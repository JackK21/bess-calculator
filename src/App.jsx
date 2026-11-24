import React, { useState, useMemo, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  BatteryCharging,
  Zap,
  Sun,
  Moon,
  Coins,
  TrendingUp,
  Upload,
  Download,
  Award,
  Layers,
  Sliders,
  CheckCircle2,
  BookmarkPlus,
  GitCompare,
  Trash2,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  Factory,
  HelpCircle,
  X,
  Info,
  Sparkles,
  AlertTriangle,
  Compass,
  Globe,
  FileText,
  CloudSun,
  Radio,
  ShieldCheck,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';
import { downloadPowerKeeperExcel } from './utils/excelExportEngine';
import {
  POWERKEEPER_MODULE_KWH,
  POWERKEEPER_PRESETS,
  POWERKEEPER_INVERTER_MODELS,
  getInverterDefaultPrice,
  BUILTIN_SAMPLE_PROFILES,
  parseLoadProfileCsv,
  runPowerKeeperSimulation,
  runPowerKeeperSizingMatrix,
  generateDemoDataset,
  fetchSolarRadiationOpenMeteo,
  POLISH_DSO_OPERATORS,
  TARIFF_GROUPS
} from './utils/simulationEngine';
import {
  DAY_NAMES_I18N,
  FORECAST_FACTORS_INCLUDED_I18N,
  FORECAST_FACTORS_EXTERNAL_I18N
} from './utils/i18n';
import {
  BUILTIN_SAMPLE_CSV_MAP,
  DEFAULT_INITIAL_CSV
} from './utils/sampleProfilesData';
import { ToastContainer } from './components/Toast';
import { ChartSeriesFilter } from './components/ChartSeriesFilter';
import { KpiGroups } from './components/KpiGroups';
import { PrintAuditReportModal } from './components/PrintAuditReportModal';
import { HelpManualView } from './components/HelpManualView.jsx';

const CustomPowerProfileTooltip = ({ active, payload, label, lang, t, contractedPowerKw, enableBess, pvCapacityKwp }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const origKw = data.originalLoadKw ?? 0;
  const gridKw = data.gridPowerKw ?? 0;
  const pvKw = data.pvGenKw ?? 0;
  const shavedKw = Math.max(0, origKw - gridKw);
  const contracted = contractedPowerKw || 0;
  const isOverContracted = origKw > contracted;
  const isSavedFromPenalty = isOverContracted && gridKw <= contracted;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card, #0f172a)',
        border: '1px solid var(--border-highlight, #0284c7)',
        borderRadius: '8px',
        padding: '0.65rem 0.85rem',
        fontSize: '0.78rem',
        color: 'var(--text-primary, #f8fafc)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        minWidth: '240px',
        lineHeight: 1.45
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--accent-primary, #38bdf8)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>⏱️ {label || data.time}</span>
        {contracted > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)' }}>
            {t ? t('Moc Umowna:', 'Contracted:') : 'Moc Umowna:'} {contracted} kW
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--accent-rose, #f43f5e)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-rose, #f43f5e)', display: 'inline-block' }}></span>
          {t ? t('1. Pobór Przed BESS:', '1. Load Before BESS:') : 'Pobór Przed BESS:'}
        </span>
        <strong className="mono">{origKw.toFixed(1)} kW</strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ color: 'var(--accent-primary, #38bdf8)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-primary, #38bdf8)', display: 'inline-block' }}></span>
          {t ? t('2. Pobór Po PowerKeeper:', '2. Grid After PowerKeeper:') : 'Pobór Po BESS:'}
        </span>
        <strong className="mono" style={{ color: 'var(--accent-primary, #38bdf8)' }}>{gridKw.toFixed(1)} kW</strong>
      </div>

      {enableBess && shavedKw > 0.1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', padding: '0.2rem 0.4rem', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '4px' }}>
          <span style={{ color: 'var(--accent-emerald, #10b981)', fontWeight: 600 }}>
            ✂️ {t ? t('Zgolony Szczyt (Peak Shaved):', 'Peak Shaved:') : 'Zgolony Szczyt:'}
          </span>
          <strong className="mono" style={{ color: 'var(--accent-emerald, #10b981)' }}>
            -{shavedKw.toFixed(1)} kW ({Math.round((shavedKw / Math.max(0.1, origKw)) * 100)}%)
          </strong>
        </div>
      )}

      {pvCapacityKwp > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--accent-amber, #f59e0b)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-amber, #f59e0b)', display: 'inline-block' }}></span>
            ☀️ {t ? t('3. Generacja PV (DC):', '3. PV Generation (DC):') : 'Generacja PV:'}
          </span>
          <strong className="mono" style={{ color: 'var(--accent-amber, #f59e0b)' }}>{pvKw.toFixed(1)} kW</strong>
        </div>
      )}

      {isSavedFromPenalty && (
        <div style={{ marginTop: '0.35rem', padding: '0.25rem 0.45rem', background: 'rgba(14, 165, 233, 0.18)', border: '1px solid var(--accent-primary, #0ea5e9)', borderRadius: '4px', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700 }}>
          🛡️ {t ? t('Uniknięto Kary 10x OSD w tym punkcie!', 'Avoided 10x DSO penalty in this slot!') : 'Uniknięto Kary 10x OSD!'}
        </div>
      )}
    </div>
  );
};

