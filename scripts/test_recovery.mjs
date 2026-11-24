import { resolveBessConfig } from '../src/engine/bessConfig.js';
import fs from 'fs';
import Papa from 'papaparse';
import { parseLoadProfileCsv } from '../src/engine/osdParser.js';
import { generatePvProfileSeries } from '../src/engine/pvPlantEngine.js';
import { calculateOsdExceedancePenalty } from '../src/engine/tariffOsdEngine.js';

const csvContent = fs.readFileSync('./public/samples/1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv', 'utf-8');
const parsedRows = Papa.parse(csvContent, { skipEmptyLines: true }).data;
const parsed = parseLoadProfileCsv(parsedRows);
const points = parsed.points;

const { actualGenSeries } = generatePvProfileSeries(points, {
  pvMode: 'simulation_pure',
  pvCapacityKwp: 100,
  orientation: 'south',
  region: 'central'
});

const bessConfig = resolveBessConfig({
  powerKeeperModules: 8,
  inverterCount: 1,
  inverterKw: 80,
  bessPowerKw: 80
});

const len = points.length;
const dt = 0.25;
const currentCap = bessConfig.nominalCapacityKwh;
const effectivePowerKw = bessConfig.effectivePowerKw;
const contractedPowerKw = 120;
const chargeLimitKw = 80;
const minSoc = 0.10;
const dcOneWayEff = Math.sqrt(0.95);
const acGridChargeEff = 0.945;

let soc = 0.50;
let maxBefore = 0, maxAfter = 0;
const monthlyStats = new Map();

for (let i = 0; i < len; i++) {
  const pt = points[i];
  const loadKw = pt.val;
  const pvKw = actualGenSeries[i];
  const netLoadKw = loadKw - pvKw;
  const hour = pt.date.getHours();
  
  let pOutPeak = 0, pOutArb = 0, pInPv = 0, pInGrid = 0;
  let gridAfter = Math.max(0, netLoadKw);
  
  // Priority 1: Peak shaving
  if (netLoadKw > contractedPowerKw) {
    const needed = netLoadKw - contractedPowerKw;
    const maxAvail = Math.max(0, ((soc - minSoc) * currentCap * dcOneWayEff) / dt);
    pOutPeak = Math.min(needed, effectivePowerKw, maxAvail);
    gridAfter = netLoadKw - pOutPeak;
    soc -= (pOutPeak * dt) / (dcOneWayEff * currentCap);
  }
  // Priority 2: Excess PV
  else if (netLoadKw < 0) {
    const excess = Math.abs(netLoadKw);
    const space = Math.max(0, ((1.0 - soc) * currentCap) / (dt * dcOneWayEff));
    pInPv = Math.min(excess, effectivePowerKw, space);
    gridAfter = 0;
    soc += (pInPv * dt * dcOneWayEff) / currentCap;
  }
  // Priority 3: Night grid charge (00:00 - 05:00)
  else if (hour >= 0 && hour < 5 && soc < 0.90) {
    const headroom = Math.max(0, chargeLimitKw - netLoadKw);
    const space = Math.max(0, ((0.90 - soc) * currentCap) / (dt * acGridChargeEff));
    pInGrid = Math.min(headroom, effectivePowerKw, space);
    gridAfter = netLoadKw + pInGrid;
    soc += (pInGrid * dt * acGridChargeEff) / currentCap;
  }
  // Priority 3b: Buffer recovery during daytime (05:00 - 23:00) when SoC drops below 55%
  else if (soc < 0.55 && netLoadKw < chargeLimitKw * 0.90) {
    const safeCeiling = Math.min(chargeLimitKw, contractedPowerKw * 0.75); // stay well below contracted power
    const headroom = Math.max(0, safeCeiling - netLoadKw);
    const space = Math.max(0, ((0.55 - soc) * currentCap) / (dt * acGridChargeEff));
    pInGrid = Math.min(headroom, effectivePowerKw * 0.5, space);
    gridAfter = netLoadKw + pInGrid;
    soc += (pInGrid * dt * acGridChargeEff) / currentCap;
  }
  // Priority 4: Arbitrage in expensive window ONLY if soc > 0.65 (preserve peak buffer!)
  else if (hour >= 17 && hour <= 21 && soc > 0.65) {
    const avail = Math.max(0, ((soc - 0.65) * currentCap * dcOneWayEff) / dt);
    pOutArb = Math.min(netLoadKw, effectivePowerKw * 0.5, avail);
    gridAfter = netLoadKw - pOutArb;
    soc -= (pOutArb * dt) / (dcOneWayEff * currentCap);
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

console.log('WITH BUFFER RECOVERY:');
console.log('maxBefore:', maxBefore.toFixed(1), 'maxAfter:', maxAfter.toFixed(1), 'shaved:', (maxBefore - maxAfter).toFixed(1));
let penB = 0, penA = 0;
for (const [m, s] of monthlyStats) {
  const dPB = Math.max(0, s.maxOrig - 120);
  const dPA = Math.max(0, s.maxAfter - 120);
  const pB = calculateOsdExceedancePenalty(dPB, 25.4);
  const pA = calculateOsdExceedancePenalty(dPA, 25.4);
  penB += pB;
  penA += pA;
  console.log(m, 'orig:', s.maxOrig.toFixed(1), 'after:', s.maxAfter.toFixed(1), 'shaved:', (s.maxOrig - s.maxAfter).toFixed(1), 'penB:', Math.round(pB), 'penA:', Math.round(pA), 'saved:', Math.round(pB - pA));
}
console.log('Total Annual Penalties: Before =', Math.round(penB), 'After =', Math.round(penA), 'SAVINGS =', Math.round(penB - penA));
