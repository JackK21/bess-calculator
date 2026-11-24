import React, { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Zap,
  Shield,
  TrendingUp,
  Cpu,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Mail,
  Star,
  MessageSquare,
  Compass,
  Sliders,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowRight,
  Info,
  ExternalLink,
  Clock,
  BatteryCharging,
  Sun,
  ShieldCheck,
  Send
} from 'lucide-react';

export function HelpManualView({
  t,
  lang,
  currency = 'PLN',
  metrics,
  params,
  parsedProfile,
  onSwitchTab
}) {
  const [activeSection, setActiveSection] = useState('quickstart'); // 'quickstart' | 'architecture' | 'peakshaving' | 'ure' | 'csv' | 'faq' | 'feedback'
  const [rating, setRating] = useState(5);
  const [userRole, setUserRole] = useState('designer');
  const [feedbackCategory, setFeedbackCategory] = useState('sizing');
  const [feedbackText, setFeedbackText] = useState('');
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [copiedSample1, setCopiedSample1] = useState(false);
  const [copiedSample2, setCopiedSample2] = useState(false);

  const sections = [
    {
      id: 'quickstart',
      icon: Zap,
      labelPl: '1. Szybki Start (5 Kroków)',
      labelEn: '1. Quick Start (5 Steps)',
      badge: t('Podstawa', 'Basics')
    },
    {
      id: 'architecture',
      icon: Cpu,
      labelPl: '2. Fizyka & Architektura DC',
      labelEn: '2. DC Physics & Architecture',
      badge: 'PowerKeeper'
    },
    {
      id: 'peakshaving',
      icon: Shield,
      labelPl: '3. Peak Shaving & Kary 10x OSD',
      labelEn: '3. Peak Shaving & 10x DSO Penalties',
      badge: t('Regulacje', 'Regulations')
    },
    {
      id: 'ure',
      icon: TrendingUp,
      labelPl: '4. Opłata Mocowa URE 2026 (K1–K4)',
      labelEn: '4. URE 2026 Capacity Fee (K1–K4)',
      badge: 'Ustawa OZE'
    },
    {
      id: 'csv',
      icon: FileText,
      labelPl: '5. Format Danych OSD (CSV)',
      labelEn: '5. DSO CSV Data Formats',
      badge: '15-min OSD'
    },
    {
      id: 'faq',
      icon: HelpCircle,
      labelPl: '6. Dobre Praktyki & FAQ',
      labelEn: '6. Best Practices & FAQ',
      badge: t('Dla Instalatora', 'For Installers')
    },
    {
      id: 'feedback',
      icon: MessageSquare,
      labelPl: '7. Feedback Projektanta / Instalatora',
      labelEn: '7. Designer & Installer Feedback',
      badge: t('Twoja Opinia', 'Your Voice'),
      highlight: true
    }
  ];

  // Helper do kopiowania feedbacku
  const handleCopyFeedback = () => {
    const feedbackSummary = `=== POWERKEEPER ANALYST - FEEDBACK PARTNERA ===
Data: ${new Date().toISOString()}
Rola: ${userRole}
Ocena: ${rating} / 5 ⭐
Kategoria: ${feedbackCategory}
Uwagi:
${feedbackText || '(Brak dodatkowego opisu)'}

--- PARAMETRY BIEŻĄCEJ SYMULACJI ---
Profil: ${metrics?.ppeCode || 'Brak'} (${metrics?.tariffGroup || 'B21'}, OSD: ${metrics?.osdOperator || 'PGE'})
Moc umowna: ${metrics?.contractedPowerKw || 0} kW
Magazyn: ${metrics?.nominalBessCapacityKwh || 0} kWh (${metrics?.powerKeeperModules || 0} mod., ${metrics?.inverterCount || 0}x ${metrics?.singleInverterKw || 0} kW)
PV: ${params?.pvCapacityKwp || 0} kWp
Pik Przed: ${metrics?.maxKwBefore || 0} kW -> Pik Po: ${metrics?.maxKwAfter || 0} kW
Zgolono: ${metrics?.powerShavedKw || 0} kW
Kary OSD uniknięte: ${metrics?.annualAvoidedOsdPenaltyPln || 0} PLN/rok
Koszyk URE: ${metrics?.basketBefore || 'K4'} -> ${metrics?.basketAfter || 'K1'}
ROI: ${metrics?.roiYears || 0} lat
`;
    navigator.clipboard.writeText(feedbackSummary).then(() => {
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 3000);
    });
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`[PowerKeeper Feedback] Opinia projektanta (${userRole}) - Ocena: ${rating}/5`);
    const body = encodeURIComponent(`Cześć Zespole PowerKeeper,\n\nPrzesyłam swoje uwagi do kalkulatora PowerKeeper Analyst:\n\nKategoria: ${feedbackCategory}\nMoja rola: ${userRole}\nOcena: ${rating}/5 gwiazdek\n\nUwagi i spostrzeżenia z projektowania:\n${feedbackText}\n\nKonfiguracja testowa:\n- Profil: ${metrics?.ppeCode || 'Własny'}\n- Moc umowna: ${metrics?.contractedPowerKw} kW\n- Magazyn: ${metrics?.nominalBessCapacityKwh} kWh / ${metrics?.effectiveBessPowerKw} kW PCS\n- Oszczędności: ${metrics?.annualTotalSavingsPln} PLN/rok\n- Prosty ROI: ${metrics?.roiYears} lat\n`);
    window.location.href = `mailto:audyty@powerkeeper.pl?subject=${subject}&body=${body}`;
  };

  const handleExportConfigJson = () => {
    const configData = {
      timestamp: new Date().toISOString(),
      params,
      metrics,
      parsedSummary: {
        records: parsedProfile?.totalRecords,
        detectedDt: parsedProfile?.detectedDt,
        startDate: parsedProfile?.startDate,
        endDate: parsedProfile?.endDate
      }
    };
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PowerKeeper_Audit_Config_${metrics?.ppeCode || 'Project'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="help-manual-container" style={{ paddingBottom: '3rem' }}>
      {/* HERO BANNER DLA PROJEKTANTÓW */}
      <div
        className="panel-card"
        style={{
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
          borderColor: 'rgba(14, 165, 233, 0.35)',
          marginBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span
                style={{
                  background: 'var(--accent-primary)',
                  color: '#020617',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  textTransform: 'uppercase'
                }}
              >
                PRO MANUAL • B2B
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                {t('Wersja Podręcznika: 2.4 (Październik 2026)', 'Manual Version: 2.4 (October 2026)')}
              </span>
            </div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              {t('Podręcznik Projektanta & Baza Wiedzy PowerKeeper Studio', 'Designer Manual & PowerKeeper Engineering Knowledge Base')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, maxWidth: '850px', lineHeight: 1.5 }}>
              {t(
                'Kompendium inżynieryjne dedykowane dla certyfikowanych instalatorów i projektantów magazynów energii C&I oraz farm PV. Dowiedz się, jak interpretować krzywe poboru 15-minutowego, eliminować 100% kar OSD, awansować klientów do Koszyka K1 URE i generować bankowalne raporty ROI.',
                'Engineering compendium for certified C&I energy storage installers and PV designers. Master 15-minute load profile analysis, eliminate 100% of DSO penalties, qualify clients for URE Basket K1 discounts, and produce bankable investment audits.'
              )}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn-secondary"
              onClick={handleExportConfigJson}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
              title={t('Pobierz bieżące parametry audytu w formacie JSON', 'Export active audit params as JSON')}
            >
              <Download size={14} /> {t('Eksport JSON', 'Export JSON')}
            </button>
            <button
              className="btn-primary"
              onClick={() => setActiveSection('feedback')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
            >
              <MessageSquare size={14} /> {t('Podziel się opinią', 'Submit Feedback')}
            </button>
          </div>
        </div>
      </div>

      {/* GŁÓWNA STRUKTURA: NAWIGACJA BOCZNA + TREŚĆ ROZDZIAŁU */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 290px) 1fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* SPIS TREŚCI / MENU SEKCJI */}
        <div className="panel-card" style={{ padding: '0.6rem', position: 'sticky', top: '1rem' }}>
          <div style={{ padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            {t('Rozdziały Podręcznika', 'Manual Sections')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    background: isActive ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Icon size={16} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                    {lang === 'en' ? sec.labelEn : sec.labelPl}
                  </span>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      padding: '0.12rem 0.4rem',
                      borderRadius: '4px',
                      background: sec.highlight ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: sec.highlight ? 'var(--accent-amber)' : 'var(--text-secondary)',
                      fontWeight: 600
                    }}
                  >
                    {sec.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SZYBKIE LINKI DO ZAKŁADEK APLIKACJI */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.8rem', paddingTop: '0.8rem', paddingLeft: '0.75rem', paddingRight: '0.75rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
              {t('Szybki skok do widoków:', 'Jump directly to view:')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
                className="btn-secondary"
                onClick={() => onSwitchTab('designer')}
                style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              >
                📊 {t('Profil Dobowy & Wykresy', 'Daily Profile & Charts')}
              </button>
              <button
                className="btn-secondary"
                onClick={() => onSwitchTab('autosizer')}
                style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              >
                ⚙️ {t('Matryca Doboru Wież (12,5 kWh)', 'Tower Sizing Matrix (12.5 kWh)')}
              </button>
              <button
                className="btn-secondary"
                onClick={() => onSwitchTab('investor')}
                style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              >
                💰 {t('Dashboard Inwestora & Cash Flow', 'Investor Dashboard & Cash Flow')}
              </button>
              <button
                className="btn-secondary"
                onClick={() => onSwitchTab('heatmap')}
                style={{ justifyContent: 'flex-start', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              >
                🗓️ {t('Heatmapa 24×7', '24×7 Load Heatmap')}
              </button>
            </div>
          </div>
        </div>

        {/* TREŚĆ WYBRANEGO ROZDZIAŁU */}
        <div className="panel-card" style={{ padding: '1.5rem' }}>
          
          {/* SEKCJA 1: QUICK START */}
          {activeSection === 'quickstart' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <Zap size={22} color="var(--accent-primary)" />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {t('Szybki Start: Jak Przeprowadzić Audyt w 5 Krokach', 'Quick Start: How to Conduct an Audit in 5 Steps')}
                </h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                {t(
                  'PowerKeeper Analyst to narzędzie symulacyjne klasy Enterprise, zaprojektowane specjalnie pod polskie uwarunkowania rynkowe (OSD, URE, Rynek Mocy). Aby przygotować kompletną analizę doboru i opłacalności dla klienta, wykonaj poniższe kroki:',
                  'PowerKeeper Analyst is an enterprise simulation engine purpose-built for the Polish power market (DSO tariffs, URE capacity fee, Capacity Market). Follow these 5 steps to create a verified, bankable audit:'
                )}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* STEP 1 */}
                <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {t('Wczytaj plik profilu 15-minutowego OSD lub wybierz wzorzec', 'Load 15-min DSO Profile CSV or select a benchmark')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {t(
                        'Poproś klienta o roczny raport pomiarowy 15-minutowy (np. z portalu Moje PGE, Tauron Dystrybucja, Enea eBOK lub Energa). Przeciągnij plik CSV do strefy upuszczania po lewej stronie. Jeśli nie posiadasz jeszcze pliku, kliknij jeden z 7 gotowych profili branżowych (Wtryskarki, Piekarnia, Baza EV, Chłodnia, Biurowiec, Suszarnia, Huta).',
                        'Ask the client for a 1-year 15-min DSO metering report. Drag & drop the CSV into the upload area on the left. Or choose one of the 7 built-in industrial profiles to test immediately.'
                      )}
                    </p>
                  </div>
                </div>

                {/* STEP 2 */}
                <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {t('Ustal Moc Umowną (P_umowna) i Stawkę Sieciową OSD', 'Set Contracted Power (P_contracted) and DSO Network Rate')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {t(
                        'Wprowadź aktualną moc umowną obiektu z faktury dystrybucyjnej. Zwróć uwagę na czerwoną linię na wykresie. Jeśli słupki poboru wystają ponad linię mocy umownej, silnik natychmiast wyliczy bieżące kary OSD w formule 10x. Ustaw limit ładowania nocnego magazynu (zalecane: 85% mocy umownej).',
                        'Input the client contracted power from their DSO invoice. Any load bars rising above this line trigger statutory 10x DSO penalties. Set night charging limit safely (recommended: 85% of contracted power).'
                      )}
                    </p>
                  </div>
                </div>

                {/* STEP 3 */}
                <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {t('Skonfiguruj Fotowoltaikę (Czysta Symulacja lub Rzeczywisty Eksport)', 'Configure Solar PV (Pure Simulation or Client Export Data)')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {t(
                        'Wybierz tryb PV: Czysta symulacja (nowa instalacja), Dane klienta (gdy plik CSV zawierał pomiar oddania) lub Rozbudowa (istniejąca instalacja + projektowane kWp). Wybierz orientację (Południe vs Wschód–Zachód) oraz region nasłonecznienia w Polsce (Północ 950, Centrum 1020, Południe 1080 kWh/kWp).',
                        'Select PV mode: Pure Simulation (new plant), Client Actual Export (from CSV), or Expansion. Set roof orientation (South vs East-West) and geographic solar insolation region.'
                      )}
                    </p>
                  </div>
                </div>

                {/* STEP 4 */}
                <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    4
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {t('Dobierz Architekturę PowerKeeper (Zakładka "Dobór Modułów")', 'Size PowerKeeper Hardware (Tab "Module Sizer")')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {t(
                        'Przejdź do zakładki "Dobór Modułów (12,5 kWh)". Zobaczysz tabelę porównawczą wszystkich wariantów wieżowych (od 50 kWh do 800+ kWh) z odpowiadającymi inwerterami hybrydowymi Sungrow (SH50CX, SH80CX, SH125CX). Wybierz wariant, który w 100% gasi piki (deltaP po BESS = 0 kW) przy optymalnym czasie zwrotu ROI.',
                        'Open the "Module Sizer" tab to view all tower configurations (50 to 800+ kWh) paired with Sungrow PCS inverters (SH50CX, SH80CX, SH125CX). Pick the preset that brings deltaP After BESS to 0 kW.'
                      )}
                    </p>
                  </div>
                </div>

                {/* STEP 5 */}
                <div style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-emerald)', color: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    5
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {t('Wygeneruj Raport Audytu (PDF i Wielozakładkowy Excel)', 'Generate Audit Reports (PDF & Multi-Sheet Excel)')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {t(
                        'Użyj górnych przycisków w aplikacji: "Drukuj Raport / PDF" (generuje elegancki dokument techniczno-ekonomiczny z klauzulami prawnymi) oraz "Eksportuj Audyt Excel" (tworzy 4 natywne arkusze kalkulacyjne: CAPEX, Bilans 12M OSD z karami, Koszyki URE, Cash Flow 10-letni dla instytucji finansującej).',
                        'Click "Print Report / PDF" for an executive presentation or "Export Excel" to produce a 4-sheet financial audit ready for banks and corporate board approval.'
                      )}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SEKCJA 2: FIZYKA I ARCHITEKTURA DC */}
          {activeSection === 'architecture' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <Cpu size={22} color="var(--accent-primary)" />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {t('Architektura PowerKeeper: Dlaczego DC-Coupled to Jedyny Słuszny Wybór w Przemyśle', 'PowerKeeper Architecture: Why DC-Coupled Outperforms AC in C&I')}
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                
                <div style={{ padding: '1rem', background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '10px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Zap size={16} /> {t('Architektura DC-Coupled', 'DC-Coupled Architecture')}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <li><strong>5–8% wyższa sprawność cyklu PV</strong> – energia ze stringów PV trafia prosto na szynę DC baterii bez podwójnej konwersji (DC-AC-DC).</li>
                    <li><strong>Brak blokady mocy przyłączeniowej OSD</strong> – instalacja PV może produkować z pełną mocą (np. 150 kW), ładując baterię bez wysyłania do sieci ponad moc przyłącza.</li>
                    <li><strong>Wspólny falownik hybrydowy Sungrow</strong> (seria SH50CX / SH80CX / SH125CX).</li>
                  </ul>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={16} /> {t('Wady Starych Systemów AC-Coupled', 'Disadvantages of Legacy AC-Coupled')}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <li>Podwójna konwersja stratna: DC z paneli -&gt; AC sieciowe -&gt; DC ładowanie baterii -&gt; AC rozładowanie (strata do 12–14%).</li>
                    <li><strong>Moc przyłączeniowa sumuje się:</strong> falownik PV + falownik bateryjny AC wymagają 2x większego przydziału mocy od OSD.</li>
                    <li>Wolniejszy czas reakcji na piki obciążenia (&gt; 250–500 ms).</li>
                  </ul>
                </div>

              </div>

              <div style={{ padding: '1.2rem', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-emerald)', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={18} /> {t('Zasada Modułowości 12,5 kWh (Zero Halucynacji)', '12.5 kWh Modular Building Block Standard')}
                </h3>
                <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t(
                    'Pojemność jednego modułu bateryjnego PowerKeeper LFP wynosi ZAWSZE 12,5 kWh. Minimalna wieża składa się z 4 modułów (50,0 kWh). System skaluje się w pionie i poziomie w krokach co 12,5 kWh:',
                    'Each PowerKeeper LFP battery module contains exactly 12.5 kWh. A minimum physical tower comprises 4 modules (50.0 kWh). Capacities scale deterministically:'
                  )}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>50.0 kWh</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>1 Wieża (4 mod.)</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>100.0 kWh</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>2 Wieże (8 mod.)</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>150.0 kWh</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>3 Wieże (12 mod.)</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>200.0 kWh</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>4 Wieże (16 mod.)</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>Skala MW</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kaskady do 1000 kWh</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                  ⚡ {t('DSO Guard: Czas Reakcji Poniżej 10 ms', 'DSO Guard: Sub-10ms Response Time')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t(
                    'Podstawowym problemem zakładów przemysłowych są impulsy prądowe z udarów rozruchowych silników, pomp i pras hydraulicznych. Standardowy falownik on-grid lub powolny magazyn sieciowy reaguje w czasie 200–800 ms, co oznacza, że licznik OSD zdąży zarejestrować 15-minutowe przekroczenie mocy. Architektura PowerKeeper z dedykowanym sterownikiem DSO Guard monitoruje szynę z częstotliwością mikroprocesorową i wstrzykuje moc w czasie poniżej 10 ms, zapobiegając rejestracji szpilki przez licznik OSD.',
                    'Industrial facilities suffer from heavy motor and hydraulic pump start-up spikes. Typical on-grid inverters react within 200-800ms, allowing DSO meters to record peak exceedances. PowerKeeper DSO Guard triggers power injection under 10ms, entirely eliminating meter peak registration.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* SEKCJA 3: PEAK SHAVING & KARY OSD */}
          {activeSection === 'peakshaving' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <Shield size={22} color="var(--accent-primary)" />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {t('Peak Shaving & Rygorystyczna Formuła Kar 10x OSD', 'Peak Shaving & The Strict 10x DSO Penalty Formula')}
                </h2>
              </div>

              <div style={{ padding: '1.2rem', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--accent-rose)', fontWeight: 800, marginBottom: '0.2rem' }}>
                  {t('Ustawowa Formuła Kar OSD w Polsce', 'Polish Statutory DSO Penalty Formula')}
                </div>
                <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                  Kara OSD [PLN] = ΔP [kW] × Stawka Sieciowa [PLN/kW/mc] × 10
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t(
                    'Gdzie ΔP to maksymalne zarejestrowane przekroczenie mocy umownej w dowolnym 15-minutowym okresie rozliczeniowym w danym miesiącu. Wystarczy JEDEN kwadrans w miesiącu, aby klient zapłacił karę równą 10-krotności stawki stałej za każdy przekroczony kilowat!',
                    'Where ΔP is the highest recorded 15-min exceedance above contracted power in any given month. A single 15-min spike incurs a tenfold penalty across the entire month!'
                  )}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem', fontSize: '0.88rem' }}>
                    Przykład Bez Magazynu BESS:
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Moc umowna: <strong>120 kW</strong><br />
                    Pik rozruchu maszyn: <strong>172 kW</strong> (ΔP = +52 kW)<br />
                    Stawka sieciowa OSD: <strong>25,40 PLN/kW/mc</strong><br />
                    <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>
                      Kara za 1 miesiąc: 52 × 25,40 × 10 = 13 208 PLN<br />
                      Koszt w skali roku: 158 496 PLN strat!
                    </span>
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.3rem', fontSize: '0.88rem' }}>
                    Efekt PowerKeeper 100 kWh / 80 kW:
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Magazyn tłumi nadwyżkę 52 kW w czasie &lt;10 ms.<br />
                    Pik widziany przez licznik OSD: <strong>120,0 kW</strong> (ΔP = 0 kW)<br />
                    Kara za przekroczenie: <strong>0 PLN</strong><br />
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      Czysta oszczędność klienta: 158 496 PLN/rok<br />
                      Zwrot inwestycji w baterię: ~1,0 rok!
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--accent-amber)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} /> {t('Reguła Doboru Pojemności Baterii na Peak Shaving', 'Battery Energy Capacity Sizing Rule for Peak Shaving')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t(
                    'Pamiętaj: moc falownika (kW) musi pokryć amplitudę piku (ΔP), natomiast pojemność baterii (kWh) musi pokryć czas trwania tego piku. Jeśli szczyt 50 kW trwa 30 minut (0,5h), magazyn zużywa 25 kWh energii. Zawsze projektuj bufor bezpieczeństwa minimum 25-30% pojemności na wypadek kolejnych uderzeń mocy w ciągu tej samej doby.',
                    'Remember: Inverter power (kW) must match the peak amplitude (ΔP), while battery energy (kWh) must cover the duration. A 50 kW spike lasting 30 min drains 25 kWh. Always maintain a 25-30% buffer for repeated pulses.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* SEKCJA 4: OPŁATA MOCOWA URE 2026 */}
          {activeSection === 'ure' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <TrendingUp size={22} color="var(--accent-primary)" />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {t('Reforma Opłaty Mocowej URE 2026: Jak Zyskać do 83% Rabatu', 'URE 2026 Capacity Fee Reform: Unlocking Up to 83% Discounts')}
                </h2>
              </div>

              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                {t(
                  'Od 2026 roku Prezes Urzędu Regulacji Energetyki (URE) wprowadza zróżnicowane współczynniki opłaty mocowej dla odbiorców grup taryfowych B i C. Zamiast płacić 100% stawki bazowej (0,2194 PLN/kWh), odbiorcy o spłaszczonym profilu zyskują ogromne ustawowe rabaty.',
                  'From 2026, the Polish Energy Regulatory Office (URE) introduces differentiated capacity fee brackets for tariff groups B and C. Facilities with flat profiles unlock massive discounts instead of paying full base rates.'
                )}
              </p>

              <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('Koszyk URE', 'URE Basket')}</th>
                      <th>{t('Warunek Rozpiętości Poboru (ΔS)', 'Load Differential (ΔS)')}</th>
                      <th>{t('Mnożnik Stawki', 'Rate Factor')}</th>
                      <th>{t('Rabat Finansowy', 'Statutory Discount')}</th>
                      <th>{t('Efektywna Stawka 2026', 'Effective 2026 Rate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                      <td><strong style={{ color: 'var(--accent-emerald)' }}>Koszyk K1</strong></td>
                      <td className="mono">ΔS &lt; 5%</td>
                      <td className="mono font-bold">0,17</td>
                      <td><span className="tag-green font-bold">-83% Rabatu</span></td>
                      <td className="mono font-bold text-emerald">0,0373 PLN/kWh</td>
                    </tr>
                    <tr>
                      <td><strong style={{ color: 'var(--accent-primary)' }}>Koszyk K2</strong></td>
                      <td className="mono">5% ≤ ΔS &lt; 10%</td>
                      <td className="mono font-bold">0,50</td>
                      <td><span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>-50% Rabatu</span></td>
                      <td className="mono">0,1097 PLN/kWh</td>
                    </tr>
                    <tr>
                      <td><strong style={{ color: 'var(--accent-amber)' }}>Koszyk K3</strong></td>
                      <td className="mono">10% ≤ ΔS &lt; 15%</td>
                      <td className="mono font-bold">0,83</td>
                      <td><span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>-17% Rabatu</span></td>
                      <td className="mono">0,1821 PLN/kWh</td>
                    </tr>
                    <tr style={{ background: 'rgba(244, 63, 94, 0.08)' }}>
                      <td><strong style={{ color: 'var(--accent-rose)' }}>Koszyk K4</strong></td>
                      <td className="mono">ΔS ≥ 15% (brak baterii)</td>
                      <td className="mono font-bold">1,00</td>
                      <td><span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>0% (Brak ulgi)</span></td>
                      <td className="mono font-bold text-rose">0,2194 PLN/kWh</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '1.2rem', background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                  📐 {t('Wzór na Współczynnik Rozpiętości Poboru ΔS:', 'Formula for Difference Factor ΔS:')}
                </h4>
                <div className="mono" style={{ fontSize: '0.95rem', margin: '0.5rem 0', color: 'var(--text-primary)' }}>
                  ΔS [%] = | (E_szczyt / h_szczyt) - (E_pozaszczyt / h_pozaszczyt) | / (E_szczyt / h_szczyt) × 100%
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t(
                    'Godziny szczytowe URE obowiązują w dni robocze od 07:00 do 22:00 (15h/dobę). Magazyn PowerKeeper rozładowuje się w tych godzinach, zbijając E_szczyt, i ładuje w dolinie nocnej (00:00–05:00), spłaszczając profil obiektu i kwalifikując klienta do Koszyka K1 lub K2. Dla zakładu zużywającego 500 MWh rocznie przeskok z K4 do K1 to ponad 45 000 PLN dodatkowych czystych oszczędności każdego roku!',
                    'Peak hours apply on business days 07:00-22:00. PowerKeeper discharges in peak hours and charges at night, flattening the load curve and moving the client from K4 to K1. For a 500 MWh/year facility, this yields over 45,000 PLN in extra savings annually!'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* SEKCJA 5: FORMAT DANYCH OSD (CSV) */}
          {activeSection === 'csv' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <FileText size={22} color="var(--accent-primary)" />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {t('Obsługiwane Formaty Plików OSD i Zasady Wgrywania Danych', 'Supported DSO CSV Data Formats & Import Protocol')}
                </h2>
              </div>

              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                {t(
                  'PowerKeeper Analyst posiada inteligentny parser plików pomiarowych OSD, radzący sobie automatycznie z różnymi separatorami (; , tab), kodowaniem polskich znaków (UTF-8, Windows-1250) oraz dwoma głównymi układami tabelarycznymi stosowanymi w Polsce:',
                  'The smart parser handles semicolons, commas, tabs, encodings, and both standard Polish DSO layouts automatically:'
                )}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                
                {/* 1. FORMAT MATRYCOWY 96 KOLUMN */}
                <div style={{ padding: '1.1rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.92rem' }}>
                      1. Format Matrycowy (96 Kolumn Kwadransowych)
                    </div>
                    <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(14, 165, 233, 0.3)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      PGE • Tauron • Enea • Energa
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    Stosowany powszechnie w rocznych raportach OSD. Każdy wiersz reprezentuje 1 pełny dzień (365 wierszy), a kolumny od <code>00:15</code> do <code>24:00</code> zawierają kolejne kwadranse.
                  </div>

                  {/* KONTRASTOWY BLOK KODU TERMINALOWEGO */}
                  <div style={{
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.75rem',
                      background: '#0f172a',
                      borderBottom: '1px solid #1e293b'
                    }}>
                      <span className="mono" style={{ color: '#38bdf8', fontSize: '0.73rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        📄 raport_roczny_96_kolumn.csv
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const text = "Data;00:15;00:30;...;24:00;Maksimum;Suma\n2025-10-01;24.50;23.57;...;23.84;151.21;1147.46\n2025-10-02;25.10;24.20;...;24.10;148.90;1120.30";
                          navigator.clipboard.writeText(text);
                          setCopiedSample1(true);
                          setTimeout(() => setCopiedSample1(false), 2000);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.18)',
                          color: copiedSample1 ? '#10b981' : '#f8fafc',
                          borderRadius: '4px',
                          padding: '0.2rem 0.55rem',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.15s ease'
                        }}
                        title={t('Kopiuj przykładowy wiersz CSV do schowka', 'Copy CSV snippet to clipboard')}
                      >
                        {copiedSample1 ? <CheckCircle2 size={12} color="#10b981" /> : <Copy size={12} />}
                        {copiedSample1 ? t('Skopiowano! ✓', 'Copied! ✓') : t('Kopiuj Wzorzec', 'Copy Sample')}
                      </button>
                    </div>
                    <div className="mono" style={{
                      padding: '0.75rem 0.85rem',
                      fontSize: '0.78rem',
                      lineHeight: 1.65,
                      overflowX: 'auto',
                      color: '#f8fafc',
                      whiteSpace: 'pre',
                      letterSpacing: '0.02em'
                    }}>
                      <div style={{ color: '#38bdf8', fontWeight: 700 }}>Data;00:15;00:30;...;24:00;Maksimum;Suma</div>
                      <div style={{ color: '#f8fafc' }}>2025-10-01;24.50;23.57;...;23.84;151.21;1147.46</div>
                      <div style={{ color: '#94a3b8' }}>2025-10-02;25.10;24.20;...;24.10;148.90;1120.30</div>
                    </div>
                  </div>
                </div>

                {/* 2. FORMAT PIONOWY TELEMETRYCZNY */}
                <div style={{ padding: '1.1rem', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.92rem' }}>
                      2. Format Pionowy (Timestamp + Wartość)
                    </div>
                    <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      Telemetria • SCADA • Portale B2B
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    Stosowany powszechnie w telemetrii i rejestratorach energii. Każdy wiersz to pojedynczy rekord 15-minutowy (35 040 wierszy w rocznym pliku).
                  </div>

                  {/* KONTRASTOWY BLOK KODU TERMINALOWEGO */}
                  <div style={{
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.75rem',
                      background: '#0f172a',
                      borderBottom: '1px solid #1e293b'
                    }}>
                      <span className="mono" style={{ color: '#10b981', fontSize: '0.73rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        📄 telemetria_pionowa_15min.csv
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const text = "Data i godzina;Pobór (kW);Oddanie (kW)\n2025-10-01 00:15;84.50;0.00\n2025-10-01 00:30;86.20;0.00\n2025-10-01 00:45;85.10;0.00";
                          navigator.clipboard.writeText(text);
                          setCopiedSample2(true);
                          setTimeout(() => setCopiedSample2(false), 2000);
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.18)',
                          color: copiedSample2 ? '#10b981' : '#f8fafc',
                          borderRadius: '4px',
                          padding: '0.2rem 0.55rem',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'all 0.15s ease'
                        }}
                        title={t('Kopiuj przykładowy wiersz CSV do schowka', 'Copy CSV snippet to clipboard')}
                      >
                        {copiedSample2 ? <CheckCircle2 size={12} color="#10b981" /> : <Copy size={12} />}
                        {copiedSample2 ? t('Skopiowano! ✓', 'Copied! ✓') : t('Kopiuj Wzorzec', 'Copy Sample')}
                      </button>
                    </div>
                    <div className="mono" style={{
                      padding: '0.75rem 0.85rem',
                      fontSize: '0.78rem',
                      lineHeight: 1.65,
                      overflowX: 'auto',
                      color: '#f8fafc',
                      whiteSpace: 'pre',
                      letterSpacing: '0.02em'
                    }}>
                      <div style={{ color: '#10b981', fontWeight: 700 }}>Data i godzina;Pobór (kW);Oddanie (kW)</div>
                      <div style={{ color: '#f8fafc' }}>2025-10-01 00:15;84.50;0.00</div>
                      <div style={{ color: '#f8fafc' }}>2025-10-01 00:30;86.20;0.00</div>
                      <div style={{ color: '#94a3b8' }}>2025-10-01 00:45;85.10;0.00</div>
                    </div>
                  </div>
                </div>

              </div>

              <div style={{ padding: '1.2rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                  🔍 {t('Automatyczna Detekcja Jednostki (kW vs kWh)', 'Automatic Unit Detection (kW vs kWh)')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t(
                    'Jeśli nagłówek pliku lub kolumna zawiera opis "[kWh]" lub "Energia", silnik automatycznie stosuje mnożnik mocy chwilowej: Moc [kW] = Energia [kWh] / 0,25h. Jeśli plik zawiera moc w [kW], wartości są przetwarzane bezpośrednio. W razie nietypowych plików, w lewym panelu możesz manualnie wymusić interpretację w polu "Jednostka pliku OSD".',
                    'If file headers indicate kWh, the engine automatically converts to power: Power [kW] = Energy [kWh] / 0.25h. If in kW, values are used directly. You can override this anytime in the left sidebar.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* SEKCJA 6: FAQ & DOBRE PRAKTYKI */}
          {activeSection === 'faq' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <HelpCircle size={22} color="var(--accent-primary)" />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {t('Dobre Praktyki Inżynierskie & Najczęstsze Pytania (FAQ)', 'Engineering Best Practices & Frequently Asked Questions (FAQ)')}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                    Q1: Kiedy wybrać falownik SH50CX, SH80CX, a kiedy SH125CX?
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Moc falownika (PCS) dobieramy zawsze do maksymalnej wymaganej mocy rozładowania (Peak Shaving) lub planowanej mocy stringów fotowoltaicznych DC. SH50CX (50 kW) współpracuje z 1 wieżą (50 kWh). SH80CX (80 kW) jest optymalny dla 2 wież (100 kWh) i zaspokaja 90% potrzeb małych zakładów produkcyjnych. SH125CX (125 kW) stosuje się przy dużych instalacjach (3–4 wieże, 150–200 kWh) lub w kaskadach wielofalownikowych do skali megawatowej.
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                    Q2: Co zrobić, gdy klient nie ma jeszcze danych 15-minutowych, a jedynie faktury miesięczne?
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Wybierz z listy gotowych profili ten, który najbardziej odpowiada specyfice branży klienta (np. Zakład wtryskarek dla produkcji 2-zmianowej, Chłodnię dla odbioru ciągłego 24/7, lub Hub EV dla floty transportowej). Następnie w lewym panelu dostosuj moc umowną i zużycie roczne, aby odpowiadały liczbom z faktury klienta.
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                    Q3: Dlaczego kalkulator pokazuje prosty ROI 1–2 lata dla niektórych profili? Czy to realne?
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Tak! W obiektach, gdzie występują regularne przekroczenia mocy umownej (np. huty, piekarnie, zakłady tworzyw), kary 10x OSD potrafią wynosić od 80 000 do 500 000 PLN rocznie! Wyzerowanie tych kar przez magazyn PowerKeeper przynosi tak potężny bezpośredni zastrzyk gotówki, że inwestycja w baterię zwraca się w zaledwie 12–24 miesiące, nawet bez uwzględniania zysków z autokonsumpcji i arbitrażu.
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                    Q4: Czy PowerKeeper może pracować jako zasilanie awaryjne (Backup / EPS)?
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Tak. Falowniki hybrydowe Sungrow SH50-125CX posiadają zintegrowany port Backup (EPS). W razie zaniku zasilania z sieci OSD system przełącza obwody krytyczne w czasie &lt; 20 ms, zapewniając ciągłość pracy serwerowni, sterowników PLC, linii technologicznych oraz chłodnictwa. W zakładce "Czynniki Forecastu" możesz wycenić tę wartość dla klienta.
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SEKCJA 7: FEEDBACK DLA PROJEKTANTÓW & INSTALATORÓW */}
          {activeSection === 'feedback' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <MessageSquare size={22} color="var(--accent-amber)" />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {t('Strefa Zaufanego Partnera: Zgłoś Uwagi i Podziel Się Doświadczeniem', 'Trusted Partner Hub: Submit Feedback & Feature Requests')}
                </h2>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', marginBottom: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {t(
                    'Drodzy Projektanci i Instalatorzy! Ta wersja PowerKeeper Analyst została stworzona dla Was, aby ułatwić i przyspieszyć codzienną pracę nad doborem magazynów C&I. Zależy nam na Waszych rzetelnych uwagach z placu budowy i biura projektowego. Zgłaszajcie brakujące falowniki, sugestie do raportów czy specyficzne taryfy.',
                    'Dear Designers and Installers! This tool was built to streamline your daily C&I engineering workflow. We value your practical insights from the field. Tell us what features, inverters, or report adjustments you need.'
                  )}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                
                <div>
                  <label className="field-label" style={{ marginBottom: '0.35rem' }}>
                    {t('Twoja Rola:', 'Your Role:')}
                  </label>
                  <select
                    className="select-input"
                    value={userRole}
                    onChange={e => setUserRole(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                  >
                    <option value="designer">{t('Projektant Instalacji PV / BESS', 'PV & BESS System Designer')}</option>
                    <option value="installer">{t('Certyfikowany Instalator OZE', 'Certified Renewable Installer')}</option>
                    <option value="engineer">{t('Inżynier Energetyk / Audytor', 'Power Engineer / Energy Auditor')}</option>
                    <option value="sales">{t('Doradca Techniczno-Handlowy C&I', 'C&I Technical Sales Advisor')}</option>
                    <option value="other">{t('Inna rola techniczna', 'Other Technical Role')}</option>
                  </select>
                </div>

                <div>
                  <label className="field-label" style={{ marginBottom: '0.35rem' }}>
                    {t('Kategoria Uwag:', 'Feedback Category:')}
                  </label>
                  <select
                    className="select-input"
                    value={feedbackCategory}
                    onChange={e => setFeedbackCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                  >
                    <option value="sizing">{t('Dobór Sprzętu i Modułów 12,5 kWh', 'Hardware & 12.5 kWh Module Sizing')}</option>
                    <option value="inverters">{t('Nowe Modele Inwerterów Sungrow', 'New Sungrow Inverter Models')}</option>
                    <option value="tariffs">{t('Taryfy OSD i Opłata Mocowa URE', 'DSO Tariffs & URE Capacity Fee')}</option>
                    <option value="reports">{t('Raporty Audytu (Excel / PDF)', 'Audit Reports (Excel / PDF)')}</option>
                    <option value="ui">{t('Interfejs i Ergonomia Pracy', 'UI & Workflow Usability')}</option>
                    <option value="bug">{t('Zgłoszenie błędu lub rozbieżności', 'Bug Report / Calculation Discrepancy')}</option>
                  </select>
                </div>

                <div>
                  <label className="field-label" style={{ marginBottom: '0.35rem' }}>
                    {t('Ocena Praktyczności Narzędzia (1-5):', 'Practicality Rating (1-5):')}
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', height: '38px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.2rem'
                        }}
                      >
                        <Star
                          size={24}
                          color={star <= rating ? '#f59e0b' : 'var(--text-muted)'}
                          fill={star <= rating ? '#f59e0b' : 'none'}
                        />
                      </button>
                    ))}
                    <span style={{ marginLeft: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-amber)' }}>
                      {rating} / 5
                    </span>
                  </div>
                </div>

              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="field-label" style={{ marginBottom: '0.35rem' }}>
                  {t('Twoje Uwagi, Sugestie i Obserwacje:', 'Your Notes, Suggestions & Observations:')}
                </label>
                <textarea
                  rows={6}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder={t(
                    'Opisz co działa świetnie, a co warto ulepszyć. Np. "Przydałaby się opcja doboru falownika 100 kW", "W raporcie Excel brakuje kolumny z autokonsumpcją godzinową", itp...',
                    'Share what works well and what should be improved. E.g. "Add Sungrow 100 kW inverter option", "Add hourly self-consumption in Excel export", etc...'
                  )}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'inherit',
                    fontSize: '0.86rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={handleSendEmail}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                >
                  <Send size={15} /> {t('Wyślij Feedback E-mailem', 'Send Feedback via Email')}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleCopyFeedback}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                >
                  <Copy size={15} /> {copiedStatus ? t('Skopiowano do schowka! ✓', 'Copied to Clipboard! ✓') : t('Kopiuj Notatkę do Schowka', 'Copy Note to Clipboard')}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleExportConfigJson}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
                >
                  <Download size={15} /> {t('Dołącz Konfigurację (JSON)', 'Attach Audit State (JSON)')}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
