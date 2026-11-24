import React from 'react';
import {
  Printer,
  X,
  ShieldCheck,
  Zap,
  TrendingUp,
  BatteryCharging,
  Sun,
  Coins,
  Award,
  Calendar,
  Layers,
  Download,
  ShieldAlert
} from 'lucide-react';

export function PrintAuditReportModal({
  isOpen,
  onClose,
  metrics,
  params,
  cashFlowTimeline = [],
  monthlyBreakdown = [],
  currency = 'PLN',
  fmtMoney,
  t,
  lang
}) {
  if (!isOpen || !metrics) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadStandaloneReport = () => {
    const reportElem = document.querySelector('.report-paper');
    if (!reportElem) return;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');
    const htmlContent = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Raport Audytu PowerKeeper BESS - ${metrics.ppeCode || 'C&I'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${styles}
  <style>
    body { background: #0b1329; font-family: 'Inter', sans-serif; margin: 0; padding: 2rem 1rem; display: flex; justify-content: center; }
    .report-paper { max-width: 960px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); border-radius: 8px; }
    .standalone-bar { position: sticky; top: 1rem; z-index: 100; margin-bottom: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem; }
    @media print { .standalone-bar { display: none !important; } body { padding: 0 !important; background: #fff !important; } }
  </style>
</head>
<body>
  <div style="max-width: 960px; width: 100%;">
    <div class="standalone-bar no-print">
      <button onclick="window.print()" style="background: #10b981; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem;">
        🖨️ Drukuj / Zapisz do PDF
      </button>
    </div>
    ${reportElem.outerHTML}
  </div>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Raport_Audytu_PowerKeeper_${metrics.ppeCode || 'PPE'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const todayStr = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="report-modal-overlay">
      <div className="report-modal-container">
        {/* ACTION BAR (Hidden in print) */}
        <div className="report-action-bar no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={18} color="var(--accent-emerald)" />
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
              {t('Podgląd Raportu Audytu Techniczno-Ekonomicznego', 'Technical & Financial Audit Report Preview')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Printer size={15} />
              {t('Drukuj / Zapisz do PDF', 'Print / Save as PDF')}
            </button>
            <button className="btn-secondary" onClick={handleDownloadStandaloneReport} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={15} />
              {t('Pobierz Plik Raportu', 'Download Report File')}
            </button>
            <button className="btn-secondary" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <X size={15} />
              {t('Zamknij', 'Close')}
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <div className="report-paper printable-content">
          {/* HEADER */}
          <div className="report-header">
            <div>
              <div className="report-badge">PowerKeeper C&I Audit Studio</div>
              <h1 className="report-title">
                {t('RAPORT AUDYTU ENERGETYCZNEGO BESS & PV', 'BESS & SOLAR PV ENERGY AUDIT REPORT')}
              </h1>
              <p className="report-subtitle">
                {t('Optymalizacja Mocy Umownej, Redukcja Kar OSD i Opłaty Mocowej URE 2026', 'Contracted Power Optimization, DSO Penalty Shaving & URE 2026 Capacity Fee Reduction')}
              </p>
            </div>
            <div className="report-meta">
              <div><strong>{t('Data audytu:', 'Audit Date:')}</strong> {todayStr}</div>
              <div><strong>{t('Kod PPE:', 'Metering Point (PPE):')}</strong> {metrics.ppeCode || '590243893032990758'}</div>
              <div><strong>{t('Horyzont danych:', 'Data Span:')}</strong> {metrics.datasetSpanDays} {t('dni (Standard 15-min OSD)', 'days (15-min DSO)')}</div>
              <div><strong>{t('Architektura:', 'Architecture:')}</strong> Sungrow DC-Coupled (&lt;10ms)</div>
            </div>
          </div>

          <hr className="report-divider" />

          {/* SECTION 1: EXECUTIVE SUMMARY */}
          <div className="report-section">
            <h2 className="report-section-title">
              <span className="section-num">1</span>
              {t('Podsumowanie Wykonawcze & Kluczowe Wskaźniki ROI', 'Executive Summary & Key ROI Metrics')}
            </h2>

            <div className="report-kpi-grid">
              <div className="report-kpi-card highlight">
                <div className="kpi-label">{t('Prosty Czas Zwrotu BESS (ROI)', 'BESS Simple Payback (ROI)')}</div>
                <div className="kpi-value text-emerald">{metrics.roiYears} {t('lat', 'yrs')}</div>
                <div className="kpi-sub">{t('CAPEX BESS / Oszczędności BESS-Only', 'BESS CAPEX / BESS-Only Savings')}</div>
              </div>

              <div className="report-kpi-card highlight">
                <div className="kpi-label">{t('Roczne Oszczędności Samodzielne BESS', 'Annual BESS-Only Savings')}</div>
                <div className="kpi-value text-amber">{fmtMoney(metrics.annualSavingsBessOnlyPln)}/{t('rok', 'yr')}</div>
                <div className="kpi-sub">{t('Kary OSD + URE + Arbitraż + DSR', 'DSO Penalty + URE + Arb + DSR')}</div>
              </div>

              <div className="report-kpi-card">
                <div className="kpi-label">{t('LCOS (Uśredniony Koszt Energii)', 'LCOS (Levelized Cost of Storage)')}</div>
                <div className="kpi-value">{currency === 'EUR' ? (metrics.lcosPlnPerKwh ? (metrics.lcosPlnPerKwh / 4.25).toFixed(3) : '—') : (metrics.lcosPlnPerKwh || '—')} {currency}/kWh</div>
                <div className="kpi-sub">{t('10 lat z degradacją i O&M', '10-yr with degradation & O&M')}</div>
              </div>

              <div className="report-kpi-card">
                <div className="kpi-label">{t('Szacunkowy NPV Projektu (10 lat)', 'Project NPV (10-Year Horizon)')}</div>
                <div className="kpi-value text-blue">{fmtMoney(metrics.npvPln)}</div>
                <div className="kpi-sub">{t('WACC dyskonto 6.0%', 'WACC discount rate 6.0%')}</div>
              </div>

              {metrics.totalCombinedCapexPln > metrics.totalCapexPln && (
                <>
                  <div className="report-kpi-card">
                    <div className="kpi-label">{t('Łączny CAPEX Projektu (PV + BESS)', 'Total Project CAPEX (PV + BESS)')}</div>
                    <div className="kpi-value">{fmtMoney(metrics.totalCombinedCapexPln)}</div>
                    <div className="kpi-sub">{params.pvCapacityKwp} kWp PV + {metrics.nominalBessCapacityKwh} kWh BESS</div>
                  </div>

                  <div className="report-kpi-card">
                    <div className="kpi-label">{t('Łączny Czas Zwrotu (PV + BESS)', 'Combined Payback (PV + BESS)')}</div>
                    <div className="kpi-value text-emerald">{metrics.roiCombinedYears} {t('lat', 'yrs')}</div>
                    <div className="kpi-sub">{t('Łączny CAPEX / Łączne Oszczędności', 'Total Combined CAPEX / Total Savings')}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECTION 2: HARDWARE & TECHNICAL SPECIFICATION */}
          <div className="report-section page-break-inside-avoid">
            <h2 className="report-section-title">
              <span className="section-num">2</span>
              {t('Konfiguracja Sprzętowa i Dobór Technologii PowerKeeper', 'Hardware Configuration & PowerKeeper Technology Spec')}
            </h2>

            <table className="report-table">
              <tbody>
                <tr>
                  <td className="table-prop">{t('Model Magazynu Energii:', 'Energy Storage System Model:')}</td>
                  <td className="table-val"><strong>PowerKeeper {metrics.nominalBessCapacityKwh} kWh</strong> ({metrics.powerKeeperTowers} {t('Wież', 'Towers')} / {metrics.powerKeeperModules} {t('modułów 12,5 kWh LFP', 'modules 12.5 kWh LFP')})</td>
                  <td className="table-prop">{t('Moc Falowników Hybrydowych:', 'Hybrid Inverter Rating:')}</td>
                  <td className="table-val"><strong>{metrics.effectiveBessPowerKw} kW</strong> ({metrics.inverterCount}× {metrics.singleInverterKw} kW Sungrow)</td>
                </tr>
                <tr>
                  <td className="table-prop">{t('Topologia Układu:', 'System Topology:')}</td>
                  <td className="table-val"><span className="tag-green">DC-Coupled (+5-8% Sprawności)</span></td>
                  <td className="table-prop">{t('Czas Reakcji (DSO Guard):', 'Response Time (DSO Guard):')}</td>
                  <td className="table-val"><strong>&lt; 10 ms</strong> ({t('Tłumienie szpilek rozruchowych', 'Industrial spike damping')})</td>
                </tr>
                <tr>
                  <td className="table-prop">{t('Moc Umowna OSD (P_umowna):', 'Contracted Power (P_contracted):')}</td>
                  <td className="table-val">{metrics.contractedPowerKw} kW</td>
                  <td className="table-prop">{t('Maksymalny Pik po Peak Shavingu:', 'Max Grid Peak After BESS:')}</td>
                  <td className="table-val text-emerald"><strong>{metrics.maxKwAfter} kW</strong> (Zredukowano z {metrics.maxKwBefore} kW)</td>
                </tr>
                <tr>
                  <td className="table-prop">{t('Fotowoltaika (PV):', 'Solar PV Capacity:')}</td>
                  <td className="table-val">{params.pvCapacityKwp > 0 ? `${params.pvCapacityKwp} kWp (${params.pvOrientation === 'east-west' ? 'Wschód-Zachód' : 'Południe'})` : t('Brak PV (Magazyn Standalone)', 'No PV (Standalone BESS)')}</td>
                  <td className="table-prop">{t('CAPEX Całkowity PowerKeeper:', 'Total PowerKeeper CAPEX:')}</td>
                  <td className="table-val"><strong>{fmtMoney(metrics.totalCapexPln)}</strong> (Bateria: {fmtMoney(metrics.batteryCapexPln)} + Inwertery: {fmtMoney(metrics.inverterPricePln)})</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 3: REVENUE & SAVINGS BREAKDOWN */}
          <div className="report-section page-break-inside-avoid">
            <h2 className="report-section-title">
              <span className="section-num">3</span>
              {t('Struktura Oszczędności i Polskie Otoczenie Regulacyjne', 'Annual Revenue Streams & Polish Regulatory Breakdown')}
            </h2>

            <div className="report-stream-grid">
              <div className="stream-card">
                <div className="stream-title">🛡️ {t('Uniknięte Kary OSD za Moc Umowną', 'Avoided DSO Contracted Power Penalties')}</div>
                <div className="stream-amount">{fmtMoney(metrics.annualAvoidedOsdPenaltyPln)}/{t('rok', 'yr')}</div>
                <div className="stream-desc">{t('Formuła OSD: 10 × Stawka Sieciowa × Przekroczenie kwadransowe (zredukowano kary do 0 PLN)', '10x network fee formula for 15-min exceedance elimination')}</div>
              </div>

              <div className="stream-card">
                <div className="stream-title">🏛️ {t('Ulga w Opłacie Mocowej URE 2026', 'URE 2026 Capacity Fee Savings')}</div>
                <div className="stream-amount">{fmtMoney(metrics.annualUreCapacityFeeSavingsPln)}/{t('rok', 'yr')}</div>
                <div className="stream-desc">
                  {t('Przeskok z Koszyka K4 do', 'Jump to Basket')} <strong>{metrics.basketAfter}</strong> ({t('Rabat', 'Discount')} {metrics.basketDiscountAfterPct}%, {t('stawka bazowa 0,2194 PLN/kWh w oknie 07:00-22:00', 'base rate 0.2194 PLN/kWh')})
                </div>
              </div>

              <div className="stream-card">
                <div className="stream-title">⚡ {t('Arbitraż Cenowy & Autokonsumpcja PV', 'Price Arbitrage & Solar Self-Consumption')}</div>
                <div className="stream-amount">{fmtMoney(metrics.annualEnergySavingsBessOnlyPln)}/{t('rok', 'yr')}</div>
                <div className="stream-desc">
                  {t('Tanie ładowanie nocne / nadwyżki PV i wstrzyknięcie energii w drogim szczycie popołudniowym', 'Night & solar surplus charging discharged in high peak hours')}
                </div>
              </div>

              <div className="stream-card">
                <div className="stream-title">🔌 {t('Usługi Sieciowe (DSR & Rynek Mocy)', 'Grid Flexibility Services (DSR & Capacity Market)')}</div>
                <div className="stream-amount">{fmtMoney(metrics.totalAnnualGridRevenuePln || 0)}/{t('rok', 'yr')}</div>
                <div className="stream-desc">
                  {metrics.totalAnnualGridRevenuePln > 0
                    ? `DSR: ${fmtMoney(metrics.annualDsrRevenuePln)}/rok | Rynek Mocy: ${fmtMoney(metrics.annualCapacityMarketRevenuePln)}/rok`
                    : t('Opcja wyłączona w bieżącej konfiguracji audytu', 'Disabled in current configuration')}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: MONTHLY PEAK & OSD PENALTY BREAKDOWN */}
          {monthlyBreakdown && monthlyBreakdown.length > 0 && (
            <div className="report-section page-break-inside-avoid">
              <h2 className="report-section-title">
                <span className="section-num">4</span>
                {t('Miesięczny Bilans Szczytów Mocy i Unikniętych Kar OSD (Formuła 10x)', 'Monthly Peak Demand & Avoided DSO Penalties (10x Standard)')}
              </h2>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>{t('Miesiąc', 'Month')}</th>
                    <th>{t('Pik Przed [kW]', 'Peak Before [kW]')}</th>
                    <th>{t('Pik Po BESS [kW]', 'Peak After [kW]')}</th>
                    <th>{t('Zgolono [kW]', 'Shaved [kW]')}</th>
                    <th>{t('Kara OSD Przed', 'DSO Penalty Before')}</th>
                    <th>{t('Kara OSD Po', 'DSO Penalty After')}</th>
                    <th>{t('Oszczędność Kar', 'Penalty Saved')}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyBreakdown.map(row => (
                    <tr key={row.month}>
                      <td className="mono"><strong>{row.month}</strong></td>
                      <td className="mono" style={{ color: '#e11d48' }}>{row.maxKwOrig} kW</td>
                      <td className="mono" style={{ color: '#0284c7' }}>{row.maxKwAfterBess} kW</td>
                      <td className="mono text-emerald"><strong>-{row.shavedKw} kW</strong></td>
                      <td className="mono">{fmtMoney(row.penaltyBeforePln)}</td>
                      <td className="mono">{fmtMoney(row.penaltyAfterPln)}</td>
                      <td className="mono text-emerald" style={{ fontWeight: 700 }}>
                        +{fmtMoney(row.penaltySavedPln)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SECTION 5: 10-YEAR CASH FLOW TABLE */}
          {cashFlowTimeline.length > 0 && (
            <div className="report-section page-break-inside-avoid">
              <h2 className="report-section-title">
                <span className="section-num">5</span>
                {t('10-Letnia Projekcja Finansowa i Przepływy Gotówkowe (Cash Flow)', '10-Year Financial Projection & Cumulative Cash Flow')}
              </h2>

              <table className="report-table cash-flow-table">
                <thead>
                  <tr>
                    <th>{t('Rok', 'Year')}</th>
                    <th>{t('Oszczędności Brutto', 'Gross Savings')}</th>
                    <th>{t('Koszty O&M (CPI)', 'O&M Costs')}</th>
                    <th>{t('Rata Długu', 'Debt Service')}</th>
                    <th>{t('Przepływ Netto', 'Net Cash Flow')}</th>
                    <th>{t('Skumulowany Cash Flow', 'Cumulative Cash Flow')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowTimeline.map(row => (
                    <tr key={row.year}>
                      <td><strong>{t('Rok', 'Year')} {row.year}</strong></td>
                      <td>{fmtMoney(row.grossSavingsPln)}</td>
                      <td className="text-muted">-{fmtMoney(row.omCostPln)}</td>
                      <td className="text-muted">{row.debtServicePln > 0 ? `-${fmtMoney(row.debtServicePln)}` : '0'}</td>
                      <td className={row.netCashFlowPln >= 0 ? 'text-emerald' : 'text-rose'}>
                        {fmtMoney(row.netCashFlowPln)}
                      </td>
                      <td className={`mono ${row.cumulativeCashFlowPln >= 0 ? 'text-emerald font-bold' : 'text-rose'}`}>
                        {fmtMoney(row.cumulativeCashFlowPln)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* LEGAL DISCLAIMER & LIMITATION OF LIABILITY */}
          <div className="report-disclaimer-box page-break-inside-avoid">
            <div className="report-disclaimer-title">
              <ShieldAlert size={15} color="#0284c7" />
              {t(
                'Klauzula Informacyjna i Ograniczenie Odpowiedzialności (Disclaimer Techniczno-Prawny)',
                'Legal Disclaimer & Limitation of Liability'
              )}
            </div>
            <p style={{ margin: '0 0 0.35rem 0' }}>
              <strong>1. {t('Charakter symulacji analitycznej:', 'Nature of simulation:')}</strong>{' '}
              {t(
                'Niniejszy raport audytu techniczno-ekonomicznego stanowi wstępną symulację matematyczną przeprowadzoną na podstawie dostarczonych danych pomiarowych (profil 15-minutowy / 1-godzinny) i deklarowanych stawek taryfowych. Raport nie stanowi oferty handlowej w rozumieniu art. 66 Kodeksu Cywilnego ani wiążącej gwarancji osiągnięcia prezentowanych wyników finansowych, redukcji mocy umownej czy wskaźników ROI.',
                'This audit report represents a preliminary mathematical simulation conducted on historical load data (15-min / 1-hour) and user-specified tariff parameters. It does not constitute a formal commercial offer under civil code nor a guaranteed financial return or payback.'
              )}
            </p>
            <p style={{ margin: '0 0 0.35rem 0' }}>
              <strong>2. {t('Zmienność warunków zewnętrznych i rynkowych:', 'External & market variability:')}</strong>{' '}
              {t(
                'Rzeczywiste oszczędności, redukcja szczytów mocy i korzyści z arbitrażu mogą różnić się od prognoz ze względu na przyszłe zmiany profilu zużycia zakładu, warunki pogodowe i nasłonecznienie instalacji PV, decyzje taryfowe Prezesa URE, zmiany taryf operatorów OSD oraz wahania cen energii na rynkach giełdowych (RDN / TGE).',
                'Actual financial performance and peak shaving savings may deviate from projections due to operational changes, weather fluctuations affecting PV yield, regulatory adjustments by URE, DSO tariff updates, and wholesale day-ahead spot price volatility.'
              )}
            </p>
            <p style={{ margin: 0 }}>
              <strong>3. {t('Wymóg audytu obiektowego i uzgodnień OSD:', 'Mandatory site survey & DSO approvals:')}</strong>{' '}
              {t(
                'Przed podjęciem ostatecznej decyzji inwestycyjnej (FID) oraz zamówieniem urządzeń wymagane jest przeprowadzenie fizycznej wizji lokalnej, pomiarów jakości zasilania, audytu rozdzielnicy głównej SN/nN oraz uzyskanie formalnych Warunków Przyłączenia do Sieci od właściwego Operatora Systemu Dystrybucyjnego (OSD).',
                'Prior to final investment execution and hardware procurement, a physical site survey, power quality measurements, electrical switchgear audit, and formal grid connection conditions from the competent DSO are strictly required.'
              )}
            </p>
          </div>

          {/* SIGN-OFF FOOTER */}
          <div className="report-footer">
            <div className="footer-col">
              <div className="footer-line"></div>
              <div className="footer-text">{t('Audyt sporządził:', 'Prepared by:')} Inżynier BESS & PV</div>
            </div>
            <div className="footer-col">
              <div className="footer-line"></div>
              <div className="footer-text">{t('Zatwierdzenie Inwestora / Zarządu:', 'Approved by Client / Board:')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
