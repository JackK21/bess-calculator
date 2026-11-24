/**
 * PowerKeeper Analyst - Polish OSD Load Profile CSV Parser & Demo Generators
 * Grounded in: references/powerkeeper_specs.md & Polish DSOs standards (15-min / 1h)
 */

export function parseLocalizedNumber(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (raw === null || raw === undefined) return 0;
  const cleaned = String(raw)
    .replace(/PLN|zł|zl|EUR|kWh|kW|MWh|%/gi, '')
    .replace(/[\s\u00A0']/g, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

export function parseFlexibleDate(dateStr, timeStr = '00:00') {
  if (!dateStr) return null;
  let cleanDate = String(dateStr).trim();
  let cleanTime = String(timeStr || '').trim().replace(/a$/i, '');

  const tSplit = cleanDate.split(/[T\s]+/);
  if (tSplit.length > 1 && (!cleanTime || cleanTime === '00:00')) {
    cleanDate = tSplit[0];
    cleanTime = tSplit[1];
  }

  let hoursOffset = 0;
  if (cleanTime.startsWith('24:')) {
    cleanTime = '00:' + cleanTime.slice(3);
    hoursOffset = 24;
  }

  const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  const hh = timeMatch ? Number(timeMatch[1]) : 0;
  const mm = timeMatch ? Number(timeMatch[2]) : 0;

  // Format YYYY-MM-DD
  const isoMatch = cleanDate.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), hh + hoursOffset, mm, 0);
  }

  // Format DD-MM-YYYY
  const euMatch = cleanDate.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (euMatch) {
    const [, d, m, y] = euMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), hh + hoursOffset, mm, 0);
  }

  const fallback = new Date(`${cleanDate} ${cleanTime || '00:00'}`);
  return !isNaN(fallback.getTime()) ? fallback : null;
}

/**
 * Parsuje plik profilu poboru CSV (zarówno matryce 96-kolumnowe jak i format pionowy)
 */
