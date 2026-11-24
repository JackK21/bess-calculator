import React from 'react';
import { Eye, EyeOff, Layers } from 'lucide-react';

export function ChartSeriesFilter({
  visibleSeries,
  onChange,
  hasPv = true,
  hasBess = true,
  lang = 'pl',
  t = (pl, en) => (lang === 'en' ? en : pl)
}) {
  const toggle = key => {
    onChange({
      ...visibleSeries,
      [key]: !visibleSeries[key]
    });
  };

  const showAll = () => {
    onChange({
      load: true,
      grid: true,
      pv: true,
      peakShaving: true,
      bessArb: true,
      soc: true
    });
  };

  const showOnlyBalance = () => {
    onChange({
      load: true,
      grid: true,
      pv: false,
      peakShaving: false,
      bessArb: false,
      soc: false
    });
  };

  return (
    <div className="series-filter-bar">
      <div className="series-filter-header">
        <span className="series-filter-title">
          <Layers size={13} />
          {t('Widoczność Serii Wykresu:', 'Chart Series Visibility:')}
        </span>
        <div className="series-filter-quick">
          <button
            type="button"
            className="action-chip"
            onClick={showAll}
            title={t('Włącz wszystkie serie danych', 'Enable all series')}
          >
            {t('Wszystkie', 'All')}
          </button>
          <button
            type="button"
            className="action-chip"
            onClick={showOnlyBalance}
            title={t('Pokaż tylko pobór zakładu i sieć', 'Show only facility load vs grid import')}
          >
            {t('Tylko Pobór/Sieć', 'Load/Grid Only')}
          </button>
        </div>
      </div>

      <div className="series-chips-grid">
        {/* ORIGINAL LOAD */}
        <button
          type="button"
          className={`series-chip ${visibleSeries.load ? 'active' : 'inactive'}`}
          onClick={() => toggle('load')}
          style={{ '--series-color': 'var(--accent-rose, #f43f5e)' }}
          title={t('Włącz/wyłącz linię oryginalnego poboru zakładu', 'Toggle original facility load')}
          aria-pressed={visibleSeries.load}
        >
          <span className="series-color-dot" style={{ background: 'var(--accent-rose, #f43f5e)' }} />
          <span>{t('Pobór Zakładu', 'Facility Load')}</span>
          {visibleSeries.load ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>

        {/* GRID POWER */}
        <button
          type="button"
          className={`series-chip ${visibleSeries.grid ? 'active' : 'inactive'}`}
          onClick={() => toggle('grid')}
          style={{ '--series-color': 'var(--accent-primary, #0ea5e9)' }}
          title={t('Włącz/wyłącz linię poboru z sieci po BESS', 'Toggle grid power after BESS')}
          aria-pressed={visibleSeries.grid}
        >
          <span className="series-color-dot" style={{ background: 'var(--accent-primary, #0ea5e9)' }} />
          <span>{t('Pobór z Sieci', 'Grid Import')}</span>
          {visibleSeries.grid ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>

        {/* PV GENERATION */}
        {hasPv && (
          <button
            type="button"
            className={`series-chip ${visibleSeries.pv ? 'active' : 'inactive'}`}
            onClick={() => toggle('pv')}
            style={{ '--series-color': 'var(--accent-amber, #f59e0b)' }}
            title={t('Włącz/wyłącz profil generacji PV', 'Toggle PV generation profile')}
            aria-pressed={visibleSeries.pv}
          >
            <span className="series-color-dot" style={{ background: 'var(--accent-amber, #f59e0b)' }} />
            <span>{t('Generacja PV (DC)', 'PV Generation (DC)')}</span>
            {visibleSeries.pv ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        )}

        {/* PEAK SHAVING DISCHARGE */}
        {hasBess && (
          <button
            type="button"
            className={`series-chip ${visibleSeries.peakShaving ? 'active' : 'inactive'}`}
            onClick={() => toggle('peakShaving')}
            style={{ '--series-color': 'var(--accent-rose, #f43f5e)' }}
            title={t('Włącz/wyłącz oddawanie mocy na peak shaving', 'Toggle peak shaving discharge')}
            aria-pressed={visibleSeries.peakShaving}
          >
            <span className="series-color-dot" style={{ background: 'var(--accent-rose, #f43f5e)' }} />
            <span>{t('Peak Shaving (<10ms)', 'Peak Shaving (<10ms)')}</span>
            {visibleSeries.peakShaving ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        )}

        {/* ARBITRAGE / SELF-CONSUMPTION */}
        {hasBess && (
          <button
            type="button"
            className={`series-chip ${visibleSeries.bessArb ? 'active' : 'inactive'}`}
            onClick={() => toggle('bessArb')}
            style={{ '--series-color': 'var(--accent-emerald, #10b981)' }}
            title={t('Włącz/wyłącz autokonsumpcję i arbitraż', 'Toggle arbitrage discharge')}
            aria-pressed={visibleSeries.bessArb}
          >
            <span className="series-color-dot" style={{ background: 'var(--accent-emerald, #10b981)' }} />
            <span>{t('Arbitraż / Autokonsumpcja', 'Arbitrage / Self-Use')}</span>
            {visibleSeries.bessArb ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        )}

        {/* BATTERY SOC */}
        {hasBess && (
          <button
            type="button"
            className={`series-chip ${visibleSeries.soc ? 'active' : 'inactive'}`}
            onClick={() => toggle('soc')}
            style={{ '--series-color': 'var(--accent-violet, #8b5cf6)' }}
            title={t('Włącz/wyłącz linię poziomu naładowania baterii (SoC %)', 'Toggle battery state of charge')}
            aria-pressed={visibleSeries.soc}
          >
            <span className="series-color-dot" style={{ background: 'var(--accent-violet, #8b5cf6)' }} />
            <span>{t('Stan Baterii SoC [%]', 'Battery SoC [%]')}</span>
            {visibleSeries.soc ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}
