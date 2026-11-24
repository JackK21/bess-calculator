// scripts/generate_12m_osd_reports.mjs
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { parseLoadProfileCsv, runPowerKeeperSimulation } from '../src/utils/simulationEngine.js';

const publicSamplesDir = path.resolve('public/samples');
const distSamplesDir = path.resolve('dist/samples');
const downloadsDir = path.resolve('C:/Users/jacek/Downloads/Raporty_OSD_15min_12_Miesiecy');

fs.mkdirSync(publicSamplesDir, { recursive: true });
fs.mkdirSync(distSamplesDir, { recursive: true });
fs.mkdirSync(downloadsDir, { recursive: true });

// Polish Public Holidays in period 2025-10-01 to 2026-09-30
const POLISH_HOLIDAYS = new Set([
  '2025-11-01', // Wszystkich Świętych
  '2025-11-11', // Niepodległości
  '2025-12-25', // Boże Narodzenie 1
  '2025-12-26', // Boże Narodzenie 2
  '2026-01-01', // Nowy Rok
  '2026-01-06', // Trzech Króli
  '2026-04-05', // Wielkanoc
  '2026-04-06', // Poniedziałek Wielkanocny
  '2026-05-01', // Święto Pracy
  '2026-05-03', // Święto Konstytucji
  '2026-06-04', // Boże Ciało
  '2026-08-15'  // Wniebowzięcie NMP
]);

// Helper for seasonal temperature approximation in Poland
function getSeasonalTempC(month, day) {
  const dayOfYear = (month - 1) * 30 + day;
  const temp = 10.5 + 13.5 * Math.sin(((dayOfYear - 105) / 365) * 2 * Math.PI);
  return temp;
}

// Pseudo-random deterministic noise with seed
function pseudoNoise(seed) {
  const x = Math.sin(seed * 9999.123) * 10000;
  return x - Math.floor(x);
}

