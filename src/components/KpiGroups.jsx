import React from 'react';
import { TrendingUp, Zap, Info, BatteryCharging, Coins, ShieldCheck, ArrowDownRight } from 'lucide-react';

export function KpiGroups({
  metrics: m,
  params,
  currency = 'PLN',
  fmtMoney,
  setFloatingTopic,
  lang = 'pl',
  t = (pl, en) => (lang === 'en' ? en : pl)
}) {
  if (!m) return null;

  if (!params.enableBess) {
    /* BASELINE MODE (WITHOUT BESS) */
    return (
      <section className="kpi-compact-section" aria-label="Kluczowe wskaźniki profilu bazowego">
        <div className="kpi-compact-header">
          <span className="kpi-group-badge warn">⚠️ {t('Profil Bazowy (Bez Magazynu Energii)', 'Baseline Facility Profile (No BESS)')}</span>
          <span className="kpi-group-desc">{t('Bieżące koszty energii, moc umowna i kary OSD', 'Current energy spend, contracted demand & DSO penalties')}</span>
        </div>

        <div className="kpi-grid">
          {/* TOTAL SPEND */}
          <div className="kpi-card" data-accent="rose" style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}>
            <div className="kpi-header">
              <span>{t('Wydatki Roczne (Bez BESS)', 'Annual Spend (Without BESS)')}</span>
              <Zap size={16} color="var(--accent-rose)" />
            </div>
            <div className="kpi-value" style={{ color: 'var(--accent-rose)' }}>
              {fmtMoney(m.annualTotalCostWithoutBessPln)}
            </div>
            <div className="kpi-sub">
              {t('Energia czynna + URE + moc umowna + kary OSD', 'Active energy + URE + contracted + penalties')}
            </div>
          </div>

          {/* PEAK & PENALTIES */}
          <div
            className="kpi-card kpi-clickable"
            data-accent="amber"
            role="button"
            tabIndex={0}
            onClick={() => setFloatingTopic('osd-penalty')}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setFloatingTopic('osd-penalty')}
            aria-label="Wyjaśnienie kar OSD"
          >
            <div className="kpi-header">
              <span>{t('Szczyt Mocy & Kary 10x OSD', 'Peak Demand & 10x DSO Penalties')}</span>
              <span className="info-badge">
                <Info size={12} /> {t('Wyjaśnij', 'Explain')}
              </span>
            </div>
            <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>
              {m.maxKwBefore} kW
            </div>
            <div className="kpi-sub">
              {t('Przekroczenie:', 'Exceeded by:')}{' '}
              <strong style={{ color: 'var(--accent-rose)' }}>+{m.deltaPBeforeKw} kW</strong> •{' '}
              {t('Kary OSD:', 'Penalties:')}{' '}
              <strong className="mono" style={{ color: 'var(--accent-rose)' }}>{fmtMoney(m.annualOsdPenaltiesBeforePln || m.annualAvoidedOsdPenaltyPln)}/{t('rok', 'yr')}</strong>
            </div>
          </div>

          {/* URE CAPACITY BASKET */}
          <div
            className="kpi-card kpi-clickable"
            data-accent="violet"
            role="button"
            tabIndex={0}
            onClick={() => setFloatingTopic('k-baskets')}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setFloatingTopic('k-baskets')}
            aria-label="Wyjaśnienie koszyków URE"
          >
            <div className="kpi-header">
              <span>{t('Opłata Mocowa URE', 'URE Capacity Fee')}</span>
              <span className="info-badge">
                <Info size={12} /> {t('Koszyk', 'Basket')} {m.basketBefore}
              </span>
            </div>
            <div className="kpi-value" style={{ color: 'var(--accent-rose)' }}>
              {fmtMoney(m.annualUreCapacityFeeBeforePln)}
            </div>
            <div className="kpi-sub">
              {t('Klasyfikacja:', 'Classification:')} <strong>{t('Koszyk', 'Basket')} {m.basketBefore}</strong> (Δs = {m.basketDeltaSBeforePct}%, {t('mnożnik', 'factor')} {m.basketFactorBefore})
            </div>
          </div>

          {/* ANNUAL LOAD */}
          <div className="kpi-card" data-accent="primary">
            <div className="kpi-header">
              <span>{t('Roczne Zużycie Energii', 'Annual Energy Consumption')}</span>
              <BatteryCharging size={16} color="var(--text-secondary)" />
            </div>
            <div className="kpi-value">{(m.totalLoadKwh / 1000).toFixed(1)} MWh</div>
            <div className="kpi-sub">
              {t('Autokonsumpcja samego PV:', 'PV self-sufficiency:')} {m.selfSufficiencyPct}%
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* FULL BESS ACTIVE MODE: COMPACT 6-CARD EXECUTIVE GRID */
  return (
    <section className="kpi-compact-section" aria-label="Główne wskaźniki korzyści PowerKeeper BESS">
      <div className="kpi-grid kpi-grid-6">
        {/* CARD 1: OSZCZĘDNOŚCI ŁĄCZNE BESS */}
        <div className="kpi-card kpi-card-highlight" data-accent="emerald">
          <div className="kpi-header">
            <span>
              <span className="kpi-mini-tag success">💰 {t('Finanse', 'Finance')}</span>
              {t('Łączne Oszczędności BESS', 'Total BESS Savings')}
            </span>
            <TrendingUp size={16} color="var(--accent-emerald)" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
            {fmtMoney(m.annualTotalSavingsPln)}
          </div>
          <div className="kpi-sub">
            {t('Zysk roczny BESS • baza:', 'Annual gain • baseline:')}{' '}
            <span className="mono">{fmtMoney(m.annualTotalCostWithoutBessPln)}/{t('rok', 'yr')}</span>
          </div>
        </div>

        {/* CARD 2: ZYSK Z PEAK SHAVING */}
        <div
          className="kpi-card kpi-clickable"
          data-accent="rose"
          role="button"
          tabIndex={0}
          onClick={() => setFloatingTopic('osd-penalty')}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setFloatingTopic('osd-penalty')}
          title={t('Kliknij, aby zobaczyć jak działa Peak Shaving i kary 10x OSD', 'Click to see Peak Shaving & 10x DSO penalties')}
          style={!params.enablePeakShaving ? { opacity: 0.7, borderStyle: 'dashed' } : {}}
          aria-label="Wyjaśnienie zysku z Peak Shaving"
        >
          <div className="kpi-header">
            <span>
              <span className="kpi-mini-tag primary">⚡ {t('Peak Shaving', 'Peak Shaving')}</span>
              {t('Ochrona Przed Karami OSD', 'DSO Penalty Protection')}
            </span>
            <span className="info-badge" style={!params.enablePeakShaving ? { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' } : {}}>
              {params.enablePeakShaving ? <Info size={12} /> : null} {params.enablePeakShaving ? t('Wyjaśnij', 'Explain') : t('WYŁ', 'OFF')}
            </span>
          </div>
          <div className="kpi-value" style={{ color: params.enablePeakShaving ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            {params.enablePeakShaving ? fmtMoney(m.annualPeakShavingSavingsPln) : `0 ${currency}`}
          </div>
          <div className="kpi-sub">
            {params.enablePeakShaving ? (
              <>
                {t('Uniknięte kary 10x:', 'Avoided 10x penalties:')}{' '}
                <strong className="mono" style={{ color: 'var(--accent-emerald)' }}>{fmtMoney(m.annualAvoidedOsdPenaltyPln)}</strong>
              </>
            ) : (
              <span style={{ color: 'var(--accent-rose)' }}>
                {t('Kary OSD:', 'DSO Penalties:')} <strong>{fmtMoney(m.annualOsdPenaltiesBeforePln)}/{t('rok', 'yr')}</strong>
              </span>
            )}
          </div>
        </div>

        {/* CARD 3: OPŁATA MOCOWA URE */}
        <div
          className="kpi-card kpi-clickable"
          data-accent="violet"
          role="button"
          tabIndex={0}
          onClick={() => setFloatingTopic('k-baskets')}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setFloatingTopic('k-baskets')}
          title={t('Kliknij, aby zobaczyć wyjaśnienie Koszyków Mocowych K1-K4', 'Click to see URE Baskets K1-K4')}
          aria-label="Wyjaśnienie koszyków URE i opłaty mocowej"
        >
          <div className="kpi-header">
            <span>
              <span className="kpi-mini-tag violet">🏛️ {t('URE', 'URE')}</span>
              {t('Rabat Opłaty Mocowej', 'Capacity Fee Discount')}
            </span>
            <span className="info-badge">
              <Info size={12} /> {t('K1–K4', 'K1–K4')}
            </span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-violet)' }}>
            {fmtMoney(m.annualUreCapacityFeeSavingsPln)}
          </div>
          <div className="kpi-sub">
            {t('Koszyk:', 'Basket:')} <strong>{m.basketBefore}</strong> →{' '}
            <strong style={{ color: 'var(--accent-emerald)' }}>{m.basketAfter}</strong> (rabat{' '}
            <strong style={{ color: 'var(--accent-emerald)' }}>-{m.basketDiscountAfterPct}%</strong>)
          </div>
        </div>

        {/* CARD 4: ŚCIĘTY SZCZYT MOCY */}
        <div className="kpi-card" data-accent="primary">
          <div className="kpi-header">
            <span>
              <span className="kpi-mini-tag primary">🛡️ {t('Moc', 'Power')}</span>
              {t('Zgolony Szczyt Mocy', 'Peak Demand Shaved')}
            </span>
            <ShieldCheck size={16} color="var(--accent-primary)" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>
            {m.powerShavedKw} kW
          </div>
          <div className="kpi-sub">
            {t('Pobór:', 'Demand:')}{' '}
            <strong className="mono">{m.maxKwBefore} kW → {m.maxKwAfter} kW</strong> (≤ {params.contractedPowerKw} kW)
          </div>
        </div>

        {/* CARD 5: PROSTY ZWROT INWESTYCJI (ROI) */}
        <div
          className="kpi-card kpi-clickable kpi-card-highlight"
          data-accent="amber"
          role="button"
          tabIndex={0}
          onClick={() => setFloatingTopic('dc-coupled')}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setFloatingTopic('dc-coupled')}
          title={t('Kliknij, aby zobaczyć zalety architektury DC-Coupled', 'Click to see DC-Coupled advantages')}
          aria-label="Wyjaśnienie zwrotu z inwestycji BESS"
        >
          <div className="kpi-header">
            <span>
              <span className="kpi-mini-tag amber">📊 {t('Zwrot', 'Payback')}</span>
              {t('Zwrot BESS (ROI)', 'BESS ROI Payback')}
            </span>
            <span className="info-badge">
              <Info size={12} /> {t('Wyjaśnij', 'Explain')}
            </span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>
            {m.roiYears > 0 ? `${m.roiYears} ${t('lat', 'yrs')}` : '—'}
          </div>
          <div className="kpi-sub">
            {params.pvCapacityKwp > 0 && m.roiCombinedYears ? (
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                {t('Projekt z PV:', 'With PV:')} {m.roiCombinedYears} {t('lat', 'yrs')}
              </span>
            ) : (
              <span>{t('Czysty zwrot bez dotacji', 'Simple payback without grants')}</span>
            )}
          </div>
        </div>

        {/* CARD 6: ŁĄCZNY CAPEX */}
        <div className="kpi-card" data-accent="emerald">
          <div className="kpi-header">
            <span>
              <span className="kpi-mini-tag emerald">🏷️ {t('CAPEX', 'CAPEX')}</span>
              {t('CAPEX PowerKeeper', 'PowerKeeper CAPEX')}
            </span>
            <Coins size={16} color="var(--accent-emerald)" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>
            {fmtMoney(m.totalCapexPln)}
          </div>
          <div className="kpi-sub">
            {(params.powerKeeperModules * 12.5).toFixed(0)} kWh • {params.inverterCount || 1}× SH{params.inverterModelKw || 50}CX
          </div>
        </div>
      </div>
    </section>
  );
}
