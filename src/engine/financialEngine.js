/**
 * PowerKeeper Analyst - Financial & Bankability Engine (Moduł 5)
 * Grounded in: PLAN_ROZBUDOWY_SILNIKA_OBLICZENIOWEGO.md & references/powerkeeper_specs.md
 * 
 * Odpowiada za:
 * 1. Niezależne wskaźniki ROI:
 *    - BESS-Only ROI: CAPEX_BESS / Oszczędności_BESS (zabezpieczenie: min. 1.0 rok)
 *    - Combined ROI: (CAPEX_BESS + CAPEX_PV) / Oszczędności_Łączne (min. 1.0 rok)
 *    - PV-Only ROI: CAPEX_PV / Oszczędności_PV
 * 2. Wskaźnik LCOS (Levelized Cost of Storage [PLN/kWh]) z degradacją i sprawnością
 * 3. 10-letni dynamiczny model Cash Flow (NPV, IRR, raty annuitetowe, eskalacja cen, koszty O&M)
 */

export function calculateFinancialMetrics({
  bessCapexPln = 0,
  pvCapexPln = 0,
  annualSavingsBessOnlyPln = 0,
  annualSavingsPvOnlyPln = 0,
  annualSavingsCombinedPln = 0,
  annualDischargeKwh = 0,
  discountRatePct = 6.0,
  projectLifetimeYears = 10,
  annualDegradationPct = 1.8,
  omRatePct = 1.0,               // Koszt O&M jako 1.0% CAPEX rocznie
  energyEscalationPct = 3.5,     // Eskalacja cen energii
  cpiInflationPct = 2.5,         // Inflacja kosztów operacyjnych
  enableFinancing = false,
  loanSharePct = 80,             // 80% finansowania długiem
  loanInterestRatePct = 7.5,     // Stopa odsetkowa kredytu
  loanTermYears = 7              // Okres spłaty
}) {
  const totalCombinedCapexPln = bessCapexPln + pvCapexPln;

  // 1. Ochrona Wiarygodności: Żadne ROI nie może zejść poniżej 1.0 roku
  const rawRoiBess = (bessCapexPln > 0 && annualSavingsBessOnlyPln > 0)
    ? bessCapexPln / annualSavingsBessOnlyPln
    : 0;
  const roiBessYears = rawRoiBess > 0 ? Math.max(1.0, Number(rawRoiBess.toFixed(1))) : 0;

  const rawRoiCombined = (totalCombinedCapexPln > 0 && annualSavingsCombinedPln > 0)
    ? totalCombinedCapexPln / annualSavingsCombinedPln
    : 0;
  const roiCombinedYears = rawRoiCombined > 0 ? Math.max(1.0, Number(rawRoiCombined.toFixed(1))) : 0;

  const rawRoiPv = (pvCapexPln > 0 && annualSavingsPvOnlyPln > 0)
    ? pvCapexPln / annualSavingsPvOnlyPln
    : 0;
  const roiPvYears = rawRoiPv > 0 ? Math.max(1.0, Number(rawRoiPv.toFixed(1))) : 0;

  // 2. LCOS (Levelized Cost of Storage)
  let discountedTotalCostPln = bessCapexPln;
  let discountedTotalEnergyKwh = 0;
  const r = discountRatePct / 100;

  for (let yr = 1; yr <= projectLifetimeYears; yr++) {
    const discountFactor = Math.pow(1 + r, yr);
    const degradedEnergy = annualDischargeKwh * Math.pow(1 - annualDegradationPct / 100, yr - 1);
    const annualOmCost = (bessCapexPln * (omRatePct / 100)) * Math.pow(1 + cpiInflationPct / 100, yr - 1);

    discountedTotalCostPln += annualOmCost / discountFactor;
    discountedTotalEnergyKwh += degradedEnergy / discountFactor;
  }

  const lcosPlnPerKwh = discountedTotalEnergyKwh > 0
    ? Number((discountedTotalCostPln / discountedTotalEnergyKwh).toFixed(3))
    : 0;

  // 3. Rata kredytu (annuitet dla BESS)
  let annualDebtServicePln = 0;
  const targetCapexPln = bessCapexPln;
  const principalPln = enableFinancing ? targetCapexPln * (loanSharePct / 100) : 0;
  const equityCapexPln = targetCapexPln - principalPln;

  if (enableFinancing && principalPln > 0 && loanTermYears > 0) {
    const ir = loanInterestRatePct / 100;
    annualDebtServicePln = ir === 0
      ? principalPln / loanTermYears
      : (principalPln * ir) / (1 - Math.pow(1 + ir, -loanTermYears));
  }

  // 4. Model 10-letniego Cash Flow
  const cashFlowTimeline = [];
  let cumulativeCashFlowPln = -equityCapexPln;
  let discountedCumulativeCashFlowPln = -equityCapexPln;

  for (let yr = 1; yr <= projectLifetimeYears; yr++) {
    const degFactor = Math.pow(1 - annualDegradationPct / 100, yr - 1);
    const escFactor = Math.pow(1 + energyEscalationPct / 100, yr - 1);
    const omInflation = Math.pow(1 + cpiInflationPct / 100, yr - 1);

    const grossSavings = annualSavingsBessOnlyPln * degFactor * escFactor;
    const omCost = (bessCapexPln * (omRatePct / 100)) * omInflation;
    const debtService = yr <= loanTermYears ? annualDebtServicePln : 0;
    const netCashFlow = grossSavings - omCost - debtService;

    cumulativeCashFlowPln += netCashFlow;

    const discountFactor = Math.pow(1 + r, yr);
    const discountedNetCashFlow = netCashFlow / discountFactor;
    discountedCumulativeCashFlowPln += discountedNetCashFlow;

    cashFlowTimeline.push({
      year: yr,
      grossSavingsPln: Math.round(grossSavings),
      omCostPln: Math.round(omCost),
      debtServicePln: Math.round(debtService),
      netCashFlowPln: Math.round(netCashFlow),
      cumulativeCashFlowPln: Math.round(cumulativeCashFlowPln),
      discountedNetCashFlowPln: Math.round(discountedNetCashFlow)
    });
  }

  const npvPln = Math.round(discountedCumulativeCashFlowPln);

  return {
    roiBessYears,
    bessOnlyRoiYears: roiBessYears,
    simplePaybackYears: roiBessYears,
    roiCombinedYears,
    combinedRoiYears: roiCombinedYears,
    roiPvYears,
    pvOnlyRoiYears: roiPvYears,
    lcosPlnPerKwh,
    npvPln,
    totalCombinedCapexPln,
    annualDebtServicePln: Math.round(annualDebtServicePln),
    cashFlowTimeline
  };
}