// 6 Realistic Presentation Scenarios
const SCENARIOS = [
  {
    id: 'wtryskarki-tworzyw',
    filename: '1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv',
    shortName: '🏭 Wtryskarki Tworzyw (PGE)',
    ppeCode: '590243893032990758',
    osdName: 'PGE Dystrybucja S.A.',
    clientName: 'PLAST-POL Sp. z o.o. - Zakład Przetwórstwa Tworzyw Sztucznych',
    address: 'ul. Fabryczna 12, 97-400 Bełchatów',
    tariff: 'B21',
    contractedPowerKw: 120,
    chargeLimitKw: 80,
    pvCapacityKwp: 100,
    powerKeeperModules: 8, // 100 kWh
    bessPowerKw: 60,
    description: 'Wtryskarki hydrauliczne + kompresorownia: 2 zmiany, ostre 15-min szczyty rozruchowe i docisku form do 172 kW przekraczające moc umowną 120 kW.',
    generateKw: (curDate, h, m, dow, isHoliday, month, day) => {
      const isWorkday = dow >= 1 && dow <= 5 && !isHoliday;
      const isSaturday = dow === 6 && !isHoliday;
      const seed = curDate.getTime() / 60000 + h * 4 + m / 15;
      const noise = (pseudoNoise(seed) - 0.5) * 4.0;

      if (!isWorkday && !isSaturday) {
        // Sunday / Holiday: idle state (chillers for tool maintenance, standby hydraulics, lighting)
        return Math.max(18, 24 + noise * 0.5);
      }

      if (isSaturday) {
        // Saturday: 1 shift maintenance & light production 06:00 - 14:00
        if (h >= 6 && h < 14) {
          let base = 58 + noise;
          if ((h === 8 && m === 30) || (h === 11 && m === 15)) {
            base = 115 + pseudoNoise(seed + 1) * 15;
          }
          return base;
        }
        return 22 + noise * 0.5;
      }

      // Workday (2 shifts: 06:00 - 22:00)
      if (h < 5 || h >= 22) {
        return 26 + noise * 0.5;
      }

      // Production hours base
      let base = 88 + noise;
      const tempC = getSeasonalTempC(month, day);
      if (tempC > 22 && h >= 10 && h <= 17) {
        base += Math.min(18, (tempC - 20) * 2.2);
      }

      // Cyclic hydraulic clamp spikes and compressor recharges
      const isSpike1 = (h === 7 && m === 30) || (h === 8 && m === 0);
      const isSpike2 = (h === 11 && m === 15) || (h === 11 && m === 45);
      const isSpike3 = (h === 14 && m === 30) || (h === 15 && m === 15);
      const isSpike4 = (h === 18 && m === 45) || (h === 19 && m === 30);

      if (isSpike1 || isSpike2 || isSpike3 || isSpike4) {
        return 154 + pseudoNoise(seed + 2) * 18; // 154 - 172 kW (exceeding 120 kW)
      }

      return base;
    }
  },
  {
    id: 'piekarnia-piece',
    filename: '2_OSD_TAURON_Piekarnia_Piece_12M_15min.csv',
    shortName: '🥐 Piekarnia Piece (TAURON)',
    ppeCode: '590123847291028374',
    osdName: 'TAURON Dystrybucja S.A.',
    clientName: 'Piekarnia Rzemieślniczo-Przemysłowa "KŁOS" Sp. j.',
    address: 'ul. Piekarska 8, 41-200 Sosnowiec',
    tariff: 'B23',
    contractedPowerKw: 90,
    chargeLimitKw: 65,
    pvCapacityKwp: 65,
    powerKeeperModules: 8, // 100 kWh
    bessPowerKw: 50,
    description: 'Nocne wypieki pieców elektrycznych (01:15–05:45) z uderzeniami mocy do 142 kW ponad moc umowną 90 kW oraz wypiek popołudniowy.',
    generateKw: (curDate, h, m, dow, isHoliday, month, day) => {
      const seed = curDate.getTime() / 60000 + h * 4 + m / 15;
      const noise = (pseudoNoise(seed) - 0.5) * 3.5;
      const isHeavyNight = dow === 6 || dow === 1;

      // Night baking window: 01:15 - 05:45
      if (h >= 1 && h <= 5) {
        if (h === 1 && m < 15) return 35 + noise;
        let baseNight = 88 + (isHeavyNight ? 15 : 0) + noise;
        // Batch oven heating spikes
        if (
          (h === 2 && m === 15) ||
          (h === 3 && m === 30) ||
          (h === 4 && m === 45)
        ) {
          return 126 + (isHeavyNight ? 10 : 0) + pseudoNoise(seed + 5) * 14; // 126 - 148 kW (exceeding 90 kW)
        }
        return baseNight;
      }

      // Midday second baking batch (11:30 - 14:15)
      if (h >= 11 && h <= 14) {
        if (h === 11 && m < 30) return 40 + noise;
        if (h === 14 && m > 15) return 42 + noise;
        let baseMidday = 76 + noise;
        if (h === 12 && m === 30) {
          return 112 + pseudoNoise(seed + 3) * 14; // 112 - 126 kW
        }
        return baseMidday;
      }

      // Rest of day: dough mixers, proofing chambers, refrigeration, packing
      if (h >= 6 && h < 11) return 48 + noise;
      if (h >= 15 && h < 20) return 36 + noise;
      return 24 + noise * 0.5;
    }
  },
  {
    id: 'baza-logistyczna-ev',
    filename: '3_OSD_ENEA_Baza_Logistyczna_EV_12M_15min.csv',
    shortName: '🚚 Baza Logistyczna EV (ENEA)',
    ppeCode: '590748291038472019',
    osdName: 'ENEA Operator Sp. z o.o.',
    clientName: 'PRO-LOGISTICS S.A. - Regionalny Hub Przeładunkowy Kurierów',
    address: 'ul. Magazynowa 4, 62-080 Tarnowo Podgórne',
    tariff: 'B21',
    contractedPowerKw: 100,
    chargeLimitKw: 70,
    pvCapacityKwp: 80,
    powerKeeperModules: 8, // 100 kWh
    bessPowerKw: 55,
    description: 'Popołudniowo-wieczorny powrót floty vanów kurierskich EV i jednoczesne ładowanie DC (16:30–20:30) do 158 kW w szczycie taryfowym B21.',
    generateKw: (curDate, h, m, dow, isHoliday, month, day) => {
      const isWorkday = dow >= 1 && dow <= 5 && !isHoliday;
      const isSaturday = dow === 6 && !isHoliday;
      const seed = curDate.getTime() / 60000 + h * 4 + m / 15;
      const noise = (pseudoNoise(seed) - 0.5) * 3.0;

      if (!isWorkday && !isSaturday) {
        return 22 + noise * 0.5;
      }

      if (isSaturday) {
        if (h >= 7 && h < 15) return 46 + noise;
        return 24 + noise * 0.5;
      }

      // Workday day sorting (07:00 - 16:00)
      if (h >= 7 && h < 16) {
        return 52 + noise;
      }

      // Evening Courier Fleet EV Charging Surge (16:30 - 20:30)
      if (h >= 16 && h <= 20) {
        if (h === 16 && m < 30) return 55 + noise;
        if (h === 20 && m > 30) return 50 + noise;

        const tempC = getSeasonalTempC(month, day);
        const winterEvFactor = tempC < 5 ? 1.15 : 1.0;
        let surge = (136 + pseudoNoise(seed + 7) * 16) * winterEvFactor;
        if ((h === 17 && m === 15) || (h === 18 && m === 45)) {
          surge = Math.min(168, surge + 14); // up to 168 kW (exceeding 100 kW)
        }
        return surge;
      }

      return 26 + noise * 0.5;
    }
  },
  {
    id: 'chlodnia-mroznia-24h',
    filename: '4_OSD_ENERGA_Chlodnia_Mroznia_12M_15min.csv',
    shortName: '❄️ Chłodnia Mroźnia 24/7 (ENERGA)',
    ppeCode: '590928374615283940',
    osdName: 'ENERGA-OPERATOR SA',
    clientName: 'FROST-LOG Sp. z o.o. - Chłodnia Składowa i Mroźnia Głęboka',
    address: 'ul. Portowa 25, 81-340 Gdynia',
    tariff: 'B21',
    contractedPowerKw: 95,
    chargeLimitKw: 70,
    pvCapacityKwp: 90,
    powerKeeperModules: 4, // 50 kWh
    bessPowerKw: 35,
    description: 'Całodobowa praca sprężarek chłodniczych + cykliczne impulsy odszraniania parowników co 4-5h do 128 kW ponad moc umowną 95 kW.',
    generateKw: (curDate, h, m, dow, isHoliday, month, day) => {
      const seed = curDate.getTime() / 60000 + h * 4 + m / 15;
      const noise = (pseudoNoise(seed) - 0.5) * 3.0;
      const tempC = getSeasonalTempC(month, day);

      let baseLoad = 50 + Math.max(0, (tempC + 5) * 1.3) + noise;

      // Defrost pulse every 4-5 hours
      const isDefrost =
        (h === 2 && m === 30) ||
        (h === 7 && m === 15) ||
        (h === 12 && m === 0) ||
        (h === 16 && m === 45) ||
        (h === 21 && m === 30);

      if (isDefrost) {
        return 118 + pseudoNoise(seed + 9) * 11; // 118 - 129 kW (exceeding 95 kW)
      }

      return baseLoad;
    }
  },
  {
    id: 'biurowiec-hvac',
    filename: '5_OSD_PGE_Biurowiec_HVAC_12M_15min.csv',
    shortName: '🏢 Biurowiec HVAC (PGE)',
    ppeCode: '590837261548291034',
    osdName: 'PGE Dystrybucja S.A.',
    clientName: 'NEXUS OFFICE PARK - Budynek Biurowy Klasy A',
    address: 'ul. Wołoska 24, 02-675 Warszawa',
    tariff: 'C21',
    contractedPowerKw: 75,
    chargeLimitKw: 50,
    pvCapacityKwp: 50,
    powerKeeperModules: 4, // 50 kWh
    bessPowerKw: 25,
    description: 'Biurowiec IT: serwerownia 20 kW 24/7, letnie upały i agregaty wody lodowej HVAC do 102 kW ponad moc umowną 75 kW.',
    generateKw: (curDate, h, m, dow, isHoliday, month, day) => {
      const isWorkday = dow >= 1 && dow <= 5 && !isHoliday;
      const seed = curDate.getTime() / 60000 + h * 4 + m / 15;
      const noise = (pseudoNoise(seed) - 0.5) * 2.5;

      if (!isWorkday) {
        return 20 + noise * 0.4;
      }

      if (h < 7 || h >= 19) {
        return 22 + noise * 0.5;
      }

      let load = 50 + noise;

      // Seasonality: Chiller HVAC in Summer (Jun-Aug)
      const tempC = getSeasonalTempC(month, day);
      if (tempC > 24 && h >= 11 && h <= 16) {
        const chillerLoad = (tempC - 20) * 3.5;
        load += chillerLoad;
        if ((h === 13 && m === 30) || (h === 14 && m === 45)) {
          load = Math.max(load, 94 + pseudoNoise(seed + 4) * 9); // 94 - 103 kW (exceeding 75 kW)
        }
      }

      // Winter morning ventilation pre-heat on freezing mornings
      if (tempC < 0 && h >= 7 && h <= 8) {
        load += 25 + pseudoNoise(seed + 6) * 10;
      }

      return load;
    }
  },
  {
    id: 'przetwornia-suszarnia',
    filename: '6_OSD_TAURON_Przetwornia_Suszarnia_12M_15min.csv',
    shortName: '🌾 Przetwórnia & Suszarnia Zbóż (TAURON)',
    ppeCode: '590482910384726152',
    osdName: 'TAURON Dystrybucja S.A.',
    clientName: 'AGRO-PLON Sp. z o.o. - Suszarnia Zbóż i Przetwórnia Warzyw',
    address: 'ul. Rolnicza 3, 49-300 Brzeg',
    tariff: 'C21',
    contractedPowerKw: 85,
    chargeLimitKw: 60,
    pvCapacityKwp: 75,
    powerKeeperModules: 8, // 100 kWh
    bessPowerKw: 55,
    description: 'Skrajna sezonowość agro: 9 m-cy mały pobór (20 kW), jesień (wrzesień-listopad) suszenie zbóż i kukurydzy do 136 kW ponad moc umowną 85 kW.',
    generateKw: (curDate, h, m, dow, isHoliday, month, day) => {
      const seed = curDate.getTime() / 60000 + h * 4 + m / 15;
      const noise = (pseudoNoise(seed) - 0.5) * 3.0;

      const isDryingSeason = month === 9 || month === 10 || month === 11;

      if (!isDryingSeason) {
        if (dow >= 1 && dow <= 5 && !isHoliday && h >= 7 && h <= 15) {
          return 36 + noise;
        }
        return 18 + noise * 0.5;
      }

      // Harvest / Drying Season (Sept, Oct, Nov): continuous dryers and high-power fans
      let harvestBase = 92 + noise;
      if (h >= 6 && h <= 23) {
        harvestBase = 110 + noise;
        if (
          (h === 8 && m === 30) ||
          (h === 11 && m === 45) ||
          (h === 15 && m === 15) ||
          (h === 19 && m === 0)
        ) {
          return 126 + pseudoNoise(seed + 8) * 11; // 126 - 137 kW (exceeding 85 kW)
        }
      } else {
        harvestBase = 72 + noise;
      }

      return harvestBase;
    }
  }
];

