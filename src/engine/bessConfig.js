/**
 * PowerKeeper Analyst - BESS Device Specifications & Configuration Engine
 * Grounded in: references/powerkeeper_specs.md
 * 
 * Critical Constraints:
 * 1. PowerKeeper & Residential exclusivity (Kategoryczny zakaz PowerStack).
 * 2. Modułowość 12,5 kWh LFP.
 * 3. Minimalna wieża PowerKeeper: 4 moduły (50,0 kWh).
 * 4. Architektura DC-Coupled (97,5% DC / 94,5% AC grid).
 * 5. Czas reakcji DSO Guard: < 10 ms.
 */

export const POWERKEEPER_MODULE_KWH = 12.5;
export const MIN_POWERKEEPER_TOWER_MODULES = 4; // 50.0 kWh (1 wieża)
export const MIN_POWERKEEPER_CAPACITY_KWH = 50.0;

export const POWERKEEPER_INVERTER_MODELS = [
  {
    powerKw: 50,
    modelCode: 'SH50CX',
    defaultPricePln: 15000,
    label: 'SH50CX (50 kW)',
    labelEn: 'SH50CX (50 kW)',
    desc: '1 Wieża (50 kWh)',
    descEn: '1 Tower (50 kWh)'
  },
  {
    powerKw: 80,
    modelCode: 'SH80CX',
    defaultPricePln: 19000,
    label: 'SH80CX (80 kW)',
    labelEn: 'SH80CX (80 kW)',
    desc: '2 Wieże (100 kWh)',
    descEn: '2 Towers (100 kWh)'
  },
  {
    powerKw: 125,
    modelCode: 'SH125CX',
    defaultPricePln: 25000,
    label: 'SH125CX (125 kW)',
    labelEn: 'SH125CX (125 kW)',
    desc: '3–4 Wieże (150–200 kWh)',
    descEn: '3–4 Towers (150–200 kWh)'
  }
];
// Support numeric power lookup (POWERKEEPER_INVERTER_MODELS[50])
POWERKEEPER_INVERTER_MODELS[50] = POWERKEEPER_INVERTER_MODELS[0];
POWERKEEPER_INVERTER_MODELS[80] = POWERKEEPER_INVERTER_MODELS[1];
POWERKEEPER_INVERTER_MODELS[125] = POWERKEEPER_INVERTER_MODELS[2];

export function getInverterDefaultPrice(kw) {
  if (kw <= 50) return 15000;
  if (kw <= 80) return 19000;
  return 25000;
}

export const POWERKEEPER_HARDWARE_SPECS = {
  MAX_CRATE_CONTINUOUS: 1.0,
  MAX_CRATE_PEAK_10S: 1.5,
  CELL_CHEMISTRY: 'LFP',
  VOLTAGE_NOMINAL_V: 800,
  CYCLE_LIFE_80_DOD: 6000,
  DSO_GUARD_RESPONSE_MS: 10,
  DC_COUPLED_EFFICIENCY: 0.975,
  AC_GRID_EFFICIENCY: 0.945
};

