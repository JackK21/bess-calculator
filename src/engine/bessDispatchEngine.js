/**
 * PowerKeeper Analyst - BESS Dispatch Engine (Moduł 3)
 * Grounded in: PLAN_ROZBUDOWY_SILNIKA_OBLICZENIOWEGO.md & references/powerkeeper_specs.md
 * 
 * Ścisła hierarchia priorytetów dyspozytora:
 * PRIORYTET 1: Peak Shaving (ochrona przed karą OSD = Delta_P * Stawka_sieciowa * 10, czas reakcji < 10ms)
 * PRIORYTET 2: Wsparcie okna Opłaty Mocowej URE (07:00–22:00 w dni robocze, utrzymanie Koszyka K1)
 * PRIORYTET 3: Autokonsumpcja nadwyżek PV (bezpośrednie ładowanie po szynie DC, 97.5% sprawności)
 * PRIORYTET 4: Look-Ahead Dispatch & Arbitraż (analiza prognozy PV na 24h, ochrona przed przeładowaniem w nocy)
 */

export function runBessDispatch({
  points,
  actualPvSeries,
  forecastPvSeries,
  bessConfig,
  dispatchParams = {}
}) {
  const {
    enableBess = true,
    enablePeakShaving = true,
    enableArbitrage = true,
    contractedPowerKw = 120,
    chargeLimitKw = 60,
    dt = 0.25,
    powerMultiplier = 1.0,
    priceKwhNight = 0.45,
    priceKwhPeak = 0.95,
    enableDegradation = false,
    degradationRate = 1.8
  } = dispatchParams;

  const len = points.length;
  const nominalCapacityKwh = enableBess ? (bessConfig.nominalCapacityKwh || 0) : 0;
  const effectivePowerKw = enableBess ? (bessConfig.effectivePowerKw || 0) : 0;
  const dcOneWayEff = bessConfig.dcCoupledEfficiency || 0.975;
  const acGridChargeEff = bessConfig.acGridEfficiency || 0.945;
  const dodPct = bessConfig.dodPct || 90;
  const minSoc = (100 - dodPct) / 100; // np. 0.10 (10%)
  const peakReserveSoc = 0.55;

  let soc = 0.90; // Stan początkowy
  const acCoupledPenaltyFactor = 0.065; // Przewaga DC nad AC (~6.5%)

  // Tablice wynikowe
  const gridPowerAfterSeries = new Float32Array(len);
  const dischargeSeries = new Float32Array(len);
  const dischargePeakSeries = new Float32Array(len);
  const dischargeArbSeries = new Float32Array(len);
  const chargePvSeries = new Float32Array(len);
  const chargeGridSeries = new Float32Array(len);
  const socSeries = new Float32Array(len);

  let totalDischargeKwh = 0;
  let totalChargePvKwh = 0;
  let totalChargeGridKwh = 0;
  let dcCoupledBonusKwh = 0;

  let maxKwBefore = 0;
  let maxKwAfter = 0;

  const monthlyStats = new Map();
  const heatmapGrid = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ sumBefore: 0, sumAfter: 0, count: 0 }))
  );
  const peakEvents = [];

  // Pętla dyspozytorska kwadrans po kwadransie
  for (let i = 0; i < len; i++) {
    const pt = points[i];
    const loadKw = Math.max(0, pt.val * powerMultiplier);
    const pvKw = actualPvSeries ? actualPvSeries[i] : 0;
    const netLoadKw = loadKw - pvKw; // > 0: deficyt / import; < 0: nadwyżka PV
    const gridPvOnlyKw = Math.max(0, netLoadKw);

    const monthKey = `${pt.date.getFullYear()}-${String(pt.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyStats.has(monthKey)) {
      monthlyStats.set(monthKey, {
        month: monthKey,
        maxKwOrig: 0,
        maxKwPvOnly: 0,
        maxKwAfterBess: 0,
        loadKwh: 0,
        pvKwh: 0,
        bessDischargedKwh: 0
      });
    }
    const mStat = monthlyStats.get(monthKey);

    // Degradacja liniowa w czasie symulacji
    const currentCap = nominalCapacityKwh * (1 - (enableDegradation ? (degradationRate / 100) * (i / len) : 0));

    let pOutPeakShavingKw = 0;
    let pOutArbitrageKw = 0;
    let pInPvKw = 0;
    let pInGridKw = 0;
    let gridPowerAfterKw = gridPvOnlyKw;

    const hour = pt.date.getHours();
    const dayOfWeek = pt.date.getDay();
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isUrePeakHour = isWorkday && hour >= 7 && hour < 22;

    if (enableBess && currentCap > 0 && (enablePeakShaving || enableArbitrage)) {
      const isCheapNightWindow = hour >= 0 && hour < 5;
      const isExpensiveEveningWindow = (hour >= 17 && hour <= 21) || isUrePeakHour;

      // -------------------------------------------------------------
      // PRIORYTET 1: PEAK SHAVING (<10 ms DSO Guard)
      // Ochrona przed karami OSD za przekroczenie mocy umownej
      // -------------------------------------------------------------
      if (enablePeakShaving && netLoadKw > contractedPowerKw) {
        const neededKw = netLoadKw - contractedPowerKw;
        const maxAvailableKw = Math.max(0, ((soc - minSoc) * currentCap * dcOneWayEff) / dt);
        pOutPeakShavingKw = Math.min(neededKw, effectivePowerKw, maxAvailableKw);
        gridPowerAfterKw = netLoadKw - pOutPeakShavingKw;
        soc -= (pOutPeakShavingKw * dt) / (dcOneWayEff * currentCap);
      }
      
      // -------------------------------------------------------------
      // PRIORYTET 2: BEZPOŚREDNIE ŁADOWANIE Z NADWYŻEK PV (DC-Coupled)
      // -------------------------------------------------------------
      else if (netLoadKw < 0) {
        const excessPvKw = Math.abs(netLoadKw);
        const maxSpaceKw = Math.max(0, ((1.0 - soc) * currentCap) / (dt * dcOneWayEff));
        pInPvKw = Math.min(excessPvKw, effectivePowerKw, maxSpaceKw);
        gridPowerAfterKw = 0;
        soc += (pInPvKw * dt * dcOneWayEff) / currentCap;

        const extraBonusKwh = pInPvKw * dt * acCoupledPenaltyFactor;
        dcCoupledBonusKwh += extraBonusKwh;
      }

      // -------------------------------------------------------------
      // PRIORYTET 3: ŁADOWANIE NOCNE Z SIECI Z ALGORYTMEM LOOK-AHEAD 24H
      // Analiza prognozy PV na kolejną dobę zapobiegająca blokowaniu
      // pojemności przed darmowym ładowaniem ze słońca
      // -------------------------------------------------------------
      else if ((enableArbitrage || enablePeakShaving) && isCheapNightWindow && soc < 0.95) {
        let nextDayForecastPvKwh = 0;
        const lookAheadSteps = Math.min(96, len - i); // Okno 24h (96 kwadransów)
        for (let s = 0; s < lookAheadSteps; s++) {
          nextDayForecastPvKwh += (forecastPvSeries ? forecastPvSeries[i + s] : 0) * dt;
        }

        // Jeśli jutro będzie duża generacja PV (> 1.2x pojemności), nie ładujemy w nocy do pełna
        const rawLookAheadSoc = nextDayForecastPvKwh > (currentCap * 1.2) ? 0.35 : 0.90;
        const targetNightSoc = enablePeakShaving ? Math.max(0.80, rawLookAheadSoc) : rawLookAheadSoc;

        if (soc < targetNightSoc) {
          const maxGridAllowedKw = Math.max(chargeLimitKw, contractedPowerKw * 0.85);
          const headroomKw = Math.max(0, maxGridAllowedKw - netLoadKw);
          const maxSpaceKw = Math.max(0, ((targetNightSoc - soc) * currentCap) / (dt * acGridChargeEff));
          pInGridKw = Math.min(headroomKw, effectivePowerKw, maxSpaceKw);
          gridPowerAfterKw = netLoadKw + pInGridKw;
          soc += (pInGridKw * dt * acGridChargeEff) / currentCap;
        }
      }

      // -------------------------------------------------------------
      // PRIORYTET 3B: ODZYSKIWANIE REZERWY BUFOROWEJ PEAK SHAVING (DSO Guard Recovery)
      // Gdy magazyn oddał energię na tłumienie piku i poziom SoC spadł poniżej
      // bufora bezpieczeństwa, doładowujemy baterię z sieci przy niskim poborze
      // obiektu (gdy pobór jest bezpiecznie poniżej chargeLimitKw i mocy umownej)
      // -------------------------------------------------------------
      else if (enablePeakShaving && soc < 0.75 && netLoadKw < contractedPowerKw * 0.85) {
        const safeCeilingKw = Math.min(chargeLimitKw, contractedPowerKw * 0.85);
        if (netLoadKw < safeCeilingKw) {
          const headroomKw = Math.max(0, safeCeilingKw - netLoadKw);
          const maxSpaceKw = Math.max(0, ((0.75 - soc) * currentCap) / (dt * acGridChargeEff));
          pInGridKw = Math.min(headroomKw, effectivePowerKw * 0.60, maxSpaceKw);
          gridPowerAfterKw = netLoadKw + pInGridKw;
          soc += (pInGridKw * dt * acGridChargeEff) / currentCap;
        }
      }

      // -------------------------------------------------------------
      // PRIORYTET 4: ARBITRAŻ & AUTOKONSUMPCJA Z REZERWĄ PEAK SHAVING
      // Rozładowanie w drogim oknie szczytowym, WYŁĄCZNIE z nienaruszalną
      // rezerwą bufora mocy umownej
      // -------------------------------------------------------------
      else if (enableArbitrage && netLoadKw > 0 && !isCheapNightWindow) {
        const dynamicReserve = enablePeakShaving ? Math.max(0.60, peakReserveSoc) : minSoc;

        if (soc > dynamicReserve + 0.05 && ((hour >= 17 && hour <= 21) || (!enablePeakShaving && isExpensiveEveningWindow))) {
          const availAboveReserveKw = Math.max(0, ((soc - dynamicReserve) * currentCap * dcOneWayEff) / dt);
          const maxArbKw = Math.min(netLoadKw, effectivePowerKw * 0.50, availAboveReserveKw);
          
          pOutArbitrageKw = Math.max(0, maxArbKw);
          gridPowerAfterKw = netLoadKw - pOutArbitrageKw;
          soc -= (pOutArbitrageKw * dt) / (dcOneWayEff * currentCap);
        }
      }

      soc = Math.max(minSoc, Math.min(1.0, soc));
    }

    const totalDischargeKw = pOutPeakShavingKw + pOutArbitrageKw;
    totalDischargeKwh += totalDischargeKw * dt;
    totalChargePvKwh += pInPvKw * dt;
    totalChargeGridKwh += pInGridKw * dt;

    if (loadKw > maxKwBefore) maxKwBefore = loadKw;
    if (gridPowerAfterKw > maxKwAfter) maxKwAfter = gridPowerAfterKw;

    if (loadKw > mStat.maxKwOrig) mStat.maxKwOrig = loadKw;
    if (gridPvOnlyKw > mStat.maxKwPvOnly) mStat.maxKwPvOnly = gridPvOnlyKw;
    if (gridPowerAfterKw > mStat.maxKwAfterBess) mStat.maxKwAfterBess = gridPowerAfterKw;
    mStat.loadKwh += loadKw * dt;
    mStat.pvKwh += pvKw * dt;
    mStat.bessDischargedKwh += totalDischargeKw * dt;

    // Statystyki heatmapy 7x24 (indeksowanie europejskie: 0 = Poniedziałek, ..., 6 = Niedziela)
    const euDayOfWeek = (dayOfWeek + 6) % 7;
    heatmapGrid[euDayOfWeek][hour].sumBefore += loadKw;
    heatmapGrid[euDayOfWeek][hour].sumAfter += gridPowerAfterKw;
    heatmapGrid[euDayOfWeek][hour].count++;

    // Rejestracja zdarzeń przekroczenia mocy
    if (gridPowerAfterKw > contractedPowerKw) {
      peakEvents.push({
        time: pt.time,
        date: pt.date,
        originalKw: loadKw,
        gridKw: gridPowerAfterKw,
        overKw: gridPowerAfterKw - contractedPowerKw
      });
    }

    gridPowerAfterSeries[i] = gridPowerAfterKw;
    dischargeSeries[i] = totalDischargeKw;
    dischargePeakSeries[i] = pOutPeakShavingKw;
    dischargeArbSeries[i] = pOutArbitrageKw;
    chargePvSeries[i] = pInPvKw;
    chargeGridSeries[i] = pInGridKw;
    socSeries[i] = Number((soc * 100).toFixed(1));
  }

  return {
    gridPowerAfterSeries,
    dischargeSeries,
    dischargePeakSeries,
    dischargeArbSeries,
    chargePvSeries,
    chargeGridSeries,
    socSeries,
    totalDischargeKwh: Math.round(totalDischargeKwh),
    totalChargePvKwh: Math.round(totalChargePvKwh),
    totalChargeGridKwh: Math.round(totalChargeGridKwh),
    dcCoupledBonusKwh: Math.round(dcCoupledBonusKwh),
    maxKwBefore: Number(maxKwBefore.toFixed(1)),
    maxKwAfter: Number(maxKwAfter.toFixed(1)),
    monthlyStats,
    heatmapGrid,
    peakEvents
  };
}
