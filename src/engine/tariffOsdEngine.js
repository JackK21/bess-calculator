/**
 * PowerKeeper Analyst - OSD & Tariff Regulations Engine (Moduł 4)
 * Grounded in: PLAN_ROZBUDOWY_SILNIKA_OBLICZENIOWEGO.md & references/powerkeeper_specs.md
 * 
 * Odpowiada za:
 * 1. Polski rynek energii: Taryfy B21, B22, B23, C21, C22a/b oraz dynamiczne TGE RDN
 * 2. Profile polskich Operatorów Systemu Dystrybucyjnego (PGE, Tauron, Enea, Energa)
 * 3. Kary sieciowe OSD za przekroczenie mocy umownej: Kara = Delta_P * Stawka * 10
 * 4. Opłata Mocowa URE 2026: Stawka bazowa 0.2194 PLN/kWh z koszykami K1 (83%), K2 (50%), K3 (17%), K4 (0%)
 * 5. Usługi elastyczności sieciowej: DSR (Demand Side Response) i Rynek Mocy (premia mocowa)
 */

export const POLISH_DSO_OPERATORS = [
  { id: 'pge', name: 'PGE Dystrybucja', defaultFixedNetworkRatePln: 25.40 },
  { id: 'tauron', name: 'Tauron Dystrybucja', defaultFixedNetworkRatePln: 24.80 },
  { id: 'enea', name: 'Enea Operator', defaultFixedNetworkRatePln: 23.90 },
  { id: 'energa', name: 'Energa-Operator', defaultFixedNetworkRatePln: 26.20 }
];

export const TARIFF_GROUPS = {
  B21: { id: 'B21', name: 'B21 (1-strefowa C&I)', zones: 1 },
  B22: { id: 'B22', name: 'B22 (2-strefowa C&I Szczyt / Pozaszczyt)', zones: 2 },
  B23: { id: 'B23', name: 'B23 (3-strefowa C&I Szczyt Przed- i Popołudniowy)', zones: 3 },
  C21: { id: 'C21', name: 'C21 (1-strefowa MŚP)', zones: 1 },
  C22A: { id: 'C22a', name: 'C22a (2-strefowa MŚP)', zones: 2 },
  RDN_DYNAMIC: { id: 'RDN', name: 'Taryfa Dynamiczna TGE RDN (Godzinowa)', zones: 'dynamic' }
};

export const URE_CAPACITY_FEE_BASE_2026 = 0.2194; // PLN/kWh stawka bazowa opłaty mocowej URE 2026

/**
 * Wylicza karę OSD za przekroczenie mocy umownej w danym miesiącu
 * Formuła OSD: Kara [PLN] = Delta_P [kW] * Stawka_sieciowa [PLN/kW/mc] * 10
 */
export function calculateOsdExceedancePenalty(deltaMaxKw, monthlyNetworkRatePln) {
  if (deltaMaxKw <= 0) return 0;
  return deltaMaxKw * monthlyNetworkRatePln * 10;
}

/**
 * Wyznacza Koszyk Opłaty Mocowej URE (K1–K4) na bazie rozpiętości poboru szczytowego do pozaszczytowego
 * Okno szczytowe: dni robocze 07:00–21:59 (15 godzin/dobę)
 * Delta_S = ((avgPeakKw / avgOffPeakKw) - 1) * 100%
 */
export function evaluateCapacityBasket(peakEnergyKwh, peakHoursCount, offPeakEnergyKwh, offPeakHoursCount) {
  const avgPeakKw = peakHoursCount > 0 ? peakEnergyKwh / peakHoursCount : 0;
  const avgOffPeakKw = offPeakHoursCount > 0 ? offPeakEnergyKwh / offPeakHoursCount : 0;

  if (avgOffPeakKw <= 0.01) {
    return {
      basket: 'K4',
      factor: 1.0,
      discountPct: 0,
      deltaSPct: 100.0,
      effectiveRatePln: URE_CAPACITY_FEE_BASE_2026,
      avgPeakKw,
      avgOffPeakKw
    };
  }

  const ratio = avgPeakKw / avgOffPeakKw - 1;
  const deltaSPct = Math.max(0, ratio * 100);

  if (deltaSPct < 5.0) {
    return {
      basket: 'K1',
      factor: 0.17,
      discountPct: 83,
      deltaSPct: Number(deltaSPct.toFixed(1)),
      effectiveRatePln: Number((URE_CAPACITY_FEE_BASE_2026 * 0.17).toFixed(4)),
      avgPeakKw,
      avgOffPeakKw
    };
  }
  if (deltaSPct < 10.0) {
    return {
      basket: 'K2',
      factor: 0.50,
      discountPct: 50,
      deltaSPct: Number(deltaSPct.toFixed(1)),
      effectiveRatePln: Number((URE_CAPACITY_FEE_BASE_2026 * 0.50).toFixed(4)),
      avgPeakKw,
      avgOffPeakKw
    };
  }
  if (deltaSPct < 15.0) {
    return {
      basket: 'K3',
      factor: 0.83,
      discountPct: 17,
      deltaSPct: Number(deltaSPct.toFixed(1)),
      effectiveRatePln: Number((URE_CAPACITY_FEE_BASE_2026 * 0.83).toFixed(4)),
      avgPeakKw,
      avgOffPeakKw
    };
  }
  return {
    basket: 'K4',
    factor: 1.0,
    discountPct: 0,
    deltaSPct: Number(deltaSPct.toFixed(1)),
    effectiveRatePln: URE_CAPACITY_FEE_BASE_2026,
    avgPeakKw,
    avgOffPeakKw
  };
}