export const POWERKEEPER_PRESETS = [
  {
    id: 'pk-50',
    name: 'PowerKeeper 50.0 kWh (1 Wieża / 1× SH50CX)',
    nameEn: 'PowerKeeper 50.0 kWh (1 Tower / 1× SH50CX)',
    modules: 4,
    capacityKwh: 50.0,
    defaultPowerKw: 50,
    defaultInverterKw: 50,
    inverterCount: 1,
    towers: 1,
    segment: 'C&I Solo',
    dcCoupledEfficiency: 0.975,
    acGridEfficiency: 0.945,
    dodPct: 90,
    responseMs: 10
  },
  {
    id: 'pk-100',
    name: 'PowerKeeper 100.0 kWh (2 Wieże / 1× SH80CX)',
    nameEn: 'PowerKeeper 100.0 kWh (2 Towers / 1× SH80CX)',
    modules: 8,
    capacityKwh: 100.0,
    defaultPowerKw: 80,
    defaultInverterKw: 80,
    inverterCount: 1,
    towers: 2,
    segment: 'C&I Industrial',
    dcCoupledEfficiency: 0.975,
    acGridEfficiency: 0.945,
    dodPct: 90,
    responseMs: 10
  },
  {
    id: 'pk-150',
    name: 'PowerKeeper 150.0 kWh (3 Wieże / 1× SH125CX)',
    nameEn: 'PowerKeeper 150.0 kWh (3 Towers / 1× SH125CX)',
    modules: 12,
    capacityKwh: 150.0,
    defaultPowerKw: 125,
    defaultInverterKw: 125,
    inverterCount: 1,
    towers: 3,
    segment: 'Heavy C&I',
    dcCoupledEfficiency: 0.975,
    acGridEfficiency: 0.945,
    dodPct: 90,
    responseMs: 10
  },
  {
    id: 'pk-200',
    name: 'PowerKeeper 200.0 kWh (4 Wieże / 1× SH125CX)',
    nameEn: 'PowerKeeper 200.0 kWh (4 Towers / 1× SH125CX)',
    modules: 16,
    capacityKwh: 200.0,
    defaultPowerKw: 125,
    defaultInverterKw: 125,
    inverterCount: 1,
    towers: 4,
    segment: 'Heavy C&I Solo Max',
    dcCoupledEfficiency: 0.975,
    acGridEfficiency: 0.945,
    dodPct: 90,
    responseMs: 10
  },
  {
    id: 'pk-250',
    name: 'PowerKeeper 250.0 kWh (ST250CF 4w×5m / 1× SH125CX)',
    nameEn: 'PowerKeeper 250.0 kWh (ST250CF / 1× SH125CX)',
    modules: 20,
    capacityKwh: 250.0,
    defaultPowerKw: 125,
    defaultInverterKw: 125,
    inverterCount: 1,
    towers: 4,
    segment: 'ST250CF Flagship',
    dcCoupledEfficiency: 0.975,
    acGridEfficiency: 0.945,
    dodPct: 90,
    responseMs: 10
  },
  {
    id: 'pk-300',
    name: 'PowerKeeper 300.0 kWh (6 Wież / 2× SH80CX = 160 kW)',
    nameEn: 'PowerKeeper 300.0 kWh (6 Towers / 2× SH80CX = 160 kW)',
    modules: 24,
    capacityKwh: 300.0,
    defaultPowerKw: 160,
    defaultInverterKw: 80,
    inverterCount: 2,
    towers: 6,
    segment: 'Multi-Inverter 2x',
    dcCoupledEfficiency: 0.975,
    acGridEfficiency: 0.945,
    dodPct: 90,
    responseMs: 10
  },
  {
    id: 'pk-500',
    name: 'PowerKeeper 500.0 kWh (10 Wież / 2× SH125CX = 250 kW)',
    nameEn: 'PowerKeeper 500.0 kWh (10 Towers / 2× SH125CX = 250 kW)',
    modules: 40,
    capacityKwh: 500.0,
    defaultPowerKw: 250,
    defaultInverterKw: 125,
    inverterCount: 2,
    towers: 10,
    segment: 'Multi-Inverter 2x',
    dcCoupledEfficiency: 0.975,
    acGridEfficiency: 0.945,
    dodPct: 90,
    responseMs: 10
  },
  {
    id: 'pk-750',
    name: 'PowerKeeper 750.0 kWh (15 Wież / 3× SH125CX = 375 kW)',
    nameEn: 'PowerKeeper 750.0 kWh (15 Towers / 3× SH125CX = 375 kW)',
    modules: 60,
    capacityKwh: 750.0,
    defaultPowerKw: 375,
    defaultInverterKw: 125,
    inverterCount: 3,
    towers: 15,
    segment: 'Multi-Inverter 3x',
    dcCoupledEfficiency: 0.975,
    acGridEfficiency: 0.945,
    dodPct: 90,
    responseMs: 10
  },
  {
    id: 'pk-1000',
    name: 'PowerKeeper 1000.0 kWh (20 Wież / 4× SH125CX = 500 kW)',
    nameEn: 'PowerKeeper 1.0 MWh (20 Towers / 4× SH125CX = 500 kW)',
    modules: 80,
    capacityKwh: 1000.0,
    defaultPowerKw: 500,
    defaultInverterKw: 125,
    inverterCount: 4,
    towers: 20,
    segment: 'Multi-Inverter 4x Megawatt',
    dcCoupledEfficiency: 0.975,
    acGridEfficiency: 0.945,
    dodPct: 90,
    responseMs: 10
  }
];