console.log('Generating 6 authentic 12-month OSD 15-minute reports (365 days, 35,040 intervals each)...');

const auditResults = [];

for (const sc of SCENARIOS) {
  const lines = [];

  // Authentic Polish DSO Matrix Headers
  lines.push(`Punkt Poboru Energii (PPE):;${sc.ppeCode};Grupa taryfowa:;${sc.tariff};Moc umowna [kW]:;${sc.contractedPowerKw};OSD:;${sc.osdName}`);
  lines.push(`Nazwa odbiorcy:;${sc.clientName};Adres PPE:;${sc.address}`);
  lines.push(`Okres rozliczeniowy:;2025-10-01 - 2026-09-30;Interwał:;15 minut;Jednostka:;kW`);
  lines.push(`Opis profilu:;${sc.description}`);

  // Header row with 96 time intervals: 00:15 ... 24:00
  const timeHeader = ['Data'];
  for (let i = 1; i <= 96; i++) {
    const totalMinutes = i * 15;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    timeHeader.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  timeHeader.push('Maksimum_dnia [kW]');
  timeHeader.push('Suma_dnia [kWh]');
  lines.push(timeHeader.join(';'));

  // Generate 365 Days: 2025-10-01 to 2026-09-30
  const startDate = new Date(2025, 9, 1);

  for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
    const curDate = new Date(startDate.getTime() + dayOffset * 86400000);
    const y = curDate.getFullYear();
    const m = curDate.getMonth() + 1;
    const d = curDate.getDate();
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dow = curDate.getDay();
    const isHoliday = POLISH_HOLIDAYS.has(dateStr);

    const rowVals = [dateStr];
    let maxDayKw = 0;
    let sumDayKwh = 0;

    for (let interval = 1; interval <= 96; interval++) {
      const intervalMinutes = (interval - 1) * 15;
      const h = Math.floor(intervalMinutes / 60);
      const minute = intervalMinutes % 60;

      const kw = sc.generateKw(curDate, h, minute, dow, isHoliday, m, d);
      const roundedKw = Math.max(5, Number(kw.toFixed(2)));

      if (roundedKw > maxDayKw) maxDayKw = roundedKw;
      sumDayKwh += roundedKw * 0.25;

      rowVals.push(roundedKw.toFixed(2));
    }

    rowVals.push(maxDayKw.toFixed(2));
    rowVals.push(sumDayKwh.toFixed(2));
    lines.push(rowVals.join(';'));
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');

  // Save to public, dist, and user Downloads
  const pubFile = path.join(publicSamplesDir, sc.filename);
  const distFile = path.join(distSamplesDir, sc.filename);
  const dlFile = path.join(downloadsDir, sc.filename);

  fs.writeFileSync(pubFile, csvContent, 'utf8');
  fs.writeFileSync(distFile, csvContent, 'utf8');
  fs.writeFileSync(dlFile, csvContent, 'utf8');

  // Verify and simulate immediately with simulationEngine
  const papaRes = Papa.parse(csvContent, { skipEmptyLines: true });
  const parsed = parseLoadProfileCsv(papaRes.data);

  const sim = runPowerKeeperSimulation(parsed, {
    enableBess: true,
    powerKeeperModules: sc.powerKeeperModules,
    bessPowerKw: sc.bessPowerKw,
    pvCapacityKwp: sc.pvCapacityKwp,
    pvRegion: 'central',
    contractedPowerKw: sc.contractedPowerKw,
    chargeLimitKw: sc.chargeLimitKw,
    osdNetworkRatePlnKwMonth: 25.0,
    ureCapacityFeeBasePlnKwh: 0.2194,
    tariffMode: 'tou',
    priceKwhNight: 0.52,
    priceKwhDay: 0.85,
    priceKwhPeak: 1.28,
    pricePerKwhBess: 2100.0,
    inputUnitMode: 'auto'
  });

  auditResults.push({
    id: sc.id,
    filename: sc.filename,
    osdName: sc.osdName,
    tariff: sc.tariff,
    contractedPowerKw: sc.contractedPowerKw,
    totalRecords: parsed.totalRecords,
    daysSpan: sim.metrics.datasetSpanDays,
    maxKwBefore: sim.metrics.maxKwBefore,
    maxKwAfter: sim.metrics.maxKwAfter,
    powerShavedKw: sim.metrics.powerShavedKw,
    bessCapacityKwh: sim.metrics.nominalBessCapacityKwh,
    bessModules: sim.metrics.powerKeeperModules,
    bessPowerKw: sim.metrics.effectiveBessPowerKw,
    annualAvoidedOsdPenaltyPln: Math.round(sim.metrics.annualAvoidedOsdPenaltyPln),
    annualPeakShavingSavingsPln: Math.round(sim.metrics.annualPeakShavingSavingsPln),
    annualEnergySavingsTotalWithPvPln: Math.round(sim.metrics.annualEnergySavingsTotalWithPvPln),
    annualUreCapacityFeeSavingsPln: Math.round(sim.metrics.annualUreCapacityFeeSavingsPln),
    annualTotalSavingsPln: Math.round(sim.metrics.annualTotalSavingsPln),
    totalCapexPln: Math.round(sim.metrics.totalCapexPln),
    roiYears: sim.metrics.roiYears,
    basketBefore: sim.metrics.basketBefore,
    basketAfter: sim.metrics.basketAfter
  });
}

console.log('AUDIT VERIFICATION SUMMARY:');
console.table(auditResults);
fs.writeFileSync(
  path.join(downloadsDir, '00_PODSUMOWANIE_AUDYTOW_SCENARIUSZY_OSD.json'),
  JSON.stringify(auditResults, null, 2),
  'utf8'
);