const CustomBessTooltip = ({ active, payload, label, lang, t }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const soc = data.batterySoc ?? 0;
  const pPeak = data.bessDischargePeakKw ?? 0;
  const pArb = data.bessDischargeArbKw ?? 0;
  const totalDischarge = pPeak + pArb;
  const pPv = data.bessChargePvKw ?? 0;
  const pGrid = data.bessChargeGridKw ?? 0;
  const totalCharge = pPv + pGrid;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card, #0f172a)',
        border: '1px solid var(--border-highlight, #0284c7)',
        borderRadius: '8px',
        padding: '0.65rem 0.85rem',
        fontSize: '0.78rem',
        color: 'var(--text-primary, #f8fafc)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        minWidth: '220px'
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--accent-primary, #38bdf8)' }}>
        ⏱️ {label || data.time}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span>🔋 {t ? t('Stan Naładowania (SoC):', 'State of Charge (SoC):') : 'SoC:'}</span>
        <strong style={{ color: 'var(--accent-violet, #a855f7)' }}>{soc.toFixed(1)}%</strong>
      </div>
      {totalDischarge > 0.05 && (
        <div style={{ marginTop: '0.3rem', paddingTop: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: 'var(--accent-rose, #f43f5e)', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
            <span>⚡ {t ? t('Oddawanie (Wsparcie):', 'Discharge (Support):') : 'Oddawanie:'}</span>
            <span>+{totalDischarge.toFixed(1)} kW</span>
          </div>
          {pPeak > 0.05 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', paddingLeft: '0.6rem' }}>
              • {t ? t('Peak Shaving (Kary OSD):', 'Peak Shaving:') : 'Peak Shaving:'} {pPeak.toFixed(1)} kW
            </div>
          )}
          {pArb > 0.05 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', paddingLeft: '0.6rem' }}>
              • {t ? t('Autokonsumpcja / Arbitraż:', 'Self-Consumption / Arbitrage:') : 'Autokonsumpcja:'} {pArb.toFixed(1)} kW
            </div>
          )}
        </div>
      )}
      {totalCharge > 0.05 && (
        <div style={{ marginTop: '0.3rem', paddingTop: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: 'var(--accent-amber, #f59e0b)', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
            <span>📥 {t ? t('Ładowanie Magazynu:', 'Battery Charging:') : 'Ładowanie:'}</span>
            <span>{totalCharge.toFixed(1)} kW</span>
          </div>
          {pPv > 0.05 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', paddingLeft: '0.6rem' }}>
              • {t ? t('Nadwyżki PV (DC):', 'PV DC Surplus:') : 'Nadwyżki PV:'} {pPv.toFixed(1)} kW
            </div>
          )}
          {pGrid > 0.05 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', paddingLeft: '0.6rem' }}>
              • {t ? t('Tani prąd z sieci (dolina):', 'Off-peak grid import:') : 'Dolina nocna sieci:'} {pGrid.toFixed(1)} kW
            </div>
          )}
        </div>
      )}
      {totalDischarge <= 0.05 && totalCharge <= 0.05 && (
        <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary, #94a3b8)', fontStyle: 'italic' }}>
          💤 {t ? t('Magazyn w trybie gotowości (0 kW)', 'Battery idle on standby (0 kW)') : 'Czuwanie (0 kW)'}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState('pl'); // 'pl' | 'en'
  const [currency, setCurrency] = useState('PLN'); // 'PLN' | 'EUR'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pk_theme') || 'dark';
  });

  const EUR_PLN_RATE = 4.25;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pk_theme', theme);
  }, [theme]);

  const t = (plText, enText) => (lang === 'en' ? enText : plText);

  // Currency Formatter
  const fmtMoney = (valPln, decimals = 0) => {
    if (valPln === null || valPln === undefined || isNaN(valPln)) return '—';
    const converted = currency === 'EUR' ? valPln / EUR_PLN_RATE : valPln;
    const rounded = Math.round(decimals === 0 ? converted : converted * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return `${rounded.toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })} ${currency}`;
  };

  const fmtUnit = (valPln, unit = '/kWh', decimals = 2) => {
    const converted = currency === 'EUR' ? valPln / EUR_PLN_RATE : valPln;
    return `${converted.toFixed(decimals)} ${currency}${unit}`;
  };

  const [params, setParams] = useState({
    enableBess: true,
    enablePeakShaving: true,
    enableArbitrage: true,
    powerKeeperModules: 8, // 8 * 12.5 kWh = 100.0 kWh (2 wieże)
    inverterCount: 1, // Liczba falowników w kaskadzie: 1, 2, 3, 4
    inverterModelKw: 80, // Falownik hybrydowy: 50 kW | 80 kW | 125 kW
    inverterPricePln: 19000, // Przybliżona cena falownika Sungrow SH80CX [PLN]
    bessPowerKw: 80.0,
    pvMode: 'simulation_pure', // 'simulation_pure' | 'client_actual' | 'client_plus_expansion'
    pvCapacityKwp: 100.0,
    existingPvKwp: 40.0,
    expansionPvKwp: 60.0,
    pvOrientation: 'south', // 'south' | 'east-west'
    pvRegion: 'central', // 'north' | 'central' | 'south'
    weatherConfidencePct: 90, // Dokładność prognozy pogody dla dyspozytora Look-Ahead (%)
    enableOnlineWeather: false,
    contractedPowerKw: 120.0, // Moc umowna [kW]
    chargeLimitKw: 80.0,
    osdOperator: 'pge', // 'pge' | 'tauron' | 'enea' | 'energa'
    osdNetworkRatePlnKwMonth: 25.40, // Stawka stała sieciowa [PLN/kW/mc]
    ureCapacityFeeBasePlnKwh: 0.2194, // Stawka bazowa opłaty mocowej URE 2026 [PLN/kWh]
    tariffMode: 'tou', // 'tou' | 'dynamic' | 'flat'
    tariffGroup: 'B21', // 'B21' | 'B22' | 'B23' | 'C21' | 'C22a' | 'RDN'
    priceKwhNight: 0.52,
    priceKwhDay: 0.85,
    priceKwhPeak: 1.28,
    priceKwhPeakMorning: 1.35, // Szczyt przedpołudniowy B23 (07:00-13:00)
    priceKwhPeakEvening: 1.45, // Szczyt popołudniowy B23 (16:00-21:00)
    rdnBasePricePlnKwh: 0.48, // Cena bazowa dla taryfy dynamicznej TGE RDN [PLN/kWh]
    rdnVolatilityPct: 100, // Amplituda zmienności godzinowej RDN [%]
    allowNegativePrices: true, // Ujemne ceny w dołku solarnym (12:00-15:00)
    pricePerKwhBess: 700.0,
    inputUnitMode: 'auto',
    overrideDt: '',
    enableDegradation: false,
    degradationRate: 1.8,
    enableFinancing: false,
    loanInterestRate: 7.5,
    loanTermYears: 7,
    enableDsr: false,
    dsrRatePlnPerMwYr: 100000,
    enableCapacityMarket: false,
    capacityMarketRatePlnPerKwYr: 180,
    enableFcr: false,
    fcrRatePlnPerMwYr: 95000
  });

  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // Interactive Stress-Test / Sensitivity sliders inside the Forecast Factors tab
  const [forecastAdjustments, setForecastAdjustments] = useState({
    energyInflationPct: 6.0, // Annual tariff inflation %
    subsidyGrantPct: 0.0, // Grant/dotacja % of CAPEX
    avoidedDowntimePlnYear: 15000, // Value of backup EPS <10ms avoiding production outage
    omCostPctCapex: 0.8 // Annual O&M + insurance % of CAPEX
  });

  const [selectedSampleId, setSelectedSampleId] = useState('zaklad-wtryskarki');
  const [rawCsvRows, setRawCsvRows] = useState(() => generateDemoDataset('zaklad-wtryskarki', 15));
  const [datasetLabel, setDatasetLabel] = useState('3_Zaklad_Produkcyjny_Wtryskarki_15min.csv');
  const [activeTab, setActiveTab] = useState('designer'); // 'designer' | 'investor' | 'autosizer' | 'heatmap' | 'forecast'
  const [heatmapMode, setHeatmapMode] = useState('after');

  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [chartResolution, setChartResolution] = useState('auto'); // 'auto' | '15min' | '1h' | '1d'
  const [powerChartType, setPowerChartType] = useState('line'); // 'bar' | 'line'
  const [bessChartType, setBessChartType] = useState('area'); // 'area' | 'bar'
  const [spanMode, setSpanMode] = useState('1day');
  const [hourRange, setHourRange] = useState({ startHour: 0, endHour: 24 });
  const [isDateExplorerOpen, setIsDateExplorerOpen] = useState(false);
  const [isScenarioSectionOpen, setIsScenarioSectionOpen] = useState(false);
  const [isBessSectionOpen, setIsBessSectionOpen] = useState(false);
  const [isTariffSectionOpen, setIsTariffSectionOpen] = useState(false);
  const [isGridServicesSectionOpen, setIsGridServicesSectionOpen] = useState(false);

  const [savedScenarios, setSavedScenarios] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [floatingTopic, setFloatingTopic] = useState(null);

  // Toast Notification System
  const [toasts, setToasts] = useState([]);
  const addToast = (type, title, message, duration = 4500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  };
  const dismissToast = id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Chart Series Visibility Toggles
  const [visibleSeries, setVisibleSeries] = useState({
    load: true,
    grid: true,
    pv: true,
    peakShaving: true,
    bessArb: true,
    soc: true
  });

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const parsedProfile = useMemo(() => parseLoadProfileCsv(rawCsvRows), [rawCsvRows]);

  const simResult = useMemo(
    () => runPowerKeeperSimulation(parsedProfile, params),
    [parsedProfile, params]
  );

  const sizingMatrix = useMemo(
    () => runPowerKeeperSizingMatrix(parsedProfile, params),
    [parsedProfile, params]
  );

  const availableDays = useMemo(() => {
    if (!simResult?.chartData?.length) return [];
    const map = new Map();
    const dayNamesArr = DAY_NAMES_I18N[lang] || DAY_NAMES_I18N.pl;
    for (const row of simResult.chartData) {
      const dayKey = row.time.slice(0, 10);
      if (!map.has(dayKey)) {
        const dObj = new Date(row.timestamp);
        map.set(dayKey, {
          dateStr: dayKey,
          dayNum: dayKey.slice(8, 10),
          dowName: dayNamesArr[dObj.getDay()],
          maxOrigKw: 0,
          maxAfterKw: 0,
          sumKwh: 0
        });
      }
      const entry = map.get(dayKey);
      if (row.originalLoadKw > entry.maxOrigKw) entry.maxOrigKw = row.originalLoadKw;
      if (row.gridPowerKw > entry.maxAfterKw) entry.maxAfterKw = row.gridPowerKw;
      entry.sumKwh += row.originalLoadKw * (simResult.metrics.detectedDt || 0.25);
    }
    return Array.from(map.values());
  }, [simResult, lang]);

  const [calendarMonth, setCalendarMonth] = useState('');

  const availableMonths = useMemo(() => {
    if (!availableDays.length) return [];
    const map = new Map();
    const monthNamesPl = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];
    const monthNamesEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    for (const d of availableDays) {
      const mKey = d.dateStr.slice(0, 7);
      if (!map.has(mKey)) {
        const y = Number(mKey.slice(0, 4));
        const m = Number(mKey.slice(5, 7));
        map.set(mKey, {
          monthKey: mKey,
          year: y,
          month: m,
          label: lang === 'en' ? `${monthNamesEn[m - 1]} ${y}` : `${monthNamesPl[m - 1]} ${y}`,
          daysMap: new Map(),
          hasOverLimit: false,
          maxKw: 0
        });
      }
      const entry = map.get(mKey);
      entry.daysMap.set(d.dateStr, d);
      if (d.maxOrigKw > entry.maxKw) entry.maxKw = d.maxOrigKw;
      if (d.maxOrigKw > params.contractedPowerKw) entry.hasOverLimit = true;
    }
    return Array.from(map.values());
  }, [availableDays, lang, params.contractedPowerKw]);

  useEffect(() => {
    if (availableDays.length > 0) {
      if (!startDateStr || !availableDays.some(d => d.dateStr === startDateStr)) {
        const first = availableDays[0].dateStr;
        setStartDateStr(first);
        setSelectedDateStr(first);
      }
      if (!endDateStr || !availableDays.some(d => d.dateStr === endDateStr)) {
        const first = availableDays[0].dateStr;
        setEndDateStr(first);
      }
    }
  }, [availableDays]);

  useEffect(() => {
    if (startDateStr) {
      const mKey = startDateStr.slice(0, 7);
      if (mKey && mKey !== calendarMonth) {
        setCalendarMonth(mKey);
      }
    } else if (availableMonths.length > 0 && !calendarMonth) {
      setCalendarMonth(availableMonths[0].monthKey);
    }
  }, [startDateStr, availableMonths]);

  const setRange1Day = () => {
    setEndDateStr(startDateStr);
  };

  const setRangePresetDays = days => {
    if (!availableDays.length) return;
    const curStart = startDateStr || availableDays[0].dateStr;
    const idx = Math.max(0, availableDays.findIndex(d => d.dateStr === curStart));
    const targetIdx = Math.min(availableDays.length - 1, idx + days - 1);
    setEndDateStr(availableDays[targetIdx].dateStr);
  };

  const setRangeFullMonth = () => {
    if (!activeMonth) return;
    const days = Array.from(activeMonth.daysMap.keys());
    if (days.length) {
      setStartDateStr(days[0]);
      setEndDateStr(days[days.length - 1]);
      setSelectedDateStr(days[0]);
    }
  };

  const setRangeFullYear = () => {
    if (!availableDays.length) return;
    setStartDateStr(availableDays[0].dateStr);
    setEndDateStr(availableDays[availableDays.length - 1].dateStr);
    setSelectedDateStr(availableDays[0].dateStr);
  };

  const activeMonth = useMemo(() => {
    if (!availableMonths.length) return null;
    const found = availableMonths.find(m => m.monthKey === calendarMonth);
    return found || availableMonths[0];
  }, [availableMonths, calendarMonth]);

  const selectedRangeSet = useMemo(() => {
    if (!startDateStr || !endDateStr || !availableDays.length) return new Set();
    const set = new Set();
    for (const d of availableDays) {
      if (d.dateStr >= startDateStr && d.dateStr <= endDateStr) {
        set.add(d.dateStr);
      }
    }
    return set;
  }, [availableDays, startDateStr, endDateStr]);

  const calendarGridCells = useMemo(() => {
    if (!activeMonth) return [];
    const { year, month, daysMap } = activeMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    // European Monday-first indexing: (getDay() + 6) % 7 => Mon=0, Tue=1, ..., Sun=6
    const firstDow = new Date(year, month - 1, 1).getDay();
    const prefixPadding = (firstDow + 6) % 7;

    const cells = [];
    for (let i = 0; i < prefixPadding; i++) {
      cells.push({ isPadding: true, key: `pad-pre-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = daysMap.get(dateStr) || null;
      const dowIndex = (prefixPadding + d - 1) % 7;
      const isWeekend = dowIndex === 5 || dowIndex === 6;
      cells.push({
        isPadding: false,
        key: dateStr,
        dateStr,
        dayNum: d,
        dayData,
        isWeekend,
        isAvailable: Boolean(dayData),
        isOverLimit: Boolean(dayData && dayData.maxOrigKw > params.contractedPowerKw),
        maxOrigKw: dayData ? dayData.maxOrigKw : 0,
        sumKwh: dayData ? dayData.sumKwh : 0
      });
    }

    const remainder = cells.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        cells.push({ isPadding: true, key: `pad-post-${i}` });
      }
    }

    return cells;
  }, [activeMonth, params.contractedPowerKw]);

  const peakDay = useMemo(() => {
    if (!availableDays.length) return null;
    let max = availableDays[0];
    for (const d of availableDays) {
      if (d.maxOrigKw > max.maxOrigKw) max = d;
    }
    return max;
  }, [availableDays]);

  const currentDayIndex = useMemo(
    () => availableDays.findIndex(d => d.dateStr === (startDateStr || selectedDateStr)),
    [availableDays, startDateStr, selectedDateStr]
  );

  const stepDay = delta => {
    if (!availableDays.length) return;
    const curIdx = availableDays.findIndex(d => d.dateStr === startDateStr);
    const endIdx = availableDays.findIndex(d => d.dateStr === endDateStr);
    const diff = Math.max(0, (endIdx >= 0 ? endIdx : 0) - (curIdx >= 0 ? curIdx : 0));
    const nextIdx = Math.max(0, Math.min(availableDays.length - 1, (curIdx >= 0 ? curIdx : 0) + delta));
    const nextStart = availableDays[nextIdx].dateStr;
    const nextEndIdx = Math.min(availableDays.length - 1, nextIdx + diff);
    setStartDateStr(nextStart);
    setEndDateStr(availableDays[nextEndIdx].dateStr);
    setSelectedDateStr(nextStart);
    const mKey = nextStart.slice(0, 7);
    if (mKey !== calendarMonth) setCalendarMonth(mKey);
  };

  const stepMonth = delta => {
    if (!availableMonths.length || !activeMonth) return;
    const curIdx = availableMonths.findIndex(m => m.monthKey === activeMonth.monthKey);
    const nextIdx = Math.max(0, Math.min(availableMonths.length - 1, curIdx + delta));
    const nextMonth = availableMonths[nextIdx];
    setCalendarMonth(nextMonth.monthKey);
    const firstDay = nextMonth.daysMap.keys().next().value;
    if (firstDay) {
      setStartDateStr(firstDay);
      setEndDateStr(firstDay);
      setSelectedDateStr(firstDay);
    }
  };

  const jumpToPeakDay = () => {
    if (!peakDay) return;
    setCalendarMonth(peakDay.dateStr.slice(0, 7));
    setStartDateStr(peakDay.dateStr);
    setEndDateStr(peakDay.dateStr);
    setSelectedDateStr(peakDay.dateStr);
  };

  const inspectedData = useMemo(() => {
    if (!simResult?.chartData?.length) return [];
    let rows = simResult.chartData;

    const s = startDateStr || (availableDays[0]?.dateStr ?? '');
    const e = endDateStr || s;

    if (s && e) {
      rows = rows.filter(r => {
        const d = r.time.slice(0, 10);
        return d >= s && d <= e;
      });
    }

    if (hourRange.startHour > 0 || hourRange.endHour < 24) {
      rows = rows.filter(r => {
        const hh = Number(r.time.slice(11, 13));
        const mm = Number(r.time.slice(14, 16));
        const hFloat = hh + mm / 60;
        return hFloat >= hourRange.startHour && hFloat <= hourRange.endHour;
      });
    }

    return rows;
  }, [simResult, startDateStr, endDateStr, availableDays, hourRange]);

  const effectiveResolution = useMemo(() => {
    if (chartResolution !== 'auto') return chartResolution;
    if (inspectedData.length <= 192) return '15min';
    if (inspectedData.length <= 2000) return '1h';
    return '1d';
  }, [chartResolution, inspectedData.length]);

  const autoResolutionLabel = useMemo(() => {
    if (effectiveResolution === '15min') return t('15-min', '15-min');
    if (effectiveResolution === '1h') return t('1-godz', '1-hour');
    return t('Dobowe', 'Daily');
  }, [effectiveResolution, lang]);

  const chartRenderData = useMemo(() => {
    if (!inspectedData.length) return [];

    if (effectiveResolution === '15min') {
      if (inspectedData.length <= 1200) return inspectedData;
      const step = Math.ceil(inspectedData.length / 1200);
      const res = [];
      for (let i = 0; i < inspectedData.length; i += step) {
        res.push(inspectedData[i]);
      }
      return res;
    }

    if (effectiveResolution === '1h') {
      const groups = new Map();
      for (const r of inspectedData) {
        const key = r.time.slice(0, 13) + ':00';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
      }

      const res = [];
      for (const [key, group] of groups.entries()) {
        const cnt = group.length;
        let sumOrig = 0, maxOrig = 0, sumGrid = 0, maxGrid = 0;
        let sumPv = 0, sumBessPeak = 0, sumBessArb = 0;
        let sumChargePv = 0, sumChargeGrid = 0;
        const lastSoc = group[cnt - 1].batterySoc;

        for (const pt of group) {
          sumOrig += pt.originalLoadKw;
          if (pt.originalLoadKw > maxOrig) maxOrig = pt.originalLoadKw;
          sumGrid += pt.gridPowerKw;
          if (pt.gridPowerKw > maxGrid) maxGrid = pt.gridPowerKw;
          sumPv += pt.pvGenKw;
          sumBessPeak += pt.bessDischargePeakKw;
          sumBessArb += pt.bessDischargeArbKw;
          sumChargePv += pt.bessChargePvKw;
          sumChargeGrid += pt.bessChargeGridKw;
        }

        res.push({
          time: key,
          originalLoadKw: Number((sumOrig / cnt).toFixed(1)),
          peakOriginalLoadKw: Number(maxOrig.toFixed(1)),
          gridPowerKw: Number((sumGrid / cnt).toFixed(1)),
          peakGridPowerKw: Number(maxGrid.toFixed(1)),
          pvGenKw: Number((sumPv / cnt).toFixed(1)),
          bessDischargePeakKw: Number((sumBessPeak / cnt).toFixed(1)),
          bessDischargeArbKw: Number((sumBessArb / cnt).toFixed(1)),
          bessChargePvKw: Number((sumChargePv / cnt).toFixed(1)),
          bessChargeGridKw: Number((sumChargeGrid / cnt).toFixed(1)),
          batterySoc: Number(lastSoc.toFixed(1))
        });
      }
      return res;
    }

    if (effectiveResolution === '1d') {
      const groups = new Map();
      for (const r of inspectedData) {
        const key = r.time.slice(0, 10);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
      }

      const res = [];
      for (const [key, group] of groups.entries()) {
        const cnt = group.length;
        let sumOrig = 0, maxOrig = 0, sumGrid = 0, maxGrid = 0;
        let sumPv = 0, sumBessPeak = 0, sumBessArb = 0;
        let sumChargePv = 0, sumChargeGrid = 0;
        const lastSoc = group[cnt - 1].batterySoc;

        for (const pt of group) {
          sumOrig += pt.originalLoadKw;
          if (pt.originalLoadKw > maxOrig) maxOrig = pt.originalLoadKw;
          sumGrid += pt.gridPowerKw;
          if (pt.gridPowerKw > maxGrid) maxGrid = pt.gridPowerKw;
          sumPv += pt.pvGenKw;
          sumBessPeak += pt.bessDischargePeakKw;
          sumBessArb += pt.bessDischargeArbKw;
          sumChargePv += pt.bessChargePvKw;
          sumChargeGrid += pt.bessChargeGridKw;
        }

        res.push({
          time: key,
          originalLoadKw: Number((sumOrig / cnt).toFixed(1)),
          peakOriginalLoadKw: Number(maxOrig.toFixed(1)),
          gridPowerKw: Number((sumGrid / cnt).toFixed(1)),
          peakGridPowerKw: Number(maxGrid.toFixed(1)),
          pvGenKw: Number((sumPv / cnt).toFixed(1)),
          bessDischargePeakKw: Number((sumBessPeak / cnt).toFixed(1)),
          bessDischargeArbKw: Number((sumBessArb / cnt).toFixed(1)),
          bessChargePvKw: Number((sumChargePv / cnt).toFixed(1)),
          bessChargeGridKw: Number((sumChargeGrid / cnt).toFixed(1)),
          batterySoc: Number(lastSoc.toFixed(1))
        });
      }
      return res;
    }

    return inspectedData;
  }, [inspectedData, effectiveResolution]);

  const formatXAxisTime = v => {
    if (!v) return '';
    if (effectiveResolution === '1d') {
      return v.slice(5, 10);
    }
    const isSingleDay = startDateStr === endDateStr;
    if (isSingleDay) {
      return v.slice(11, 16);
    }
    return `${v.slice(5, 10)} ${v.slice(11, 16)}`;
  };

  const windowStats = useMemo(() => {
    if (!inspectedData.length || !simResult) {
      return { count: 0, maxOrigKw: 0, maxAfterKw: 0, shavedKw: 0, loadKwh: 0, pvKwh: 0, bessOutKwh: 0 };
    }
    const dt = simResult.metrics.detectedDt || 0.25;
    let maxOrigKw = 0;
    let maxAfterKw = 0;
    let loadKwh = 0;
    let pvKwh = 0;
    let bessOutKwh = 0;

    for (const r of inspectedData) {
      if (r.originalLoadKw > maxOrigKw) maxOrigKw = r.originalLoadKw;
      if (r.gridPowerKw > maxAfterKw) maxAfterKw = r.gridPowerKw;
      loadKwh += r.originalLoadKw * dt;
      pvKwh += r.pvGenKw * dt;
      bessOutKwh += (r.bessDischargePeakKw + r.bessDischargeArbKw) * dt;
    }

    return {
      count: inspectedData.length,
      maxOrigKw: Number(maxOrigKw.toFixed(1)),
      maxAfterKw: Number(maxAfterKw.toFixed(1)),
      shavedKw: Number(Math.max(0, maxOrigKw - maxAfterKw).toFixed(1)),
      loadKwh: Number(loadKwh.toFixed(1)),
      pvKwh: Number(pvKwh.toFixed(1)),
      bessOutKwh: Number(bessOutKwh.toFixed(1))
    };
  }, [inspectedData, simResult]);

  // Extended 10-year forecast sensitivity calculation
  const extendedForecastSummary = useMemo(() => {
    if (!simResult?.metrics) return null;
    const m = simResult.metrics;
    const baseCapex = m.totalCapexPln;
    const netCapexWithSubsidy = baseCapex * (1 - forecastAdjustments.subsidyGrantPct / 100);
    const annualOmCost = baseCapex * (forecastAdjustments.omCostPctCapex / 100);
    const baseAnnualSavings = m.annualTotalSavingsPln;

    let cumBase10Y = -baseCapex;
    let cumExt10Y = -netCapexWithSubsidy;
    let extBreakEvenYear = null;

    for (let yr = 1; yr <= 10; yr++) {
      const degFactor = params.enableDegradation
        ? Math.max(0.65, 1 - (params.degradationRate / 100) * (yr - 1))
        : 1.0;
      const inflationMultiplier = Math.pow(1 + forecastAdjustments.energyInflationPct / 100, yr - 1);

      const yrBase = baseAnnualSavings * degFactor;
      const yrExt =
        baseAnnualSavings * degFactor * inflationMultiplier +
        (params.enableBess ? forecastAdjustments.avoidedDowntimePlnYear : 0) -
        (params.enableBess ? annualOmCost : 0);

      cumBase10Y += yrBase;
      const prevExt = cumExt10Y;
      cumExt10Y += yrExt;
      if (extBreakEvenYear === null && cumExt10Y >= 0 && yrExt > 0) {
        extBreakEvenYear = Number((yr - 1 + Math.abs(prevExt) / yrExt).toFixed(1));
      }
    }

    const firstYearExtendedSavings =
      baseAnnualSavings +
      (params.enableBess ? forecastAdjustments.avoidedDowntimePlnYear - annualOmCost : 0);

    const rawExtRoiYears =
      params.enableBess && firstYearExtendedSavings > 0
        ? extBreakEvenYear || Number((netCapexWithSubsidy / firstYearExtendedSavings).toFixed(1))
        : 0;
    const extRoiYears = rawExtRoiYears > 0 ? Math.max(1.0, rawExtRoiYears) : 0;

    return {
      netCapexWithSubsidy: Math.round(netCapexWithSubsidy),
      annualOmCost: Math.round(annualOmCost),
      firstYearExtendedSavings: Math.round(firstYearExtendedSavings),
      cumBase10Y: Math.round(cumBase10Y),
      cumExt10Y: Math.round(cumExt10Y),
      extRoiYears
    };
  }, [simResult, forecastAdjustments, params]);

  const updateParam = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleLoadSampleProfile = async profile => {
    setSelectedSampleId(profile.id);
    setDatasetLabel(profile.filename);
    const invCount = profile.inverterCount || 1;
    const invKw = profile.inverterKw || (profile.powerKeeperModules <= 4 ? 50 : profile.powerKeeperModules <= 8 ? 80 : 125);
    const invPrice = getInverterDefaultPrice(invKw);
    setParams(prev => ({
      ...prev,
      contractedPowerKw: profile.contractedPowerKw,
      chargeLimitKw: profile.chargeLimitKw,
      pvCapacityKwp: profile.pvCapacityKwp,
      pvOrientation: profile.pvOrientation || 'south',
      pvRegion: profile.pvRegion || 'central',
      powerKeeperModules: Math.max(4, profile.powerKeeperModules),
      inverterCount: invCount,
      inverterModelKw: invKw,
      inverterPricePln: invPrice,
      bessPowerKw: invKw * invCount
    }));
    setSpanMode('1day');
    setHourRange({ startHour: 0, endHour: 24 });

    const embeddedCsv = BUILTIN_SAMPLE_CSV_MAP[profile.filename];
    if (embeddedCsv) {
      const delimiter = embeddedCsv.includes(';') ? ';' : ',';
      const papaRes = Papa.parse(embeddedCsv, { delimiter, skipEmptyLines: true });
      if (papaRes?.data?.length) {
        setRawCsvRows(papaRes.data);
        return;
      }
    }

    try {
      const res = await fetch(`/samples/${encodeURIComponent(profile.filename)}`);
      if (res.ok) {
        const text = await res.text();
        const delimiter = text.includes(';') ? ';' : ',';
        const papaRes = Papa.parse(text, { delimiter, skipEmptyLines: true });
        if (papaRes?.data?.length) {
          setRawCsvRows(papaRes.data);
          return;
        }
      }
    } catch (err) {
      console.warn('Fallback to demo generator for profile:', profile.id, err);
    }

    const rows = generateDemoDataset(profile.id, 15);
    setRawCsvRows(rows);
    addToast('info', t('Profil demonstracyjny załadowany', 'Demo Profile Loaded'), `${profile.label} • ${profile.contractedPowerKw} kW`);
  };

  const handleFileUpload = file => {
    if (!file) return;
    setSelectedSampleId('custom');
    setDatasetLabel(file.name);

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result;
      if (!text || typeof text !== 'string') {
        addToast(
          'error',
          t('Błąd pliku CSV', 'CSV File Error'),
          t('Plik jest pusty lub nieczytelny.', 'File is empty or unreadable.')
        );
        return;
      }

      // Detect delimiter by counting occurrences in preview
      const previewLines = text.slice(0, 4000);
      const semiCount = (previewLines.match(/;/g) || []).length;
      const commaCount = (previewLines.match(/,/g) || []).length;
      const tabCount = (previewLines.match(/\t/g) || []).length;

      let primaryDelim = ';';
      if (tabCount > semiCount && tabCount > commaCount) primaryDelim = '\t';
      else if (commaCount > semiCount) primaryDelim = ',';

      let papaRes = Papa.parse(text, { delimiter: primaryDelim, skipEmptyLines: true });
      let parsed = parseLoadProfileCsv(papaRes.data);

      // If initial delimiter failed, try alternate delimiter
      if (parsed.error && (primaryDelim === ';' || primaryDelim === ',')) {
        const altDelim = primaryDelim === ';' ? ',' : ';';
        const altPapa = Papa.parse(text, { delimiter: altDelim, skipEmptyLines: true });
        const altParsed = parseLoadProfileCsv(altPapa.data);
        if (!altParsed.error && altParsed.points?.length) {
          papaRes = altPapa;
          parsed = altParsed;
        }
      }

      if (parsed.error || !parsed.points?.length) {
        addToast(
          'error',
          t('Błąd formatu profilu', 'Profile Format Error'),
          parsed.message || t('Nie rozpoznano kolumn z datą i mocą/energią. Oczekiwany format: Data;Wartość', 'Could not recognize date and power columns. Expected: Date;Value')
        );
        return;
      }

      setRawCsvRows(papaRes.data);
      setSpanMode('1day');
      setHourRange({ startHour: 0, endHour: 24 });
      const dtMin = Math.round((parsed.detectedDt || 0.25) * 60);
      const ppeStr = parsed.ppeCode ? ` • PPE: ${parsed.ppeCode}` : '';
      let maxVal = 0;
      for (const pt of parsed.points) {
        if (pt.val > maxVal) maxVal = pt.val;
      }

      addToast(
        'success',
        t('Wczytano profil obciążenia', 'Load Profile Loaded'),
        `${file.name} (${parsed.totalRecords.toLocaleString()} ${t('rekordów', 'records')}, ${dtMin} min${ppeStr}) • Pik: ${maxVal.toFixed(1)} kW`
      );
    };

    reader.onerror = () => {
      addToast(
        'error',
        t('Błąd czytania CSV', 'CSV Read Error'),
        t('Wystąpił błąd odczytu pliku.', 'Failed to read file.')
      );
    };

    reader.readAsText(file);
  };

  useEffect(() => {
    if (DEFAULT_INITIAL_CSV) {
      const delimiter = DEFAULT_INITIAL_CSV.includes(';') ? ';' : ',';
      const papaRes = Papa.parse(DEFAULT_INITIAL_CSV, { delimiter, skipEmptyLines: true });
      if (papaRes?.data?.length) {
        setRawCsvRows(papaRes.data);
        setDatasetLabel('1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv');
        return;
      }
    }

    fetch('/samples/1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv')
      .then(res => (res.ok ? res.text() : null))
      .then(text => {
        if (text) {
          const delimiter = text.includes(';') ? ';' : ',';
          const papaRes = Papa.parse(text, { delimiter, skipEmptyLines: true });
          if (papaRes?.data?.length) {
            setRawCsvRows(papaRes.data);
            setDatasetLabel('1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv');
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleDrop = e => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleSaveScenario = () => {
    if (!simResult) return;
    const m = simResult.metrics;
    let label = params.enableBess
      ? `PowerKeeper ${m.nominalBessCapacityKwh} kWh (${m.powerKeeperTowers || m.powerKeeperModules / 4}w) + ${m.inverterCount || 1}× Falownik ${m.inverterModelKw} kW (${m.effectiveBessPowerKw} kW) + PV ${params.pvCapacityKwp} kWp`
      : t(`Bez BESS (Tylko PV ${params.pvCapacityKwp} kWp)`, `Without BESS (PV Only ${params.pvCapacityKwp} kWp)`);
    if (params.enableBess) {
      if (params.enablePeakShaving && !params.enableArbitrage) {
        label += ` [Tylko Peak Shaving]`;
      } else if (!params.enablePeakShaving && params.enableArbitrage) {
        label += ` [Tylko Arbitraż]`;
      } else if (!params.enablePeakShaving && !params.enableArbitrage) {
        label += ` [Bez funkcji BESS]`;
      }
    }
    setSavedScenarios(prev => [
      ...prev,
      {
        id: Date.now(),
        label,
        enableBess: params.enableBess,
        enablePeakShaving: params.enablePeakShaving,
        enableArbitrage: params.enableArbitrage,
        modules: m.powerKeeperModules,
        towers: m.powerKeeperTowers,
        capacityKwh: m.nominalBessCapacityKwh,
        inverterCount: m.inverterCount || 1,
        inverterModelKw: m.inverterModelKw,
        inverterPricePln: m.inverterPricePln,
        batteryCapexPln: m.batteryCapexPln,
        bessPowerKw: m.effectiveBessPowerKw,
        pvKwp: params.pvCapacityKwp,
        capexPln: m.totalCapexPln,
        maxKwBefore: m.maxKwBefore,
        maxKwAfter: m.maxKwAfter,
        powerShavedKw: m.powerShavedKw,
        basketBefore: m.basketBefore,
        basketAfter: m.basketAfter,
        annualUreCapacityFeeSavingsPln: m.annualUreCapacityFeeSavingsPln,
        annualAvoidedOsdPenaltyPln: m.annualAvoidedOsdPenaltyPln,
        annualPeakShavingSavingsPln: m.annualPeakShavingSavingsPln,
        annualEnergySavingsBessOnlyPln: m.annualEnergySavingsBessOnlyPln,
        annualTotalSavingsPln: m.annualTotalSavingsPln,
        annualTotalCostWithoutBessPln: m.annualTotalCostWithoutBessPln,
        roiYears: m.roiYears,
        roiCombinedYears: m.roiCombinedYears,
        selfSufficiencyPct: m.selfSufficiencyPct
      }
    ]);
    addToast('success', t('Zapisano scenariusz', 'Scenario Saved'), `${label.slice(0, 50)}...`);
  };

  const handleSyncOnlineWeather = async () => {
    setIsWeatherLoading(true);
    try {
      const lat = params.pvRegion === 'south' ? 50.06 : params.pvRegion === 'north' ? 54.35 : 52.23;
      const lon = params.pvRegion === 'south' ? 19.94 : params.pvRegion === 'north' ? 18.65 : 21.01;
      const regionLabel =
        params.pvRegion === 'south'
          ? t('Południe (Kraków/Katowice)', 'South (Krakow/Katowice)')
          : params.pvRegion === 'north'
          ? t('Północ (Gdańsk)', 'North (Gdansk)')
          : t('Centrum (Warszawa)', 'Central (Warsaw)');

      let startDate, endDate;
      if (availableDays && availableDays.length > 0) {
        startDate = availableDays[0].dateStr;
        const lastIdx = Math.min(availableDays.length - 1, 30);
        endDate = availableDays[lastIdx].dateStr;
      }

      const res = await fetchSolarRadiationOpenMeteo({ latitude: lat, longitude: lon, startDate, endDate });
      if (res && res.success && res.data) {
        const count = res.data.time?.length || 0;
        setParams(prev => ({
          ...prev,
          enableOnlineWeather: true,
          onlineWeatherData: res.data
        }));
        addToast(
          'success',
          t('Pomyślnie zsynchronizowano dane nasłonecznienia z satelity Open-Meteo!', 'Successfully synced irradiance from Open-Meteo satellite!'),
          `${regionLabel} (${lat}°N, ${lon}°E) • ${count} ${t('godzin satelitarnych', 'satellite hours')}`
        );
      } else {
        addToast(
          'warning',
          t('Błąd API Open-Meteo: użyto modelu analitycznego offline.', 'Open-Meteo API fallback: using offline model.'),
          res?.error || t('Serwer Open-Meteo chwilowo niedostępny.', 'Open-Meteo temporarily unavailable.')
        );
      }
    } catch (err) {
      addToast('error', t('Błąd połączenia z API pogodowym.', 'Weather API connection error.'), err.message);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const exportCsvReport = () => {
    if (!simResult) return;
    const m = simResult.metrics;
    const currScale = currency === 'EUR' ? 1 / EUR_PLN_RATE : 1;
    const curr = currency;
    const rows = [
      [t('Parametr Audytu PowerKeeper', 'PowerKeeper Audit Parameter'), t('Wartość', 'Value'), t('Jednostka', 'Unit'), t('Źródło / Metodologia', 'Source / Methodology')],
      [t('Waluta audytu', 'Audit Currency'), curr, curr === 'EUR' ? `1 EUR = ${EUR_PLN_RATE} PLN` : 'PLN', 'ECB / NBP Standard'],
      [t('Punkt Poboru Energii (PPE)', 'Metering Point (PPE)'), m.ppeCode, '-', 'CSV / OSD'],
      [t('Krok pomiarowy (dt)', 'Metering Interval (dt)'), m.detectedDt, 'h', 'Auto-detect (0.25h / 1.0h)'],
      [t('Architektura BESS', 'BESS Architecture'), 'PowerKeeper DC-Coupled', '-', 'references/powerkeeper_specs.md'],
      [t('Tryb Peak Shaving (<10 ms)', 'Peak Shaving Mode (<10 ms)'), params.enablePeakShaving ? t('WŁĄCZONY', 'ACTIVE') : t('WYŁĄCZONY', 'DISABLED'), '-', 'Obcinanie szczytów i ochrona przed karami OSD'],
      [t('Tryb Arbitrażu i Autokonsumpcji', 'Arbitrage & Self-Consumption Mode'), params.enableArbitrage ? t('WŁĄCZONY', 'ACTIVE') : t('WYŁĄCZONY', 'DISABLED'), '-', 'Przesuwanie energii w czasie (dolina -> szczyt)'],
      [t('Liczba wież PowerKeeper', 'Number of PowerKeeper Towers'), m.powerKeeperTowers, t('wieże', 'towers'), '1 wieża = 4 moduły (50 kWh)'],
      [t('Liczba modułów 12,5 kWh', 'Number of 12.5 kWh Modules'), m.powerKeeperModules, t('szt.', 'pcs'), 'Moduł bazowy LFP = 12,5 kWh (min. 4 moduły)'],
      [t('Pojemność całkowita PowerKeeper', 'Total PowerKeeper Capacity'), m.nominalBessCapacityKwh, 'kWh', 'Wielokrotność 50 kWh (wieże po 4 moduły)'],
      [t('Falowniki hybrydowe (Kaskada)', 'Hybrid Inverter Cascade'), `${m.inverterCount || 1}× SH${m.inverterModelKw}CX (${m.effectiveBessPowerKw} kW PCS)`, 'kW', 'Sungrow PowerKeeper (50 / 80 / 125 kW)'],
      [t('Moc znamionowa inwertera', 'Inverter Rated Power'), m.effectiveBessPowerKw, 'kW', 'Czas reakcji DSO Guard < 10 ms'],
      [t('Moc instalacji PV (DC)', 'PV System Capacity (DC)'), params.pvCapacityKwp, 'kWp', 'Bezpośrednie ładowanie szyny DC'],
      [t('Orientacja modułów PV', 'PV Modules Orientation'), params.pvOrientation === 'east-west' ? t('Wschód–Zachód', 'East-West') : t('Południe', 'South'), '-', 'Profil generacji nasłonecznienia'],
      [t('Region nasłonecznienia PV', 'PV Solar Region'), params.pvRegion === 'south' ? t('Południe (~1080 kWh/kWp)', 'South (~1080 kWh/kWp)') : params.pvRegion === 'north' ? t('Północ (~950 kWh/kWp)', 'North (~950 kWh/kWp)') : t('Środek (~1020 kWh/kWp)', 'Central (~1020 kWh/kWp)'), '-', 'Nasłonecznienie wg IMGW/PVGIS'],
      [t('Moc umowna OSD', 'DSO Contracted Power'), m.contractedPowerKw, 'kW', 'Granica przekroczeń 15-min'],
      [t('Szczyt poboru PRZED BESS', 'Peak Demand BEFORE BESS'), m.maxKwBefore, 'kW', 'Profil bazowy'],
      [t('Szczyt poboru PO PowerKeeper', 'Peak Demand AFTER PowerKeeper'), m.maxKwAfter, 'kW', 'Po Peak Shavingu < 10 ms'],
      [t('Zredukowany szczyt mocy (Peak Shaving)', 'Shaved Peak Demand'), m.powerShavedKw, 'kW', 'Redukcja mocy szczytowej'],
      [t('Koszyk Mocowy URE PRZED / PO', 'URE Capacity Basket BEFORE / AFTER'), `${m.basketBefore} -> ${m.basketAfter}`, '-', 'URE Rynek Mocy (K1=0.17, K2=0.50, K3=0.83, K4=1.00)'],
      [t('Oszczędność na Opłacie Mocowej URE', 'URE Capacity Fee Savings'), Math.round(m.annualUreCapacityFeeSavingsPln * currScale), `${curr}/yr`, 'Stawka URE (07:00-22:00 dni robocze)'],
      [t('Uniknięte kary OSD (10x stawka sieciowa)', 'Avoided DSO 10x Penalties'), Math.round(m.annualAvoidedOsdPenaltyPln * currScale), `${curr}/yr`, 'Kara = Delta_P * Stawka_sieciowa * 10'],
      [t('Łączny zysk Peak Shaving (Kary + Moc)', 'Total Peak Shaving Profit'), Math.round(m.annualPeakShavingSavingsPln * currScale), `${curr}/yr`, 'Redukcja kosztów mocy OSD'],
      [t('Zysk z arbitrażu BESS (autokonsumpcja/ToU)', 'BESS Direct Arbitrage Profit'), Math.round(m.annualEnergySavingsBessOnlyPln * currScale), `${curr}/yr`, 'ToU / Dynamic RCEm + BESS'],
      [t('Całkowite roczne oszczędności BESS', 'Total Standalone BESS Annual Savings'), Math.round(m.annualTotalSavingsPln * currScale), `${curr}/yr`, 'Peak Shaving + URE + Arbitraż BESS'],
      [t('Cena jednostkowa BESS za 1 kWh', 'BESS Unit Price per 1 kWh'), Math.round(params.pricePerKwhBess * currScale), `${curr}/kWh`, 'Moduły magazynu energii LFP'],
      [t('Koszt modułów bateryjnych BESS', 'BESS Battery Cost'), Math.round(m.batteryCapexPln * currScale), curr, `${m.nominalBessCapacityKwh} kWh × cena/kWh`],
      [t('Koszt falowników hybrydowych', 'Hybrid Inverters Cost'), Math.round(m.inverterPricePln * currScale), curr, `${m.inverterCount || 1}× falownik ${m.inverterModelKw} kW`],
      [t('Łączny CAPEX PowerKeeper (Bateria + Falowniki)', 'Total PowerKeeper CAPEX (Battery + Inverters)'), Math.round(m.totalCapexPln * currScale), curr, 'Bateria + Falowniki hybrydowe'],
      [t('Prosty czas zwrotu BESS (ROI)', 'BESS Standalone Simple Payback (ROI)'), m.roiYears, t('lat', 'years'), 'BESS CAPEX / Oszczędności BESS'],
      ...(params.pvCapacityKwp > 0 ? [
        [t('Szacowany CAPEX instalacji PV', 'Estimated PV System CAPEX'), Math.round(m.pvEstimatedCapexPln * currScale), curr, `${params.pvCapacityKwp} kWp × 2800 PLN/kWp`],
        [t('Łączny CAPEX projektu (PV + BESS)', 'Total Combined Project CAPEX (PV + BESS)'), Math.round(m.totalCombinedCapexPln * currScale), curr, 'CAPEX BESS + CAPEX PV'],
        [t('Łączne roczne oszczędności (PV + BESS)', 'Total Combined Annual Savings (PV + BESS)'), Math.round(m.annualSavingsCombinedPvBessPln * currScale), `${curr}/yr`, 'Generacja PV + Oszczędności BESS'],
        [t('Łączny czas zwrotu projektu (PV + BESS)', 'Combined Project Payback (PV + BESS)'), m.roiCombinedYears, t('lat', 'years'), 'Total Combined CAPEX / Total Combined Savings']
      ] : [])
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audyt_PowerKeeper_${m.nominalBessCapacityKwh}kWh_${currency}_${lang.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const m = simResult?.metrics;
  const activeSampleProfile = BUILTIN_SAMPLE_PROFILES.find(p => p.id === selectedSampleId);
  const factorsIncludedList = FORECAST_FACTORS_INCLUDED_I18N[lang] || FORECAST_FACTORS_INCLUDED_I18N.pl;
  const factorsExternalList = FORECAST_FACTORS_EXTERNAL_I18N[lang] || FORECAST_FACTORS_EXTERNAL_I18N.pl;

  // Chart styling based on theme
  const isDark = theme === 'dark';
  const chartGridStroke = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.22)';
  const chartAxisStroke = isDark ? '#94a3b8' : '#64748b';
  const chartTooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    border: isDark ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.78rem',
    color: isDark ? '#f8fafc' : '#0f172a',
    boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)'
  };

  return (
    <div className="app-shell">
      {/* LEFT SIDEBAR: SYSTEM CONFIGURATION */}
      <aside className="sidebar">
        <div className="brand-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="brand-icon">
              <BatteryCharging size={22} color="#020617" strokeWidth={2.5} />
            </div>
            <div>
              <div className="brand-title">PowerKeeper Studio</div>
              <div className="brand-subtitle">
                {t('Audyt BESS 15-Min & 1h • DC-Coupled', '15-Min & 1h BESS Audit • DC-Coupled')}
              </div>
            </div>
          </div>
        </div>

        {/* 1. UPLOAD & BUILT-IN SAMPLE PROFILES */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span>{t('1. Profil Pomiarowy (15-min / 1h)', '1. Load Profile (15-min / 1h)')}</span>
            <Upload size={14} />
          </div>

          <div
            className={`dropzone ${dragActive ? 'active' : ''}`}
            onDragOver={e => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={e => handleFileUpload(e.target.files?.[0])}
            />
            <div className="dropzone-title">
              {t('Wgraj własny plik CSV (15-min / 1h)', 'Upload Custom CSV File (15-min / 1h)')}
            </div>
            <div className="dropzone-sub">
              {t('Akceptuje formaty OSD (Tauron, PGE, Enea, Energa)', 'Supports DSO/OSD formats (15-min & hourly)')}
            </div>
          </div>

          {/* 5 Built-in 15-min Sample Profiles */}
          <div style={{ marginTop: '0.6rem' }}>
            <div className="field-label" style={{ marginBottom: '0.35rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Factory size={13} color="var(--accent-primary)" />
                {t('Gotowe profile 15-min (kliknij lub pobierz):', 'Sample 15-min profiles (click or download):')}
              </span>
            </div>
            <div className="preset-chips">
              {BUILTIN_SAMPLE_PROFILES.map(prof => (
                <button
                  key={prof.id}
                  className={`preset-chip ${selectedSampleId === prof.id ? 'active' : ''}`}
                  onClick={() => handleLoadSampleProfile(prof)}
                  title={lang === 'en' ? prof.descriptionEn : prof.description}
                >
                  {lang === 'en' ? prof.shortNameEn : prof.shortName}
                </button>
              ))}
            </div>

            {activeSampleProfile && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.55rem',
                  borderRadius: '8px',
                  background: 'rgba(14, 165, 233, 0.08)',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  {lang === 'en' ? activeSampleProfile.titleEn : activeSampleProfile.title}
                </div>
                <div>{lang === 'en' ? activeSampleProfile.descriptionEn : activeSampleProfile.description}</div>
                <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a
                    href={
                      BUILTIN_SAMPLE_CSV_MAP[activeSampleProfile.filename]
                        ? `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(BUILTIN_SAMPLE_CSV_MAP[activeSampleProfile.filename])}`
                        : `/samples/${activeSampleProfile.filename}`
                    }
                    download={activeSampleProfile.filename}
                    style={{
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Download size={12} /> {t('Pobierz ten plik CSV', 'Download this CSV')}
                  </a>
                  <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)' }}>
                    {t('2976 wierszy (15m)', '2,976 rows (15m)')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="field-group" style={{ marginTop: '0.5rem' }}>
            <div className="field-label">
              <span>{t('Standard profilu', 'Profile Standard')}</span>
              <span className="mono" style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                15 min (OSD 15-min)
              </span>
            </div>
            <div
              style={{
                fontSize: '0.74rem',
                color: 'var(--text-muted)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '6px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>{t('Jednostka obliczeniowa:', 'Calculation unit:')} <strong style={{ color: 'var(--text-primary)' }}>kW (moc 15m)</strong></span>
              <span className="mono" style={{ color: 'var(--accent-primary)', fontSize: '0.7rem' }}>
                dt = 0.25h
              </span>
            </div>
          </div>
        </div>

        {/* 2. SCENARIO MODE: WITH BESS vs WITHOUT BESS */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            role="button"
            tabIndex={0}
            aria-expanded={isScenarioSectionOpen}
            onClick={() => setIsScenarioSectionOpen(prev => !prev)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIsScenarioSectionOpen(prev => !prev)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Layers size={14} color="var(--accent-primary)" />
              <span>{t('2. Tryb Scenariusza & Funkcje', '2. Scenario Mode & Functions')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {isScenarioSectionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {!isScenarioSectionOpen ? (
            /* COLLAPSED SCENARIO VIEW: SHOWS SCENARIO DESCRIPTION */
            <div
              style={{
                cursor: 'pointer',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                background: params.enableBess ? 'rgba(14, 165, 233, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${params.enableBess ? 'rgba(14, 165, 233, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                fontSize: '0.74rem'
              }}
              onClick={() => setIsScenarioSectionOpen(true)}
              title={t('Kliknij, aby zmienić tryb i funkcje scenariusza', 'Click to change scenario mode & functions')}
            >
              <div style={{ fontWeight: 700, color: params.enableBess ? 'var(--accent-primary)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{params.enableBess ? t('🔋 Z Magazynem PowerKeeper', '🔋 With PowerKeeper BESS') : t('⚠️ Bez BESS (Koszty Bazowe)', '⚠️ Without BESS (Baseline Costs)')}</span>
                <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{t('Zmień ▼', 'Edit ▼')}</span>
              </div>
              {params.enableBess && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span>Peak Shaving:</span>
                  <strong style={{ color: params.enablePeakShaving ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    {params.enablePeakShaving ? t('WŁ (<10ms)', 'ON (<10ms)') : t('WYŁ', 'OFF')}
                  </strong>
                  <span>• Arbitraż:</span>
                  <strong style={{ color: params.enableArbitrage ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                    {params.enableArbitrage ? t('WŁ', 'ON') : t('WYŁ', 'OFF')}
                  </strong>
                </div>
              )}
            </div>
          ) : (
            /* EXPANDED FULL SCENARIO CONTROLS */
            <>
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${params.enableBess ? 'active' : ''}`}
                  onClick={() => updateParam('enableBess', true)}
                >
                  {t('Z Magazynem PowerKeeper', 'With PowerKeeper BESS')}
                </button>
                <button
                  className={`mode-btn ${!params.enableBess ? 'active-warn' : ''}`}
                  onClick={() => updateParam('enableBess', false)}
                >
                  {t('Bez BESS (Koszty Bazowe)', 'Without BESS (Baseline Costs)')}
                </button>
              </div>

              {params.enableBess && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {t('Funkcje Magazynu (Kliknij, aby przetestować):', 'Storage Functions (Click to test):')}
                  </div>

                  {/* Peak Shaving Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '6px',
                      background: params.enablePeakShaving ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-input, rgba(0,0,0,0.2))',
                      border: `1px solid ${params.enablePeakShaving ? 'rgba(59, 130, 246, 0.45)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => updateParam('enablePeakShaving', !params.enablePeakShaving)}
                    title={t('Włącz/wyłącz obcinanie szczytów mocy i eliminację 10x kar OSD', 'Toggle peak shaving & 10x DSO penalties elimination')}
                  >
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: params.enablePeakShaving ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Zap size={13} />
                        {t('Peak Shaving (<10 ms)', 'Peak Shaving (<10 ms)')}
                      </div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {params.enablePeakShaving
                          ? t('Kary OSD redukowane do 0 zł', 'DSO penalties reduced to 0')
                          : t('Wyłączony (przekroczenia mocy)', 'Disabled (exceedances active)')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`preset-chip ${params.enablePeakShaving ? 'active' : ''}`}
                      style={{
                        margin: 0,
                        padding: '0.18rem 0.55rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: params.enablePeakShaving ? 'var(--accent-primary)' : 'transparent',
                        color: params.enablePeakShaving ? '#fff' : 'var(--text-muted)',
                        borderColor: params.enablePeakShaving ? 'var(--accent-primary)' : 'var(--border-color)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateParam('enablePeakShaving', !params.enablePeakShaving);
                      }}
                    >
                      {params.enablePeakShaving ? t('WŁ', 'ON') : t('WYŁ', 'OFF')}
                    </button>
                  </div>

                  {/* Arbitrage Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.7rem',
                      borderRadius: '6px',
                      background: params.enableArbitrage ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-input, rgba(0,0,0,0.2))',
                      border: `1px solid ${params.enableArbitrage ? 'rgba(16, 185, 129, 0.45)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => updateParam('enableArbitrage', !params.enableArbitrage)}
                    title={t('Włącz/wyłącz arbitraż cenowy (dolina/szczyt) i przesunięcie autokonsumpcji', 'Toggle price arbitrage & self-consumption')}
                  >
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: params.enableArbitrage ? 'var(--accent-emerald)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <TrendingUp size={13} />
                        {t('Arbitraż & Autokonsumpcja', 'Arbitrage & Self-Consumption')}
                      </div>
                      <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                        {params.enableArbitrage
                          ? t('Cykle ładowania w dolinie i z PV', 'Valley/PV charge & peak discharge')
                          : t('Wyłączony (brak cykli taryfowych)', 'Disabled (no spread cycling)')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`preset-chip ${params.enableArbitrage ? 'active' : ''}`}
                      style={{
                        margin: 0,
                        padding: '0.18rem 0.55rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: params.enableArbitrage ? 'var(--accent-emerald)' : 'transparent',
                        color: params.enableArbitrage ? '#fff' : 'var(--text-muted)',
                        borderColor: params.enableArbitrage ? 'var(--accent-emerald)' : 'var(--border-color)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateParam('enableArbitrage', !params.enableArbitrage);
                      }}
                    >
                      {params.enableArbitrage ? t('WŁ', 'ON') : t('WYŁ', 'OFF')}
                    </button>
                  </div>
                </div>
              )}

              {/* CLOSE / COLLAPSE BUTTON */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.55rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsScenarioSectionOpen(false)}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                >
                  ▲ {t('Zwiń scenariusz', 'Collapse scenario')}
                </button>
              </div>
            </>
          )}
        </div>

        {/* 3. POWERKEEPER 12.5 kWh MODULAR CONFIGURATION & INVERTER */}
        {params.enableBess && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              role="button"
              tabIndex={0}
              aria-expanded={isBessSectionOpen}
              onClick={() => setIsBessSectionOpen(prev => !prev)}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIsBessSectionOpen(prev => !prev)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <BatteryCharging size={14} color="var(--accent-emerald)" />
                <span>{t('3. Dobór PowerKeeper & Falownik', '3. PowerKeeper & Inverter Sizing')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {isBessSectionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {!isBessSectionOpen ? (
              /* COLLAPSED VIEW: ONLY SELECTION & TOTAL CAPEX, NO UNIT PRICES */
              <div
                style={{
                  cursor: 'pointer',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.74rem'
                }}
                onClick={() => setIsBessSectionOpen(true)}
                title={t('Kliknij, aby zmienić konfigurację modułów, falowników i ceny', 'Click to edit sizing & pricing')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ color: 'var(--accent-emerald)', fontSize: '0.78rem' }}>
                    PowerKeeper {(params.powerKeeperModules * POWERKEEPER_MODULE_KWH).toFixed(0)} kWh ({Math.round(params.powerKeeperModules / 4)}w)
                  </strong>
                  <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{t('Zmień ▼', 'Edit ▼')}</span>
                </div>
                <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)' }}>
                  {t('Falowniki:', 'Inverters:')}{' '}
                  <strong className="mono" style={{ color: 'var(--accent-primary)' }}>
                    {params.inverterCount || 1}× SH{params.inverterModelKw || 50}CX ({((params.inverterCount || 1) * (params.inverterModelKw || 50))} kW PCS)
                  </strong>
                </div>
                <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('Łączny CAPEX:', 'Total CAPEX:')}</span>
                  <span className="mono" style={{ fontWeight: 800, color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>
                    {fmtMoney(
                      (params.powerKeeperModules * POWERKEEPER_MODULE_KWH) * params.pricePerKwhBess +
                      (params.inverterCount || 1) * (params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50))
                    )}
                  </span>
                </div>
              </div>
            ) : (
              /* EXPANDED FULL SIZING & PRICING CONTROLS */
              <>
                {/* MODULAR TOWERS PRESET CHIPS (MIN 4 MODULES = 50 KWH PER TOWER) */}
                <div className="field-label" style={{ marginBottom: '0.35rem' }}>
                  <span>{t('Pojemność (Wieże 50 kWh / 4 mod.):', 'Capacity (50 kWh / 4-Mod Towers):')}</span>
                </div>
                <div className="preset-chips">
                  {POWERKEEPER_PRESETS.map(preset => {
                    const isSelected = params.powerKeeperModules === preset.modules && (params.inverterCount || 1) === (preset.inverterCount || 1);
                    return (
                      <button
                        key={preset.id}
                        className={`preset-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          updateParam('powerKeeperModules', preset.modules);
                          const invKw = preset.defaultInverterKw || 50;
                          const invCnt = preset.inverterCount || 1;
                          updateParam('inverterCount', invCnt);
                          updateParam('inverterModelKw', invKw);
                          updateParam('bessPowerKw', invKw * invCnt);
                          updateParam('inverterPricePln', getInverterDefaultPrice(invKw));
                        }}
                        title={lang === 'en' ? preset.nameEn : preset.name}
                      >
                        {preset.capacityKwh} kWh ({preset.towers}w - {preset.modules}m){preset.inverterCount > 1 ? ` [${preset.inverterCount}x]` : ''}
                      </button>
                    );
                  })}
                </div>

                {/* MODULES SLIDER (MIN 4, STEP 4, MAX 80 = 20 WIEŻ = 1000 KWH) */}
                <div className="field-group" style={{ marginTop: '0.55rem' }}>
                  <div className="field-label">
                    <span>{t('Liczba modułów (min. 4 = 1 wieża)', 'Number of modules (min. 4 = 1 tower)')}</span>
                    <strong className="mono" style={{ color: 'var(--accent-primary)' }}>
                      {Math.round(params.powerKeeperModules / 4)} {t('wieża', 'tower')}{params.powerKeeperModules > 4 ? (params.powerKeeperModules < 20 ? (lang === 'en' ? 's' : 'e') : (lang === 'en' ? 's' : 'ż')) : ''} ({params.powerKeeperModules} {t('mod.', 'mods')} = {(params.powerKeeperModules * POWERKEEPER_MODULE_KWH).toFixed(0)} kWh)
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="80"
                    step="4"
                    value={params.powerKeeperModules}
                    onChange={e => {
                      const mods = Number(e.target.value);
                      updateParam('powerKeeperModules', mods);
                      const towers = Math.round(mods / 4);
                      if (towers > 15 && (params.inverterCount || 1) < 4) {
                        updateParam('inverterCount', 4);
                        updateParam('inverterModelKw', 125);
                        updateParam('bessPowerKw', 500);
                        updateParam('inverterPricePln', getInverterDefaultPrice(125));
                      } else if (towers > 10 && (params.inverterCount || 1) < 3) {
                        updateParam('inverterCount', 3);
                        updateParam('inverterModelKw', 125);
                        updateParam('bessPowerKw', 375);
                        updateParam('inverterPricePln', getInverterDefaultPrice(125));
                      } else if (towers > 4 && (params.inverterCount || 1) < 2) {
                        updateParam('inverterCount', 2);
                        updateParam('inverterModelKw', 125);
                        updateParam('bessPowerKw', 250);
                        updateParam('inverterPricePln', getInverterDefaultPrice(125));
                      }
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* INVERTER COUNT SELECTION (1x, 2x, 3x, 4x KASKADA) */}
                <div className="field-group" style={{ marginTop: '0.65rem' }}>
                  <div className="field-label">
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('Liczba falowników w kaskadzie:', 'Cascade Inverters Count:')}
                    </span>
                    <span className="mono" style={{ color: 'var(--accent-primary)', fontSize: '0.72rem', fontWeight: 700 }}>
                      {params.inverterCount || 1}× ({((params.inverterCount || 1) * (params.inverterModelKw || 50))} kW PCS)
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
                    {[1, 2, 3, 4].map(cnt => {
                      const isSel = (params.inverterCount || 1) === cnt;
                      const totalKw = cnt * (params.inverterModelKw || 50);
                      return (
                        <button
                          key={cnt}
                          type="button"
                          className={`preset-chip ${isSel ? 'active' : ''}`}
                          style={{ margin: 0, textAlign: 'center', justifyContent: 'center', fontSize: '0.72rem', padding: '0.35rem 0.2rem' }}
                          onClick={() => {
                            updateParam('inverterCount', cnt);
                            updateParam('bessPowerKw', totalKw);
                          }}
                        >
                          {cnt}× ({totalKw} kW)
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* INVERTER MODEL SELECTION (50 kW / 80 kW / 125 kW) */}
                <div className="field-group" style={{ marginTop: '0.65rem' }}>
                  <div className="field-label">
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('⚡ Model Falownika Hybrydowego:', '⚡ Hybrid Inverter Model:')}
                    </span>
                    <span className="mono" style={{ color: 'var(--accent-emerald)', fontSize: '0.7rem' }}>
                      {params.inverterModelKw || 50} kW / szt.
                    </span>
                  </div>
                  <div className="inverter-selector-grid">
                    {POWERKEEPER_INVERTER_MODELS.map(inv => {
                      const isSelected = (params.inverterModelKw || 50) === inv.powerKw;
                      const priceFormatted = fmtMoney(inv.defaultPricePln);
                      return (
                        <button
                          key={inv.powerKw}
                          className={`inverter-btn ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            updateParam('inverterModelKw', inv.powerKw);
                            updateParam('bessPowerKw', inv.powerKw * (params.inverterCount || 1));
                            updateParam('inverterPricePln', inv.defaultPricePln);
                          }}
                          title={`${inv.label} — ${lang === 'en' ? inv.descEn : inv.desc} (~${priceFormatted})`}
                        >
                          <div className="inverter-btn-title">
                            {inv.label} {isSelected && '✓'}
                          </div>
                          <div className="inverter-btn-sub">
                            ~{priceFormatted}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DEDICATED HIGHLIGHTED CARD: BESS PRICE PER KWH & INVERTER CAPEX */}
                <div className="price-card-highlight">
                  <div className="price-card-header">
                    <span className="price-card-title">
                      <Coins size={13} />
                      {t('Cena za 1 kWh i Koszt Inwestycji', 'Price per 1 kWh & Investment Cost')}
                    </span>
                    <span className="info-badge" style={{ fontSize: '0.66rem' }}>
                      ROI Engine
                    </span>
                  </div>

                  {/* BESS PRICE PER KWH INPUT */}
                  <div className="field-group">
                    <div className="field-label">
                      <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {t('Cena BESS za 1 kWh pojemności:', 'BESS Price per 1 kWh capacity:')}
                      </span>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {fmtUnit(params.pricePerKwhBess, '/kWh', 0)}
                      </span>
                    </div>
                    <input
                      type="number"
                      className="number-input mono"
                      style={{ fontWeight: 700 }}
                      value={currency === 'EUR' ? Math.round(params.pricePerKwhBess / EUR_PLN_RATE) : params.pricePerKwhBess}
                      min="100"
                      max="5000"
                      step={currency === 'EUR' ? 10 : 25}
                      onChange={e => {
                        const val = Number(e.target.value);
                        updateParam('pricePerKwhBess', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                      }}
                    />
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {t('Koszt modułów bateryjnych:', 'Battery modules cost:')}{' '}
                      <strong className="mono" style={{ color: 'var(--text-primary)' }}>
                        {(params.powerKeeperModules * POWERKEEPER_MODULE_KWH).toFixed(0)} kWh × {fmtUnit(params.pricePerKwhBess, '/kWh', 0)} = {fmtMoney((params.powerKeeperModules * POWERKEEPER_MODULE_KWH) * params.pricePerKwhBess)}
                      </strong>
                    </div>
                  </div>

                  {/* INVERTER PRICE INPUT */}
                  <div className="field-group" style={{ marginTop: '0.45rem' }}>
                    <div className="field-label">
                      <span>
                        {t(`Cena 1 falownika (${params.inverterModelKw || 50} kW):`, `Single Inverter Price (${params.inverterModelKw || 50} kW):`)}
                      </span>
                      <span className="mono" style={{ color: 'var(--accent-emerald)' }}>
                        {(params.inverterCount || 1) > 1 
                          ? `${params.inverterCount || 1}× ${fmtMoney(params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50))} = ${fmtMoney((params.inverterCount || 1) * (params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50)))}`
                          : fmtMoney(params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50))
                        }
                      </span>
                    </div>
                    <input
                      type="number"
                      className="number-input mono"
                      value={currency === 'EUR' ? Math.round((params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50)) / EUR_PLN_RATE) : (params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50))}
                      min="1000"
                      max="200000"
                      step={currency === 'EUR' ? 200 : 1000}
                      onChange={e => {
                        const val = Number(e.target.value);
                        updateParam('inverterPricePln', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                      }}
                    />
                    {(params.inverterCount || 1) > 1 && (
                      <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {t('Łącznie kaskada falowników:', 'Total inverter cascade:')}{' '}
                        <strong className="mono" style={{ color: 'var(--accent-emerald)' }}>
                          {params.inverterCount || 1} szt. × {fmtMoney(params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50))} = {fmtMoney((params.inverterCount || 1) * (params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50)))}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* SUMMARY CAPEX BAR */}
                  <div className="capex-summary-bar">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{t('Łączny CAPEX PowerKeeper:', 'Total PowerKeeper CAPEX:')}</span>
                      <span className="capex-summary-total mono">
                        {fmtMoney(
                          (params.powerKeeperModules * POWERKEEPER_MODULE_KWH) * params.pricePerKwhBess +
                          (params.inverterCount || 1) * (params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50))
                        )}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {t(
                        `= Bateria (${fmtMoney((params.powerKeeperModules * POWERKEEPER_MODULE_KWH) * params.pricePerKwhBess)}) + Falowniki (${fmtMoney((params.inverterCount || 1) * (params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50)))})`,
                        `= Battery (${fmtMoney((params.powerKeeperModules * POWERKEEPER_MODULE_KWH) * params.pricePerKwhBess)}) + Inverters (${fmtMoney((params.inverterCount || 1) * (params.inverterPricePln || getInverterDefaultPrice(params.inverterModelKw || 50)))})`
                      )}
                    </div>
                  </div>
                </div>

                {/* CLOSE / COLLAPSE BUTTON */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.55rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsBessSectionOpen(false)}
                    style={{ padding: '0.22rem 0.6rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <ChevronUp size={13} />
                    {t('Zwiń dobór magazynu ▲', 'Collapse sizing ▲')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 4. PV DC-COUPLED & OSD CONTRACTED POWER */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span>{t('4. Fotowoltaika (DC) & Moc Umowna OSD', '4. Solar PV (DC) & DSO Contracted Power')}</span>
            <Sun size={14} />
          </div>

          {/* PV Source Mode Selector */}
          <div className="field-group" style={{ marginBottom: '0.65rem' }}>
            <div className="field-label">
              <span>{t('Źródło Generacji PV:', 'PV Generation Source:')}</span>
              <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {params.pvMode === 'client_actual'
                  ? t('Odczyt z OSD', 'Client DSO Data')
                  : params.pvMode === 'client_plus_expansion'
                  ? t('Rozbudowa (Istn.+Nowa)', 'Expansion')
                  : t('Czysta Symulacja', 'Pure Simulation')}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem' }}>
              <button
                type="button"
                className={`preset-chip ${(params.pvMode || 'simulation_pure') === 'simulation_pure' ? 'active' : ''}`}
                style={{ margin: 0, padding: '0.3rem 0.15rem', fontSize: '0.68rem', justifyContent: 'center' }}
                onClick={() => updateParam('pvMode', 'simulation_pure')}
                title={t('Czysta symulacja geometryczno-promieniowa dla Polski', 'Pure geometric simulation')}
              >
                ☀️ {t('Symulacja', 'Sim')}
              </button>
              <button
                type="button"
                className={`preset-chip ${params.pvMode === 'client_actual' ? 'active' : ''}`}
                style={{ margin: 0, padding: '0.3rem 0.15rem', fontSize: '0.68rem', justifyContent: 'center' }}
                onClick={() => updateParam('pvMode', 'client_actual')}
                title={t('Pobranie profilu generacji bezpośrednio ze zmierzonego oddania w pliku OSD', 'Actual export column from DSO CSV')}
              >
                📁 {t('Z pliku OSD', 'DSO File')}
              </button>
              <button
                type="button"
                className={`preset-chip ${params.pvMode === 'client_plus_expansion' ? 'active' : ''}`}
                style={{ margin: 0, padding: '0.3rem 0.15rem', fontSize: '0.68rem', justifyContent: 'center' }}
                onClick={() => updateParam('pvMode', 'client_plus_expansion')}
                title={t('Klient ma istniejące PV + dodajemy nową moc', 'Client existing PV + new expansion kWp')}
              >
                ➕ {t('Rozbudowa', 'Expand')}
              </button>
            </div>
          </div>

          {/* PV Capacity Inputs based on Mode */}
          {params.pvMode === 'client_plus_expansion' ? (
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', padding: '0.5rem', marginBottom: '0.5rem' }}>
              <div className="field-group" style={{ marginBottom: '0.4rem' }}>
                <div className="field-label">
                  <span>{t('Istniejące PV Klienta [kWp]:', 'Existing PV [kWp]:')}</span>
                  <span className="mono" style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>{params.existingPvKwp} kWp</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="5"
                  value={params.existingPvKwp}
                  onChange={e => {
                    const v = Number(e.target.value);
                    updateParam('existingPvKwp', v);
                    updateParam('pvCapacityKwp', v + (params.expansionPvKwp || 0));
                  }}
                />
              </div>
              <div className="field-group">
                <div className="field-label">
                  <span>{t('Projektowana Rozbudowa [kWp]:', 'New Expansion [kWp]:')}</span>
                  <span className="mono" style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{params.expansionPvKwp} kWp</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={params.expansionPvKwp}
                  onChange={e => {
                    const v = Number(e.target.value);
                    updateParam('expansionPvKwp', v);
                    updateParam('pvCapacityKwp', (params.existingPvKwp || 0) + v);
                  }}
                />
              </div>
            </div>
          ) : params.pvMode === 'client_actual' ? (
            <div style={{ padding: '0.45rem', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              ℹ️ {t('Generacja PV pobierana jest bezpośrednio z kolumny „Oddanie/Generacja” wgranego profilu OSD.', 'Solar generation is read directly from DSO CSV measured export rows.')}
            </div>
          ) : (
            <div className="field-group">
              <div className="field-label">
                <span>{t('Moc Instalacji PV [kWp]:', 'Solar PV Capacity [kWp]:')}</span>
                <span className="mono" style={{ color: params.pvCapacityKwp > 0 ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {params.pvCapacityKwp} kWp
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={params.pvCapacityKwp}
                  onChange={e => updateParam('pvCapacityKwp', Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  className="number-input mono"
                  style={{ width: '85px', fontWeight: 700 }}
                  value={params.pvCapacityKwp}
                  min="0"
                  max="2000"
                  step="10"
                  onChange={e => updateParam('pvCapacityKwp', Math.max(0, Number(e.target.value)))}
                />
              </div>
              {params.pvCapacityKwp === 0 && (
                <div style={{ color: 'var(--accent-amber)', fontSize: '0.68rem', marginTop: '0.2rem' }}>
                  {t('Tryb Standalone: Tylko BESS bez fotowoltaiki', 'Standalone mode: BESS only without solar PV')}
                </div>
              )}
            </div>
          )}

          {/* Online Weather API Sync Button & Forecast Accuracy */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem', alignItems: 'center' }}>
            <button
              type="button"
              className={`preset-chip ${params.enableOnlineWeather ? 'active' : ''}`}
              style={{ flex: 1, margin: 0, padding: '0.35rem 0.4rem', fontSize: '0.7rem', justifyContent: 'center' }}
              onClick={handleSyncOnlineWeather}
              disabled={isWeatherLoading}
              title={t('Pobierz rzeczywiste dane promieniowania słonecznego z satelity Open-Meteo Solar API', 'Fetch real satellite solar radiation from Open-Meteo Solar API')}
            >
              <CloudSun size={13} style={{ marginRight: '0.25rem' }} />
              {isWeatherLoading ? t('Pobieranie...', 'Syncing...') : params.enableOnlineWeather ? t('Open-Meteo Aktywne ✓', 'Open-Meteo Active ✓') : t('Pobierz Pogodę Online', 'Fetch Online Solar')}
            </button>
          </div>

          {/* Forecast Confidence Slider for Look-Ahead Dispatch */}
          <div className="field-group" style={{ marginTop: '0.45rem' }}>
            <div className="field-label">
              <span>{t('Pewność Prognozy Pogody (Look-Ahead):', 'Forecast Confidence %:')}</span>
              <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                {params.weatherConfidencePct || 90}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={params.weatherConfidencePct || 90}
              onChange={e => updateParam('weatherConfidencePct', Number(e.target.value))}
            />
          </div>

          {/* PV Orientation Chips */}
          {params.pvCapacityKwp > 0 && params.pvMode !== 'client_actual' && (
            <div className="field-group" style={{ marginTop: '0.45rem' }}>
              <div className="field-label">
                <span>{t('Orientacja modułów PV:', 'PV Orientation:')}</span>
                <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {params.pvOrientation === 'east-west' ? t('Wschód–Zachód', 'East-West') : t('Południe', 'South')}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                <button
                  type="button"
                  className={`preset-chip ${(params.pvOrientation || 'south') === 'south' ? 'active' : ''}`}
                  style={{ margin: 0, justifyContent: 'center', textAlign: 'center', fontSize: '0.72rem', padding: '0.35rem 0.2rem' }}
                  onClick={() => updateParam('pvOrientation', 'south')}
                  title={t('Standardowy montaż na południe — najwyższy pik w południe (11:00-14:00)', 'Standard South orientation - highest midday peak')}
                >
                  ☀️ {t('Południe (Szczyt 12:00)', 'South (Peak 12:00)')}
                </button>
                <button
                  type="button"
                  className={`preset-chip ${params.pvOrientation === 'east-west' ? 'active' : ''}`}
                  style={{ margin: 0, justifyContent: 'center', textAlign: 'center', fontSize: '0.72rem', padding: '0.35rem 0.2rem' }}
                  onClick={() => updateParam('pvOrientation', 'east-west')}
                  title={t('Orientacja Wschód-Zachód — dłuższa generacja rano i po południu, mniejszy pik w południe', 'East-West orientation - wider generation morning & afternoon')}
                >
                  🌅 {t('Wschód–Zachód (E-W)', 'East-West (E-W)')}
                </button>
              </div>
            </div>
          )}

          {/* PV Region Chips */}
          {params.pvCapacityKwp > 0 && params.pvMode !== 'client_actual' && (
            <div className="field-group" style={{ marginTop: '0.45rem' }}>
              <div className="field-label">
                <span>{t('Region Polski (nasłonecznienie):', 'Poland Region (Irradiance):')}</span>
                <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                  {params.pvRegion === 'south' ? t('Południe (~1080)', 'South (~1080)') : params.pvRegion === 'north' ? t('Północ (~950)', 'North (~950)') : t('Środek (~1020)', 'Central (~1020)')} kWh/kWp
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem' }}>
                <button
                  type="button"
                  className={`preset-chip ${params.pvRegion === 'north' ? 'active' : ''}`}
                  style={{ margin: 0, justifyContent: 'center', textAlign: 'center', fontSize: '0.7rem', padding: '0.32rem 0.15rem' }}
                  onClick={() => updateParam('pvRegion', 'north')}
                  title={t('Północ Polski: Pas nadmorski, Pomorze, Warmia (~950 kWh/kWp/rok)', 'North Poland (~950 kWh/kWp)')}
                >
                  📍 {t('Północ', 'North')}
                </button>
                <button
                  type="button"
                  className={`preset-chip ${(params.pvRegion || 'central') === 'central' ? 'active' : ''}`}
                  style={{ margin: 0, justifyContent: 'center', textAlign: 'center', fontSize: '0.7rem', padding: '0.32rem 0.15rem' }}
                  onClick={() => updateParam('pvRegion', 'central')}
                  title={t('Polska Centralna: Mazowsze, Łódzkie, Wielkopolska (~1020 kWh/kWp/rok)', 'Central Poland (~1020 kWh/kWp)')}
                >
                  📍 {t('Środek', 'Central')}
                </button>
                <button
                  type="button"
                  className={`preset-chip ${params.pvRegion === 'south' ? 'active' : ''}`}
                  style={{ margin: 0, justifyContent: 'center', textAlign: 'center', fontSize: '0.7rem', padding: '0.32rem 0.15rem' }}
                  onClick={() => updateParam('pvRegion', 'south')}
                  title={t('Południe Polski: Małopolska, Śląsk, Podkarpacie (~1080 kWh/kWp/rok)', 'South Poland (~1080 kWh/kWp)')}
                >
                  📍 {t('Południe', 'South')}
                </button>
              </div>
            </div>
          )}

          <div className="field-row" style={{ marginTop: '0.55rem' }}>
            <div className="field-group">
              <div className="field-label">
                <span>{t('Moc Umowna [kW]', 'Contracted Power [kW]')}</span>
              </div>
              <input
                type="number"
                className="number-input mono"
                value={params.contractedPowerKw}
                min="10"
                max="2000"
                step="5"
                onChange={e => updateParam('contractedPowerKw', Number(e.target.value))}
              />
            </div>
            <div className="field-group">
              <div className="field-label">
                <span>{t('Próg Ładowania Sieć [kW]', 'Grid Charge Limit [kW]')}</span>
              </div>
              <input
                type="number"
                className="number-input mono"
                value={params.chargeLimitKw}
                min="5"
                max="1000"
                step="5"
                onChange={e => updateParam('chargeLimitKw', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="field-group" style={{ marginTop: '0.45rem' }}>
            <div className="field-label">
              <label htmlFor="input-osd-network-rate">{t('Stawka stała OSD', 'DSO Network Rate')} [{currency}/kW/mc]</label>
            </div>
            <input
              id="input-osd-network-rate"
              name="osdNetworkRate"
              type="number"
              step="0.1"
              className="number-input mono"
              value={currency === 'EUR' ? Number((params.osdNetworkRatePlnKwMonth / EUR_PLN_RATE).toFixed(2)) : Number((params.osdNetworkRatePlnKwMonth || 25.4).toFixed(2))}
              min="1"
              max="100"
              onChange={e => {
                const val = Number(e.target.value);
                updateParam('osdNetworkRatePlnKwMonth', currency === 'EUR' ? Number((val * EUR_PLN_RATE).toFixed(2)) : Number(val.toFixed(2)));
              }}
            />
          </div>
        </div>

        {/* 5. TARIFF & DYNAMIC PRICING */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            role="button"
            tabIndex={0}
            aria-expanded={isTariffSectionOpen}
            onClick={() => setIsTariffSectionOpen(prev => !prev)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIsTariffSectionOpen(prev => !prev)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Sliders size={14} />
              <span>{t('5. Taryfa Energii & Arbitraż Cenowy', '5. Energy Tariff & Price Arbitrage')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {isTariffSectionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {!isTariffSectionOpen ? (
            /* COLLAPSED TARIFF VIEW: ONLY SHOWS WHICH TARIFF IS SELECTED */
            <div
              style={{
                cursor: 'pointer',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: '0.74rem'
              }}
              onClick={() => setIsTariffSectionOpen(true)}
              title={t('Kliknij, aby zmienić strukturę taryfy lub stawki energii', 'Click to edit tariff structure or rates')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <strong style={{ color: 'var(--accent-primary)', fontSize: '0.78rem' }}>
                  {params.tariffGroup === 'B23'
                    ? t('⚡ Taryfa 3-Strefowa B23 (C&I)', '⚡ 3-Zone Tariff B23 (C&I)')
                    : params.tariffGroup === 'RDN' || params.tariffMode === 'dynamic'
                    ? t('⚡ Taryfa Dynamiczna TGE RDN', '⚡ Dynamic TGE RDN Spot')
                    : params.tariffMode === 'flat' || params.tariffGroup === 'B21' || params.tariffGroup === 'C21'
                    ? t('⚡ Taryfa Całodobowa B21/C11', '⚡ Flat Tariff B21/C11')
                    : t('⚡ Taryfa 2-Strefowa B22/C22a', '⚡ 2-Zone Tariff B22/C22a')}
                </strong>
                <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{t('Zmień ▼', 'Edit ▼')}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {params.tariffGroup === 'B23' ? (
                  <span>
                    {t('Noc:', 'Night:')} <strong className="mono" style={{ color: 'var(--accent-emerald)' }}>{fmtMoney(params.priceKwhNight, 2)}</strong>
                    {' '}| {t('Przedpoł:', 'Morning:')} <strong className="mono" style={{ color: 'var(--accent-amber)' }}>{fmtMoney(params.priceKwhPeakMorning || 1.35, 2)}</strong>
                    {' '}| {t('Popoł:', 'Evening:')} <strong className="mono" style={{ color: 'var(--accent-rose)' }}>{fmtMoney(params.priceKwhPeakEvening || 1.45, 2)}</strong>
                  </span>
                ) : params.tariffGroup === 'RDN' || params.tariffMode === 'dynamic' ? (
                  <span>
                    {t('Baza RDN:', 'RDN Base:')} <strong className="mono" style={{ color: 'var(--accent-primary)' }}>{fmtMoney(params.rdnBasePricePlnKwh || 0.48, 2)}</strong>
                    {' '}(±{params.rdnVolatilityPct || 100}%)
                  </span>
                ) : params.tariffMode === 'flat' || params.tariffGroup === 'B21' || params.tariffGroup === 'C21' ? (
                  <span>
                    {t('Stawka:', 'Rate:')}{' '}
                    <strong className="mono" style={{ color: 'var(--text-primary)' }}>
                      {fmtMoney(params.priceKwhDay, 2)}/kWh
                    </strong>
                  </span>
                ) : (
                  <span>
                    {t('Noc:', 'Night:')}{' '}
                    <strong className="mono" style={{ color: 'var(--accent-emerald)' }}>
                      {fmtMoney(params.priceKwhNight, 2)}
                    </strong>
                    {' '}| {t('Szczyt:', 'Peak:')}{' '}
                    <strong className="mono" style={{ color: 'var(--accent-rose, #f43f5e)' }}>
                      {fmtMoney(params.priceKwhPeak, 2)}
                    </strong>
                    {' '}/ kWh
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* EXPANDED FULL TARIFF SETTINGS */
            <>
              {/* Polish DSO Operator Selector */}
              <div className="field-group" style={{ marginBottom: '0.5rem' }}>
                <div className="field-label">
                  <span>{t('Operator OSD w Polsce:', 'Polish DSO Operator:')}</span>
                </div>
                <select
                  className="select-input"
                  value={params.osdOperator || 'pge'}
                  onChange={e => {
                    const opId = e.target.value;
                    const op = POLISH_DSO_OPERATORS.find(o => o.id === opId);
                    updateParam('osdOperator', opId);
                    if (op) updateParam('osdNetworkRatePlnKwMonth', op.defaultFixedNetworkRatePln);
                  }}
                >
                  {POLISH_DSO_OPERATORS.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.defaultFixedNetworkRatePln.toFixed(2)} PLN/kW/mc)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tariff Group Selector */}
              <div className="field-group" style={{ marginBottom: '0.5rem' }}>
                <div className="field-label">
                  <span>{t('Grupa Taryfowa Zakupu:', 'Purchase Tariff Group:')}</span>
                  <span className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{params.tariffGroup || 'B21'}</span>
                </div>
                <select
                  className="select-input"
                  value={params.tariffGroup || 'B21'}
                  onChange={e => {
                    const val = e.target.value;
                    updateParam('tariffGroup', val);
                    if (val === 'RDN') updateParam('tariffMode', 'dynamic');
                    else if (val === 'B21' || val === 'C21') updateParam('tariffMode', 'flat');
                    else updateParam('tariffMode', 'tou');
                  }}
                >
                  <option value="B21">{t('B21 (1-strefowa C&I — stała stawka)', 'B21 (1-zone C&I — flat rate)')}</option>
                  <option value="B22">{t('B22 (2-strefowa C&I — szczyt / pozaszczyt)', 'B22 (2-zone C&I — peak / off-peak)')}</option>
                  <option value="B23">{t('B23 (3-strefowa C&I — 2 szczyty + 2 doliny)', 'B23 (3-zone C&I — 2 peaks + 2 valleys)')}</option>
                  <option value="C21">{t('C21 (1-strefowa MŚP)', 'C21 (1-zone SME)')}</option>
                  <option value="C22a">{t('C22a (2-strefowa MŚP)', 'C22a (2-zone SME)')}</option>
                  <option value="RDN">{t('TGE RDN (Taryfa dynamiczna giełdowa)', 'TGE RDN (Dynamic day-ahead spot)')}</option>
                </select>
              </div>

              {/* CONDITIONAL PRICING INPUTS */}
              {params.tariffGroup === 'B23' ? (
                <div style={{ marginTop: '0.45rem' }}>
                  <div className="field-label" style={{ marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {t('⚡ Stawki 3-Strefowe B23:', '⚡ B23 3-Zone Energy Rates:')}
                    </span>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <div className="field-label">
                        <span>{t('Szczyt Przedpoł. (07-13)', 'Morning Peak (07-13)')} [{currency}/kWh]</span>
                      </div>
                      <input
                        type="number"
                        step={currency === 'EUR' ? 0.01 : 0.05}
                        className="number-input mono"
                        value={currency === 'EUR' ? Number(((params.priceKwhPeakMorning || 1.35) / EUR_PLN_RATE).toFixed(3)) : (params.priceKwhPeakMorning || 1.35)}
                        onChange={e => {
                          const val = Number(e.target.value);
                          updateParam('priceKwhPeakMorning', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                        }}
                      />
                    </div>
                    <div className="field-group">
                      <div className="field-label">
                        <span>{t('Szczyt Popoł. (16-21)', 'Evening Peak (16-21)')} [{currency}/kWh]</span>
                      </div>
                      <input
                        type="number"
                        step={currency === 'EUR' ? 0.01 : 0.05}
                        className="number-input mono"
                        value={currency === 'EUR' ? Number(((params.priceKwhPeakEvening || 1.45) / EUR_PLN_RATE).toFixed(3)) : (params.priceKwhPeakEvening || 1.45)}
                        onChange={e => {
                          const val = Number(e.target.value);
                          updateParam('priceKwhPeakEvening', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                        }}
                      />
                    </div>
                  </div>
                  <div className="field-row" style={{ marginTop: '0.4rem' }}>
                    <div className="field-group">
                      <div className="field-label">
                        <span>{t('Dolina Dzienna (13-16)', 'Midday Valley (13-16)')} [{currency}/kWh]</span>
                      </div>
                      <input
                        type="number"
                        step={currency === 'EUR' ? 0.01 : 0.05}
                        className="number-input mono"
                        value={currency === 'EUR' ? Number((params.priceKwhDay / EUR_PLN_RATE).toFixed(3)) : params.priceKwhDay}
                        onChange={e => {
                          const val = Number(e.target.value);
                          updateParam('priceKwhDay', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                        }}
                      />
                    </div>
                    <div className="field-group">
                      <div className="field-label">
                        <span>{t('Dolina Nocna (22-07)', 'Night Valley (22-07)')} [{currency}/kWh]</span>
                      </div>
                      <input
                        type="number"
                        step={currency === 'EUR' ? 0.01 : 0.05}
                        className="number-input mono"
                        value={currency === 'EUR' ? Number((params.priceKwhNight / EUR_PLN_RATE).toFixed(3)) : params.priceKwhNight}
                        onChange={e => {
                          const val = Number(e.target.value);
                          updateParam('priceKwhNight', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : params.tariffGroup === 'RDN' || params.tariffMode === 'dynamic' ? (
                <div style={{ marginTop: '0.45rem' }}>
                  <div className="field-label" style={{ marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {t('⚡ Parametry TGE RDN (Dynamiczne):', '⚡ TGE RDN Dynamic Parameters:')}
                    </span>
                  </div>
                  <div className="field-group">
                    <div className="field-label">
                      <span>{t('Średnia Cena Bazowa RDN:', 'RDN Base Price:')} [{currency}/kWh]</span>
                      <span className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {fmtMoney(params.rdnBasePricePlnKwh || 0.48, 2)}
                      </span>
                    </div>
                    <input
                      type="number"
                      step={currency === 'EUR' ? 0.01 : 0.02}
                      className="number-input mono"
                      value={currency === 'EUR' ? Number(((params.rdnBasePricePlnKwh || 0.48) / EUR_PLN_RATE).toFixed(3)) : (params.rdnBasePricePlnKwh || 0.48)}
                      onChange={e => {
                        const val = Number(e.target.value);
                        updateParam('rdnBasePricePlnKwh', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                      }}
                    />
                  </div>
                  <div className="field-group" style={{ marginTop: '0.45rem' }}>
                    <div className="field-label">
                      <span>{t('Amplituda Zmienności RDN [%]:', 'RDN Volatility Amplitude [%]:')}</span>
                      <span className="mono" style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                        {params.rdnVolatilityPct || 100}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="10"
                      value={params.rdnVolatilityPct || 100}
                      onChange={e => updateParam('rdnVolatilityPct', Number(e.target.value))}
                    />
                  </div>
                  <div style={{ marginTop: '0.45rem', padding: '0.45rem', background: 'rgba(14, 165, 233, 0.08)', borderRadius: '6px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={params.allowNegativePrices !== false}
                        onChange={e => updateParam('allowNegativePrices', e.target.checked)}
                      />
                      <span>{t('Uwzględniaj ujemne ceny w dołku solarnym (12:00–15:00)', 'Include negative prices during solar peak (12:00–15:00)')}</span>
                    </label>
                  </div>
                </div>
              ) : params.tariffMode === 'flat' || params.tariffGroup === 'B21' || params.tariffGroup === 'C21' ? (
                <div className="field-group" style={{ marginTop: '0.45rem' }}>
                  <div className="field-label">
                    <span>{t('Cena Całodobowa C11 / B21', 'Flat Rate C11 / B21')} [{currency}/kWh]</span>
                  </div>
                  <input
                    type="number"
                    step={currency === 'EUR' ? 0.01 : 0.02}
                    className="number-input mono"
                    value={currency === 'EUR' ? Number((params.priceKwhDay / EUR_PLN_RATE).toFixed(3)) : params.priceKwhDay}
                    onChange={e => {
                      const val = Number(e.target.value);
                      updateParam('priceKwhDay', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                    }}
                  />
                </div>
              ) : (
                <div style={{ marginTop: '0.45rem' }}>
                  <div className="field-label" style={{ marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('⚡ Stawki 2-Strefowe B22 / C22a:', '⚡ 2-Zone Energy Rates (Peak / Off-Peak):')}
                    </span>
                  </div>
                  <div className="field-row">
                    <div className="field-group">
                      <div className="field-label">
                        <span>{t('Tania Noc', 'Cheap Night')} [{currency}/kWh]</span>
                      </div>
                      <input
                        type="number"
                        step={currency === 'EUR' ? 0.01 : 0.05}
                        className="number-input mono"
                        value={currency === 'EUR' ? Number((params.priceKwhNight / EUR_PLN_RATE).toFixed(3)) : params.priceKwhNight}
                        onChange={e => {
                          const val = Number(e.target.value);
                          updateParam('priceKwhNight', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                        }}
                      />
                    </div>
                    <div className="field-group">
                      <div className="field-label">
                        <span>{t('Drogi Szczyt', 'Expensive Peak')} [{currency}/kWh]</span>
                      </div>
                      <input
                        type="number"
                        step={currency === 'EUR' ? 0.01 : 0.05}
                        className="number-input mono"
                        value={currency === 'EUR' ? Number((params.priceKwhPeak / EUR_PLN_RATE).toFixed(3)) : params.priceKwhPeak}
                        onChange={e => {
                          const val = Number(e.target.value);
                          updateParam('priceKwhPeak', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                        }}
                      />
                    </div>
                  </div>

                  <div className="field-group" style={{ marginTop: '0.4rem' }}>
                    <div className="field-label">
                      <span>{t('Strefa Dzień / Standardowa', 'Standard Day Rate')} [{currency}/kWh]</span>
                    </div>
                    <input
                      type="number"
                      step={currency === 'EUR' ? 0.01 : 0.05}
                      className="number-input mono"
                      value={currency === 'EUR' ? Number((params.priceKwhDay / EUR_PLN_RATE).toFixed(3)) : params.priceKwhDay}
                      onChange={e => {
                        const val = Number(e.target.value);
                        updateParam('priceKwhDay', currency === 'EUR' ? val * EUR_PLN_RATE : val);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CLOSE / COLLAPSE BUTTON */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.55rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsTariffSectionOpen(false)}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                >
                  ▲ {t('Zwiń taryfę', 'Collapse tariff')}
                </button>
              </div>
            </>
          )}
        </div>

        {/* 6. GRID SERVICES & CAPACITY MARKET (DSR, RYNEK MOCY, FCR) */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            role="button"
            tabIndex={0}
            aria-expanded={isGridServicesSectionOpen}
            onClick={() => setIsGridServicesSectionOpen(prev => !prev)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIsGridServicesSectionOpen(prev => !prev)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Radio size={14} color="var(--accent-primary)" />
              <span>{t('6. Usługi Sieciowe PSE, Rynek Mocy & FCR', '6. Grid Services, Capacity Market & FCR')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {m?.totalAnnualGridRevenuePln > 0 && !isGridServicesSectionOpen && (
                <span className="mono" style={{ fontSize: '0.67rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                  +{fmtMoney(m.totalAnnualGridRevenuePln)}
                </span>
              )}
              {isGridServicesSectionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {!isGridServicesSectionOpen ? (
            /* COLLAPSED VIEW */
            <div
              style={{
                cursor: 'pointer',
                padding: '0.45rem 0.65rem',
                borderRadius: '6px',
                background: (params.enableDsr || params.enableCapacityMarket || params.enableFcr) ? 'rgba(14, 165, 233, 0.08)' : 'rgba(148, 163, 184, 0.06)',
                border: `1px solid ${(params.enableDsr || params.enableCapacityMarket || params.enableFcr) ? 'rgba(14, 165, 233, 0.3)' : 'var(--border-color)'}`,
                fontSize: '0.74rem'
              }}
              onClick={() => setIsGridServicesSectionOpen(true)}
              title={t('Kliknij, aby skonfigurować usługi systemowe PSE, Rynek Mocy i FCR', 'Click to configure PSE grid services, Capacity Market & FCR')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <strong style={{ color: (params.enableDsr || params.enableCapacityMarket || params.enableFcr) ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: '0.76rem' }}>
                  {(params.enableDsr || params.enableCapacityMarket || params.enableFcr)
                    ? t('⚡ Usługi Systemowe Aktywne', '⚡ Grid Services Active')
                    : t('💤 Usługi Sieciowe Wyłączone', '💤 Grid Services Disabled')}
                </strong>
                <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{t('Zmień ▼', 'Edit ▼')}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {params.enableDsr && (
                  <span style={{ color: 'var(--accent-emerald)' }}>DSR (+{fmtMoney(m?.annualDsrRevenuePln || 0)})</span>
                )}
                {params.enableCapacityMarket && (
                  <span style={{ color: 'var(--accent-primary)' }}>RM (+{fmtMoney(m?.annualCapacityMarketRevenuePln || 0)})</span>
                )}
                {params.enableFcr && (
                  <span style={{ color: 'var(--accent-violet)' }}>FCR (+{fmtMoney(m?.annualFcrRevenuePln || 0)})</span>
                )}
                {!params.enableDsr && !params.enableCapacityMarket && !params.enableFcr && (
                  <span>{t('DSR, Rynek Mocy i FCR gotowe do aktywacji', 'DSR, CRM and FCR ready to enable')}</span>
                )}
              </div>
            </div>
          ) : (
            /* EXPANDED FULL CONTROLS */
            <>
              <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', marginBottom: '0.55rem', lineHeight: 1.4 }}>
                {t(
                  'PowerKeeper PCS charakteryzuje się czasem reakcji < 10 ms, co pozwala na certyfikację i monetyzację rezerw systemowych PSE i Rynku Mocy.',
                  'PowerKeeper PCS features <10ms response time, qualifying for certified PSE system reserves, Capacity Market and FCR.'
                )}
              </div>

              {/* 1. DSR CONTROLS */}
              <div style={{ padding: '0.5rem', borderRadius: '6px', background: params.enableDsr ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-input, rgba(0,0,0,0.2))', border: `1px solid ${params.enableDsr ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-color)'}`, marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: params.enableDsr ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={!!params.enableDsr}
                      onChange={e => updateParam('enableDsr', e.target.checked)}
                    />
                    <span>{t('DSR (Demand Side Response)', 'DSR (Demand Side Response)')}</span>
                  </label>
                  {params.enableDsr && (
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      +{fmtMoney(m?.annualDsrRevenuePln || 0)}/{t('rok', 'yr')}
                    </span>
                  )}
                </div>
                {params.enableDsr && (
                  <div style={{ marginTop: '0.4rem', paddingTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="field-label" style={{ fontSize: '0.67rem' }}>
                      <span>{t('Stawka gotowości DSR [PLN/MW/rok]:', 'DSR Readiness Rate [PLN/MW/yr]:')}</span>
                    </div>
                    <input
                      type="number"
                      step="5000"
                      min="10000"
                      max="300000"
                      className="number-input mono"
                      value={params.dsrRatePlnPerMwYr || 100000}
                      onChange={e => updateParam('dsrRatePlnPerMwYr', Number(e.target.value))}
                    />
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {t('Moc dyspozycyjna:', 'Available power:')} {m?.effectiveBessPowerKw || 80} kW ({((m?.effectiveBessPowerKw || 80) / 1000).toFixed(3)} MW)
                    </div>
                  </div>
                )}
              </div>

              {/* 2. CAPACITY MARKET (RYNEK MOCY) */}
              <div style={{ padding: '0.5rem', borderRadius: '6px', background: params.enableCapacityMarket ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-input, rgba(0,0,0,0.2))', border: `1px solid ${params.enableCapacityMarket ? 'rgba(59, 130, 246, 0.35)' : 'var(--border-color)'}`, marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: params.enableCapacityMarket ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={!!params.enableCapacityMarket}
                      onChange={e => updateParam('enableCapacityMarket', e.target.checked)}
                    />
                    <span>{t('Rynek Mocy (Aukcje PSE)', 'Capacity Market (CRM)')}</span>
                  </label>
                  {params.enableCapacityMarket && (
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      +{fmtMoney(m?.annualCapacityMarketRevenuePln || 0)}/{t('rok', 'yr')}
                    </span>
                  )}
                </div>
                {params.enableCapacityMarket && (
                  <div style={{ marginTop: '0.4rem', paddingTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="field-label" style={{ fontSize: '0.67rem' }}>
                      <span>{t('Stawka aukcji mocowej [PLN/kW/rok]:', 'Capacity Auction Rate [PLN/kW/yr]:')}</span>
                    </div>
                    <input
                      type="number"
                      step="10"
                      min="50"
                      max="450"
                      className="number-input mono"
                      value={params.capacityMarketRatePlnPerKwYr || 180}
                      onChange={e => updateParam('capacityMarketRatePlnPerKwYr', Number(e.target.value))}
                    />
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {t('Współczynnik deratingu dyspozycyjności:', 'Availability derating factor:')} <strong>{m?.nominalBessCapacityKwh >= (m?.effectiveBessPowerKw || 80) * 2 ? '0.85 (≥2h BESS)' : '0.50 (<2h BESS)'}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. FCR (FREQUENCY CONTAINMENT RESERVE < 2s) */}
              <div style={{ padding: '0.5rem', borderRadius: '6px', background: params.enableFcr ? 'rgba(168, 85, 247, 0.08)' : 'var(--bg-input, rgba(0,0,0,0.2))', border: `1px solid ${params.enableFcr ? 'rgba(168, 85, 247, 0.35)' : 'var(--border-color)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', color: params.enableFcr ? 'var(--accent-violet)' : 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={!!params.enableFcr}
                      onChange={e => updateParam('enableFcr', e.target.checked)}
                    />
                    <span>{t('Rezerwa FCR (< 2s Pierwotna)', 'FCR Reserve (< 2s Primary)')}</span>
                  </label>
                  {params.enableFcr && (
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent-violet)', fontWeight: 700 }}>
                      +{fmtMoney(m?.annualFcrRevenuePln || 0)}/{t('rok', 'yr')}
                    </span>
                  )}
                </div>
                {params.enableFcr && (
                  <div style={{ marginTop: '0.4rem', paddingTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="field-label" style={{ fontSize: '0.67rem' }}>
                      <span>{t('Stawka FCR [PLN/MW/rok]:', 'FCR Reserve Rate [PLN/MW/yr]:')}</span>
                    </div>
                    <input
                      type="number"
                      step="5000"
                      min="20000"
                      max="250000"
                      className="number-input mono"
                      value={params.fcrRatePlnPerMwYr || 95000}
                      onChange={e => updateParam('fcrRatePlnPerMwYr', Number(e.target.value))}
                    />
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {t('Rezerwowane 50% mocy ciągłej PCS:', 'Allocating 50% continuous PCS power:')} {((m?.effectiveBessPowerKw || 80) * 0.5).toFixed(1)} kW
                    </div>
                  </div>
                )}
              </div>

              {/* TOTAL GRID SERVICES REVENUE SUMMARY */}
              {(m?.totalAnnualGridRevenuePln || 0) > 0 && (
                <div style={{ marginTop: '0.6rem', padding: '0.45rem 0.6rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    {t('Łączny Przychód Sieciowy:', 'Total Grid Services Revenue:')}
                  </span>
                  <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    +{fmtMoney(m?.totalAnnualGridRevenuePln || 0)}/{t('rok', 'yr')}
                  </span>
                </div>
              )}

              {/* CLOSE / COLLAPSE BUTTON */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.55rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsGridServicesSectionOpen(false)}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
                >
                  ▲ {t('Zwiń usługi sieciowe', 'Collapse grid services')}
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="view-tabs">
            <button
              className={`view-tab ${activeTab === 'designer' ? 'active' : ''}`}
              onClick={() => setActiveTab('designer')}
            >
              {t('Profil Dobowy & Eksplorator Dni', 'Daily Profile & Day Explorer')}
            </button>
            <button
              className={`view-tab ${activeTab === 'investor' ? 'active' : ''}`}
              onClick={() => setActiveTab('investor')}
            >
              {t('Dashboard Inwestora (ROI)', 'Investor Dashboard (ROI)')}
            </button>
            <button
              className={`view-tab ${activeTab === 'autosizer' ? 'active' : ''}`}
              onClick={() => setActiveTab('autosizer')}
            >
              {t('Dobór Modułów (12,5 kWh)', 'Module Sizer (12.5 kWh)')}
            </button>
            <button
              className={`view-tab ${activeTab === 'heatmap' ? 'active' : ''}`}
              onClick={() => setActiveTab('heatmap')}
            >
              {t('Heatmapa 24×7', '24×7 Load Heatmap')}
            </button>
            <button
              className={`view-tab ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => setActiveTab('forecast')}
              style={{
                border: activeTab === 'forecast' ? 'none' : '1px solid rgba(16, 185, 129, 0.4)',
                color: activeTab === 'forecast' ? '#020617' : 'var(--accent-emerald)'
              }}
            >
              <Compass size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              {t('Czynniki Forecastu (W Modelu vs Poza)', 'Forecast Factors (In-Model vs External)')}
            </button>
            <button
              className={`view-tab ${activeTab === 'help' ? 'active' : ''}`}
              onClick={() => setActiveTab('help')}
              style={{
                border: activeTab === 'help' ? 'none' : '1px solid rgba(14, 165, 233, 0.4)',
                color: activeTab === 'help' ? '#020617' : 'var(--accent-primary)',
                background: activeTab === 'help' ? 'var(--accent-primary)' : 'rgba(14, 165, 233, 0.08)'
              }}
            >
              <BookOpen size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              {t('Help & Podręcznik', 'Help & Manual')}
            </button>
          </div>

          <div className="action-bar">
            {/* THEME SWITCHER */}
            <button
              className="btn-secondary"
              onClick={() => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))}
              title={t('Przełącz motyw (Jasny / Ciemny)', 'Toggle theme (Light / Dark)')}
            >
              {theme === 'dark' ? <Sun size={14} color="var(--accent-amber)" /> : <Moon size={14} color="var(--accent-violet)" />}
              {theme === 'dark' ? t('Jasny', 'Light') : t('Ciemny', 'Dark')}
            </button>

            {/* CURRENCY SWITCHER */}
            <button
              className="btn-secondary"
              onClick={() => setCurrency(prev => (prev === 'PLN' ? 'EUR' : 'PLN'))}
              style={{
                borderColor: currency === 'EUR' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                color: currency === 'EUR' ? 'var(--accent-primary)' : 'inherit',
                fontWeight: 700
              }}
              title={t('Przełącz walutę (PLN / EUR • 1 EUR = 4.25 PLN)', 'Switch currency (PLN / EUR • 1 EUR = 4.25 PLN)')}
            >
              <Coins size={14} />
              {currency === 'PLN' ? '🇪🇺 EUR (€)' : '🇵🇱 PLN (zł)'}
            </button>

            {/* LANGUAGE SWITCHER */}
            <button
              className="btn-secondary"
              onClick={() => setLang(prev => (prev === 'pl' ? 'en' : 'pl'))}
              style={{
                borderColor: 'rgba(14, 165, 233, 0.5)',
                color: 'var(--accent-primary)',
                fontWeight: 700
              }}
              title={t('Switch to English version', 'Przełącz na wersję polską')}
            >
              <Globe size={14} />
              {lang === 'pl' ? '🇬🇧 English' : '🇵🇱 Polski'}
            </button>

            <button className="btn-secondary" onClick={handleSaveScenario}>
              <BookmarkPlus size={14} />
              {t('Zapisz Scenariusz', 'Save Scenario')}
            </button>
            <button className="btn-secondary" onClick={() => setShowCompareModal(true)}>
              <GitCompare size={14} />
              {t('Porównaj', 'Compare')} ({savedScenarios.length})
            </button>
            <button className="btn-primary" onClick={exportCsvReport}>
              <Download size={14} />
              {t('Eksportuj Audyt CSV', 'Export Audit CSV')}
            </button>
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', borderColor: '#0284c7', color: '#fff' }}
              onClick={() => {
                downloadPowerKeeperExcel({
                  metrics: simResult?.metrics,
                  params,
                  monthlyBreakdown: simResult?.monthlyBreakdown,
                  cashFlowTimeline: simResult?.cashFlowTimeline,
                  currency
                });
                addToast(
                  'success',
                  t('Pobrano audyt Excel (.xls)', 'Excel Audit Downloaded (.xls)'),
                  t('4 arkusze: Karta Projektu, Bilans 12M OSD, Koszyki URE 2026, Cash Flow 10-letni', '4 worksheets: Project Card, 12M DSO, URE Baskets 2026, 10Y Cash Flow')
                );
              }}
              title={t('Eksportuj kompletny model bankowy i audyt techniczno-ekonomiczny do 4-arkuszowego pliku Excel (.xls)', 'Export complete bankability model & 4-worksheet audit to Excel (.xls)')}
            >
              <FileSpreadsheet size={14} />
              {t('Eksportuj Excel (.xls)', 'Export Excel (.xls)')}
            </button>
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669', color: '#fff' }}
              onClick={() => setShowPrintReportModal(true)}
              title={t('Otwórz gotowy do druku i zapisu w PDF raport techniczno-ekonomiczny dla klienta', 'Open printable and PDF-ready technical & financial report')}
            >
              <FileText size={14} />
              {t('Raport Audytu PDF / Druk', 'PDF Audit Report / Print')}
            </button>
          </div>
        </header>

        {/* EDUCATIONAL INTERACTIVE PILLS BAR */}
        <div className="edu-pills-bar">
          <span className="edu-bar-label">
            <Sparkles size={14} color="var(--accent-primary)" />
            {t(
              'Przewodnik dla Klienta (Kliknij pojęcie, aby otworzyć wyjaśnienie):',
              'Client Guide (Click any concept to open an interactive explanation):'
            )}
          </span>
          <button className="edu-pill" onClick={() => setFloatingTopic('k-baskets')}>
            <HelpCircle size={13} />
            {t('Koszyki Mocowe K1–K4 (Rabaty URE do 83%)', 'URE Capacity Baskets K1–K4 (Up to 83% Discount)')}
          </button>
          <button className="edu-pill" onClick={() => setFloatingTopic('capacity-fee')}>
            <HelpCircle size={13} />
            {t('Opłata Mocowa (07:00–22:00)', 'Capacity Fee (07:00–22:00 Peak Window)')}
          </button>
          <button className="edu-pill" onClick={() => setFloatingTopic('osd-penalty')}>
            <HelpCircle size={13} />
            {t('Kary 10x za Moc Umowną i Peak Shaving', '10x Contracted Power Penalties & Peak Shaving')}
          </button>
          <button className="edu-pill" onClick={() => setFloatingTopic('dc-coupled')}>
            <HelpCircle size={13} />
            {t('Architektura DC-Coupled (+5–8% sprawności)', 'DC-Coupled Architecture (+5–8% Efficiency)')}
          </button>
          <button className="edu-pill" onClick={() => setFloatingTopic('arbitrage')}>
            <HelpCircle size={13} />
            {t('Arbitraż Cenowy i „Efekt Gąbki”', 'Price Arbitrage & "Sponge Effect"')}
          </button>
          <button
            className="edu-pill"
            onClick={() => setFloatingTopic('disclaimer')}
            style={{ borderColor: 'rgba(245, 158, 11, 0.45)', color: 'var(--accent-amber)' }}
          >
            <AlertTriangle size={13} color="var(--accent-amber)" />
            {t('Nota Prawna & Zastrzeżenia (Disclaimer)', 'Legal Disclaimer & Terms')}
          </button>
        </div>

        {/* GROUPED KPI DASHBOARDS */}
        {m && (
          <KpiGroups
            metrics={m}
            params={params}
            currency={currency}
            fmtMoney={fmtMoney}
            setFloatingTopic={setFloatingTopic}
            lang={lang}
            t={t}
          />
        )}

        {/* TAB 1: DESIGNER & INTERACTIVE DAY/HOUR EXPLORER */}
        {activeTab === 'designer' && m && (
          <div className="view-pane">
            {/* COLLAPSIBLE DAY & HOUR EXPLORER */}
            {!isDateExplorerOpen ? (
              /* COMPACT COLLAPSED BAR: LOW HEIGHT, INSTANT CHART VISIBILITY */
              <div className="panel-card explorer-card" style={{ padding: '0.65rem 1rem', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <Calendar size={17} color="var(--accent-primary)" />
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {t('Zakres Dat:', 'Date Range:')}{' '}
                        <strong className="mono" style={{ color: 'var(--accent-primary)', fontSize: '0.86rem' }}>
                          {startDateStr === endDateStr ? startDateStr : `${startDateStr} — ${endDateStr}`}
                        </strong>
                      </span>
                      <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginLeft: '0.45rem' }}>
                        ({t('godz.', 'hrs')} {String(hourRange.startHour).padStart(2, '0')}:00–{String(hourRange.endHour).padStart(2, '0')}:00 • {selectedRangeSet.size} {t('dni', 'days')})
                      </span>
                    </div>

                    {peakDay && (
                      <button
                        className="btn-secondary"
                        style={{
                          padding: '0.18rem 0.45rem',
                          fontSize: '0.7rem',
                          borderColor: 'rgba(244, 63, 94, 0.4)',
                          color: 'var(--accent-rose)',
                          fontWeight: 600,
                          marginLeft: '0.2rem'
                        }}
                        onClick={jumpToPeakDay}
                        title={t('Przejdź do dnia z najwyższym szczytem obciążenia', 'Jump to peak load day')}
                      >
                        🔥 {t('Pik Roczny', 'Annual Peak')}: {peakDay.dateStr} ({peakDay.maxOrigKw.toFixed(0)} kW)
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {/* Quick Range Presets right on the compact bar */}
                    <div className="preset-chips" style={{ margin: 0 }}>
                      <button
                        className={`preset-chip ${startDateStr === endDateStr ? 'active' : ''}`}
                        onClick={setRange1Day}
                        style={{ padding: '0.22rem 0.5rem', fontSize: '0.71rem' }}
                      >
                        {t('1 Dzień', '1 Day')}
                      </button>
                      <button
                        className="preset-chip"
                        onClick={() => setRangePresetDays(7)}
                        style={{ padding: '0.22rem 0.5rem', fontSize: '0.71rem' }}
                      >
                        {t('7 Dni', '7 Days')}
                      </button>
                      <button
                        className="preset-chip"
                        onClick={() => setRangePresetDays(14)}
                        style={{ padding: '0.22rem 0.5rem', fontSize: '0.71rem' }}
                      >
                        {t('14 Dni', '14 Days')}
                      </button>
                      <button
                        className="preset-chip"
                        onClick={setRangeFullMonth}
                        style={{ padding: '0.22rem 0.5rem', fontSize: '0.71rem' }}
                      >
                        {t('Miesiąc', 'Month')}
                      </button>
                      <button
                        className="preset-chip"
                        onClick={setRangeFullYear}
                        style={{ padding: '0.22rem 0.5rem', fontSize: '0.71rem' }}
                      >
                        {t('Cały Rok', 'Full Year')}
                      </button>
                    </div>

                    {/* Expand Button */}
                    <button
                      className="btn-primary"
                      onClick={() => setIsDateExplorerOpen(true)}
                      style={{
                        padding: '0.26rem 0.7rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Calendar size={13} />
                      {t('Zmień Daty / Kalendarz', 'Change Dates / Calendar')}
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>

                {/* Compact KPI Summary Pill Strip */}
                <div className="window-summary-strip" style={{ marginTop: '0.45rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.73rem' }}>
                  <div>
                    {t('Szczyt przed BESS:', 'Peak before:')}{' '}
                    <strong className="mono" style={{ color: 'var(--accent-rose)' }}>{windowStats.maxOrigKw} kW</strong>
                  </div>
                  <div>
                    {t('Po PowerKeeper:', 'After PowerKeeper:')}{' '}
                    <strong className="mono" style={{ color: 'var(--accent-primary)' }}>{windowStats.maxAfterKw} kW</strong>{' '}
                    <span style={{ color: 'var(--accent-emerald)' }}>(-{windowStats.shavedKw} kW)</span>
                  </div>
                  <div>
                    {t('Zużycie:', 'Load:')} <strong className="mono">{windowStats.loadKwh} kWh</strong>
                  </div>
                  <div>
                    {t('PV:', 'PV:')} <strong className="mono" style={{ color: 'var(--accent-amber)' }}>{windowStats.pvKwh} kWh</strong>
                  </div>
                  <div>
                    {t('BESS:', 'BESS:')} <strong className="mono" style={{ color: 'var(--accent-emerald)' }}>{windowStats.bessOutKwh} kWh</strong>
                  </div>
                  <div>
                    {windowStats.maxOrigKw > params.contractedPowerKw ? (
                      <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>⚠️ Przekroczenie &gt; {params.contractedPowerKw} kW</span>
                    ) : (
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>✅ W normie (&le; {params.contractedPowerKw} kW)</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* EXPANDED FULL CALENDAR & HOUR EXPLORER */
              <div className="panel-card explorer-card">
                <div className="panel-header" style={{ marginBottom: '0.55rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <Calendar size={18} color="var(--accent-primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                      {t(
                        'Wybór Zakresu Dat i Dnia do Analizy Obciążenia',
                        'Date Range & Day Explorer for Load Profile Inspection'
                      )}
                    </span>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      ({datasetLabel} • {inspectedData.length} {t('rekordów', 'records')})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* QUICK DATE RANGE PRESETS */}
                    <div className="preset-chips" style={{ margin: 0 }}>
                      <button
                        className={`preset-chip ${startDateStr === endDateStr ? 'active' : ''}`}
                        onClick={setRange1Day}
                      >
                        {t('1 Dzień', '1 Day')}
                      </button>
                      <button className="preset-chip" onClick={() => setRangePresetDays(7)}>
                        {t('7 Dni', '7 Days')}
                      </button>
                      <button className="preset-chip" onClick={() => setRangePresetDays(14)}>
                        {t('14 Dni', '14 Days')}
                      </button>
                      <button className="preset-chip" onClick={setRangeFullMonth}>
                        {t('Miesiąc', 'Month')}
                      </button>
                      <button className="preset-chip" onClick={setRangeFullYear}>
                        {t('Cały Rok (12M)', 'Full Year (12M)')}
                      </button>
                    </div>

                    {/* Collapse Button in Header */}
                    <button
                      className="btn-secondary"
                      onClick={() => setIsDateExplorerOpen(false)}
                      style={{
                        padding: '0.24rem 0.65rem',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        borderColor: 'var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                      title={t('Zwiń panel, aby zyskać więcej miejsca na wykresy', 'Collapse panel to save space')}
                    >
                      <ChevronUp size={14} />
                      {t('Zwiń Kalendarz ▲', 'Collapse Calendar ▲')}
                    </button>
                  </div>
                </div>

                {/* DATE RANGE SELECTOR BAR (OD - DO) */}
                <div className="date-range-bar">
                  <div className="date-range-inputs">
                    <div className="date-input-wrap">
                      <label>{t('Data Od:', 'Start Date:')}</label>
                      <input
                        type="date"
                        value={startDateStr}
                        min={availableDays[0]?.dateStr}
                        max={availableDays[availableDays.length - 1]?.dateStr}
                        onChange={e => {
                          const val = e.target.value;
                          setStartDateStr(val);
                          setSelectedDateStr(val);
                          if (val > endDateStr) setEndDateStr(val);
                        }}
                      />
                    </div>
                    <div className="date-input-wrap">
                      <label>{t('Data Do:', 'End Date:')}</label>
                      <input
                        type="date"
                        value={endDateStr}
                        min={startDateStr || availableDays[0]?.dateStr}
                        max={availableDays[availableDays.length - 1]?.dateStr}
                        onChange={e => {
                          const val = e.target.value;
                          setEndDateStr(val);
                          if (val < startDateStr) setStartDateStr(val);
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {peakDay && (
                      <button
                        className="btn-secondary"
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.72rem',
                          borderColor: 'rgba(244, 63, 94, 0.4)',
                          color: 'var(--accent-rose)',
                          fontWeight: 600
                        }}
                        onClick={jumpToPeakDay}
                        title={t('Przejdź do dnia z najwyższym szczytem obciążenia', 'Jump to peak load day')}
                      >
                        🔥 {t('Pik Roczny', 'Annual Peak')}: {peakDay.dateStr} ({peakDay.maxOrigKw.toFixed(0)} kW)
                      </button>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {t('Wybrano dni:', 'Selected days:')}{' '}
                      <strong className="mono" style={{ color: 'var(--accent-primary)' }}>
                        {selectedRangeSet.size}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* UNIFIED CALENDAR & HOUR RANGE EXPLORER */}
                <div className="calendar-explorer-layout">
                  {/* COLUMN 1: INTERACTIVE MONTHLY CALENDAR */}
                  <div className="calendar-box">
                    <div className="calendar-top-nav">
                      <div className="calendar-month-selector">
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.24rem 0.45rem', fontSize: '0.72rem' }}
                          onClick={() => stepMonth(-1)}
                          title={t('Poprzedni miesiąc', 'Previous Month')}
                        >
                          <ChevronLeft size={13} />
                        </button>

                        <select
                          className="select-input"
                          style={{ width: 'auto', minWidth: 155, padding: '0.24rem 0.45rem', fontSize: '0.76rem', fontWeight: 700 }}
                          value={calendarMonth}
                          onChange={e => {
                            setCalendarMonth(e.target.value);
                            const mData = availableMonths.find(m => m.monthKey === e.target.value);
                            if (mData) {
                              const firstDay = mData.daysMap.keys().next().value;
                              if (firstDay) {
                                setStartDateStr(firstDay);
                                setEndDateStr(firstDay);
                                setSelectedDateStr(firstDay);
                              }
                            }
                          }}
                        >
                          {availableMonths.map(m => (
                            <option key={m.monthKey} value={m.monthKey}>
                              {m.label} {m.hasOverLimit ? '⚠️' : ''} (Max: {m.maxKw.toFixed(0)} kW)
                            </option>
                          ))}
                        </select>

                        <button
                          className="btn-secondary"
                          style={{ padding: '0.24rem 0.45rem', fontSize: '0.72rem' }}
                          onClick={() => stepMonth(1)}
                          title={t('Następny miesiąc', 'Next Month')}
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.24rem 0.45rem', fontSize: '0.72rem' }}
                          onClick={() => stepDay(-1)}
                          disabled={currentDayIndex <= 0}
                          title={t('Poprzedni dzień', 'Previous Day')}
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.24rem 0.45rem', fontSize: '0.72rem' }}
                          onClick={() => stepDay(1)}
                          disabled={currentDayIndex >= availableDays.length - 1}
                          title={t('Następny dzień', 'Next Day')}
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>

                    {/* 7-DAY WEEK HEADERS */}
                    <div className="calendar-week-headers">
                      {(lang === 'en'
                        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                        : ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
                      ).map(name => (
                        <div key={name} className="calendar-week-header">
                          {name}
                        </div>
                      ))}
                    </div>

                    {/* CALENDAR DAYS GRID */}
                    <div className="calendar-days-grid">
                      {calendarGridCells.map(cell => {
                        if (cell.isPadding) {
                          return <div key={cell.key} className="calendar-day-tile pad-blank" />;
                        }
                        const isSelected = cell.dateStr === startDateStr || cell.dateStr === endDateStr;
                        const inRange = selectedRangeSet.has(cell.dateStr);

                        return (
                          <button
                            key={cell.key}
                            className={`calendar-day-tile ${cell.isWeekend ? 'weekend' : ''} ${
                              inRange ? 'in-range' : ''
                            } ${isSelected ? 'selected' : ''} ${!cell.isAvailable ? 'disabled' : ''}`}
                            onClick={() => {
                              if (cell.isAvailable) {
                                setStartDateStr(cell.dateStr);
                                setEndDateStr(cell.dateStr);
                                setSelectedDateStr(cell.dateStr);
                              }
                            }}
                            disabled={!cell.isAvailable}
                            title={
                              cell.isAvailable
                                ? `${cell.dateStr} • Max: ${cell.maxOrigKw.toFixed(1)} kW | ${cell.sumKwh.toFixed(0)} kWh ${
                                    cell.isOverLimit ? `(⚠️ Przekroczenie > ${params.contractedPowerKw} kW)` : ''
                                  }`
                                : cell.dateStr
                            }
                          >
                            {cell.isOverLimit && <span className="calendar-over-dot" />}
                            <span>{cell.dayNum}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="explorer-legend" style={{ justifyContent: 'space-between', marginTop: '0.15rem' }}>
                      <span className="explorer-legend-item">
                        <span className="peak-dot-legend" />
                        {t(
                          `Przekroczenie Mocy Umownej (> ${params.contractedPowerKw} kW)`,
                          `Exceeding Contracted Power (> ${params.contractedPowerKw} kW)`
                        )}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {startDateStr === endDateStr ? (
                          <>
                            {t('Wybrany dzień:', 'Selected:')}{' '}
                            <strong className="mono" style={{ color: 'var(--accent-primary)' }}>
                              {startDateStr}
                            </strong>
                          </>
                        ) : (
                          <>
                            <strong className="mono" style={{ color: 'var(--accent-primary)' }}>
                              {startDateStr}
                            </strong>{' '}
                            →{' '}
                            <strong className="mono" style={{ color: 'var(--accent-primary)' }}>
                              {endDateStr}
                            </strong>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* COLUMN 2: HOUR RANGE SELECTION & WINDOW KPIS */}
                  <div className="hour-range-card">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <Clock size={16} color="var(--accent-primary)" />
                          <span>{t('Godzina Rozpoczęcia i Zakończenia', 'Start & End Hour Range')}</span>
                        </div>
                        <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {String(hourRange.startHour).padStart(2, '0')}:00 – {String(hourRange.endHour).padStart(2, '0')}:00
                        </span>
                      </div>

                      <div className="hour-inputs-row">
                        <div className="hour-input-group">
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {t('Od (Start):', 'Start Hour:')}
                          </label>
                          <select
                            className="select-input mono"
                            style={{ width: 92, padding: '0.3rem 0.5rem', fontSize: '0.78rem', fontWeight: 600 }}
                            value={hourRange.startHour}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setHourRange(prev => ({
                                startHour: val,
                                endHour: Math.max(val + 1, prev.endHour)
                              }));
                            }}
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>
                                {String(i).padStart(2, '0')}:00
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="hour-input-group">
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {t('Do (Koniec):', 'End Hour:')}
                          </label>
                          <select
                            className="select-input mono"
                            style={{ width: 92, padding: '0.3rem 0.5rem', fontSize: '0.78rem', fontWeight: 600 }}
                            value={hourRange.endHour}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setHourRange(prev => ({
                                startHour: Math.min(prev.startHour, val - 1),
                                endHour: val
                              }));
                            }}
                          >
                            {Array.from({ length: 24 }, (_, i) => i + 1).map(i => (
                              <option key={i} value={i}>
                                {String(i).padStart(2, '0')}:00
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* QUICK PRESETS */}
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.35rem' }}>
                          {t('Szybkie profile godzinowe:', 'Quick hour presets:')}
                        </div>
                        <div className="preset-chips">
                          {[
                            { label: t('🌅 Doba (00–24)', '🌅 Full Day (00–24)'), s: 0, e: 24 },
                            { label: t('⚡ Szczyt URE (07–22)', '⚡ URE Peak (07–22)'), s: 7, e: 22 },
                            { label: t('🏭 Zmiana I (06–14)', '🏭 Shift I (06–14)'), s: 6, e: 14 },
                            { label: t('🚚 Szczyt EV (16–22)', '🚚 EV Peak (16–22)'), s: 16, e: 22 },
                            { label: t('🥐 Noc/Wypiek (01–06)', '🥐 Night/Baking (01–06)'), s: 1, e: 6 },
                            { label: t('☀️ Szczyt PV (10–16)', '☀️ Solar PV (10–16)'), s: 10, e: 16 }
                          ].map(preset => (
                            <button
                              key={preset.label}
                              className={`preset-chip ${
                                hourRange.startHour === preset.s && hourRange.endHour === preset.e ? 'active' : ''
                              }`}
                              onClick={() => setHourRange({ startHour: preset.s, endHour: preset.e })}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* WINDOW LIVE KPI CARDS */}
                    <div className="window-kpi-summary">
                      <div className="window-kpi-item">
                        <span className="window-kpi-label">{t('Szczyt Przed BESS', 'Peak Before')}</span>
                        <span className="window-kpi-val" style={{ color: 'var(--accent-rose)' }}>
                          {windowStats.maxOrigKw.toFixed(1)} kW
                        </span>
                      </div>

                      <div className="window-kpi-item">
                        <span className="window-kpi-label">{t('Pobór Po PowerKeeper', 'After PowerKeeper')}</span>
                        <span className="window-kpi-val" style={{ color: 'var(--accent-primary)' }}>
                          {windowStats.maxAfterKw.toFixed(1)} kW
                        </span>
                      </div>

                      <div className="window-kpi-item">
                        <span className="window-kpi-label">{t('Zgolony Szczyt', 'Power Shaved')}</span>
                        <span className="window-kpi-val" style={{ color: 'var(--accent-emerald)' }}>
                          {windowStats.shavedKw > 0 ? `-${windowStats.shavedKw.toFixed(1)} kW` : '0 kW'}
                        </span>
                      </div>

                      <div className="window-kpi-item">
                        <span className="window-kpi-label">{t('Energia w Oknie', 'Window Energy')}</span>
                        <span className="window-kpi-val">
                          {Math.round(windowStats.loadKwh).toLocaleString()} kWh
                        </span>
                      </div>

                      <div className="window-kpi-item">
                        <span className="window-kpi-label">{t('Status Mocy Umownej', 'Contracted Status')}</span>
                        <span
                          className="window-kpi-val"
                          style={{
                            fontSize: '0.78rem',
                            color:
                              windowStats.maxOrigKw > params.contractedPowerKw
                                ? 'var(--accent-rose)'
                                : 'var(--accent-emerald)'
                          }}
                        >
                          {windowStats.maxOrigKw > params.contractedPowerKw
                            ? `⚠️ +${(windowStats.maxOrigKw - params.contractedPowerKw).toFixed(1)} kW`
                            : '✅ W normie'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SUMMARY PILLS FOR CURRENTLY SELECTED WINDOW */}
                <div className="window-summary-strip">
                  <div>
                    {t('Szczyt w wybranym oknie PRZED:', 'Window Peak BEFORE:')}{' '}
                    <strong className="mono" style={{ color: 'var(--accent-rose)' }}>
                      {windowStats.maxOrigKw} kW
                    </strong>
                  </div>
                  <div>
                    {t('Szczyt PO PowerKeeper:', 'Peak AFTER PowerKeeper:')}{' '}
                    <strong className="mono" style={{ color: 'var(--accent-primary)' }}>
                      {windowStats.maxAfterKw} kW
                    </strong>{' '}
                    ({t('obcięto', 'shaved')} {windowStats.shavedKw} kW)
                  </div>
                  <div>
                    {t('Zużycie w oknie:', 'Window Consumption:')}{' '}
                    <strong className="mono">{windowStats.loadKwh} kWh</strong>
                  </div>
                  <div>
                    {t('Generacja PV w oknie:', 'Window PV Generation:')}{' '}
                    <strong className="mono" style={{ color: 'var(--accent-amber)' }}>
                      {windowStats.pvKwh} kWh
                    </strong>
                  </div>
                  <div>
                    {t('Wsparcie BESS w oknie:', 'Window BESS Discharge:')}{' '}
                    <strong className="mono" style={{ color: 'var(--accent-emerald)' }}>
                      {windowStats.bessOutKwh} kWh
                    </strong>
                  </div>
                </div>

                {/* BOTTOM CONFIRMATION / COLLAPSE ACTION BAR */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    className="btn-primary"
                    onClick={() => setIsDateExplorerOpen(false)}
                    style={{ padding: '0.3rem 0.95rem', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <CheckCircle2 size={14} />
                    {t('Zatwierdź Wybór i Zwiń Panel ▲', 'Apply Selection & Collapse Panel ▲')}
                  </button>
                </div>
              </div>
            )}

            {/* CHART RESOLUTION & DATA AGGREGATION BAR */}
            <div className="resolution-bar-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Layers size={15} color="var(--accent-primary)" />
                  {t('Uśrednianie i Rozdzielczość Danych:', 'Data Averaging & Chart Resolution:')}
                </span>
                <div className="preset-chips" style={{ margin: 0 }}>
                  <button
                    className={`preset-chip ${chartResolution === 'auto' ? 'active' : ''}`}
                    onClick={() => setChartResolution('auto')}
                    title={t('Automatyczne uśrednianie dopasowane do długości wybranego okresu', 'Auto-averaged to match selected duration')}
                  >
                    ⚡ Auto ({autoResolutionLabel})
                  </button>
                  <button
                    className={`preset-chip ${chartResolution === '15min' ? 'active' : ''}`}
                    onClick={() => setChartResolution('15min')}
                  >
                    ⏱️ 15-min ({t('Krok OSD', 'DSO Step')})
                  </button>
                  <button
                    className={`preset-chip ${chartResolution === '1h' ? 'active' : ''}`}
                    onClick={() => setChartResolution('1h')}
                  >
                    🕒 1-godzinne ({t('Średnia 1h', '1h Average')})
                  </button>
                  <button
                    className={`preset-chip ${chartResolution === '1d' ? 'active' : ''}`}
                    onClick={() => setChartResolution('1d')}
                  >
                    📅 Dobowe ({t('Średnia i Szczyt', 'Daily Avg & Peak')})
                  </button>
                </div>
              </div>

              {/* Quick toggle chips for Peak Shaving & Arbitrage during chart review */}
              {params.enableBess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t('Tryby Pracy BESS:', 'BESS Modes:')}
                  </span>
                  <button
                    className={`preset-chip ${params.enablePeakShaving ? 'active' : ''}`}
                    onClick={() => updateParam('enablePeakShaving', !params.enablePeakShaving)}
                    style={{
                      margin: 0,
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      borderColor: params.enablePeakShaving ? 'var(--accent-primary)' : 'var(--border-color)',
                      background: params.enablePeakShaving ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                      color: params.enablePeakShaving ? 'var(--accent-primary)' : 'var(--text-muted)'
                    }}
                    title={t('Włącz/wyłącz Peak Shaving, aby zobaczyć różnicę na wykresie i w karach OSD', 'Toggle Peak Shaving on/off to see impact on chart and penalties')}
                  >
                    ⚡ Peak Shaving: {params.enablePeakShaving ? t('WŁ', 'ON') : t('WYŁ', 'OFF')}
                  </button>
                  <button
                    className={`preset-chip ${params.enableArbitrage ? 'active' : ''}`}
                    onClick={() => updateParam('enableArbitrage', !params.enableArbitrage)}
                    style={{
                      margin: 0,
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      borderColor: params.enableArbitrage ? 'var(--accent-emerald)' : 'var(--border-color)',
                      background: params.enableArbitrage ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                      color: params.enableArbitrage ? 'var(--accent-emerald)' : 'var(--text-muted)'
                    }}
                    title={t('Włącz/wyłącz arbitraż cenowy i przesunięcie autokonsumpcji', 'Toggle Arbitrage on/off')}
                  >
                    📈 Arbitraż: {params.enableArbitrage ? t('WŁ', 'ON') : t('WYŁ', 'OFF')}
                  </button>
                </div>
              )}

              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {t('Zakres:', 'Range:')}{' '}
                <strong className="mono" style={{ color: 'var(--accent-primary)' }}>
                  {startDateStr === endDateStr ? startDateStr : `${startDateStr} — ${endDateStr}`}
                </strong>{' '}
                ({chartRenderData.length} {t('punktów na osi czasu', 'points on timeline')})
              </div>
            </div>

            {/* SERIES VISIBILITY FILTER */}
            <ChartSeriesFilter
              visibleSeries={visibleSeries}
              onChange={setVisibleSeries}
              hasPv={params.pvCapacityKwp > 0}
              hasBess={params.enableBess}
              lang={lang}
              t={t}
            />

            {/* CHART 1: MAIN POWER & PEAK SHAVING CHART */}
            <div className="panel-card">
              <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 className="panel-title">
                    <Zap size={18} color="var(--accent-primary)" />
                    {t('Przebieg Mocy [kW] — ', 'Power Profile [kW] — ')}
                    {startDateStr === endDateStr ? startDateStr : `${startDateStr} — ${endDateStr}`},{' '}
                    {t('godz.', 'hrs')} {String(hourRange.startHour).padStart(2, '0')}:00–
                    {String(hourRange.endHour).padStart(2, '0')}:00
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    {t(
                      'Czerwona przerywana linia to Moc Umowna OSD (',
                      'Red dashed line indicates DSO Contracted Power ('
                    )}
                    {params.contractedPowerKw} kW) •{' '}
                    {t(
                      'PowerKeeper obcina przekroczenia w < 10 ms',
                      'PowerKeeper clips exceedances in < 10 ms'
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    className={`preset-chip ${powerChartType === 'bar' ? 'active' : ''}`}
                    onClick={() => setPowerChartType('bar')}
                    style={{ padding: '0.22rem 0.55rem', fontSize: '0.72rem', fontWeight: 600 }}
                    title={t('Słupki porównawcze obok siebie dla każdego punktu czasu (Pobór przed BESS vs Po BESS vs PV)', 'Side-by-side grouped bars for direct visual comparison')}
                  >
                    📊 {t('Słupki Obok Siebie', 'Grouped Bars')}
                  </button>
                  <button
                    className={`preset-chip ${powerChartType === 'line' ? 'active' : ''}`}
                    onClick={() => setPowerChartType('line')}
                    style={{ padding: '0.22rem 0.55rem', fontSize: '0.72rem', fontWeight: 600 }}
                    title={t('Gładkie linie przebiegu mocy (bez kropek)', 'Smooth continuous power curves (no dots)')}
                  >
                    📈 {t('Wykres Liniowy', 'Smooth Lines')}
                  </button>
                </div>
              </div>

              <div className="chart-box">
                <ResponsiveContainer width="100%" height={360}>
                  <ComposedChart data={chartRenderData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis
                      dataKey="time"
                      stroke={chartAxisStroke}
                      fontSize={11}
                      tickFormatter={formatXAxisTime}
                      minTickGap={24}
                    />
                    <YAxis stroke={chartAxisStroke} fontSize={11} unit=" kW" />
                    <Tooltip
                      isAnimationActive={false}
                      content={props => (
                        <CustomPowerProfileTooltip
                          {...props}
                          lang={lang}
                          t={t}
                          contractedPowerKw={params.contractedPowerKw}
                          enableBess={params.enableBess}
                          pvCapacityKwp={params.pvCapacityKwp}
                        />
                      )}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                    <ReferenceLine
                      y={params.contractedPowerKw}
                      stroke="var(--accent-rose)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      label={{
                        value: `${t('Moc Umowna', 'Contracted Power')} ${params.contractedPowerKw} kW`,
                        fill: 'var(--accent-rose)',
                        fontSize: 11,
                        position: 'insideTopRight'
                      }}
                    />

                    {powerChartType === 'bar' ? (
                      <>
                        {visibleSeries.load && (
                          <Bar
                            isAnimationActive={false}
                            dataKey="originalLoadKw"
                            name={t('1. Pobór Przed BESS [kW]', '1. Load Before BESS [kW]')}
                            fill="var(--accent-rose)"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={28}
                          />
                        )}
                        {visibleSeries.grid && (
                          <Bar
                            isAnimationActive={false}
                            dataKey="gridPowerKw"
                            name={params.enableBess ? t('2. Pobór Po PowerKeeper [kW]', '2. Grid After PowerKeeper [kW]') : t('Pobór z Sieci [kW]', 'Grid Import [kW]')}
                            fill="var(--accent-primary)"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={28}
                          />
                        )}
                        {visibleSeries.pv && params.pvCapacityKwp > 0 && (
                          <Bar
                            isAnimationActive={false}
                            dataKey="pvGenKw"
                            name={t('3. Generacja PV [kW]', '3. PV Generation [kW]')}
                            fill="var(--accent-amber)"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={28}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {visibleSeries.pv && (
                          <Area
                            isAnimationActive={false}
                            type="monotone"
                            dataKey="pvGenKw"
                            name={t('Generacja PV (DC) [kW]', 'PV Generation (DC) [kW]')}
                            fill="rgba(245, 158, 11, 0.18)"
                            stroke="var(--accent-amber)"
                            strokeWidth={1.5}
                          />
                        )}
                        {effectiveResolution === '1d' && visibleSeries.load && (
                          <Line
                            isAnimationActive={false}
                            type="monotone"
                            dataKey="peakOriginalLoadKw"
                            name={t('Maksymalny Szczyt Dobowy Przed BESS [kW]', 'Daily Peak Before BESS [kW]')}
                            stroke="rgba(244, 63, 94, 0.55)"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        )}
                        {visibleSeries.load && (
                          <Line
                            isAnimationActive={false}
                            type="monotone"
                            dataKey="originalLoadKw"
                            name={
                              effectiveResolution === '1d'
                                ? t('Średnie Obciążenie Dobowe Przed BESS [kW]', 'Daily Avg Load Before BESS [kW]')
                                : t('Oryginalny Pobór Zakładu [kW]', 'Original Facility Load [kW]')
                            }
                            stroke="var(--accent-rose)"
                            strokeWidth={2.2}
                            dot={false}
                          />
                        )}
                        {effectiveResolution === '1d' && visibleSeries.grid && (
                          <Line
                            isAnimationActive={false}
                            type="monotone"
                            dataKey="peakGridPowerKw"
                            name={t('Maksymalny Szczyt z Sieci PO BESS [kW]', 'Daily Peak After BESS [kW]')}
                            stroke="rgba(14, 165, 233, 0.6)"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            dot={false}
                          />
                        )}
                        {visibleSeries.grid && (
                          <Line
                            isAnimationActive={false}
                            type="monotone"
                            dataKey="gridPowerKw"
                            name={
                              params.enableBess
                                ? (effectiveResolution === '1d'
                                    ? t('Średni Pobór z Sieci PO PowerKeeper [kW]', 'Daily Avg Grid Import AFTER PowerKeeper [kW]')
                                    : t('Pobór z Sieci PO PowerKeeper [kW]', 'Grid Import AFTER PowerKeeper [kW]'))
                                : t('Pobór z Sieci (Bez BESS) [kW]', 'Grid Import (Without BESS) [kW]')
                            }
                            stroke="var(--accent-primary)"
                            strokeWidth={2.4}
                            dot={false}
                          />
                        )}
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: BESS DISPATCH & SOC */}
            {params.enableBess && (
              <div className="panel-card">
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 className="panel-title">
                    <BatteryCharging size={18} color="var(--accent-emerald)" />
                    {t(
                      'Praca Magazynu PowerKeeper (Przepływ Mocy [kW] i SoC [%])',
                      'PowerKeeper Dispatch (Power Flow [kW] & SoC [%])'
                    )}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      className={`preset-chip ${bessChartType === 'area' ? 'active' : ''}`}
                      onClick={() => setBessChartType('area')}
                      style={{ padding: '0.22rem 0.5rem', fontSize: '0.72rem' }}
                      title={t('Ciągłe warstwy przepływów mocy', 'Continuous power flow areas')}
                    >
                      🌊 {t('Wykres ciągły (Obszary)', 'Continuous Flow (Area)')}
                    </button>
                    <button
                      className={`preset-chip ${bessChartType === 'bar' ? 'active' : ''}`}
                      onClick={() => setBessChartType('bar')}
                      style={{ padding: '0.22rem 0.5rem', fontSize: '0.72rem' }}
                      title={t('Słupki skumulowane mocy', 'Stacked power bars')}
                    >
                      📊 {t('Słupki skumulowane (Bar)', 'Stacked Bars (Bar)')}
                    </button>
                  </div>
                </div>

                <div className="chart-box">
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={chartRenderData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                      <XAxis
                        dataKey="time"
                        stroke={chartAxisStroke}
                        fontSize={11}
                        tickFormatter={formatXAxisTime}
                        minTickGap={24}
                      />
                      <YAxis yAxisId="left" stroke={chartAxisStroke} fontSize={11} unit=" kW" />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--accent-violet)" fontSize={11} domain={[0, 100]} unit="%" />
                      <Tooltip
                        isAnimationActive={false}
                        content={props => <CustomBessTooltip {...props} lang={lang} t={t} />}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.76rem' }} />

                      {bessChartType === 'area' ? (
                        <>
                          {visibleSeries.peakShaving && (
                            <Area
                              isAnimationActive={false}
                              yAxisId="left"
                              type="monotone"
                              dataKey="bessDischargePeakKw"
                              name={t('Oddawanie: Peak Shaving (Golenie Szczytu) [kW]', 'Discharge: Peak Shaving [kW]')}
                              fill="rgba(244, 63, 94, 0.45)"
                              stroke="var(--accent-rose)"
                              strokeWidth={2}
                            />
                          )}
                          {visibleSeries.bessArb && (
                            <Area
                              isAnimationActive={false}
                              yAxisId="left"
                              type="monotone"
                              dataKey="bessDischargeArbKw"
                              name={t('Oddawanie: Autokonsumpcja & Arbitraż [kW]', 'Discharge: Self-Consumption & Arbitrage [kW]')}
                              fill="rgba(16, 185, 129, 0.4)"
                              stroke="var(--accent-emerald)"
                              strokeWidth={2}
                            />
                          )}
                          {visibleSeries.pv && (
                            <Area
                              isAnimationActive={false}
                              yAxisId="left"
                              type="monotone"
                              dataKey="bessChargePvKw"
                              name={t('Ładowanie: Nadwyżki PV (DC) [kW]', 'Charging: PV DC Surplus [kW]')}
                              fill="rgba(245, 158, 11, 0.4)"
                              stroke="var(--accent-amber)"
                              strokeWidth={2}
                            />
                          )}
                          {visibleSeries.bessArb && (
                            <Area
                              isAnimationActive={false}
                              yAxisId="left"
                              type="monotone"
                              dataKey="bessChargeGridKw"
                              name={t('Ładowanie: Tani Prąd z Sieci (Dolina) [kW]', 'Charging: Off-Peak Grid Import [kW]')}
                              fill="rgba(14, 165, 233, 0.4)"
                              stroke="var(--accent-primary)"
                              strokeWidth={2}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          {visibleSeries.peakShaving && (
                            <Bar
                              isAnimationActive={false}
                              yAxisId="left"
                              dataKey="bessDischargePeakKw"
                              stackId="bess_discharge"
                              name={t('Oddawanie: Peak Shaving [kW]', 'Discharge: Peak Shaving [kW]')}
                              fill="var(--accent-rose)"
                            />
                          )}
                          {visibleSeries.bessArb && (
                            <Bar
                              isAnimationActive={false}
                              yAxisId="left"
                              dataKey="bessDischargeArbKw"
                              stackId="bess_discharge"
                              name={t('Oddawanie: Autokonsumpcja & Arbitraż [kW]', 'Discharge: Self-Consumption [kW]')}
                              fill="var(--accent-emerald)"
                            />
                          )}
                          {visibleSeries.pv && (
                            <Bar
                              isAnimationActive={false}
                              yAxisId="left"
                              dataKey="bessChargePvKw"
                              stackId="bess_charge"
                              name={t('Ładowanie: Nadwyżki PV (DC) [kW]', 'Charging: PV Surplus [kW]')}
                              fill="var(--accent-amber)"
                            />
                          )}
                          {visibleSeries.bessArb && (
                            <Bar
                              isAnimationActive={false}
                              yAxisId="left"
                              dataKey="bessChargeGridKw"
                              stackId="bess_charge"
                              name={t('Ładowanie: Tani Prąd z Sieci [kW]', 'Charging: Off-Peak Grid [kW]')}
                              fill="var(--accent-primary)"
                            />
                          )}
                        </>
                      )}

                      {visibleSeries.soc && (
                        <Line
                          isAnimationActive={false}
                          yAxisId="right"
                          type="monotone"
                          dataKey="batterySoc"
                          name={t('Stan Naładowania Baterii SoC [%]', 'Battery State of Charge SoC [%]')}
                          stroke="var(--accent-violet)"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* DATA INSPECTION TABLE FOR SELECTED DAY & HOURS */}
            <div className="panel-card">
              <div className="panel-header">
                <h3 className="panel-title">
                  <TableIcon size={18} color="var(--accent-primary)" />
                  {t(
                    'Tabela Obserwacji Danych Krok po Kroku (Wybrany Dzień i Godziny)',
                    'Step-by-Step Metering Data Inspection Table (Selected Day & Hours)'
                  )}
                </h3>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {t('Wyświetlono', 'Showing')} {Math.min(inspectedData.length, 96)}{' '}
                  {t('z', 'of')} {inspectedData.length} {t('rekordów w oknie', 'records in window')}
                </span>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Data i Godzina', 'Date & Time')}</th>
                      <th>{t('Pobór Zakładu [kW]', 'Facility Load [kW]')}</th>
                      <th>{t('Generacja PV [kW]', 'PV Gen [kW]')}</th>
                      <th>{t('Sieć PO PowerKeeper [kW]', 'Grid AFTER PowerKeeper [kW]')}</th>
                      <th>{t('Obcięty Szczyt [kW]', 'Shaved Peak [kW]')}</th>
                      <th>SoC BESS [%]</th>
                      <th>{t('Cena Energii', 'Energy Price')} [{currency}/kWh]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectedData.slice(0, 96).map(r => {
                      const shaved = Math.max(0, r.originalLoadKw - r.gridPowerKw);
                      const isOver = r.originalLoadKw > params.contractedPowerKw;
                      const convertedPrice = currency === 'EUR' ? r.spotPricePln / EUR_PLN_RATE : r.spotPricePln;
                      return (
                        <tr key={r.time} style={isOver ? { background: 'rgba(244, 63, 94, 0.08)' } : undefined}>
                          <td className="mono">{r.time}</td>
                          <td className="mono" style={{ color: isOver ? 'var(--accent-rose)' : 'var(--text-primary)', fontWeight: isOver ? 700 : 400 }}>
                            {r.originalLoadKw.toFixed(1)} kW
                          </td>
                          <td className="mono" style={{ color: 'var(--accent-amber)' }}>{r.pvGenKw.toFixed(1)} kW</td>
                          <td className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{r.gridPowerKw.toFixed(1)} kW</td>
                          <td className="mono" style={{ color: shaved > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                            {shaved > 0 ? `-${shaved.toFixed(1)} kW` : '0.0 kW'}
                          </td>
                          <td className="mono">{r.batterySoc}%</td>
                          <td className="mono">{convertedPrice.toFixed(currency === 'EUR' ? 3 : 2)} {currency}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVESTOR DASHBOARD (ROI & CASHFLOW) */}
        {activeTab === 'investor' && m && (
          <div className="view-pane">
            {/* 3-STREAM REVENUE SUMMARY CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {/* Stream 1: Peak Shaving */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: `1px solid ${params.enablePeakShaving ? 'rgba(59, 130, 246, 0.4)' : 'var(--border-color)'}`,
                  padding: '1rem',
                  opacity: params.enablePeakShaving ? 1 : 0.65
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Zap size={15} /> 1. Peak Shaving (&lt;10 ms)
                  </span>
                  <span className="preset-chip" style={{ margin: 0, padding: '0.15rem 0.5rem', fontSize: '0.67rem', fontWeight: 700, background: params.enablePeakShaving ? 'rgba(59, 130, 246, 0.15)' : 'transparent', color: params.enablePeakShaving ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    {params.enablePeakShaving ? t('WŁĄCZONY', 'ON') : t('WYŁĄCZONY', 'OFF')}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: params.enablePeakShaving ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                  {fmtMoney(m.annualPeakShavingSavingsPln)} / {t('rok', 'yr')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {params.enablePeakShaving ? (
                    <>
                      {t('Obcięto szczyt:', 'Shaved peak:')} <strong>{m.powerShavedKw} kW</strong><br />
                      {t('Uniknięte kary 10x OSD:', 'Avoided 10x DSO penalties:')} <strong>{fmtMoney(m.annualAvoidedOsdPenaltyPln)}</strong>
                    </>
                  ) : (
                    <span style={{ color: 'var(--accent-rose)' }}>{t('Funkcja wyłączona — kary OSD nie są obcinane', 'Disabled — DSO penalties not mitigated')}</span>
                  )}
                </div>
              </div>

              {/* Stream 2: URE Capacity Fee */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-violet)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Award size={15} /> 2. Opłata Mocowa (URE)
                  </span>
                  <span className="preset-chip" style={{ margin: 0, padding: '0.15rem 0.5rem', fontSize: '0.67rem', fontWeight: 700, background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-violet)' }}>
                    {m.basketBefore} → {m.basketAfter}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-violet)' }}>
                  {fmtMoney(m.annualUreCapacityFeeSavingsPln)} / {t('rok', 'yr')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {t('Rabat na opłacie mocowej:', 'Capacity fee discount:')} <strong>-{m.basketDiscountAfterPct}%</strong><br />
                  {t('Wskaźnik nierównomierności Δs:', 'Non-uniformity Δs:')} <strong>{m.basketDeltaSAfterPct}%</strong>
                </div>
              </div>

              {/* Stream 3: Arbitrage & Self-Consumption */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: `1px solid ${params.enableArbitrage ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-color)'}`,
                  padding: '1rem',
                  opacity: params.enableArbitrage ? 1 : 0.65
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <TrendingUp size={15} /> 3. Arbitraż & Autokonsumpcja
                  </span>
                  <span className="preset-chip" style={{ margin: 0, padding: '0.15rem 0.5rem', fontSize: '0.67rem', fontWeight: 700, background: params.enableArbitrage ? 'rgba(16, 185, 129, 0.15)' : 'transparent', color: params.enableArbitrage ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                    {params.enableArbitrage ? t('WŁĄCZONY', 'ON') : t('WYŁĄCZONY', 'OFF')}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: params.enableArbitrage ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                  {fmtMoney(m.annualEnergySavingsBessOnlyPln)} / {t('rok', 'yr')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {params.enableArbitrage ? (
                    <>
                      {t('Zysk na różnicy taryf / RCEm', 'Spread profit on ToU / dynamic pricing')}<br />
                      {t('Bonus sprawności DC (+6.5%):', 'DC efficiency bonus (+6.5%):')} <strong>+{fmtMoney(m.annualDcCoupledBonusPln)}</strong>
                    </>
                  ) : (
                    <span style={{ color: 'var(--accent-rose)' }}>{t('Funkcja wyłączona — brak cykli arbitrażowych', 'Disabled — no spread arbitrage cycling')}</span>
                  )}
                </div>
              </div>

              {/* Stream 4: Grid Services PSE & Rynek Mocy & FCR */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: `1px solid ${(params.enableDsr || params.enableCapacityMarket || params.enableFcr) ? 'rgba(14, 165, 233, 0.4)' : 'var(--border-color)'}`,
                  padding: '1rem',
                  opacity: (params.enableDsr || params.enableCapacityMarket || params.enableFcr) ? 1 : 0.65
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Radio size={15} /> 4. {t('Usługi Sieciowe (DSR / RM / FCR)', 'Grid Services (DSR / CRM / FCR)')}
                  </span>
                  <span className="preset-chip" style={{ margin: 0, padding: '0.15rem 0.5rem', fontSize: '0.67rem', fontWeight: 700, background: (params.enableDsr || params.enableCapacityMarket || params.enableFcr) ? 'rgba(14, 165, 233, 0.15)' : 'transparent', color: (params.enableDsr || params.enableCapacityMarket || params.enableFcr) ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    {(params.enableDsr || params.enableCapacityMarket || params.enableFcr) ? t('AKTYWNE', 'ACTIVE') : t('WYŁĄCZONE', 'OFF')}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (params.enableDsr || params.enableCapacityMarket || params.enableFcr) ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                  {fmtMoney(m.totalAnnualGridRevenuePln)} / {t('rok', 'yr')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {(m.totalAnnualGridRevenuePln || 0) > 0 ? (
                    <>
                      {params.enableDsr && <div>• DSR: <strong>{fmtMoney(m.annualDsrRevenuePln)}</strong></div>}
                      {params.enableCapacityMarket && <div>• {t('Rynek Mocy:', 'Capacity Market:')} <strong>{fmtMoney(m.annualCapacityMarketRevenuePln)}</strong></div>}
                      {params.enableFcr && <div>• FCR (&lt;2s): <strong>{fmtMoney(m.annualFcrRevenuePln)}</strong></div>}
                    </>
                  ) : (
                    <span>{t('DSR, Rynek Mocy i FCR (konfiguracja w sekcji 6)', 'DSR, Capacity Market and FCR in section 6')}</span>
                  )}
                </div>
              </div>

              {/* Stream 5: Standalone BESS Payback (ROI) */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <BatteryCharging size={15} /> {t('Zwrot BESS (ROI)', 'BESS Payback (ROI)')}
                  </span>
                  <span className="preset-chip" style={{ margin: 0, padding: '0.15rem 0.5rem', fontSize: '0.67rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
                    CAPEX: {fmtMoney(m.totalCapexPln)}
                  </span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                  {m.roiYears > 0 ? `${m.roiYears} ${t('lat', 'yrs')}` : '—'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {t('Łączny zysk BESS:', 'Total BESS savings:')} <strong>{fmtMoney(m.annualTotalSavingsPln)}/{t('rok', 'yr')}</strong><br />
                  {params.pvCapacityKwp > 0 && m.roiCombinedYears ? (
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                      {t('Łącznie z PV (CAPEX + generacja):', 'Combined PV+BESS:')} {m.roiCombinedYears} {t('lat', 'yrs')}
                    </span>
                  ) : (
                    t('Samodzielny magazyn PowerKeeper', 'Standalone PowerKeeper system')
                  )}
                </div>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <h3 className="panel-title">
                  <TrendingUp size={18} color="var(--accent-emerald)" />
                  {t(
                    'Struktura Przychodów i Oszczędności (Peak Shaving + Koszyk Mocowy K + Arbitraż + PV DC)',
                    'Revenue & Savings Breakdown (Peak Shaving + URE Basket K + Arbitrage + PV DC)'
                  )}
                </h3>
              </div>

              <div className="chart-box">
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart
                    data={simResult.monthlyBreakdown}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="month" stroke={chartAxisStroke} fontSize={12} />
                    <YAxis stroke={chartAxisStroke} fontSize={11} unit=" kW" />
                    <Tooltip
                      isAnimationActive={false}
                      contentStyle={chartTooltipStyle}
                    />
                    <Legend />
                    <Bar
                      isAnimationActive={false}
                      dataKey="maxKwOrig"
                      name={t('Szczyt Miesięczny PRZED [kW]', 'Monthly Peak BEFORE [kW]')}
                      fill="var(--accent-rose)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="maxKwAfterBess"
                      name={t('Szczyt Miesięczny PO PowerKeeper [kW]', 'Monthly Peak AFTER PowerKeeper [kW]')}
                      fill="var(--accent-emerald)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <h3 className="panel-title">
                  {t('Zestawienie Miesięczne Peak Shaving i Kar 10x OSD', 'Monthly Peak Shaving & 10x DSO Penalties Breakdown')}
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Miesiąc', 'Month')}</th>
                      <th>{t('Max Przed [kW]', 'Max Before [kW]')}</th>
                      <th>{t('Max Po BESS [kW]', 'Max After BESS [kW]')}</th>
                      <th>{t('Zredukowano [kW]', 'Shaved [kW]')}</th>
                      <th>{t('Kara OSD Przed', 'DSO Penalty Before')}</th>
                      <th>{t('Kara OSD Po', 'DSO Penalty After')}</th>
                      <th>{t('Oszczędność Kar 10x', '10x Penalty Saved')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simResult.monthlyBreakdown.map(row => (
                      <tr key={row.month}>
                        <td className="mono">{row.month}</td>
                        <td className="mono" style={{ color: 'var(--accent-rose)' }}>{row.maxKwOrig} kW</td>
                        <td className="mono" style={{ color: 'var(--accent-primary)' }}>{row.maxKwAfterBess} kW</td>
                        <td className="mono" style={{ color: 'var(--accent-emerald)' }}>-{row.shavedKw} kW</td>
                        <td className="mono">{fmtMoney(row.penaltyBeforePln)}</td>
                        <td className="mono">{fmtMoney(row.penaltyAfterPln)}</td>
                        <td className="mono" style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                          +{fmtMoney(row.penaltySavedPln)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUTO-SIZER MATRIX (MODULAR TOWERS CO 50 KWH & INVERTERS 50/80/125 kW) */}
        {activeTab === 'autosizer' && (
          <div className="panel-card view-pane">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  <Award size={18} color="var(--accent-amber)" />
                  {t(
                    'Matryca Doboru Wież PowerKeeper (min. 4 moduły = 50 kWh) i Falowników (50 / 80 / 125 kW)',
                    'PowerKeeper Modular Towers Matrix (min. 4 modules = 50 kWh) & Inverters (50 / 80 / 125 kW)'
                  )}
                </h3>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {t(
                    'Porównanie konfiguracji wieżowych PowerKeeper (50 / 100 / 150 / 200 kWh) z dopasowanymi falownikami hybrydowymi i pełnym CAPEX dla wgranego profilu',
                    'Comparison of PowerKeeper tower configurations (50 / 100 / 150 / 200 kWh) with matched hybrid inverters and full CAPEX for the active load profile'
                  )}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('Konfiguracja PowerKeeper', 'PowerKeeper Configuration')}</th>
                    <th>{t('Wieże / Moduły', 'Towers / Modules')}</th>
                    <th>{t('Falownik Hybrydowy', 'Hybrid Inverter')}</th>
                    <th>{t('Łączny CAPEX (Bateria + Falownik)', 'Total CAPEX (Battery + Inverter)')}</th>
                    <th>{t('Koszyk URE Po', 'URE Basket After')}</th>
                    <th>{t('Zysk Peak Shaving', 'Peak Shaving Profit')}</th>
                    <th>{t('Zysk Opłata Mocowa', 'Capacity Fee Profit')}</th>
                    <th>{t('Zysk BESS (Arbitraż)', 'BESS Gain (Arbitrage)')}</th>
                    <th>{t('Suma Zysków BESS / Rok', 'Total BESS Savings / Yr')}</th>
                    <th>{t('ROI BESS [Lata]', 'BESS ROI [Years]')}</th>
                    <th>{t('Akcja', 'Action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sizingMatrix.map(row => {
                    const isCurrent = params.enableBess && params.powerKeeperModules === row.modules && (params.inverterCount || 1) === (row.inverterCount || 1);
                    return (
                      <tr
                        key={row.id}
                        style={isCurrent ? { background: 'rgba(14, 165, 233, 0.12)' } : undefined}
                      >
                        <td style={{ fontWeight: 600 }}>{lang === 'en' ? row.nameEn : row.name}</td>
                        <td className="mono">
                          {row.towers} {t('wieża', 'tower')}{row.towers > 1 ? (row.towers < 5 ? (lang === 'en' ? 's' : 'e') : (lang === 'en' ? 's' : 'ż')) : ''} ({row.modules} × 12.5 kWh)
                        </td>
                        <td className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                          {row.inverterCount > 1 ? `${row.inverterCount}× ${row.inverterModelKw} kW (${row.inverterTotalPowerKw} kW)` : `${row.inverterModelKw} kW`}
                          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                            ~{fmtMoney(row.inverterPricePln)}
                          </div>
                        </td>
                        <td className="mono">
                          <strong style={{ color: 'var(--text-primary)' }}>{fmtMoney(row.capexPln)}</strong>
                          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                            {fmtMoney(row.batteryCapexPln)} + {fmtMoney(row.inverterPricePln)}
                          </div>
                        </td>
                        <td className="mono" style={{ color: 'var(--accent-violet)', fontWeight: 700 }}>{row.basketAfter}</td>
                        <td className="mono" style={{ color: 'var(--accent-primary)' }}>
                          {fmtMoney(row.annualPeakShavingSavingsPln)}
                        </td>
                        <td className="mono" style={{ color: 'var(--accent-violet)' }}>
                          {fmtMoney(row.annualUreCapacityFeeSavingsPln)}
                        </td>
                        <td className="mono" style={{ color: 'var(--accent-emerald)' }}>
                          {fmtMoney(row.annualEnergySavingsPln)}
                        </td>
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          {fmtMoney(row.annualTotalSavingsPln)}
                        </td>
                        <td className="mono" style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                          {row.roiYears} {t('lat', 'yrs')}
                          {params.pvCapacityKwp > 0 && row.roiCombinedYears ? (
                            <div style={{ fontSize: '0.67rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                              PV+BESS: {row.roiCombinedYears} {t('lat', 'yrs')}
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <button
                            className="preset-chip active"
                            onClick={() => {
                              updateParam('enableBess', true);
                              updateParam('powerKeeperModules', row.modules);
                              updateParam('inverterCount', row.inverterCount || 1);
                              updateParam('inverterModelKw', row.inverterModelKw);
                              updateParam('bessPowerKw', row.inverterTotalPowerKw);
                              updateParam('inverterPricePln', row.singleInverterPricePln || getInverterDefaultPrice(row.inverterModelKw));
                            }}
                          >
                            {isCurrent ? (
                              <>
                                <CheckCircle2 size={12} /> {t('Wybrano', 'Active')}
                              </>
                            ) : (
                              t('Wybierz', 'Select')
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: 24x7 HEATMAP */}
        {activeTab === 'heatmap' && m && (
          <div className="panel-card view-pane">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">
                  {t(
                    'Heatmapa Obciążenia Sieci 24×7 (Średnia Moc [kW] wg Dnia Tygodnia i Godziny)',
                    '24×7 Grid Load Heatmap (Average Power [kW] by Day of Week & Hour)'
                  )}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {t(
                    'Kliknij dowolną godzinę w tabeli, aby natychmiast przejść do wykresu dla tej godziny',
                    'Click any hour cell in the heatmap to jump directly to the detailed chart for that hour window'
                  )}
                </div>
              </div>
              <div className="view-tabs">
                <button
                  className={`view-tab ${heatmapMode === 'before' ? 'active' : ''}`}
                  onClick={() => setHeatmapMode('before')}
                >
                  {t('Przed BESS (Oryginalny Profil)', 'Before BESS (Original Profile)')}
                </button>
                <button
                  className={`view-tab ${heatmapMode === 'after' ? 'active' : ''}`}
                  onClick={() => setHeatmapMode('after')}
                >
                  {t('Po PowerKeeper BESS + PV', 'After PowerKeeper BESS + PV')}
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="heatmap-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-secondary)' }}>
                      {t('Dzień \\ Godz', 'Day \\ Hr')}
                    </th>
                    {Array.from({ length: 24 }, (_, hr) => (
                      <th key={hr} className="mono" style={{ color: 'var(--text-secondary)' }}>
                        {String(hr).padStart(2, '0')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {simResult.heatmapData.map(row => (
                    <tr key={row.day}>
                      <td style={{ fontWeight: 700, padding: '0.4rem', color: 'var(--text-primary)' }}>
                        {lang === 'en' ? row.dayEn || row.day : row.day}
                      </td>
                      {row.hours.map(cell => {
                        const val = heatmapMode === 'before' ? cell.avgBeforeKw : cell.avgAfterKw;
                        const ratio = Math.min(1, val / Math.max(1, m.maxKwBefore));
                        const isOverContract = val > params.contractedPowerKw;
                        const bg = isOverContract
                          ? `rgba(244, 63, 94, ${0.45 + ratio * 0.45})`
                          : ratio > 0.6
                          ? `rgba(245, 158, 11, ${0.25 + ratio * 0.45})`
                          : `rgba(16, 185, 129, ${0.12 + ratio * 0.45})`;
                        return (
                          <td
                            key={cell.hour}
                            className="heatmap-cell"
                            style={{ background: bg, cursor: 'pointer' }}
                            title={`${t('Godzina', 'Hour')} ${String(cell.hour).padStart(2, '0')}:00 — ${t('Średnio', 'Avg')} ${val.toFixed(1)} kW`}
                            onClick={() => {
                              setHourRange({
                                startHour: Math.max(0, cell.hour - 1),
                                endHour: Math.min(24, cell.hour + 2)
                              });
                              setActiveTab('designer');
                            }}
                          >
                            {val.toFixed(0)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: FORECAST FACTORS CARD (INCLUDED IN ENGINE VS EXTERNAL FACTORS TO REMEMBER) */}
        {activeTab === 'forecast' && m && extendedForecastSummary && (
          <div className="view-pane">
            {/* INTERACTIVE SENSITIVITY SIMULATOR FOR EXTERNAL FACTORS */}
            <div className="panel-card" style={{ border: '1px solid var(--border-highlight)' }}>
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">
                    <Compass size={19} color="var(--accent-primary)" />
                    {t(
                      'Symulator Wrażliwości Prognozy (Wpływ Czynników Dodatkowych na 10-Letni Wynik i ROI)',
                      'Forecast Sensitivity Simulator (Impact of External Factors on 10-Year Profit & ROI)'
                    )}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {t(
                      'Sprawdź, jak inflacja cen energii, dotacje unijne, wartość unikniętych przestojów (Backup EPS <10 ms) oraz serwis O&M zmieniają prognozę',
                      'Test how electricity price inflation, EU grants, avoided downtime value (EPS Backup <10 ms), and O&M costs transform the forecast'
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div className="field-label">
                    <span>{t('Inflacja cen energii i taryf OSD', 'Energy & DSO Tariff Inflation')}</span>
                    <strong className="mono" style={{ color: 'var(--accent-emerald)' }}>
                      {forecastAdjustments.energyInflationPct}% / {t('rok', 'yr')}
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={forecastAdjustments.energyInflationPct}
                    onChange={e => setForecastAdjustments(p => ({ ...p, energyInflationPct: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div className="field-label">
                    <span>{t('Dotacja / Ulga podatkowa CAPEX', 'CAPEX Grant / Tax Relief')}</span>
                    <strong className="mono" style={{ color: 'var(--accent-primary)' }}>{forecastAdjustments.subsidyGrantPct}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={forecastAdjustments.subsidyGrantPct}
                    onChange={e => setForecastAdjustments(p => ({ ...p, subsidyGrantPct: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div className="field-label">
                    <span>{t('Wartość ochrony przed przestojem (EPS)', 'Avoided Outage Value (EPS Backup)')}</span>
                    <strong className="mono" style={{ color: 'var(--accent-amber)' }}>
                      {fmtMoney(forecastAdjustments.avoidedDowntimePlnYear)}/{t('rok', 'yr')}
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={currency === 'EUR' ? 20000 : 80000}
                    step={currency === 'EUR' ? 1000 : 5000}
                    value={currency === 'EUR' ? Math.round(forecastAdjustments.avoidedDowntimePlnYear / EUR_PLN_RATE) : forecastAdjustments.avoidedDowntimePlnYear}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setForecastAdjustments(p => ({
                        ...p,
                        avoidedDowntimePlnYear: currency === 'EUR' ? val * EUR_PLN_RATE : val
                      }));
                    }}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div className="field-label">
                    <span>{t('Serwis O&M + Ubezpieczenie (% CAPEX)', 'O&M Service + Insurance (% CAPEX)')}</span>
                    <strong className="mono" style={{ color: 'var(--accent-rose)' }}>
                      {forecastAdjustments.omCostPctCapex}% / {t('rok', 'yr')}
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.1"
                    value={forecastAdjustments.omCostPctCapex}
                    onChange={e => setForecastAdjustments(p => ({ ...p, omCostPctCapex: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="kpi-grid" style={{ marginBottom: 0 }}>
                <div className="kpi-card" data-accent="primary">
                  <div className="kpi-header">{t('CAPEX Netto (Po Dotacji)', 'Net CAPEX (After Grant)')}</div>
                  <div className="kpi-value" style={{ color: 'var(--accent-primary)' }}>
                    {fmtMoney(extendedForecastSummary.netCapexWithSubsidy)}
                  </div>
                  <div className="kpi-sub">
                    {t('Bazowy CAPEX:', 'Base CAPEX:')} {fmtMoney(m.totalCapexPln)}
                  </div>
                </div>

                <div className="kpi-card" data-accent="emerald">
                  <div className="kpi-header">{t('Zysk Roczny (Z Ochroną EPS - O&M)', 'Annual Profit (With EPS - O&M)')}</div>
                  <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
                    {fmtMoney(extendedForecastSummary.firstYearExtendedSavings)}
                  </div>
                  <div className="kpi-sub">
                    {t('Model bazowy:', 'Base model:')} {fmtMoney(m.annualTotalSavingsPln)}/{t('rok', 'yr')}
                  </div>
                </div>

                <div className="kpi-card" data-accent="amber">
                  <div className="kpi-header">{t('Skorygowany Czas Zwrotu (ROI)', 'Adjusted Payback Period (ROI)')}</div>
                  <div className="kpi-value" style={{ color: 'var(--accent-amber)' }}>
                    {extendedForecastSummary.extRoiYears} {t('lat', 'yrs')}
                  </div>
                  <div className="kpi-sub">
                    {t('Bazowy ROI w aplikacji:', 'Base in-app ROI:')} {m.roiYears} {t('lat', 'yrs')}
                  </div>
                </div>

                <div className="kpi-card" data-accent="emerald">
                  <div className="kpi-header">{t('Skumulowany Zysk Netto (10 Lat z Inflacją)', '10-Year Cumulative Net Profit (With Inflation)')}</div>
                  <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
                    +{fmtMoney(extendedForecastSummary.cumExt10Y)}
                  </div>
                  <div className="kpi-sub">
                    {t('Bez inflacji i dotacji:', 'Without inflation & grants:')} +{fmtMoney(extendedForecastSummary.cumBase10Y)}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION A: FACTORS ALREADY INCLUDED IN THE SIMULATION ENGINE */}
            <div className="panel-card">
              <div className="panel-header">
                <h3 className="panel-title">
                  <CheckCircle2 size={19} color="var(--accent-emerald)" />
                  {t(
                    'Część A: Czynniki Uwzględnione w Silniku Aplikacji (Zaimplementowane Deterministycznie)',
                    'Part A: Factors Included in the Application Engine (Deterministically Implemented)'
                  )}
                </h3>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--accent-emerald)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 999,
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {t('8 Aktywnych Modułów Obliczeniowych', '8 Active Simulation Modules')}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Czynnik Modelu (W Aplikacji)', 'In-Model Factor (Implemented)')}</th>
                      <th>{t('Kategoria', 'Category')}</th>
                      <th>{t('Wpływ na Wynik', 'Impact')}</th>
                      <th>{t('Parametr / Wzór w Kodzie', 'Code Formula / Parameter')}</th>
                      <th>{t('Znaczenie dla Dokładności Forecastu', 'Significance for Forecast Accuracy')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factorsIncludedList.map(f => {
                      const isCrit = f.impact === 'Krytyczny' || f.impact === 'Critical';
                      return (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 700, color: 'var(--accent-emerald)', minWidth: 220 }}>{f.name}</td>
                          <td className="mono" style={{ fontSize: '0.74rem' }}>{f.category}</td>
                          <td>
                            <span
                              style={{
                                background: isCrit ? 'rgba(244, 63, 94, 0.18)' : 'rgba(14, 165, 233, 0.18)',
                                color: isCrit ? 'var(--accent-rose)' : 'var(--accent-primary)',
                                padding: '0.18rem 0.48rem',
                                borderRadius: 4,
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}
                            >
                              {f.impact}
                            </span>
                          </td>
                          <td className="mono" style={{ fontSize: '0.75rem', minWidth: 190 }}>{f.formulaOrParam}</td>
                          <td style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION B: EXTERNAL FACTORS NOT IN BASELINE ENGINE (MUST REMEMBER IN REAL-WORLD AUDIT) */}
            <div className="panel-card">
              <div className="panel-header">
                <h3 className="panel-title">
                  <AlertTriangle size={19} color="var(--accent-amber)" />
                  {t(
                    'Część B: Czynniki Zewnętrzne Spoza Modelu Bazowego (O Których Należy Pamiętać przy Audycie C&I)',
                    'Part B: External Factors Outside the Baseline Engine (Essential for Real-World C&I Audits)'
                  )}
                </h3>
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.16)',
                    color: 'var(--accent-amber)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 999,
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  {t('8 Czynników Strategicznych i Rynkowych', '8 Strategic & Market Factors')}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Czynnik Zewnętrzny (Do Uwzględnienia)', 'External Factor (To Remember)')}</th>
                      <th>{t('Kategoria', 'Category')}</th>
                      <th>{t('Kierunek Wpływu', 'Direction')}</th>
                      <th>{t('Typowa Skala Wpływu', 'Typical Impact Scale')}</th>
                      <th>{t('Dlaczego Musimy o Nim Pamiętać w Rozmowie z Klientem?', 'Why Must We Remember It During Client Audits?')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factorsExternalList.map(f => {
                      const isOpp =
                        f.riskOrOpportunity.includes('Szansa') || f.riskOrOpportunity.includes('Opportunity');
                      return (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 700, color: 'var(--accent-amber)', minWidth: 220 }}>{f.name}</td>
                          <td className="mono" style={{ fontSize: '0.74rem' }}>{f.category}</td>
                          <td>
                            <span
                              style={{
                                background: isOpp ? 'rgba(16, 185, 129, 0.16)' : 'rgba(139, 92, 246, 0.18)',
                                color: isOpp ? 'var(--accent-emerald)' : 'var(--accent-violet)',
                                padding: '0.18rem 0.48rem',
                                borderRadius: 4,
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}
                            >
                              {f.riskOrOpportunity}
                            </span>
                          </td>
                          <td className="mono" style={{ fontSize: '0.75rem', minWidth: 170 }}>{f.typicalRange}</td>
                          <td style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* HELP & DESIGNER MANUAL TAB */}
        {activeTab === 'help' && (
          <HelpManualView
            t={t}
            lang={lang}
            currency={currency}
            metrics={m}
            params={params}
            parsedProfile={parsedProfile}
            onSwitchTab={setActiveTab}
          />
        )}

        {/* APP-LEVEL DISCLAIMER & LEGAL LIMITATION OF LIABILITY */}
        <div className="app-disclaimer-box">
          <div className="app-disclaimer-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <AlertTriangle size={16} color="var(--accent-amber)" />
              {t(
                'Nota Prawna & Zastrzeżenie Odpowiedzialności (Symulacja Analityczna)',
                'Legal Notice & Disclaimer (Analytical Simulation)'
              )}
            </span>
            <button
              className="btn-secondary"
              style={{
                padding: '0.15rem 0.55rem',
                fontSize: '0.68rem',
                borderColor: 'rgba(245, 158, 11, 0.45)',
                color: 'var(--accent-amber)',
                fontWeight: 600
              }}
              onClick={() => setFloatingTopic('disclaimer')}
              title={t('Otwórz pełną klauzulę prawną i ograniczenie odpowiedzialności', 'Open full legal terms')}
            >
              {t('Pełna klauzula prawna', 'Full legal terms')} →
            </button>
          </div>
          <p style={{ margin: 0 }}>
            {t(
              'Przedstawione wyniki, wykresy, przepływy finansowe, wskaźniki ROI oraz szacowane redukcje mocy umownej i kar OSD stanowią wstępną symulację matematyczną opartą na dostarczonych danych profilu i nie stanowią wiążącej oferty handlowej w rozumieniu art. 66 Kodeksu Cywilnego ani gwarancji finansowej. Rzeczywisty wynik zależy od przyszłego profilu obciążenia obiektu, warunków pogodowych PV, zmian taryf OSD i decyzji Prezesa URE. Przed podjęciem decyzji inwestycyjnej wymagana jest weryfikacja techniczna na obiekcie i uzyskanie warunków przyłączenia do sieci od OSD.',
              'The results, charts, financial cashflows, ROI metrics, and DSO penalty reduction calculations shown are preliminary mathematical simulations based on supplied profile data and do not constitute a binding commercial offer under Polish Civil Code or a financial guarantee. Actual performance depends on future facility load profiles, weather conditions, DSO tariff revisions, and URE regulatory decisions. On-site technical verification and formal DSO grid interconnection conditions are required.'
            )}
          </p>
        </div>
      </main>

      {/* FLOATING EDUCATIONAL WINDOW FOR NON-TECHNICAL CLIENTS (POLISH & ENGLISH, BIPOLAR CURRENCY) */}
      {floatingTopic && m && (
        <div className="modal-backdrop" onClick={() => setFloatingTopic(null)}>
          <div className="floating-window" onClick={e => e.stopPropagation()}>
            <div className="floating-window-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="floating-icon-badge">
                  <Sparkles size={18} color="var(--accent-primary)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-primary)', fontWeight: 700 }}>
                    {t('Przewodnik dla Klienta / Inwestora', 'Client & Investor Guide')}
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.08rem' }}>
                    {floatingTopic === 'disclaimer' &&
                      t(
                        'Klauzula Informacyjna i Ograniczenie Odpowiedzialności (Disclaimer)',
                        'Legal Disclaimer & Limitation of Liability'
                      )}
                    {floatingTopic === 'k-baskets' &&
                      t(
                        'Czym są Koszyki Mocowe (K1, K2, K3, K4) i jak dają 83% rabatu?',
                        'What are URE Capacity Baskets (K1–K4) and how do they grant an 83% discount?'
                      )}
                    {floatingTopic === 'capacity-fee' &&
                      t(
                        'Czym jest Opłata Mocowa na fakturze za prąd (07:00–22:00)?',
                        'What is the URE Capacity Fee on your electricity bill (07:00–22:00)?'
                      )}
                    {floatingTopic === 'osd-penalty' &&
                      t(
                        'Moc Umowna, Kary 10x OSD i jak działa Peak Shaving (< 10 ms)?',
                        'Contracted Power, 10x DSO Penalties & how < 10 ms Peak Shaving works'
                      )}
                    {floatingTopic === 'dc-coupled' &&
                      t(
                        'Dlaczego architektura PowerKeeper DC-Coupled (12,5 kWh) daje przewagę?',
                        'Why does PowerKeeper DC-Coupled (12.5 kWh) architecture give an advantage?'
                      )}
                    {floatingTopic === 'arbitrage' &&
                      t(
                        'Jak działa Arbitraż Cenowy i „Efekt Gąbki” (Autokonsumpcja PV)?',
                        'How do Price Arbitrage and the PV "Sponge Effect" work?'
                      )}
                  </h3>
                </div>
              </div>
              <button className="floating-close-btn" onClick={() => setFloatingTopic(null)}>
                <X size={18} />
              </button>
            </div>

            {floatingTopic === 'k-baskets' && (
              <div className="floating-body">
                <p className="floating-lead">
                  {t(
                    <>
                      Urząd Regulacji Energetyki (URE) nagradza firmy, które mają <strong>płaski, równomierny profil zużycia prądu</strong>. Zamiast płacić pełną stawkę opłaty mocowej, zakład może trafić do jednego z czterech <strong>Koszyków Mocowych (K1–K4)</strong> i otrzymać aż do <strong>83% zniżki</strong>!
                    </>,
                    <>
                      The Energy Regulatory Office (URE) rewards companies that maintain a <strong>flat, even electricity load profile</strong>. Instead of paying the full capacity fee rate, your facility is classified into one of four <strong>Capacity Baskets (K1–K4)</strong> and can earn up to an <strong>83% statutory discount</strong>!
                    </>
                  )}
                </p>

                <div className="floating-highlight-box">
                  <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--accent-primary)' }}>
                    {t(
                      'Wynik dla Twojego profilu w tej symulacji:',
                      'Live Result for Your Facility Profile in this Simulation:'
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.86rem' }}>
                    <div>
                      {t('Przed magazynem:', 'Before BESS:')}{' '}
                      <strong style={{ color: 'var(--accent-rose)' }}>
                        {t('Koszyk', 'Basket')} {m.basketBefore}
                      </strong>{' '}
                      (Δs = {m.basketDeltaSBeforePct}%, {t('mnożnik', 'factor')} {m.basketFactorBefore})
                    </div>
                    <div>
                      {t('Z PowerKeeper:', 'With PowerKeeper:')}{' '}
                      <strong style={{ color: 'var(--accent-emerald)' }}>
                        {t('Koszyk', 'Basket')} {m.basketAfter}
                      </strong>{' '}
                      (Δs = {m.basketDeltaSAfterPct}%, {t('rabat', 'discount')} <strong>-{m.basketDiscountAfterPct}%</strong>)
                    </div>
                    <div>
                      {t('Oszczędność:', 'Annual Savings:')}{' '}
                      <strong style={{ color: 'var(--accent-emerald)' }}>{fmtMoney(m.annualUreCapacityFeeSavingsPln)}/{t('rok', 'yr')}</strong>
                    </div>
                  </div>
                </div>

                <table className="data-table" style={{ marginTop: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th>{t('Koszyk URE', 'URE Basket')}</th>
                      <th>{t('Różnica poboru Szczyt vs Poza Szczytem (Δs)', 'Peak vs Off-Peak Ratio (Δs)')}</th>
                      <th>{t('Mnożnik Opłaty (Współczynnik A)', 'Fee Multiplier (Factor A)')}</th>
                      <th>{t('Rabat dla Klienta', 'Statutory Discount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        {t('Koszyk K1 (Najlepszy)', 'Basket K1 (Best)')}
                      </td>
                      <td className="mono">Δs &lt; 5%</td>
                      <td className="mono">0.17</td>
                      <td style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                        {t('-83% rabatu (płacisz tylko 17% stawki!)', '-83% discount (pay only 17% of the rate!)')}
                      </td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {t('Koszyk K2', 'Basket K2')}
                      </td>
                      <td className="mono">5% ≤ Δs &lt; 10%</td>
                      <td className="mono">0.50</td>
                      <td style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                        {t('-50% rabatu (płacisz połowę)', '-50% discount (pay half)')}
                      </td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--accent-amber)' }}>
                        {t('Koszyk K3', 'Basket K3')}
                      </td>
                      <td className="mono">10% ≤ Δs &lt; 15%</td>
                      <td className="mono">0.83</td>
                      <td style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                        {t('-17% rabatu', '-17% discount')}
                      </td>
                    </tr>
                    <tr>
                      <td className="mono" style={{ fontWeight: 700, color: 'var(--accent-rose)' }}>
                        {t('Koszyk K4 (Brak ulgi)', 'Basket K4 (No discount)')}
                      </td>
                      <td className="mono">Δs ≥ 15%</td>
                      <td className="mono">1.00</td>
                      <td style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>
                        {t('0% rabatu (100% pełnej opłaty)', '0% discount (100% full charge)')}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <p className="floating-note">
                  {t(
                    <>
                      <strong>Jak pomaga PowerKeeper?</strong> Magazyn ładuje się w nocy lub ze słońca i oddaje prąd w godzinach 07:00–22:00. Dzięki temu spłaszcza profil poboru z sieci (zmniejsza Δs) i automatycznie przesuwa firmę z drogiego koszyka K4 do tańszego koszyka K2 lub K1!
                    </>,
                    <>
                      <strong>How does PowerKeeper help?</strong> The battery charges at night or from solar PV and discharges during peak hours (07:00–22:00). This flattens grid import (reducing Δs) and automatically promotes your facility from expensive Basket K4 into K2 or K1!
                    </>
                  )}
                </p>
              </div>
            )}

            {floatingTopic === 'capacity-fee' && (
              <div className="floating-body">
                <p className="floating-lead">
                  {t(
                    <>
                      <strong>Opłata Mocowa (Rynek Mocy URE)</strong> to dodatkowa pozycja na każdej fakturze za prąd dla firm, wprowadzona na utrzymanie rezerw mocy w polskich elektrowniach. Jest naliczana za każdą kilowatogodzinę (kWh) pobraną z sieci w dni robocze między <strong>07:00 rano a 22:00 wieczorem</strong> (15 godzin dziennie).
                    </>,
                    <>
                      The <strong>URE Capacity Fee (Rynek Mocy)</strong> is a mandatory surcharge on Polish C&I electricity bills that funds national power plant reserves. It is charged on every kilowatt-hour (kWh) drawn from the grid on workdays between <strong>07:00 AM and 10:00 PM</strong> (15 hours/day).
                    </>
                  )}
                </p>

                <div className="floating-highlight-box">
                  <div>
                    • {t('Stawka bazowa URE (2026):', 'URE Base Rate (2026):')}{' '}
                    <strong>{fmtUnit(params.ureCapacityFeeBasePlnKwh, '/kWh', 4)}</strong>
                  </div>
                  <div>
                    • {t('Koszt opłaty mocowej w Twoim profilu BEZ BESS:', 'Capacity Fee in your profile WITHOUT BESS:')}{' '}
                    <strong style={{ color: 'var(--accent-rose)' }}>{fmtMoney(m.annualUreCapacityFeeBeforePln)} / {t('rok', 'yr')}</strong>
                  </div>
                  <div>
                    • {t('Koszt opłaty mocowej Z PowerKeeper:', 'Capacity Fee WITH PowerKeeper:')}{' '}
                    <strong style={{ color: 'var(--accent-emerald)' }}>{fmtMoney(m.annualUreCapacityFeeAfterPln)} / {t('rok', 'yr')}</strong> (
                    {t('Zysk:', 'Saved:')} <strong>+{fmtMoney(m.annualUreCapacityFeeSavingsPln)}/{t('rok', 'yr')}</strong>)
                  </div>
                </div>

                <p className="floating-note">
                  {t(
                    <>
                      <strong>Podwójna korzyść z PowerKeeper:</strong> Po pierwsze, w godzinach 07:00–22:00 zakład zasila się z magazynu i PV, więc pobiera mniej kWh w oknie szczytowym. Po drugie, mniejszy pobór w dzień obniża wskaźnik Δs, dając dodatkowy rabat z Koszyka Mocowego K1–K3!
                    </>,
                    <>
                      <strong>Double benefit with PowerKeeper:</strong> First, between 07:00 and 22:00 your facility runs on stored battery + PV energy, reducing taxable peak kWh volume. Second, lower daytime import reduces Δs, unlocking an extra statutory discount via Basket K1–K3!
                    </>
                  )}
                </p>
              </div>
            )}

            {floatingTopic === 'osd-penalty' && (
              <div className="floating-body">
                <p className="floating-lead">
                  {t(
                    <>
                      Każdy zakład umawia się z Operatorem Sieci Dystrybucyjnej (OSD) na tzw. <strong>Moc Umowną [kW]</strong>. Licznik OSD sprawdza średni pobór mocy co <strong>15 minut</strong>. Jeśli w którymkolwiek kwadransie maszyny (np. wtryskarki, piece, klimatyzacja, ładowarki EV) przekroczą ten limit, operator nalicza <strong>10-krotną karę</strong>!
                    </>,
                    <>
                      Every C&I facility contracts a fixed <strong>Contracted Power limit [kW]</strong> with the DSO (OSD). The utility meter measures average demand every <strong>15 minutes</strong>. If machinery startups (injection molding, ovens, chillers, EV chargers) exceed this limit in any 15-min window, the DSO charges a <strong>10x statutory penalty</strong>!
                    </>
                  )}
                </p>

                <div className="floating-formula-box">
                  {t(
                    `Wzór OSD: Kara [${currency}] = ΔP (Przekroczenie kW) × Stawka stała sieciowa [${currency}/kW/mc] × 10`,
                    `DSO Formula: Penalty [${currency}] = ΔP (Exceeded kW) × Monthly Network Rate [${currency}/kW/mo] × 10`
                  )}
                </div>

                <div className="floating-highlight-box">
                  <div>
                    • {t('Moc umowna w symulacji:', 'Simulated Contracted Power:')} <strong>{m.contractedPowerKw} kW</strong>
                  </div>
                  <div>
                    • {t('Szczyt 15-min PRZED BESS:', '15-min Peak BEFORE BESS:')}{' '}
                    <strong style={{ color: 'var(--accent-rose)' }}>{m.maxKwBefore} kW</strong> ({t('przekroczenie o', 'exceeded by')} {m.deltaPBeforeKw} kW)
                  </div>
                  <div>
                    • {t('Szczyt 15-min PO PowerKeeper:', '15-min Peak AFTER PowerKeeper:')}{' '}
                    <strong style={{ color: 'var(--accent-primary)' }}>{m.maxKwAfter} kW</strong> ({t('obcięto szczyt o', 'peak shaved by')}{' '}
                    <strong>{m.powerShavedKw} kW</strong>)
                  </div>
                  <div>
                    • {t('Łączny zysk z Peak Shavingu:', 'Total Peak Shaving Profit:')}{' '}
                    <strong style={{ color: 'var(--accent-emerald)' }}>{fmtMoney(m.annualPeakShavingSavingsPln)} / {t('rok', 'yr')}</strong>
                  </div>
                </div>

                <p className="floating-note">
                  {t(
                    <>
                      <strong>Jak działa Peak Shaving (DSO Guard &lt; 10 ms)?</strong> Gdy w zakładzie rusza ciężka maszyna, układ PowerKeeper w mniej niż 10 milisekund (szybciej niż jedno mrugnięcie okiem) wstrzykuje brakującą moc z baterii. Licznik OSD widzi płaski pobór poniżej limitu i nie nalicza żadnych kar.
                    </>,
                    <>
                      <strong>How does Peak Shaving (DSO Guard &lt; 10 ms) work?</strong> The instant heavy machinery starts up, PowerKeeper injects the missing power from the battery in under 10 milliseconds. The DSO meter sees a flat demand below your limit and charges zero penalties.
                    </>
                  )}
                </p>
              </div>
            )}

            {floatingTopic === 'dc-coupled' && (
              <div className="floating-body">
                <p className="floating-lead">
                  {t(
                    <>
                      <strong>PowerKeeper</strong> wykorzystuje nowoczesną architekturę <strong>DC-Coupled</strong> (bezpośrednie spięcie paneli fotowoltaicznych i magazynu energii na wspólnej szynie prądu stałego DC wewnątrz jednego falownika hybrydowego) oraz <strong>moduły LFP o pojemności dokładnie 12,5 kWh</strong>.
                    </>,
                    <>
                      <strong>PowerKeeper</strong> utilizes a modern <strong>DC-Coupled architecture</strong> (connecting solar PV and battery storage directly on a shared DC bus inside a single hybrid inverter) with <strong>12.5 kWh LFP battery modules</strong>.
                    </>
                  )}
                </p>

                <div className="floating-highlight-box">
                  <div>
                    1. <strong>{t('+5–8% wyższa sprawność ładowania z PV:', '+5–8% higher PV charging efficiency:')}</strong>{' '}
                    {t(
                      'Prąd stały (DC) z paneli trafia prosto do baterii (DC) bez niepotrzebnej podwójnej zamiany na prąd zmienny (DC→AC→DC).',
                      'Direct current (DC) from solar panels flows straight into the DC battery without wasteful double conversion (DC→AC→DC).'
                    )}
                  </div>
                  <div style={{ marginTop: '0.35rem' }}>
                    2. <strong>{t('Brak blokady przyłącza OSD:', 'Zero DSO grid connection summing:')}</strong>{' '}
                    {t(
                      'Operator sieci liczy tylko moc jednego falownika hybrydowego AC – moc baterii nie sumuje się z mocą fotowoltaiki, co chroni przed odmową warunków przyłączenia.',
                      'The utility operator only counts the single AC hybrid inverter rating—battery power does not sum with PV power, avoiding grid connection rejections.'
                    )}
                  </div>
                  <div style={{ marginTop: '0.35rem' }}>
                    3. <strong>{t('Wieże modułowe (min. 4 moduły = 50 kWh) & Falowniki 50 / 80 / 125 kW:', 'Modular Towers (min. 4 modules = 50 kWh) & 50 / 80 / 125 kW Inverters:')}</strong>{' '}
                    {t(
                      'Najmniejsza wieża PowerKeeper to 4 moduły (50,0 kWh). System skaluje się w wieżach: 50 kWh (1 wieża), 100 kWh (2 wieże), 150 kWh (3 wieże) i 200 kWh (4 wieże kaskada) z dedykowanymi inwerterami hybrydowymi 50 kW, 80 kW i 125 kW oraz zapewnia zasilanie awaryjne (Backup / EPS) < 10 ms.',
                      'The minimum PowerKeeper tower is 4 modules (50.0 kWh). System scales in towers: 50 kWh (1 tower), 100 kWh (2 towers), 150 kWh (3 towers), and 200 kWh (4-tower cascade) with matched 50 kW, 80 kW, and 125 kW hybrid inverters, providing < 10 ms Emergency Backup (EPS).'
                    )}
                  </div>
                </div>
              </div>
            )}

            {floatingTopic === 'arbitrage' && (
              <div className="floating-body">
                <p className="floating-lead">
                  {t(
                    <>
                      Nawet jeśli zakład nie przekracza mocy umownej lub nie ma jeszcze fotowoltaiki, magazyn <strong>PowerKeeper</strong> zarabia codziennie na różnicy cen prądu między godzinami tanimi a drogimi (tzw. <strong>Arbitraż Cenowy</strong>) oraz na zatrzymywaniu darmowej energii słonecznej w firmie (<strong>„Efekt Gąbki”</strong>).
                    </>,
                    <>
                      Even if a facility has zero solar PV or no contracted power exceedances, <strong>PowerKeeper</strong> generates daily savings from the price spread between cheap off-peak hours and expensive peak hours (<strong>Price Arbitrage</strong>) and by absorbing free solar energy on-site (<strong>"Sponge Effect"</strong>).
                    </>
                  )}
                </p>

                <div className="floating-highlight-box">
                  <div>
                    • <strong>{t('Tania strefa nocna / południowa:', 'Cheap Night / Midday Window:')}</strong>{' '}
                    {t('Magazyn ładuje się, gdy prąd kosztuje np.', 'Battery charges when electricity costs e.g.')}{' '}
                    {fmtUnit(params.priceKwhNight, '/kWh')} {t('lub 0 z nadwyżki PV.', 'or 0 from PV surplus.')}
                  </div>
                  <div style={{ marginTop: '0.3rem' }}>
                    • <strong>{t('Drogi szczyt (07:00–13:00 oraz 16:00–21:00):', 'Expensive Peak (07:00–13:00 & 16:00–21:00):')}</strong>{' '}
                    {t('Magazyn oddaje zgromadzoną energię, zastępując zakup prądu po', 'Battery discharges stored energy, replacing grid import at')}{' '}
                    {fmtUnit(params.priceKwhPeak, '/kWh')}.
                  </div>
                  <div style={{ marginTop: '0.3rem' }}>
                    • <strong>{t('Zysk w Twojej symulacji:', 'Profit in your simulation:')}</strong>{' '}
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      +{fmtMoney(m.annualEnergySavingsTotalWithPvPln)} / {t('rok', 'yr')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {floatingTopic === 'disclaimer' && (
              <div className="floating-body">
                <p className="floating-lead">
                  {t(
                    <>
                      Aplikacja <strong>PowerKeeper Studio</strong> jest zaawansowanym narzędziem inżynierskim służącym do symulacji matematycznej i analizy profili elektroenergetycznych. Wszystkie generowane zestawienia służą do <strong>wstępnej oceny koncepcyjnej</strong>.
                    </>,
                    <>
                      <strong>PowerKeeper Studio</strong> is an advanced engineering tool designed for mathematical simulation and load profile analysis. All generated reports serve exclusively for <strong>preliminary conceptual assessment</strong>.
                    </>
                  )}
                </p>

                <div className="floating-highlight-box">
                  <div style={{ fontWeight: 700, marginBottom: '0.45rem', color: 'var(--accent-amber)', fontSize: '0.88rem' }}>
                    {t('Kluczowe Zastrzeżenia Prawne i Ograniczenie Odpowiedzialności:', 'Key Legal Disclaimers & Limitation of Liability:')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.83rem', lineHeight: 1.55 }}>
                    <div>
                      <strong>1. {t('Brak Oferty Handlowej (Art. 66 K.C.):', 'No Commercial Offer (Civil Code):')}</strong><br />
                      {t(
                        'Niniejsza symulacja, raporty do druku oraz wykresy nie stanowią oferty handlowej w rozumieniu przepisów art. 66 i nast. Kodeksu Cywilnego ani wiążącej gwarancji osiągnięcia określonych przychodów, rabatów URE czy okresu zwrotu z inwestycji (ROI).',
                        'This simulation, print reports, and charts do not constitute a commercial offer under Art. 66 of the Polish Civil Code or a financial guarantee of future revenue, URE discounts, or ROI payback.'
                      )}
                    </div>
                    <div>
                      <strong>2. {t('Charakter Modelu Matematycznego:', 'Mathematical Modeling Nature:')}</strong><br />
                      {t(
                        'Silnik aplikacji przetwarza historyczny profil 15-minutowy / 1-godzinny według przyjętych stałych algorytmów. Bieżące i przyszłe zużycie energii w zakładzie (awarie maszyn, zmiany w planie produkcji, rozbudowa parku maszynowego) może odbiegać od danych historycznych.',
                        'The calculation engine processes historical 15-minute / 1-hour load data using deterministic dispatch models. Future facility consumption patterns (machinery downtime, production schedule shifts, expansion) may deviate from historical input.'
                      )}
                    </div>
                    <div>
                      <strong>3. {t('Zmienność Regulacyjna i Cenowa:', 'Regulatory & Market Volatility:')}</strong><br />
                      {t(
                        'Koszty energii elektrycznej, taryfy dystrybucyjne OSD, stawki opłaty mocowej URE (okno 07:00–22:00) oraz ceny energii na Rynku Dnia Następnego (RDN / TGE) podlegają okresowym zmianom i decyzjom regulatorów, na które autor oprogramowania nie ma wpływu.',
                        'Electricity prices, DSO distribution tariffs, URE capacity fee rates (07:00–22:00 window), and wholesale day-ahead spot prices (RDN/TGE) are subject to periodic regulatory updates and market volatility beyond the software author\'s control.'
                      )}
                    </div>
                    <div>
                      <strong>4. {t('Wymóg Audytu Obiektowego i Uzgodnień OSD:', 'Mandatory Site Due Diligence & DSO Approvals:')}</strong><br />
                      {t(
                        'Przed podjęciem decyzji o zakupie systemu BESS wymagana jest fizyczna wizja lokalna, audyt instalacji elektrycznej SN/nN obiektu, pomiary jakości zasilania oraz uzyskanie formalnych Warunków Przyłączenia do Sieci wydanych przez Operatora Systemu Dystrybucyjnego (OSD).',
                        'Prior to BESS procurement, a physical site survey, main switchgear audit, power quality assessment, and formal grid interconnection conditions issued by the relevant DSO are strictly required.'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="floating-footer">
              <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                {t(
                  'Źródło: Specyfikacja Techniczna PowerKeeper (Moduły 12,5 kWh, DC-Coupled) & URE Rynek Mocy',
                  'Source: PowerKeeper Technical Specification (12.5 kWh Modules, DC-Coupled) & URE Capacity Market Rules'
                )}
              </span>
              <button className="btn-primary" onClick={() => setFloatingTopic(null)}>
                {t('Rozumiem, zamknij okno', 'Got it, close window')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCENARIO COMPARISON MODAL */}
      {showCompareModal && (
        <div className="modal-backdrop" onClick={() => setShowCompareModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h3 className="panel-title">
                <GitCompare size={18} color="var(--accent-primary)" />
                {t('Porównanie Zapisanych Scenariuszy Audytowych', 'Saved Audit Scenarios Comparison')}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {savedScenarios.length > 0 && (
                  <button className="btn-secondary" onClick={() => setSavedScenarios([])}>
                    <Trash2 size={14} /> {t('Wyczyść', 'Clear All')}
                  </button>
                )}
                <button className="btn-secondary" onClick={() => setShowCompareModal(false)}>
                  {t('Zamknij', 'Close')}
                </button>
              </div>
            </div>

            {savedScenarios.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {t(
                  'Brak zapisanych scenariuszy. Kliknij „Zapisz Scenariusz” na górnym pasku, aby dodać warianty do porównania.',
                  'No saved scenarios yet. Click "Save Scenario" in the top bar to add configurations for comparison.'
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Scenariusz', 'Scenario')}</th>
                      <th>{t('Pojemność', 'Capacity')}</th>
                      <th>{t('Koszyk URE', 'URE Basket')}</th>
                      <th>CAPEX</th>
                      <th>Peak Shaving</th>
                      <th>{t('Opłata Mocowa', 'Capacity Fee')}</th>
                      <th>{t('Arbitraż Cenowy', 'Arbitrage')}</th>
                      <th>{t('Łączny Zysk / Rok', 'Total Savings / Yr')}</th>
                      <th>ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedScenarios.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.label}</td>
                        <td className="mono">{s.capacityKwh} kWh</td>
                        <td className="mono">{s.basketBefore} → {s.basketAfter}</td>
                        <td className="mono">{fmtMoney(s.capexPln)}</td>
                        <td className="mono" style={{ color: 'var(--accent-primary)' }}>
                          {fmtMoney(s.annualPeakShavingSavingsPln)}
                        </td>
                        <td className="mono" style={{ color: 'var(--accent-violet)' }}>
                          {fmtMoney(s.annualUreCapacityFeeSavingsPln)}
                        </td>
                        <td className="mono" style={{ color: 'var(--accent-emerald)' }}>
                          {fmtMoney(s.annualEnergySavingsBessOnlyPln || 0)}
                        </td>
                        <td className="mono" style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                          {fmtMoney(s.annualTotalSavingsPln)}
                        </td>
                        <td className="mono" style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                          {s.enableBess ? `${s.roiYears} ${t('lat', 'yrs')}` : '—'}
                          {s.roiCombinedYears ? (
                            <div style={{ fontSize: '0.67rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                              PV+BESS: {s.roiCombinedYears} {t('lat', 'yrs')}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUDIT REPORT PRINT / PDF MODAL (OPCJA A) */}
      <PrintAuditReportModal
        isOpen={showPrintReportModal}
        onClose={() => setShowPrintReportModal(false)}
        metrics={simResult?.metrics}
        params={params}
        cashFlowTimeline={simResult?.cashFlowTimeline || []}
        monthlyBreakdown={simResult?.monthlyBreakdown || []}
        currency={currency}
        fmtMoney={fmtMoney}
        t={t}
        lang={lang}
      />

      {/* FLOATING TOAST NOTIFICATION SYSTEM */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
