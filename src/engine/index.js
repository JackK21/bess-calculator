/**
 * PowerKeeper Analyst - Calculation Engine Core
 * Unified Modular Architecture (5 Modules):
 * - Module 1: PV Plant Engine (pvPlantEngine.js)
 * - Module 2: BESS Hardware & Config (bessConfig.js)
 * - Module 3: Intelligent Look-Ahead Dispatch (bessDispatchEngine.js)
 * - Module 4: Polish OSD & URE Tariffs (tariffOsdEngine.js)
 * - Module 5: Financial & Bankability Model (financialEngine.js)
 * - Ingestion: Polish OSD Load Profile CSV Parser (osdParser.js)
 */

export * from './bessConfig.js';
export * from './pvPlantEngine.js';
export * from './bessDispatchEngine.js';
export * from './tariffOsdEngine.js';
export * from './financialEngine.js';
export * from './osdParser.js';

import {
  POWERKEEPER_MODULE_KWH,
  POWERKEEPER_PRESETS,
  POWERKEEPER_INVERTER_MODELS,
  getInverterDefaultPrice,
  resolveBessConfig
} from './bessConfig.js';
import { generatePvProfileSeries, PV_MODES } from './pvPlantEngine.js';
import { runBessDispatch } from './bessDispatchEngine.js';
import {
  evaluateCapacityBasket,
  calculateOsdExceedancePenalty,
  getSpotOrTariffPrice,
  calculateGridServicesRevenue,
  URE_CAPACITY_FEE_BASE_2026
} from './tariffOsdEngine.js';
import { calculateFinancialMetrics } from './financialEngine.js';