export function parseLoadProfileCsv(dataRows) {
  if (!dataRows || !Array.isArray(dataRows) || dataRows.length === 0) {
    return { error: true, message: 'Plik CSV jest pusty lub nieprawidłowy.' };
  }

  let headerRowIndex = -1;
  let isMatrixFormat = false;
  let dataColIdx = -1;
  let timeColIdx = -1;
  let valColIdx = -1;
  let exportColIdx = -1;
  let dirColIdx = -1;
  let priceColIdx = -1;
  let timeCols = [];
  let ppeCode = '590243893032990758';
  let detectedUnit = 'auto';

  for (let i = 0; i < Math.min(15, dataRows.length); i++) {
    const row = dataRows[i];
    if (!Array.isArray(row)) continue;
    const joined = row.join(' ').toLowerCase();
    const ppeMatch = joined.match(/\b(\d{16,18}|PL\d{16,20})\b/i);
    if (ppeMatch) ppeCode = ppeMatch[1];
    if (
      joined.includes('jednostka:;kw') ||
      joined.includes('jednostka: kw') ||
      joined.includes('jednostka:[kw]') ||
      joined.includes('[kw]') ||
      joined.includes('moc [kw]') ||
      joined.includes('moc czynna')
    ) {
      if (detectedUnit === 'auto') detectedUnit = 'kw';
    } else if (
      joined.includes('jednostka:;kwh') ||
      joined.includes('jednostka: kwh') ||
      joined.includes('jednostka:[kwh]') ||
      joined.includes('[kwh]') ||
      joined.includes('energia [kwh]') ||
      joined.includes('energia czynna')
    ) {
      if (detectedUnit === 'auto') detectedUnit = 'kwh';
    }
  }

  for (let i = 0; i < Math.min(35, dataRows.length); i++) {
    const row = dataRows[i];
    if (!row || !Array.isArray(row)) continue;
    const rowLower = row.map(c => String(c ?? '').toLowerCase().trim());

    const timeColMatches = rowLower.filter(c => /^\d{1,2}:\d{2}a?$/i.test(c));
    if (timeColMatches.length >= 12) {
      headerRowIndex = i;
      isMatrixFormat = true;
      for (let c = 0; c < row.length; c++) {
        const cell = rowLower[c];
        if (cell === 'data' || cell.includes('data') || cell === 'date' || cell === 'dzień') {
          if (dataColIdx === -1) dataColIdx = c;
        } else if (cell.includes('kierunek') || cell.includes('rodzaj') || cell.includes('direction')) {
          dirColIdx = c;
        } else if (/^\d{1,2}:\d{2}a?$/i.test(cell)) {
          timeCols.push({ rawTime: cell, timeStr: cell.replace(/a$/i, ''), isDstExtra: /a$/i.test(cell), colIdx: c });
        }
      }
      if (dataColIdx === -1) dataColIdx = 0;
      break;
    }

    const rowJoined = rowLower.join('|');
    if (
      rowJoined.includes('data') ||
      rowJoined.includes('timestamp') ||
      rowJoined.includes('czas') ||
      rowJoined.includes('godzin') ||
      rowJoined.includes('datetime') ||
      rowJoined.includes('wartość') ||
      rowJoined.includes('wartosc') ||
      rowJoined.includes('pobór') ||
      rowJoined.includes('load') ||
      rowJoined.includes('power') ||
      rowJoined.includes('kwh') ||
      rowJoined.includes('kw')
    ) {
      headerRowIndex = i;
      isMatrixFormat = false;
      for (let c = 0; c < row.length; c++) {
        const cell = rowLower[c];
        if (dataColIdx === -1 && (cell.includes('data') || cell.includes('date') || cell.includes('datetime') || cell.includes('timestamp') || cell.includes('dzień') || cell.includes('dzien'))) {
          dataColIdx = c;
        } else if (timeColIdx === -1 && (cell.includes('godzin') || cell === 'czas' || cell.includes('time') || cell === 'godz')) {
          timeColIdx = c;
        } else if (valColIdx === -1 && (cell.includes('pobór') || cell.includes('pobor') || cell.includes('moc') || cell.includes('wart') || cell.includes('kwh') || cell.includes('load') || cell.includes('power') || cell.includes('zużycie') || cell.includes('zuzycie') || cell.includes('energia'))) {
          valColIdx = c;
        } else if (exportColIdx === -1 && (cell.includes('oddanie') || cell.includes('eksport') || cell.includes('pv') || cell.includes('generacja') || cell.includes('wprowadzenie'))) {
          exportColIdx = c;
        } else if (dirColIdx === -1 && (cell.includes('kierunek') || cell.includes('rodzaj') || cell.includes('direction'))) {
          dirColIdx = c;
        } else if (priceColIdx === -1 && (cell.includes('cena') || cell.includes('price') || cell.includes('rcem') || cell.includes('tge') || cell.includes('stawka'))) {
          priceColIdx = c;
        }
      }
      if (dataColIdx !== -1 && valColIdx !== -1) {
        if (rowLower[valColIdx].includes('kwh')) detectedUnit = 'kwh';
        else if (rowLower[valColIdx].includes('kw')) detectedUnit = 'kw';
        break;
      }
    }
  }

  if (headerRowIndex === -1 && dataRows[0] && dataRows[0].length >= 2) {
    const testDate = parseFlexibleDate(dataRows[0][0]);
    headerRowIndex = testDate ? -1 : 0;
    isMatrixFormat = false;
    dataColIdx = 0;
    valColIdx = 1;
  }

  if (dataColIdx === -1 && timeColIdx !== -1) {
    dataColIdx = timeColIdx;
    timeColIdx = -1;
  }

  if (dataColIdx === -1 || (!isMatrixFormat && valColIdx === -1)) {
    return { error: true, message: 'Nie udało się rozpoznać kolumn czasu i mocy/energii w pliku CSV.' };
  }

  const rawPoints = [];

  if (isMatrixFormat) {
    const activeTimeCols = timeCols.filter(tc => !tc.isDstExtra);
    const colsCount = activeTimeCols.length;
    const detectedDt = colsCount >= 90 ? 0.25 : colsCount >= 45 ? 0.5 : 1.0;

    for (let i = headerRowIndex + 1; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || !Array.isArray(row) || !row[dataColIdx]) continue;

      if (dirColIdx !== -1 && row[dirColIdx]) {
        const dir = String(row[dirColIdx]).toLowerCase();
        if (dir.includes('oddanie') || dir.includes('wprowadzona') || dir.includes('eksport')) continue;
      }

      const dayStr = String(row[dataColIdx]).trim();
      if (!/\d/.test(dayStr)) continue;

      for (const tc of activeTimeCols) {
        const rawCell = row[tc.colIdx];
        if (rawCell === undefined || rawCell === null || String(rawCell).trim() === '') continue;
        const val = parseLocalizedNumber(rawCell);
        const dtObj = parseFlexibleDate(dayStr, tc.timeStr);
        if (dtObj) {
          rawPoints.push({
            date: dtObj,
            val,
            dynamicPricePlnKwh: null,
            matrixDt: detectedDt
          });
        }
      }
    }
  } else {
    for (let i = headerRowIndex + 1; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || !Array.isArray(row) || row.length <= Math.max(dataColIdx, valColIdx)) continue;

      if (dirColIdx !== -1 && row[dirColIdx]) {
        const dir = String(row[dirColIdx]).toLowerCase();
        if (dir.includes('oddanie') || dir.includes('wprowadzona') || dir.includes('eksport')) continue;
      }

      const timeVal = timeColIdx !== -1 ? row[timeColIdx] : '';
      const dtObj = parseFlexibleDate(row[dataColIdx], timeVal);
      if (!dtObj) continue;

      const val = parseLocalizedNumber(row[valColIdx]);
      const exportKw = exportColIdx !== -1 && row[exportColIdx] !== undefined
        ? parseLocalizedNumber(row[exportColIdx])
        : 0;
      const dynPrice = priceColIdx !== -1 && row[priceColIdx] !== undefined
        ? parseLocalizedNumber(row[priceColIdx])
        : null;

      rawPoints.push({
        date: dtObj,
        val,
        exportKw,
        dynamicPricePlnKwh: dynPrice
      });
    }
  }

  if (rawPoints.length === 0) {
    return { error: true, message: 'Brak poprawnych rekordów pomiarowych po wczytaniu pliku.' };
  }

  rawPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

  let detectedDt = rawPoints[0].matrixDt || 0.25;
  if (!rawPoints[0].matrixDt && rawPoints.length > 2) {
    const diffs = [];
    for (let i = 1; i < Math.min(25, rawPoints.length); i++) {
      const h = (rawPoints[i].date.getTime() - rawPoints[i - 1].date.getTime()) / 3600000;
      if (h > 0.05 && h <= 2.0) diffs.push(h);
    }
    if (diffs.length > 0) {
      diffs.sort((a, b) => a - b);
      const median = diffs[Math.floor(diffs.length / 2)];
      if (Math.abs(median - 0.25) < 0.05) detectedDt = 0.25;
      else if (Math.abs(median - 0.5) < 0.05) detectedDt = 0.5;
      else if (Math.abs(median - 1.0) < 0.1) detectedDt = 1.0;
    }
  }

  return {
    error: false,
    ppeCode,
    detectedUnit,
    isMatrixFormat,
    detectedDt,
    totalRecords: rawPoints.length,
    startDate: rawPoints[0].date,
    endDate: rawPoints[rawPoints.length - 1].date,
    points: rawPoints
  };
}