/**
 * Rozwiązuje pełną specyfikację techniczną i kosztową magazynu PowerKeeper
 * @param {Object} params - parametry konfiguracji (bessPresetId, powerKeeperModules, itp.)
 */
export function resolveBessConfig(params = {}) {
  // Jeśli podano dedykowaną konfigurację niestandardową (np. z pliku JSON)
  if (params.customDevice && params.customDevice.nominalCapacityKwh > 0) {
    const c = params.customDevice;
    const nominalKwh = Number(c.nominalCapacityKwh);
    const dod = Number(c.dodPct || 90);
    const invKw = Number(c.inverterModelKw || 50);
    const invCount = Number(c.inverterCount || 1);
    const effPowerKw = Number(c.ratedPowerKw || (invKw * invCount));
    const capexBattery = Number(c.capexBatteryPln || (nominalKwh * 700));
    const capexInverter = Number(c.capexInverterPln || (getInverterDefaultPrice(invKw) * invCount));

    return {
      id: c.id || 'custom-bess',
      modelName: c.modelName || 'Konfiguracja Indywidualna C&I',
      moduleCapacityKwh: POWERKEEPER_MODULE_KWH,
      moduleCount: Math.round(nominalKwh / POWERKEEPER_MODULE_KWH),
      nominalCapacityKwh: nominalKwh,
      usableCapacityKwh: nominalKwh * (dod / 100),
      inverterModelKw: invKw,
      inverterCount: invCount,
      effectiveInverterKw: invKw * invCount,
      effectivePowerKw: effPowerKw,
      dodPct: dod,
      dcCoupledEfficiency: Number(c.dcCoupledEfficiency || 0.975),
      acGridEfficiency: Number(c.acGridEfficiency || 0.945),
      responseMs: Number(c.responseMs || 10),
      capexBatteryPln: capexBattery,
      capexInverterPln: capexInverter,
      totalCapexPln: capexBattery + capexInverter
    };
  }

  // Predefiniowane presety PowerKeeper
  const preset = POWERKEEPER_PRESETS.find(p => p.id === params.bessPresetId) || POWERKEEPER_PRESETS[1]; // default pk-100
  const rawModules = params.powerKeeperModules ? Number(params.powerKeeperModules) : preset.modules;
  // Wymuszenie architektury wieżowej PowerKeeper: min. 4 moduły (50 kWh)
  const moduleCount = Math.max(MIN_POWERKEEPER_TOWER_MODULES, Math.round(rawModules));
  const nominalCapacityKwh = moduleCount * POWERKEEPER_MODULE_KWH;

  const invKw = Number(params.inverterModelKw || params.inverterKw || preset.defaultInverterKw);
  const invCount = Number(params.inverterCount || preset.inverterCount);
  const effectiveInverterKw = invKw * invCount;
  const rawRequestedPowerKw = Number(params.bessPowerKw !== undefined ? params.bessPowerKw : effectiveInverterKw);
  const maxBatteryCrateKw = nominalCapacityKwh * (POWERKEEPER_HARDWARE_SPECS.MAX_CRATE_CONTINUOUS || 1.0);
  const effectivePowerKw = Math.min(rawRequestedPowerKw, effectiveInverterKw, maxBatteryCrateKw);

  const pricePerKwh = Number(params.pricePerKwhBess !== undefined ? params.pricePerKwhBess : 700);
  const capexBatteryPln = nominalCapacityKwh * pricePerKwh;
  const invUnitPrice = params.inverterPricePln !== undefined ? Number(params.inverterPricePln) : getInverterDefaultPrice(invKw);
  const capexInverterPln = invUnitPrice * invCount;
  const totalCapexPln = capexBatteryPln + capexInverterPln;

  return {
    id: preset.id,
    modelName: preset.name,
    modelNameEn: preset.nameEn,
    moduleCapacityKwh: POWERKEEPER_MODULE_KWH,
    moduleCount,
    towers: Math.ceil(moduleCount / 4),
    towersCount: Math.ceil(moduleCount / 4),
    nominalCapacityKwh,
    usableCapacityKwh: nominalCapacityKwh * (preset.dodPct / 100),
    inverterModelKw: invKw,
    inverterCount: invCount,
    effectiveInverterKw,
    effectivePowerKw,
    dodPct: preset.dodPct,
    dcCoupledEfficiency: preset.dcCoupledEfficiency,
    acGridEfficiency: preset.acGridEfficiency,
    roundTripEfficiency: params.couplingMode === 'ac' ? preset.acGridEfficiency : preset.dcCoupledEfficiency,
    responseMs: preset.responseMs,
    capexBatteryPln,
    capexInverterPln,
    totalCapexPln
  };
}