export const BUILTIN_SAMPLE_PROFILES = [
  {
    id: 'zaklad-wtryskarki',
    filename: '1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv',
    shortName: '🏭 Wtryskarki Tworzyw (PGE)',
    shortNameEn: '🏭 Injection Molding (PGE)',
    title: 'Zakład Tworzyw Sztucznych z Wtryskarkami i Kompresorownią (12M OSD PGE)',
    titleEn: 'Injection Molding Plant & Compressors (12M PGE DSO Matrix)',
    description: 'Praca 2-zmianowa (06:00–22:00), ostre 15-min szczyty rozruchowe i docisku hydraulicznego do 172 kW (przekroczenia mocy umownej 120 kW).',
    descriptionEn: '2-shift production (06:00–22:00), sharp 15-min hydraulic clamp and compressor surge spikes up to 172 kW (exceeding 120 kW contracted power).',
    contractedPowerKw: 120,
    chargeLimitKw: 80,
    pvCapacityKwp: 100,
    powerKeeperModules: 8,
    inverterCount: 1,
    inverterKw: 80,
    bessPowerKw: 80
  },
  {
    id: 'piekarnia-piece',
    filename: '2_OSD_TAURON_Piekarnia_Piece_12M_15min.csv',
    shortName: '🥐 Piekarnia Piece (TAURON)',
    shortNameEn: '🥐 Bakery Electric Ovens (TAURON)',
    title: 'Piekarnia Przemysłowa z Piecami Elektrycznymi (12M OSD TAURON)',
    titleEn: 'Industrial Bakery with Batch Electric Ovens (12M TAURON DSO Matrix)',
    description: 'Nocne wypieki (01:15–05:45) z uderzeniami mocy pieców wsadowych do 142 kW (przekroczenia mocy 90 kW) oraz wypiek południowy.',
    descriptionEn: 'Night baking (01:15–05:45) with oven batch power surges up to 142 kW (exceeding 90 kW contracted power) plus midday baking.',
    contractedPowerKw: 90,
    chargeLimitKw: 65,
    pvCapacityKwp: 65,
    powerKeeperModules: 8,
    inverterCount: 1,
    inverterKw: 80,
    bessPowerKw: 80
  },
  {
    id: 'logistyka-ev',
    filename: '3_OSD_ENEA_Baza_Logistyczna_EV_12M_15min.csv',
    shortName: '🚚 Hub Kurierski EV (ENEA)',
    shortNameEn: '🚚 Courier EV Hub (ENEA)',
    title: 'Baza Logistyczna z Szybkimi Ładowarkami Floty EV DC (12M OSD ENEA)',
    titleEn: 'Logistics Hub with Fleet DC EV Fast Chargers (12M ENEA DSO Matrix)',
    description: 'Popołudniowo-wieczorny powrót kurierów i ładowanie DC (16:30–20:30) do 158 kW w drogim szczycie taryfy B21 i oknie opłaty mocowej.',
    descriptionEn: 'Evening courier van return and DC fast charging surge (16:30–20:30) up to 158 kW in peak tariff & capacity fee window.',
    contractedPowerKw: 100,
    chargeLimitKw: 70,
    pvCapacityKwp: 80,
    powerKeeperModules: 8,
    inverterCount: 1,
    inverterKw: 80,
    bessPowerKw: 80
  },
  {
    id: 'chlodnia-24h',
    filename: '4_OSD_ENERGA_Chlodnia_Mroznia_12M_15min.csv',
    shortName: '❄️ Chłodnia Mroźnia 24/7 (ENERGA)',
    shortNameEn: '❄️ Cold Storage 24/7 (ENERGA)',
    title: 'Chłodnia Składowa i Mroźnia Głęboka 24/7 (12M OSD ENERGA)',
    titleEn: 'Deep Freeze & Cold Storage 24/7 with Defrost (12M ENERGA DSO Matrix)',
    description: 'Praca całodobowa 24/7, cykliczne odszranianie elektryczne parowników co 4-5h wybijające do 128 kW (przekroczenia mocy 95 kW).',
    descriptionEn: '24/7 refrigeration, cyclic electric evaporator defrost heater spikes every 4-5h up to 128 kW (exceeding 95 kW contracted power).',
    contractedPowerKw: 95,
    chargeLimitKw: 70,
    pvCapacityKwp: 90,
    powerKeeperModules: 4,
    inverterCount: 1,
    inverterKw: 50,
    bessPowerKw: 50
  },
  {
    id: 'biuro-hvac',
    filename: '5_OSD_PGE_Biurowiec_HVAC_12M_15min.csv',
    shortName: '🏢 Biurowiec HVAC (PGE)',
    shortNameEn: '🏢 Office Building HVAC (PGE)',
    title: 'Biurowiec Klasy A ze Szczytami Chłodniczymi HVAC (12M OSD PGE)',
    titleEn: 'Class A Office Park with Summer Chiller HVAC Spikes (12M PGE DSO Matrix)',
    description: 'Serwerownia 20 kW 24/7, letnie upały i agregaty wody lodowej HVAC do 102 kW (przekroczenia mocy umownej 75 kW).',
    descriptionEn: '24/7 20 kW server room, summer heatwave chiller spikes up to 102 kW (exceeding 75 kW contracted power).',
    contractedPowerKw: 75,
    chargeLimitKw: 50,
    pvCapacityKwp: 50,
    powerKeeperModules: 4,
    inverterCount: 1,
    inverterKw: 50,
    bessPowerKw: 50
  },
  {
    id: 'przetwornia-suszarnia',
    filename: '6_OSD_TAURON_Przetwornia_Suszarnia_12M_15min.csv',
    shortName: '🌾 Przetwórnia & Suszarnia (TAURON)',
    shortNameEn: '🌾 Agri-Dryer & Processing (TAURON)',
    title: 'Przetwórnia Agro i Suszarnia Zbóż z Sezonem Jesiennym (12M OSD TAURON)',
    titleEn: 'Agri-food Processing & Grain Dryer Harvest Season (12M TAURON DSO Matrix)',
    description: 'Skrajna sezonowość: 9 m-cy mały pobór (20 kW), jesień (wrzesień-listopad) suszenie zbóż i kukurydzy do 136 kW ponad moc umowną 85 kW.',
    descriptionEn: 'Extreme seasonality: 9 idle months (20 kW), autumn harvest continuous grain drying spikes up to 136 kW (exceeding 85 kW).',
    contractedPowerKw: 85,
    chargeLimitKw: 60,
    pvCapacityKwp: 75,
    powerKeeperModules: 8,
    inverterCount: 1,
    inverterKw: 80,
    bessPowerKw: 80
  },
  {
    id: 'huta-odlewnia-megawat',
    filename: '7_OSD_Huta_Odlewnia_Przemysl_12M_15min.csv',
    shortName: '⚡ Huta & Odlewnia (400 kW)',
    shortNameEn: '⚡ Heavy Foundry & Melting (400 kW)',
    title: 'Zakład Przemysłowy z Piecami Indukcyjnymi i Odlewnią (Skala Megawatowa)',
    titleEn: 'Heavy Industrial Foundry & Induction Melting (Megawatt Scale Benchmark)',
    description: 'Ciągły pobór bazowy 380–520 kW z pikami do 580 kW (moc umowna 380 kW). Wymaga kaskady do 4 falowników SH125CX (500 kW PCS) i 16–20 wież (800–1000 kWh).',
    descriptionEn: 'Continuous heavy load 380–520 kW with spikes up to 580 kW (contracted 380 kW). Requires multi-inverter cascade (up to 4x SH125CX = 500 kW PCS + 16–20 towers = 800–1000 kWh).',
    contractedPowerKw: 380,
    chargeLimitKw: 350,
    pvCapacityKwp: 400,
    powerKeeperModules: 64,
    inverterCount: 4,
    inverterKw: 125,
    bessPowerKw: 500
  }
];