export function generateProfilePowerKw(profileId, day, hour, minute, isWeekend) {
  const dtNoise = ((day * 13 + hour * 7 + minute) % 11) - 5;

  if (profileId === 'huta-odlewnia-megawat') {
    if (isWeekend) return 160 + Math.max(0, dtNoise * 2);
    let base = 325 + 35 * Math.sin(((hour - 5) / 18) * Math.PI) + dtNoise * 2.5;
    if (
      (hour === 8 && minute === 30) ||
      (hour === 11 && minute === 15) ||
      (hour === 15 && minute === 45) ||
      (hour === 19 && minute === 15)
    ) {
      return 560 + ((day * 7) % 25);
    }
    return Math.max(260, base);
  }

  if (profileId === 'biuro-hvac') {
    if (isWeekend) return 14 + Math.max(0, dtNoise * 0.4);
    if (hour < 7 || hour >= 19) return 15 + Math.max(0, dtNoise * 0.5);
    let kw = 54 + 12 * Math.sin(((hour - 7) / 11) * Math.PI) + dtNoise;
    if ((hour === 13 && minute === 15) || (hour === 15 && minute === 15)) {
      kw = 92 + ((day * 5) % 7);
    }
    return Math.max(12, kw);
  }

  if (profileId === 'piekarnia-piece') {
    const isSunday = day % 7 === 4;
    if (!isSunday && ((hour === 1 && minute >= 30) || (hour >= 2 && hour <= 5))) {
      if ((hour === 2 && minute === 0) || (hour === 3 && minute === 30)) {
        return 126 + ((day * 7) % 11);
      }
      return 74 + dtNoise;
    }
    if (!isSunday && hour >= 11 && hour <= 12) {
      return 78 + ((day * 3) % 8);
    }
    return 22 + Math.max(0, dtNoise * 0.8);
  }

  if (profileId === 'zaklad-wtryskarki') {
    if (isWeekend) return 24 + Math.max(0, dtNoise * 0.5);
    if (hour >= 6 && hour < 22) {
      let base = 86 + 10 * Math.sin(((hour - 6) / 16) * Math.PI) + dtNoise;
      if (
        (hour === 6 && minute === 15) ||
        (hour === 10 && minute === 30) ||
        (hour === 14 && minute === 15) ||
        (hour === 18 && minute === 45)
      ) {
        return 156 + ((day * 5) % 13);
      }
      return base;
    }
    return 28 + Math.max(0, dtNoise * 0.6);
  }

  if (profileId === 'logistyka-ev') {
    let base = isWeekend ? 22 : hour >= 7 && hour <= 16 ? 52 : 28;
    if (!isWeekend && hour >= 17 && hour <= 20) {
      if ((hour === 17 && minute === 30) || (hour === 19 && minute === 15)) {
        return 136 + ((day * 4) % 11);
      }
      return 84 + dtNoise;
    }
    return base + Math.max(0, dtNoise);
  }

  if (profileId === 'chlodnia-24h') {
    let coldBase = 52 + 20 * Math.sin(((hour - 4) / 20) * Math.PI) + dtNoise;
    if ((hour === 9 && minute === 15) || (hour === 14 && minute === 30) || (hour === 19 && minute === 0)) {
      return 116 + ((day * 3) % 9);
    }
    return Math.max(40, coldBase);
  }

  return isWeekend ? 30 : hour >= 7 && hour <= 17 ? 95 : 40;
}

export function generateDemoDataset(profileId = 'zaklad-wtryskarki', stepMinutes = 15) {
  const rows = [['Data i godzina', 'Pobór (kWh)', 'Moc średnia (kW)', 'Kierunek']];
  const dt = stepMinutes / 60;

  for (let d = 1; d <= 31; d++) {
    const dateObj = new Date(2025, 4, d);
    const dow = dateObj.getDay();
    const isWeekend = dow === 0 || dow === 6;

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += stepMinutes) {
        const kw = generateProfilePowerKw(profileId, d, h, m, isWeekend);
        const kwh = kw * dt;
        const ts = `2025-05-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        rows.push([
          ts,
          `${kwh.toFixed(3).replace('.', ',')} kWh`,
          `${kw.toFixed(2).replace('.', ',')} kW`,
          'Pobór'
        ]);
      }
    }
  }
  return rows;
}
