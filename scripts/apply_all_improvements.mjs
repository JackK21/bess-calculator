import fs from 'fs';

console.log('--- Applying improvements to PowerKeeper Analyst codebase ---');

// 1. excelExportEngine.js
{
  let code = fs.readFileSync('src/utils/excelExportEngine.js', 'utf8');

  // Sheet 1
  code = code.replaceAll('${m.batteryCapexPln || 0}', '${cVal(m.batteryCapexPln)}');
  code = code.replaceAll('${params.pricePerKwhBess || 700} PLN/kWh', '${Math.round((params.pricePerKwhBess || 700) * currRate)} ${currency}/kWh');
  code = code.replaceAll('${m.inverterPricePln || 0}', '${cVal(m.inverterPricePln)}');
  code = code.replaceAll('${m.totalCapexPln || 0}', '${cVal(m.totalCapexPln)}');
  code = code.replaceAll('${m.pvEstimatedCapexPln || 0}', '${cVal(m.pvEstimatedCapexPln)}');
  code = code.replaceAll('2800 PLN/kWp', '${Math.round(2800 * currRate)} ${currency}/kWp');
  code = code.replaceAll('${m.totalCombinedCapexPln || 0}', '${cVal(m.totalCombinedCapexPln)}');
  code = code.replaceAll('3. STRUKTURA PRZYCHODÓW I OSZCZĘDNOŚCI ROCZNYCH (PLN/ROK)', '3. STRUKTURA PRZYCHODÓW I OSZCZĘDNOŚCI ROCZNYCH (${currency}/ROK)');
  code = code.replaceAll('${m.annualAvoidedOsdPenaltyPln || 0}', '${cVal(m.annualAvoidedOsdPenaltyPln)}');
  code = code.replaceAll('${m.annualUreCapacityFeeSavingsPln || 0}', '${cVal(m.annualUreCapacityFeeSavingsPln)}');
  code = code.replaceAll("Przeskok z K4 do ${escapeXml(m.basketAfter || 'K1')}", "Przeskok z ${escapeXml(m.basketBefore || 'K4')} do ${escapeXml(m.basketAfter || 'K1')}");
  code = code.replaceAll('${m.annualEnergySavingsBessOnlyPln || 0}', '${cVal(m.annualEnergySavingsBessOnlyPln)}');
  code = code.replaceAll('${m.totalAnnualGridRevenuePln || 0}', '${cVal(m.totalAnnualGridRevenuePln)}');
  code = code.replaceAll(
    'DSR: ${m.annualDsrRevenuePln || 0} PLN | RM: ${m.annualCapacityMarketRevenuePln || 0} PLN | FCR: ${m.annualFcrRevenuePln || 0} PLN',
    'DSR: ${cVal(m.annualDsrRevenuePln)} ${currency} | RM: ${cVal(m.annualCapacityMarketRevenuePln)} ${currency} | FCR: ${cVal(m.annualFcrRevenuePln)} ${currency}'
  );
  code = code.replaceAll('${m.annualSavingsBessOnlyPln || 0}', '${cVal(m.annualSavingsBessOnlyPln)}');
  code = code.replaceAll('${m.npvPln || 0}', '${cVal(m.npvPln)}');
  code = code.replaceAll('${m.lcosPlnPerKwh || 0.35}', '${Number(((m.lcosPlnPerKwh || 0.35) * currRate).toFixed(3))}');
  code = code.replaceAll('PLN/kWh w horyzoncie 10 lat z O&amp;M', '${currency}/kWh w horyzoncie 10 lat z O&amp;M');

  // Sheet 2
  code = code.replaceAll('${r.penaltyBeforePln}', '${cVal(r.penaltyBeforePln)}');
  code = code.replaceAll('${r.penaltyAfterPln}', '${cVal(r.penaltyAfterPln)}');
  code = code.replaceAll('${r.penaltySavedPln}', '${cVal(r.penaltySavedPln)}');
  code = code.replaceAll('${monthlyBreakdown.reduce((s, r) => s + (r.penaltyBeforePln || 0), 0)}', '${cVal(monthlyBreakdown.reduce((s, r) => s + (r.penaltyBeforePln || 0), 0))}');
  code = code.replaceAll('${monthlyBreakdown.reduce((s, r) => s + (r.penaltyAfterPln || 0), 0)}', '${cVal(monthlyBreakdown.reduce((s, r) => s + (r.penaltyAfterPln || 0), 0))}');
  code = code.replaceAll('${monthlyBreakdown.reduce((s, r) => s + (r.penaltySavedPln || 0), 0)}', '${cVal(monthlyBreakdown.reduce((s, r) => s + (r.penaltySavedPln || 0), 0))}');

  // Sheet 3
  code = code.replaceAll('ROZLICZENIE FINANSOWE OPŁATY MOCOWEJ (PLN/ROK)', 'ROZLICZENIE FINANSOWE OPŁATY MOCOWEJ (${currency}/ROK)');
  code = code.replaceAll('${m.annualUreCapacityFeeBeforePln || 0}', '${cVal(m.annualUreCapacityFeeBeforePln)}');
  code = code.replaceAll('${m.annualUreCapacityFeeAfterPln || 0}', '${cVal(m.annualUreCapacityFeeAfterPln)}');
  code = code.replaceAll('${m.annualUreCapacityFeeSavingsPln || 0}', '${cVal(m.annualUreCapacityFeeSavingsPln)}');

  // Sheet 4
  code = code.replaceAll('${row.grossSavingsPln}', '${cVal(row.grossSavingsPln)}');
  code = code.replaceAll('-${row.omCostPln}', '-${cVal(row.omCostPln)}');
  code = code.replaceAll('${row.debtServicePln > 0 ? `-${row.debtServicePln}` : 0}', '${row.debtServicePln > 0 ? `-${cVal(row.debtServicePln)}` : 0}');
  code = code.replaceAll('${row.netCashFlowPln}', '${cVal(row.netCashFlowPln)}');
  code = code.replaceAll('${row.cumulativeCashFlowPln}', '${cVal(row.cumulativeCashFlowPln)}');

  fs.writeFileSync('src/utils/excelExportEngine.js', code, 'utf8');
  console.log('✓ excelExportEngine.js updated with multi-currency scaling and dynamic URE baskets');
}

