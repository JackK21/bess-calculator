import fs from 'fs';
import path from 'path';

// Polish Public Holidays in period 2025-10-01 to 2026-09-30
const POLISH_HOLIDAYS = new Set([
  '2025-11-01', '2025-11-11', '2025-12-25', '2025-12-26',
  '2026-01-01', '2026-01-06', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-03', '2026-06-04', '2026-08-15'
]);

function getSeasonalTempC(month, day) {
  const dayOfYear = (month - 1) * 30 + day;
  return 10.5 + 13.5 * Math.sin(((dayOfYear - 105) / 365) * 2 * Math.PI);
}

function pseudoNoise(seed) {
  const x = Math.sin(seed * 9999.123) * 10000;
  return x - Math.floor(x);
}

// 1. Recalibrate Piekarnia (contracted: 90 kW)
function generatePiekarniaKw(curDate, h, m, dow, isHoliday, month, day) {
  const seed = curDate.getTime() / 60000 + h * 4 + m / 15;
  const noise = (pseudoNoise(seed) - 0.5) * 3.0;
  const isHeavyNight = dow === 6 || dow === 1;

  // Night baking window: 01:15 - 05:45
  if (h >= 1 && h <= 5) {
    if (h === 1 && m < 15) return 32 + noise;
    const baseNight = 74 + (isHeavyNight ? 6 : 0) + noise; // ~74-80 kW (< 90 kW)
    // Main cold deck oven preheat batch (02:15 - 03:00)
    if ((h === 2 && (m === 30 || m === 45)) || (h === 3 && (m === 0 || m === 15))) {
      return 120 + pseudoNoise(seed + 5) * 8; // 120 - 128 kW (exceeding 90 kW)
    }
    return baseNight;
  }

  // Midday second baking batch (11:30 - 14:15)
  if (h >= 11 && h <= 14) {
    if (h === 11 && m < 30) return 36 + noise;
    if (h === 14 && m > 15) return 38 + noise;
    const baseMidday = 64 + noise;
    if (h === 12 && (m === 30 || m === 45)) {
      return 110 + pseudoNoise(seed + 3) * 8; // 110 - 118 kW
    }
    return baseMidday;
  }

  if (h >= 6 && h < 11) return 44 + noise;
  if (h >= 15 && h < 20) return 32 + noise;
  return 22 + noise * 0.5;
}

// 2. Recalibrate Baza Logistyczna EV (contracted: 100 kW)
function generateEvKw(curDate, h, m, dow, isHoliday, month, day) {
  const isWorkday = dow >= 1 && dow <= 5 && !isHoliday;
  const isSaturday = dow === 6 && !isHoliday;
  const seed = curDate.getTime() / 60000 + h * 4 + m / 15;
  const noise = (pseudoNoise(seed) - 0.5) * 2.5;

  if (!isWorkday && !isSaturday) {
    return 20 + noise * 0.5;
  }

  if (isSaturday) {
    if (h >= 7 && h < 15) return 42 + noise;
    return 22 + noise * 0.5;
  }

  // Workday day sorting (07:00 - 16:00)
  if (h >= 7 && h < 16) {
    return 48 + noise;
  }

  // Evening Courier Fleet EV Charging Surge (16:30 - 20:30)
  if (h >= 16 && h <= 20) {
    if (h === 16 && m < 30) return 48 + noise;
    if (h === 20 && m > 30) return 35 + noise;

    // Wave 1: First van return batch (17:00 - 17:45)
    const isWave1 = (h === 17 && m >= 0 && m <= 45);
    // Wave 2: Second van return batch (18:45 - 19:30)
    const isWave2 = (h === 18 && m >= 45) || (h === 19 && m <= 30);

    if (isWave1 || isWave2) {
      return 122 + pseudoNoise(seed + 7) * 8; // 122 - 130 kW (exceeding 100 kW)
    }

    // Between waves / throttled base charging
    return 56 + noise;
  }

  return 24 + noise * 0.5;
}

// 3. Recalibrate Suszarnia (contracted: 85 kW)
function generateSuszarniaKw(curDate, h, m, dow, isHoliday, month, day) {
  const seed = curDate.getTime() / 60000 + h * 4 + m / 15;
  const noise = (pseudoNoise(seed) - 0.5) * 2.5;
  const isDryingSeason = month === 9 || month === 10 || month === 11;

  if (!isDryingSeason) {
    if (dow >= 1 && dow <= 5 && !isHoliday && h >= 7 && h <= 15) {
      return 32 + noise;
    }
    return 16 + noise * 0.5;
  }

  // Harvest / Drying Season (Sept, Oct, Nov): continuous dryers and high-power fans
  if (h >= 6 && h <= 23) {
    const harvestBase = 68 + noise;
    if (
      (h === 8 && (m === 30 || m === 45)) ||
      (h === 11 && (m === 45 || m === 0)) ||
      (h === 15 && (m === 15 || m === 30)) ||
      (h === 19 && (m === 0 || m === 15))
    ) {
      return 124 + pseudoNoise(seed + 8) * 12; // 124 - 136 kW (exceeding 85 kW)
    }
    return harvestBase;
  } else {
    return 36 + noise;
  }
}

function regenerateMatrixCsv(filename, generatorFn) {
  const filePath = path.join('public/samples', filename);
  const oldLines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
  
  // Keep first 5 metadata lines
  const headerLines = oldLines.slice(0, 5);
  const newRows = [...headerLines];

  const startDate = new Date(2025, 9, 1); // 2025-10-01

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

    for (let i = 1; i <= 96; i++) {
      const totalMinutes = i * 15;
      const h = Math.floor(totalMinutes / 60) % 24;
      const min = totalMinutes % 60;

      const kw = Number(Math.max(5, generatorFn(curDate, h, min, dow, isHoliday, m, d)).toFixed(2));
      rowVals.push(kw.toFixed(2));

      if (kw > maxDayKw) maxDayKw = kw;
      sumDayKwh += kw * 0.25;
    }

    rowVals.push(maxDayKw.toFixed(2));
    rowVals.push(sumDayKwh.toFixed(2));
    newRows.push(rowVals.join(';'));
  }

  const csvContent = '\uFEFF' + newRows.join('\r\n');
  fs.writeFileSync(filePath, csvContent, 'utf8');
  console.log(`✓ Recalibrated and updated ${filename}`);
}

console.log('--- Recalibrating 3 12-month sample CSV profiles ---');
regenerateMatrixCsv('2_OSD_TAURON_Piekarnia_Piece_12M_15min.csv', generatePiekarniaKw);
regenerateMatrixCsv('3_OSD_ENEA_Baza_Logistyczna_EV_12M_15min.csv', generateEvKw);
regenerateMatrixCsv('6_OSD_TAURON_Przetwornia_Suszarnia_12M_15min.csv', generateSuszarniaKw);
console.log('--- Recalibration complete ---');