/**
 * Walidator zewnętrznego pliku JSON ze specyfikacją BESS
 * @param {string|Object} inputJson - ciąg tekstowy lub obiekt JSON
 */
export function validateCustomBessJson(inputJson) {
  let parsed;
  try {
    parsed = typeof inputJson === 'string' ? JSON.parse(inputJson) : inputJson;
  } catch (err) {
    const msg = 'Niepoprawny format JSON: ' + err.message;
    return { valid: false, error: msg, errors: [msg] };
  }

  if (!parsed || typeof parsed !== 'object') {
    const msg = 'Obiekt JSON musi zawierać definicję konfiguracji urządzenia.';
    return { valid: false, error: msg, errors: [msg] };
  }

  const nominalCapacityKwh = Number(parsed.nominalCapacityKwh);
  if (isNaN(nominalCapacityKwh) || nominalCapacityKwh <= 0) {
    const msg = 'Pole nominalCapacityKwh musi być dodatnią liczbą [kWh].';
    return { valid: false, error: msg, errors: [msg] };
  }

  const inverterKw = Number(parsed.inverterModelKw || parsed.inverterKw || 50);
  if (isNaN(inverterKw) || inverterKw <= 0) {
    const msg = 'Pole mocy falownika musi być dodatnią liczbą [kW].';
    return { valid: false, error: msg, errors: [msg] };
  }

  return {
    valid: true,
    errors: [],
    data: {
      id: parsed.id || 'custom-' + Date.now(),
      modelName: parsed.modelName || `Magazyn ${nominalCapacityKwh} kWh / ${inverterKw} kW`,
      nominalCapacityKwh,
      inverterModelKw: inverterKw,
      inverterCount: Number(parsed.inverterCount || 1),
      ratedPowerKw: Number(parsed.ratedPowerKw || inverterKw),
      dodPct: Number(parsed.dodPct || 90),
      dcCoupledEfficiency: Number(parsed.dcCoupledEfficiency || 0.975),
      acGridEfficiency: Number(parsed.acGridEfficiency || 0.945),
      roundTripEfficiency: Number(parsed.roundTripEfficiency || 0.975),
      responseMs: Number(parsed.responseMs || 10),
      capexBatteryPln: Number(parsed.capexBatteryPln || (nominalCapacityKwh * 700)),
      capexInverterPln: Number(parsed.capexInverterPln || getInverterDefaultPrice(inverterKw))
    }
  };
}