// 2. PrintAuditReportModal.jsx
{
  let code = fs.readFileSync('src/components/PrintAuditReportModal.jsx', 'utf8');

  // Replace LaTeX formula with clean text
  code = code.replace(
    "{t('Moc Umowna OSD ($P_{umowna}$):', 'Contracted Power:')}",
    "{t('Moc Umowna OSD (P_umowna):', 'Contracted Power (P_contracted):')}"
  );

  // LCOS currency scaling
  code = code.replace(
    "<div className=\"kpi-value\">{metrics.lcosPlnPerKwh || '—'} {currency}/kWh</div>",
    "<div className=\"kpi-value\">{currency === 'EUR' ? (metrics.lcosPlnPerKwh ? (metrics.lcosPlnPerKwh / 4.25).toFixed(3) : '—') : (metrics.lcosPlnPerKwh || '—')} {currency}/kWh</div>"
  );

  fs.writeFileSync('src/components/PrintAuditReportModal.jsx', code, 'utf8');
  console.log('✓ PrintAuditReportModal.jsx updated with clean formula text and LCOS EUR conversion');
}

// 3. App.jsx fixes
{
  let code = fs.readFileSync('src/App.jsx', 'utf8');

  // Initial datasetLabel
  code = code.replace(
    "const [datasetLabel, setDatasetLabel] = useState('Profil_15min_PGE_B21.csv');",
    "const [datasetLabel, setDatasetLabel] = useState('1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv');"
  );

  // Toast in demo profile change
  code = code.replace(
    "toast.success(t(`Wczytano profil demonstracyjny: ${profile.name}`, `Loaded demo profile: ${profile.nameEn}`));",
    "toast.success(t(`Wczytano profil: ${profile.shortName || profile.name}`, `Loaded profile: ${profile.shortNameEn || profile.nameEn}`));"
  );

  // Dynamic record count in App.jsx#L1306
  code = code.replace(
    "35 040 rekordów pomiarowych",
    "${(metrics?.totalRecords || parsedProfile?.totalRecords || parsedProfile?.points?.length || 35040).toLocaleString('pl-PL')} rekordów pomiarowych"
  );

  // Weather date range sync
  const targetOldWeatherSync = `      const start = '2024-01-01';
      const end = '2024-12-31';`;
  const targetNewWeatherSync = `      const start = parsedProfile?.startDate ? parsedProfile.startDate.toISOString().slice(0, 10) : '2024-01-01';
      const end = parsedProfile?.endDate ? parsedProfile.endDate.toISOString().slice(0, 10) : '2024-12-31';`;
  if (code.includes(targetOldWeatherSync)) {
    code = code.replace(targetOldWeatherSync, targetNewWeatherSync);
  }

  fs.writeFileSync('src/App.jsx', code, 'utf8');
  console.log('✓ App.jsx updated with proper initial label, shortName toast, dynamic record count, and weather sync');
}

console.log('--- All codebase improvements applied successfully ---');