/**
 * Główna funkcja orkiestracji symulacji audytu BESS i PV
 * Integruje 5 modułów obliczeniowych i zwraca spójne wyniki dla interfejsu App.jsx
 */
export function runPowerKeeperSimulation(parsedProfile, params = {}) {
  if (!parsedProfile || parsedProfile.error || !parsedProfile.points?.length) {
    return null;
  }

  const {
    enableBess = true,
    enablePeakShaving = true,
    enableArbitrage = true,
    contractedPowerKw = 120.0,
    chargeLimitKw = 60.0,
    osdNetworkRatePlnKwMonth = 25.0,
    ureCapacityFeeBasePlnKwh = URE_CAPACITY_FEE_BASE_2026,
    inputUnitMode = 'auto',
    enableDegradation = false,
    degradationRate = 1.8,
    enableFinancing = false,
    loanInterestRate = 7.5,
    loanTermYears = 7,
    pvCapacityKwp = 50.0,
    pvCapexPerKwp = 2800,
    pvOrientation = 'south',
    tariffMode = 'tou',
    tariffGroup = 'B21',
    priceKwhDay = 0.68,
    priceKwhNight = 0.44,
    priceKwhPeak = 0.96
  } = params;

  // 1. Rozwiązanie konfiguracji sprzętowej PowerKeeper (Moduł 2)
  const bessConfig = resolveBessConfig(params);
  const nominalBessCapacityKwh = enableBess ? bessConfig.nominalCapacityKwh : 0;
  const effectiveBessPowerKw = enableBess ? bessConfig.effectivePowerKw : 0;
  const batteryCapexPln = enableBess ? bessConfig.capexBatteryPln : 0;
  const totalCapexPln = enableBess ? bessConfig.totalCapexPln : 0;

  const points = parsedProfile.points;
  const dt = params.overrideDt ? Number(params.overrideDt) : parsedProfile.detectedDt;

  const unitToUse =
    inputUnitMode && inputUnitMode !== 'auto'
      ? inputUnitMode
      : parsedProfile.detectedUnit && parsedProfile.detectedUnit !== 'auto'
      ? parsedProfile.detectedUnit
      : 'kw';
  const powerMultiplier = unitToUse === 'kw' ? 1.0 : 1.0 / dt;

  // 2. Generowanie profilu fotowoltaiki (Moduł 1)
  const { actualGenSeries, forecastGenSeries } = generatePvProfileSeries(points, {
    pvMode: params.pvMode || PV_MODES.SIMULATION_PURE,
    pvCapacityKwp,
    existingPvKwp: params.existingPvKwp || 0,
    expansionPvKwp: params.expansionPvKwp || 0,
    orientation: pvOrientation || params.pvOrientation || 'south',
    region: params.pvRegion || 'central',
    enableOnlineWeather: Boolean(params.enableOnlineWeather),
    onlineWeatherData: params.onlineWeatherData || null,
    weatherConfidencePct: params.weatherConfidencePct !== undefined ? params.weatherConfidencePct : 90
  });

  // 3. Dispatch magazynu energii (Moduł 3)
  const dispatchResult = runBessDispatch({
    points,
    actualPvSeries: actualGenSeries,
    forecastPvSeries: forecastGenSeries,
    bessConfig,
    dispatchParams: {
      enableBess,
      enablePeakShaving,
      enableArbitrage,
      contractedPowerKw,
      chargeLimitKw,
      dt,
      powerMultiplier,
      priceKwhNight,
      priceKwhPeak,
      enableDegradation,
      degradationRate
    }
  });

  const {
    gridPowerAfterSeries,
    dischargeSeries,
    dischargePeakSeries,
    dischargeArbSeries,
    chargePvSeries,
    chargeGridSeries,
    socSeries,
    maxKwBefore,
    maxKwAfter,
    monthlyStats,
    heatmapGrid,
    totalDischargeKwh,
    totalChargePvKwh,
    totalChargeGridKwh,
    dcCoupledBonusKwh
  } = dispatchResult;

  // 4. Kalkulacje taryfowe i rynkowe (Moduł 4)
  const nSteps = points.length;
  let totalLoadKwh = 0;
  let totalPvGenKwh = 0;
  let urePeakKwhBefore = 0;
  let ureOffPeakKwhBefore = 0;
  let urePeakKwhAfter = 0;
  let ureOffPeakKwhAfter = 0;
  let urePeakHoursCount = 0;
  let ureOffPeakHoursCount = 0;

  let energyCostBaselineNoPvNoBessPln = 0;
  let energyCostPvOnlyPln = 0;
  let energyCostWithPowerKeeperPln = 0;
  let dcCoupledBonusPln = 0;

  const chartData = [];

  for (let i = 0; i < nSteps; i++) {
    const pt = points[i];
    const loadKw = Math.max(0, pt.val * powerMultiplier);
    const pvKw = actualGenSeries[i];
    const gridAfterKw = gridPowerAfterSeries[i];
    const netLoadAfterPvKw = Math.max(0, loadKw - pvKw);
    const spotPrice = getSpotOrTariffPrice(pt, params);

    const stepLoadKwh = loadKw * dt;
    const stepGridBeforeKwh = netLoadAfterPvKw * dt;
    const stepGridAfterKwh = gridAfterKw * dt;

    totalLoadKwh += stepLoadKwh;
    totalPvGenKwh += pvKw * dt;

    energyCostBaselineNoPvNoBessPln += stepLoadKwh * spotPrice;
    energyCostPvOnlyPln += stepGridBeforeKwh * spotPrice;
    energyCostWithPowerKeeperPln += stepGridAfterKwh * spotPrice;

    if (enableArbitrage && chargePvSeries[i] > 0) {
      dcCoupledBonusPln += (chargePvSeries[i] * dt * 0.065) * spotPrice;
    }

    const hour = pt.date.getHours();
    const dayOfWeek = pt.date.getDay();
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isUrePeakHour = isWorkday && hour >= 7 && hour < 22;

    if (isUrePeakHour) {
      urePeakKwhBefore += stepGridBeforeKwh;
      urePeakKwhAfter += stepGridAfterKwh;
      urePeakHoursCount += dt;
    } else {
      ureOffPeakKwhBefore += stepGridBeforeKwh;
      ureOffPeakKwhAfter += stepGridAfterKwh;
      ureOffPeakHoursCount += dt;
    }

    chartData.push({
      time: `${pt.date.getFullYear()}-${String(pt.date.getMonth() + 1).padStart(2, '0')}-${String(pt.date.getDate()).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(pt.date.getMinutes()).padStart(2, '0')}`,
      timestamp: pt.date.getTime(),
      originalLoadKw: Number(loadKw.toFixed(2)),
      gridPowerKw: Number(gridAfterKw.toFixed(2)),
      contractedPowerKw: Number(contractedPowerKw.toFixed(2)),
      pvGenKw: Number(pvKw.toFixed(2)),
      bessChargePvKw: Number((-chargePvSeries[i]).toFixed(2)),
      bessChargeGridKw: Number((-chargeGridSeries[i]).toFixed(2)),
      bessDischargePeakKw: Number(dischargePeakSeries[i].toFixed(2)),
      bessDischargeArbKw: Number(dischargeArbSeries[i].toFixed(2)),
      batterySoc: socSeries[i],
      spotPricePln: Number((spotPrice ?? 0.68).toFixed(3))
    });
  }

  const datasetSpanDays = Math.max(1, (points[points.length - 1].date.getTime() - points[0].date.getTime()) / 86400000);
  const annualMultiplier = datasetSpanDays < 330 ? 365 / Math.max(1, datasetSpanDays) : 1.0;

  // Ewaluacja koszyków opłaty mocowej URE K1–K4
  const basketEvalBefore = evaluateCapacityBasket(urePeakKwhBefore, urePeakHoursCount, ureOffPeakKwhBefore, ureOffPeakHoursCount);
  const basketEvalAfter = evaluateCapacityBasket(urePeakKwhAfter, urePeakHoursCount, ureOffPeakKwhAfter, ureOffPeakHoursCount);

  const annualUreCapacityFeeBeforePln = urePeakKwhBefore * annualMultiplier * ureCapacityFeeBasePlnKwh * basketEvalBefore.factor;
  const annualUreCapacityFeeAfterPln = urePeakKwhAfter * annualMultiplier * ureCapacityFeeBasePlnKwh * basketEvalAfter.factor;
  const annualUreCapacityFeeSavingsPln = Math.max(0, annualUreCapacityFeeBeforePln - annualUreCapacityFeeAfterPln);

  // Kary OSD za przekroczenia
  let totalOsdPenaltiesBeforePln = 0;
  let totalOsdPenaltiesAfterPln = 0;
  const monthlyBreakdown = [];

  for (const m of monthlyStats.values()) {
    const deltaPBefore = Math.max(0, m.maxKwOrig - contractedPowerKw);
    const deltaPAfter = Math.max(0, m.maxKwAfterBess - contractedPowerKw);
    const penaltyBeforePln = calculateOsdExceedancePenalty(deltaPBefore, osdNetworkRatePlnKwMonth);
    const penaltyAfterPln = calculateOsdExceedancePenalty(deltaPAfter, osdNetworkRatePlnKwMonth);

    totalOsdPenaltiesBeforePln += penaltyBeforePln;
    totalOsdPenaltiesAfterPln += penaltyAfterPln;

    monthlyBreakdown.push({
      month: m.month,
      maxKwOrig: Number(m.maxKwOrig.toFixed(1)),
      maxKwAfterBess: Number(m.maxKwAfterBess.toFixed(1)),
      shavedKw: Number(Math.max(0, m.maxKwOrig - m.maxKwAfterBess).toFixed(1)),
      deltaPBefore: Number(deltaPBefore.toFixed(1)),
      deltaPAfter: Number(deltaPAfter.toFixed(1)),
      penaltyBeforePln: Number(penaltyBeforePln.toFixed(0)),
      penaltyAfterPln: Number(penaltyAfterPln.toFixed(0)),
      penaltySavedPln: Number(Math.max(0, penaltyBeforePln - penaltyAfterPln).toFixed(0)),
      loadKwh: Number(m.loadKwh.toFixed(0)),
      bessDischargedKwh: Number(m.bessDischargedKwh.toFixed(0))
    });
  }

  const monthsCount = Math.max(1, monthlyBreakdown.length);
  const annualMonthScale = 12 / monthsCount;

  const annualAvoidedOsdPenaltyPln = enablePeakShaving
    ? Math.max(0, totalOsdPenaltiesBeforePln - totalOsdPenaltiesAfterPln) * annualMonthScale
    : 0;
  const powerShavedKw = enablePeakShaving ? Math.max(0, maxKwBefore - maxKwAfter) : 0;
  const potentialContractedReductionKw = Math.max(0, contractedPowerKw - maxKwAfter);
  const annualContractedPowerSavingsPln = (enablePeakShaving && totalOsdPenaltiesBeforePln === 0 && potentialContractedReductionKw > 0)
    ? potentialContractedReductionKw * osdNetworkRatePlnKwMonth * 12
    : 0;

  const annualPeakShavingSavingsPln = annualAvoidedOsdPenaltyPln + annualContractedPowerSavingsPln;

  // Przychody z Usług Sieciowych i Rynku Mocy (Moduł 4)
  const gridServices = calculateGridServicesRevenue({
    nominalCapacityKwh: nominalBessCapacityKwh,
    effectivePowerKw: effectiveBessPowerKw,
    enableDsr: params.enableDsr,
    dsrRatePlnPerMwYr: params.dsrRatePlnPerMwYr,
    enableCapacityMarket: params.enableCapacityMarket,
    capacityMarketRatePlnPerKwYr: params.capacityMarketRatePlnPerKwYr,
    enableFcr: params.enableFcr,
    fcrRatePlnPerMwYr: params.fcrRatePlnPerMwYr
  });

  // Oszczędności BESS-Only
  const rawEnergySavingsBessOnlyPln = Math.max(0, energyCostPvOnlyPln - energyCostWithPowerKeeperPln) * annualMultiplier;
  const annualEnergySavingsBessOnlyPln = enableArbitrage ? rawEnergySavingsBessOnlyPln : 0;
  const effectiveUreSavingsPln = (enablePeakShaving || enableArbitrage) ? annualUreCapacityFeeSavingsPln : 0;
  const annualSavingsBessOnlyPln = enableBess
    ? annualPeakShavingSavingsPln + effectiveUreSavingsPln + annualEnergySavingsBessOnlyPln + gridServices.totalAnnualGridRevenuePln
    : 0;

  // Oszczędności Projektu Łączonego (PV + BESS)
  const annualEnergySavingsTotalWithPvPln = Math.max(0, energyCostBaselineNoPvNoBessPln - energyCostWithPowerKeeperPln) * annualMultiplier;
  const annualSavingsCombinedPvBessPln = enableBess
    ? annualPeakShavingSavingsPln + annualUreCapacityFeeSavingsPln + annualEnergySavingsTotalWithPvPln + gridServices.totalAnnualGridRevenuePln
    : Math.max(0, energyCostBaselineNoPvNoBessPln - energyCostPvOnlyPln) * annualMultiplier;

  const pvEstimatedCapexPln = (params.pvCapacityKwp || 0) * pvCapexPerKwp;
  const totalCombinedCapexPln = totalCapexPln + pvEstimatedCapexPln;

  // 5. Metryki finansowe i model bankowy (Moduł 5)
  const finMetrics = calculateFinancialMetrics({
    bessCapexPln: totalCapexPln,
    pvCapexPln: pvEstimatedCapexPln,
    annualSavingsBessOnlyPln,
    annualSavingsPvOnlyPln: Math.max(0, energyCostBaselineNoPvNoBessPln - energyCostPvOnlyPln) * annualMultiplier,
    annualSavingsCombinedPln: annualSavingsCombinedPvBessPln,
    annualDischargeKwh: totalDischargeKwh * annualMultiplier,
    annualDegradationPct: enableDegradation ? degradationRate : 1.8,
    enableFinancing,
    loanInterestRatePct: loanInterestRate,
    loanTermYears
  });

  const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
  const dayNamesEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const heatmapData = heatmapGrid.map((hoursArr, dow) => ({
    day: dayNames[dow],
    dayEn: dayNamesEn[dow],
    hours: hoursArr.map((cell, hr) => ({
      hour: hr,
      avgBeforeKw: cell.count > 0 ? Number((cell.sumBefore / cell.count).toFixed(1)) : 0,
      avgAfterKw: cell.count > 0 ? Number((cell.sumAfter / cell.count).toFixed(1)) : 0
    }))
  }));

  const annualTotalSavingsPln = enableBess ? annualSavingsBessOnlyPln : (energyCostBaselineNoPvNoBessPln - energyCostPvOnlyPln) * annualMultiplier;
  const selfSufficiencyPct = totalLoadKwh > 0
    ? Math.min(100, Math.round(((totalPvGenKwh + totalDischargeKwh) / totalLoadKwh) * 100))
    : 0;

  return {
    metrics: {
      ppeCode: parsedProfile.ppeCode,
      detectedDt: dt,
      enableBess,
      enablePeakShaving,
      enableArbitrage,
      enableDsr: !!params.enableDsr,
      enableCapacityMarket: !!params.enableCapacityMarket,
      enableFcr: !!params.enableFcr,
      annualDsrRevenuePln: gridServices.annualDsrRevenuePln,
      annualCapacityMarketRevenuePln: gridServices.annualCapacityMarketRevenuePln,
      annualFcrRevenuePln: gridServices.annualFcrRevenuePln,
      totalAnnualGridRevenuePln: gridServices.totalAnnualGridRevenuePln,
      pvMode: params.pvMode || 'simulation_pure',
      existingPvKwp: params.existingPvKwp || 0,
      expansionPvKwp: params.expansionPvKwp || 0,
      weatherConfidencePct: params.weatherConfidencePct !== undefined ? params.weatherConfidencePct : 90,
      osdOperator: params.osdOperator || 'pge',
      tariffGroup: params.tariffGroup || 'B21',
      datasetSpanDays: Number(datasetSpanDays.toFixed(1)),
      annualMultiplier: Number(annualMultiplier.toFixed(2)),
      totalLoadKwh: Math.round(totalLoadKwh * annualMultiplier),
      totalPvGenKwh: Math.round(totalPvGenKwh * annualMultiplier),
      totalDischargeKwh: Math.round(totalDischargeKwh * annualMultiplier),
      selfSufficiencyPct,
      powerKeeperModules: enableBess ? bessConfig.moduleCount : 0,
      powerKeeperTowers: enableBess ? bessConfig.towers : 0,
      nominalBessCapacityKwh,
      effectiveBessPowerKw,
      inverterCount: bessConfig.inverterCount,
      singleInverterKw: bessConfig.inverterModelKw,
      inverterModelKw: bessConfig.effectiveInverterKw,
      singleInverterPricePln: getInverterDefaultPrice(bessConfig.inverterModelKw),
      inverterPricePln: bessConfig.capexInverterPln,
      pvOrientation,
      pvRegion: params.pvRegion || 'central',
      batteryCapexPln: Math.round(batteryCapexPln),
      totalCapexPln: Math.round(totalCapexPln),
      maxKwBefore: Number(maxKwBefore.toFixed(1)),
      maxKwAfter: Number(maxKwAfter.toFixed(1)),
      powerShavedKw: Number(powerShavedKw.toFixed(1)),
      contractedPowerKw: Number(contractedPowerKw.toFixed(1)),
      deltaPBeforeKw: Number(Math.max(0, maxKwBefore - contractedPowerKw).toFixed(1)),
      deltaPAfterKw: Number(Math.max(0, maxKwAfter - contractedPowerKw).toFixed(1)),
      basketBefore: basketEvalBefore.basket,
      basketFactorBefore: basketEvalBefore.factor,
      basketDeltaSBeforePct: basketEvalBefore.deltaSPct,
      basketAfter: basketEvalAfter.basket,
      basketFactorAfter: basketEvalAfter.factor,
      basketDeltaSAfterPct: basketEvalAfter.deltaSPct,
      basketDiscountAfterPct: basketEvalAfter.discountPct,
      annualUreCapacityFeeBeforePln: Number(annualUreCapacityFeeBeforePln.toFixed(0)),
      annualUreCapacityFeeAfterPln: Number(annualUreCapacityFeeAfterPln.toFixed(0)),
      annualUreCapacityFeeSavingsPln: Number(annualUreCapacityFeeSavingsPln.toFixed(0)),
      annualOsdPenaltiesBeforePln: Number((totalOsdPenaltiesBeforePln * annualMonthScale).toFixed(0)),
      annualOsdPenaltiesAfterPln: Number((totalOsdPenaltiesAfterPln * annualMonthScale).toFixed(0)),
      annualAvoidedOsdPenaltyPln: Number(annualAvoidedOsdPenaltyPln.toFixed(0)),
      annualContractedPowerSavingsPln: Number(annualContractedPowerSavingsPln.toFixed(0)),
      annualPeakShavingSavingsPln: Number(annualPeakShavingSavingsPln.toFixed(0)),
      annualEnergySavingsBessOnlyPln: Number(annualEnergySavingsBessOnlyPln.toFixed(0)),
      annualEnergySavingsTotalWithPvPln: Number(annualEnergySavingsTotalWithPvPln.toFixed(0)),
      annualDcCoupledBonusPln: Number((dcCoupledBonusPln * annualMultiplier).toFixed(0)),
      dcCoupledBonusKwh: Number((dcCoupledBonusKwh * annualMultiplier).toFixed(0)),
      annualTotalSavingsPln: Number(annualTotalSavingsPln.toFixed(0)),
      annualSavingsBessOnlyPln: Number(annualSavingsBessOnlyPln.toFixed(0)),
      annualSavingsCombinedPvBessPln: Number(annualSavingsCombinedPvBessPln.toFixed(0)),
      pvEstimatedCapexPln: Math.round(pvEstimatedCapexPln),
      totalCombinedCapexPln: Math.round(totalCombinedCapexPln),
      annualTotalCostWithoutBessPln: Number((energyCostPvOnlyPln * annualMultiplier + contractedPowerKw * osdNetworkRatePlnKwMonth * 12 + totalOsdPenaltiesBeforePln * annualMonthScale + annualUreCapacityFeeBeforePln).toFixed(0)),
      annualTotalCostWithBessPln: Number((energyCostWithPowerKeeperPln * annualMultiplier + Math.min(contractedPowerKw, maxKwAfter) * osdNetworkRatePlnKwMonth * 12 + totalOsdPenaltiesAfterPln * annualMonthScale + annualUreCapacityFeeAfterPln).toFixed(0)),
      roiYears: finMetrics.roiBessYears,
      roiCombinedYears: finMetrics.roiCombinedYears,
      lcosPlnPerKwh: finMetrics.lcosPlnPerKwh,
      npvPln: finMetrics.npvPln,
      loanPaymentAnnualPln: finMetrics.annualDebtServicePln,
      netCashflowAnnualPln: Math.round(annualTotalSavingsPln - finMetrics.annualDebtServicePln),
      rawEnergySavingsBessOnlyPln: Number(rawEnergySavingsBessOnlyPln.toFixed(0))
    },
    monthlyBreakdown,
    heatmapData,
    chartData,
    cashFlowTimeline: finMetrics.cashFlowTimeline
  };
}

