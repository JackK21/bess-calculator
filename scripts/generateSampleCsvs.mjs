// scripts/generateSampleCsvs.mjs
import fs from 'fs';
import path from 'path';
import {
  BUILTIN_SAMPLE_PROFILES,
  generateDemoDataset,
  parseLoadProfileCsv,
  runPowerKeeperSimulation
} from '../src/utils/simulationEngine.js';

const publicSamplesDir = path.resolve('public/samples');
const downloadsSamplesDir = path.resolve('C:/Users/jacek/Downloads/Przykladowe_Profile_15min_PowerKeeper');

fs.mkdirSync(publicSamplesDir, { recursive: true });
fs.mkdirSync(downloadsSamplesDir, { recursive: true });

const results = [];

for (const profMeta of BUILTIN_SAMPLE_PROFILES) {
  const rows = generateDemoDataset(profMeta.id, 15);
  const csvContent = rows
    .map((r, idx) => (idx === 0 ? r.join(',') : `${r[0]},"${r[1]}","${r[2]}",${r[3]}`))
    .join('\n');

  const pubPath = path.join(publicSamplesDir, profMeta.filename);
  const dlPath = path.join(downloadsSamplesDir, profMeta.filename);

  fs.writeFileSync(pubPath, csvContent, 'utf8');
  fs.writeFileSync(dlPath, csvContent, 'utf8');

  const parsed = parseLoadProfileCsv(rows);
  const sim = runPowerKeeperSimulation(parsed, {
    enableBess: true,
    powerKeeperModules: profMeta.powerKeeperModules,
    bessPowerKw: profMeta.bessPowerKw,
    pvCapacityKwp: profMeta.pvCapacityKwp,
    pvRegion: 'central',
    contractedPowerKw: profMeta.contractedPowerKw,
    chargeLimitKw: profMeta.chargeLimitKw,
    osdNetworkRatePlnKwMonth: 25.0,
    tariffMode: 'tou',
    priceKwhNight: 0.52,
    priceKwhDay: 0.85,
    priceKwhPeak: 1.28,
    pricePerKwhBess: 2100.0,
    inputUnitMode: 'auto'
  });

  results.push({
    filename: profMeta.filename,
    title: profMeta.title,
    records: parsed.totalRecords,
    contractedPowerKw: profMeta.contractedPowerKw,
    maxKwBefore: sim.metrics.maxKwBefore,
    maxKwAfter: sim.metrics.maxKwAfter,
    powerShavedKw: sim.metrics.powerShavedKw,
    bessConfig: `${sim.metrics.nominalBessCapacityKwh} kWh (${sim.metrics.powerKeeperModules}x12.5 kWh) / ${profMeta.bessPowerKw} kW`,
    pvKwp: profMeta.pvCapacityKwp,
    avoidedPenaltyPln: sim.metrics.annualAvoidedOsdPenaltyPln,
    peakSavingsPln: sim.metrics.annualPeakShavingSavingsPln,
    energySavingsPln: sim.metrics.annualEnergySavingsTotalWithPvPln,
    dcBonusPln: sim.metrics.annualDcCoupledBonusPln,
    totalSavingsPln: sim.metrics.annualTotalSavingsPln,
    capexPln: sim.metrics.totalCapexPln,
    roiYears: sim.metrics.roiYears,
    selfSufficiencyPct: sim.metrics.selfSufficiencyPct
  });
}

console.log(JSON.stringify(results, null, 2));
