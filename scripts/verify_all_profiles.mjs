import fs from 'fs';
import path from 'path';
import { parseLoadProfileCsv } from '../src/engine/osdParser.js';
import { runPowerKeeperSimulation, BUILTIN_SAMPLE_PROFILES } from '../src/engine/index.js';

console.log('=== VERIFYING ALL 7 12-MONTH OSD SAMPLE PROFILES ===\n');

const results = [];

for (const demo of BUILTIN_SAMPLE_PROFILES) {
  const filePath = path.join('public/samples', demo.filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File missing: ${filePath}`);
    continue;
  }

  const rawCsv = fs.readFileSync(filePath, 'utf8');
  // Simple CSV parser for semicolon delimited matrices
  const rows = rawCsv
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(line => line.split(';'));

  const parsed = parseLoadProfileCsv(rows);
  if (parsed.error) {
    console.error(`Failed parsing ${demo.filename}: ${parsed.message}`);
    continue;
  }

  const sim = runPowerKeeperSimulation(parsed, {
    enableBess: true,
    enablePeakShaving: true,
    enableArbitrage: true,
    contractedPowerKw: demo.contractedPowerKw,
    chargeLimitKw: demo.chargeLimitKw,
    pvCapacityKwp: demo.pvCapacityKwp,
    powerKeeperModules: demo.powerKeeperModules,
    inverterCount: demo.inverterCount || 1,
    inverterKw: demo.inverterKw,
    inverterModelKw: demo.inverterKw,
    bessPowerKw: demo.bessPowerKw
  });

  const m = sim.metrics;
  const hasNaN = Object.entries(m).some(([k, v]) => typeof v === 'number' && isNaN(v));

  results.push({
    profile: demo.shortName,
    filename: demo.filename,
    records: parsed.totalRecords,
    contracted: m.contractedPowerKw,
    maxBefore: m.maxKwBefore,
    maxAfter: m.maxKwAfter,
    shavedKw: m.powerShavedKw,
    deltaPBefore: m.deltaPBeforeKw,
    deltaPAfter: m.deltaPAfterKw,
    penaltyBefore: m.annualOsdPenaltiesBeforePln,
    penaltyAfter: m.annualOsdPenaltiesAfterPln,
    avoidedPenalty: m.annualAvoidedOsdPenaltyPln,
    totalSavings: m.annualTotalSavingsPln,
    roiYears: m.roiYears,
    loadMwh: (m.totalLoadKwh / 1000).toFixed(1),
    selfSufficiency: `${m.selfSufficiencyPct}%`,
    hasNaN
  });
}

console.table(results, [
  'profile',
  'contracted',
  'maxBefore',
  'maxAfter',
  'shavedKw',
  'deltaPBefore',
  'deltaPAfter',
  'penaltyBefore',
  'penaltyAfter',
  'roiYears',
  'hasNaN'
]);

console.log('\n--- DETAILED SUMMARY ---');
for (const r of results) {
  console.log(`${r.profile}:`);
  console.log(`  Moc umowna: ${r.contracted} kW | Pik przed: ${r.maxBefore} kW -> po: ${r.maxAfter} kW (zgolono: ${r.shavedKw} kW)`);
  console.log(`  Kary OSD przed: ${r.penaltyBefore} PLN -> po: ${r.penaltyAfter} PLN (uniknięto: ${r.avoidedPenalty} PLN)`);
  console.log(`  Oszczędności roczne: ${r.totalSavings} PLN | ROI: ${r.roiYears} lat | Zużycie: ${r.loadMwh} MWh | Self-suff: ${r.selfSufficiency}`);
  console.log(`  Weryfikacja NaN: ${r.hasNaN ? '❌ WYKRYTO NaN!' : '✅ Brak NaN'}\n`);
}