/**
 * Zwraca cenę energii dla danego punktu czasowego w wybranej taryfie
 */
export function getSpotOrTariffPrice(point, params = {}) {
  const priceDay = params.priceKwhDay ?? 0.85;
  const priceNight = params.priceKwhNight ?? 0.52;
  const pricePeak = params.priceKwhPeak ?? 1.28;
  const pricePeakMorning = params.priceKwhPeakMorning ?? pricePeak;
  const pricePeakEvening = params.priceKwhPeakEvening ?? pricePeak;

  // Ceny dynamiczne z pliku (jeśli profil zawiera kolumnę cenową)
  if (point.dynamicPricePlnKwh !== null && point.dynamicPricePlnKwh !== undefined) {
    return point.dynamicPricePlnKwh > 20 ? point.dynamicPricePlnKwh / 1000 : point.dynamicPricePlnKwh;
  }

  const hour = point.date.getHours();
  const day = point.date.getDay();
  const isWeekend = day === 0 || day === 6;

  // Taryfa Dynamiczna TGE RDN (Symulacja zmienności giełdowej RDN / RCEm)
  if (params.tariffMode === 'dynamic' || params.tariffGroup === 'RDN') {
    const basePrice = params.rdnBasePricePlnKwh ?? 0.48;
    const vol = (params.rdnVolatilityPct ?? 100) / 100;
    // Profil dobowy TGE RDN: dołek nocny (01-05), szczyt poranny (08-11), dołek solarny (12-15), szczyt wieczorny (18-21)
    let hourlyFactor = 1.0;
    if (hour >= 1 && hour <= 4) hourlyFactor = 0.55;
    else if (hour >= 8 && hour <= 11) hourlyFactor = 1.55;
    else if (hour >= 12 && hour <= 15) hourlyFactor = params.allowNegativePrices ? -0.15 : 0.40;
    else if (hour >= 18 && hour <= 21) hourlyFactor = 1.85;
    else hourlyFactor = 0.90;

    const price = basePrice * (1 + (hourlyFactor - 1) * vol);
    return Number(price.toFixed(4));
  }

  if (params.tariffMode === 'flat' || params.tariffGroup === 'B21' || params.tariffGroup === 'C21') {
    return priceDay;
  }

  // Taryfa 3-strefowa B23 (Szczyt przedpołudniowy, Szczyt popołudniowy, Dolina dzienna, Dolina nocna)
  if (params.tariffGroup === 'B23') {
    if (isWeekend) return priceNight;
    if (hour >= 7 && hour < 13) return pricePeakMorning; // Szczyt przedpołudniowy
    if (hour >= 16 && hour < 21) return pricePeakEvening; // Szczyt popołudniowy
    if (hour >= 13 && hour < 16) return priceDay;         // Dolina dzienna
    return priceNight;                                    // Dolina nocna (22:00-07:00)
  }

  // Taryfa 2-strefowa (B22, C22a, C22b, lub ogólny tryb tou)
  if (isWeekend || hour >= 22 || hour < 6) {
    return priceNight;
  }
  if ((hour >= 7 && hour < 13) || (hour >= 16 && hour < 21)) {
    return pricePeak;
  }
  return priceDay;
}

/**
 * Wylicza roczne przychody ze świadczenia usług sieciowych dla magazynu C&I (DSR / Rynek Mocy / FCR)
 */
export function calculateGridServicesRevenue({
  nominalCapacityKwh = 100,
  effectivePowerKw = 80,
  enableDsr = false,
  dsrRatePlnPerMwYr = 100000,          // Średnio 100 000 PLN/MW gotowości
  enableCapacityMarket = false,
  capacityMarketRatePlnPerKwYr = 180,  // Średnia cena z aukcji rynku mocy ~180 PLN/kW/rok
  enableFcr = false,
  fcrRatePlnPerMwYr = 95000            // Rezerwa pierwotna FCR ~95 000 PLN/MW/rok
} = {}) {
  let annualDsrRevenuePln = 0;
  let annualCapacityMarketRevenuePln = 0;
  let annualFcrRevenuePln = 0;

  if (enableDsr && effectivePowerKw > 0) {
    annualDsrRevenuePln = (effectivePowerKw / 1000) * dsrRatePlnPerMwYr;
  }

  if (enableCapacityMarket && effectivePowerKw > 0) {
    // Współczynnik dyspozycyjności BESS (derating ~0.85 dla magazynu min. 2-godzinnego)
    const availabilityFactor = nominalCapacityKwh >= effectivePowerKw * 2 ? 0.85 : 0.50;
    annualCapacityMarketRevenuePln = effectivePowerKw * availabilityFactor * capacityMarketRatePlnPerKwYr;
  }

  if (enableFcr && effectivePowerKw > 0) {
    // Rezerwa FCR: udostępnienie 50% mocy ciągłej PCS na regulację częstotliwości
    annualFcrRevenuePln = (effectivePowerKw * 0.50 / 1000) * fcrRatePlnPerMwYr;
  }

  return {
    annualDsrRevenuePln: Math.round(annualDsrRevenuePln),
    annualCapacityMarketRevenuePln: Math.round(annualCapacityMarketRevenuePln),
    annualFcrRevenuePln: Math.round(annualFcrRevenuePln),
    totalAnnualGridRevenuePln: Math.round(annualDsrRevenuePln + annualCapacityMarketRevenuePln + annualFcrRevenuePln)
  };
}