/**
 * Przelicza matrycę wariantów pojemnościowych PowerKeeper dla zestawienia porównawczego
 */
export function runPowerKeeperSizingMatrix(parsedProfile, baseParams = {}) {
  if (!parsedProfile || parsedProfile.error) return [];
  return POWERKEEPER_PRESETS.map(preset => {
    const invKw = preset.defaultInverterKw || 50;
    const invCount = preset.inverterCount || 1;
    const invPrice = getInverterDefaultPrice(invKw);
    const sim = runPowerKeeperSimulation(parsedProfile, {
      ...baseParams,
      enableBess: true,
      powerKeeperModules: preset.modules,
      inverterCount: invCount,
      bessPowerKw: invKw * invCount,
      inverterModelKw: invKw,
      inverterPricePln: invPrice
    });
    return {
      ...preset,
      inverterCount: invCount,
      inverterModelKw: invKw,
      inverterTotalPowerKw: invKw * invCount,
      singleInverterPricePln: invPrice,
      inverterPricePln: invPrice * invCount,
      batteryCapexPln: sim.metrics.batteryCapexPln,
      capexPln: sim.metrics.totalCapexPln,
      maxKwAfter: sim.metrics.maxKwAfter,
      powerShavedKw: sim.metrics.powerShavedKw,
      deltaPAfterKw: sim.metrics.deltaPAfterKw,
      basketAfter: sim.metrics.basketAfter,
      annualUreCapacityFeeSavingsPln: sim.metrics.annualUreCapacityFeeSavingsPln,
      annualAvoidedOsdPenaltyPln: sim.metrics.annualAvoidedOsdPenaltyPln,
      annualPeakShavingSavingsPln: sim.metrics.annualPeakShavingSavingsPln,
      annualEnergySavingsPln: sim.metrics.annualEnergySavingsBessOnlyPln,
      annualTotalSavingsPln: sim.metrics.annualTotalSavingsPln,
      roiYears: sim.metrics.roiYears,
      roiCombinedYears: sim.metrics.roiCombinedYears
    };
  });
}
