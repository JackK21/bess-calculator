import { resolveBessConfig } from '../src/engine/bessConfig.js';
import fs from 'fs';
import Papa from 'papaparse';
import { parseLoadProfileCsv } from '../src/engine/osdParser.js';
import { generatePvProfileSeries } from '../src/engine/pvPlantEngine.js';
import { calculateOsdExceedancePenalty } from '../src/engine/tariffOsdEngine.js';
import { BUILTIN_SAMPLE_PROFILES } from '../src/engine/index.js';

function simulateProfile(profileMeta, useBufferRecovery = false) {
  const filePath = `./public/samples/${profileMeta.filename}`;
  if (!fs.existsSync(filePath)) {
    return { name: profileMeta.shortName, skipped: true };
  }
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const parsedRows = Papa.parse(csvContent, { skipEmptyLines: true }).data;
  const parsed = parseLoadProfileCsv(parsedRows);
  const points = parsed.points;
  const dt = parsed.detectedDt || 0.25;

  const { actualGenSeries, forecastGenSeries } = generatePvProfileSeries(points, {
    pvMode: 'simulation_pure',
    pvCapacityKwp: profileMeta.pvCapacityKwp,
    orientation: 'south',
    region: 'central'
  });

  const bessConfig = resolveBessConfig({
    powerKeeperModules: profileMeta.powerKeeperModules,
    inverterCount: profileMeta.inverterCount,
    inverterKw: profileMeta.inverterKw,
    bessPowerKw: profileMeta.bessPowerKw
  });

  const len = points.length;
  const currentCap = bessConfig.nominalCapacityKwh;
  const effectivePowerKw = bessConfig.effectivePowerKw;
  const contractedPowerKw = profileMeta.contractedPowerKw;
  const chargeLimitKw = profileMeta.chargeLimitKw;
  const minSoc = 0.10;
  const dcOneWayEff = Math.sqrt(0.95);
  const acGridChargeEff = 0.945;
  const peakReserveSoc = 0.25;

  let soc = 0.50;
  let maxBefore = 0, maxAfter = 0;
  const monthlyStats = new Map();

  for (let i = 0; i < len; i++) {
    const pt = points[i];
    const loadKw = pt.val;
    const pvKw = actualGenSeries[i];
    const netLoadKw = loadKw - pvKw;
    const hour = pt.date.getHours();
    const dayOfWeek = pt.date.getDay();
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isUrePeakHour = isWorkday && hour >= 7 && hour < 22;

    let pOutPeak = 0, pOutArb = 0, pInPv = 0, pInGrid = 0;
    let gridAfter = Math.max(0, netLoadKw);

    // 1. Peak shaving
    if (netLoadKw > contractedPowerKw) {
      const needed = netLoadKw - contractedPowerKw;
      const maxAvail = Math.max(0, ((soc - minSoc) * currentCap * dcOneWayEff) / dt);
      pOutPeak = Math.min(needed, effectivePowerKw, maxAvail);
      gridAfter = netLoadKw - pOutPeak;
      soc -= (pOutPeak * dt) / (dcOneWayEff * currentCap);
    }
    // 2. Excess PV
    else if (netLoadKw < 0) {
      const excess = Math.abs(netLoadKw);
      const space = Math.max(0, ((1.0 - soc) * currentCap) / (dt * dcOneWayEff));
      pInPv = Math.min(excess, effectivePowerKw, space);
      gridAfter = 0;
      soc += (pInPv * dt * dcOneWayEff) / currentCap;
    }
    // 3. Night grid charging (00:00 - 05:00)
    else if (hour >= 0 && hour < 5 && soc < 0.90) {
      const headroom = Math.max(0, chargeLimitKw - netLoadKw);
      const space = Math.max(0, ((0.90 - soc) * currentCap) / (dt * acGridChargeEff));
      pInGrid = Math.min(headroom, effectivePowerKw, space);
      gridAfter = netLoadKw + pInGrid;
      soc += (pInGrid * dt * acGridChargeEff) / currentCap;
    }
    // 3b. Daytime buffer recovery (if enabled)
    else if (useBufferRecovery && soc < 0.55 && netLoadKw < chargeLimitKw * 0.90) {
      const safeCeiling = Math.min(chargeLimitKw, contractedPowerKw * 0.75);
      const headroom = Math.max(0, safeCeiling - netLoadKw);
      const space = Math.max(0, ((0.55 - soc) * currentCap) / (dt * acGridChargeEff));
      pInGrid = Math.min(headroom, effectivePowerKw * 0.5, space);
      gridAfter = netLoadKw + pInGrid;
      soc += (pInGrid * dt * acGridChargeEff) / currentCap;
    }
    // 4. Arbitrage
    else if (!useBufferRecovery) {
      // old logic
      const isDaytimeWindow = hour >= 6 && hour < 16;
      const dynamicReserve = isDaytimeWindow ? 0.70 : peakReserveSoc;
      if (soc > dynamicReserve + 0.02 && ((hour >= 17 && hour <= 21) || isUrePeakHour || (hour >= 7 && soc > 0.80))) {
        const avail = Math.max(0, ((soc - dynamicReserve) * currentCap * dcOneWayEff) / dt);
        const maxArb = isDaytimeWindow
          ? Math.min(Math.max(0, netLoadKw - contractedPowerKw * 0.40), effectivePowerKw * 0.50, avail)
          : Math.min(netLoadKw, effectivePowerKw, avail);
        pOutArb = Math.max(0, maxArb);
        gridAfter = netLoadKw - pOutArb;
        soc -= (pOutArb * dt) / (dcOneWayEff * currentCap);
      }
    } else {
      // new logic with strict buffer protection
      const reserve = Math.max(0.60, peakReserveSoc);
      if (soc > reserve + 0.05 && (hour >= 17 && hour <= 21)) {
        const avail = Math.max(0, ((soc - reserve) * currentCap * dcOneWayEff) / dt);
        pOutArb = Math.min(netLoadKw, effectivePowerKw * 0.50, avail);
        gridAfter = netLoadKw - pOutArb;
        soc -= (pOutArb * dt) / (dcOneWayEff * currentCap);
      }
    }

    soc = Math.max(minSoc, Math.min(1.0, soc));
    if (loadKw > maxBefore) maxBefore = loadKw;
    if (gridAfter > maxAfter) maxAfter = gridAfter;

    const mKey = `${pt.date.getFullYear()}-${String(pt.date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyStats.has(mKey)) monthlyStats.set(mKey, { maxOrig: 0, maxAfter: 0 });
    const ms = monthlyStats.get(mKey);
    if (loadKw > ms.maxOrig) ms.maxOrig = loadKw;
    if (gridAfter > ms.maxAfter) ms.maxAfter = gridAfter;
  }

  let totalPenBefore = 0, totalPenAfter = 0;
  for (const [m, s] of monthlyStats) {
    const dPB = Math.max(0, s.maxOrig - contractedPowerKw);
    const dPA = Math.max(0, s.maxAfter - contractedPowerKw);
    totalPenBefore += calculateOsdExceedancePenalty(dPB, 25.4);
    totalPenAfter += calculateOsdExceedancePenalty(dPA, 25.4);
  }

  return {
    name: profileMeta.shortName,
    contracted: contractedPowerKw,
    maxBefore: Number(maxBefore.toFixed(1)),
    maxAfter: Number(maxAfter.toFixed(1)),
    shavedKw: Number((maxBefore - maxAfter).toFixed(1)),
    penBefore: Math.round(totalPenBefore),
    penAfter: Math.round(totalPenAfter),
    penSaved: Math.round(totalPenBefore - totalPenAfter)
  };
}

console.log('=== BENCHMARK ALL 7 SAMPLE PROFILES: BEFORE vs AFTER BUFFER RECOVERY ===\n');

for (const p of BUILTIN_SAMPLE_PROFILES) {
  const rOld = simulateProfile(p, false);
  const rNew = simulateProfile(p, true);
  if (rOld.skipped) {
    console.log(`[SKIP] ${p.shortName} (file missing)`);
    continue;
  }
  console.log(`Profile: ${p.shortName} (P_umowna: ${p.contractedPowerKw} kW, BESS: ${p.powerKeeperModules * 12.5} kWh / ${p.bessPowerKw} kW)`);
  console.log(`  BEFORE: Shaved = ${rOld.shavedKw} kW (Max: ${rOld.maxBefore} -> ${rOld.maxAfter} kW) | Penalty Saved = ${rOld.penSaved.toLocaleString()} PLN`);
  console.log(`  AFTER:  Shaved = ${rNew.shavedKw} kW (Max: ${rNew.maxBefore} -> ${rNew.maxAfter} kW) | Penalty Saved = ${rNew.penSaved.toLocaleString()} PLN`);
  console.log(`  GAIN:   +${(rNew.shavedKw - rOld.shavedKw).toFixed(1)} kW shaved | +${(rNew.penSaved - rOld.penSaved).toLocaleString()} PLN saved\n`);
}
