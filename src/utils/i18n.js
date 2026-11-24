// src/utils/i18n.js
// Complete Polish (PL) & English (EN) translations for PowerKeeper Studio

export const DAY_NAMES_I18N = {
  pl: ['Niedz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
};

export const FORECAST_FACTORS_INCLUDED_I18N = {
  pl: [
    {
      id: 'res-15m',
      name: '1. Rozdzielczość Pomiarowa 15-Minutowa i 1-Godzinowa (OSD)',
      category: 'Pomiar i Fizyka Sieci',
      impact: 'Krytyczny',
      formulaOrParam: 'dt = 0,25h (96 okien/dobę) lub 1,0h',
      description:
        'Dokładne odwzorowanie 15-minutowych okien pomiarowych licznika OSD. Pozwala wychwycić krótkotrwałe szpilki rozruchowe maszyn (wtryskarek, pieców, sprężarek), które w danych godzinowych uległyby sztucznemu uśrednieniu.'
    },
    {
      id: 'pk-125',
      name: '2. Modułowość LFP PowerKeeper 12,5 kWh i DoD 90%',
      category: 'Architektura Sprzętowa',
      impact: 'Wysoki',
      formulaOrParam: 'Pojemność = N × 12,5 kWh (Min SoC = 10%)',
      description:
        'Ścisłe skalowanie pojemności w wielokrotnościach modułu bazowego 12,5 kWh (12,5 / 25 / 37,5 / 50 / 100 / 200 kWh) z zachowaniem bezpiecznego bufora 10% SoC dla żywotności ogniw LiFePO4.'
    },
    {
      id: 'dc-coupled',
      name: '3. Topologia DC-Coupled (+5–8% Wyższa Sprawność Ładowania PV)',
      category: 'Sprawność Konwersji',
      impact: 'Wysoki',
      formulaOrParam: 'η_DC = 97,5% (+6,5% vs AC-Coupled)',
      description:
        'Bezpośrednie ładowanie baterii z szyny DC falownika hybrydowego z pominięciem podwójnej konwersji DC→AC→DC oraz brak sumowania mocy PV i magazynu na przyłączu OSD.'
    },
    {
      id: 'dso-guard',
      name: '4. Peak Shaving < 10 ms (DSO Guard) i Kary 10x OSD',
      category: 'Moc Umowna i Kary',
      impact: 'Krytyczny',
      formulaOrParam: 'Kara = ΔP [kW] × Stawka_sieciowa × 10',
      description:
        'Utrzymywanie dedykowanej rezerwy SoC (55%) na potrzeby błyskawicznego (<10 ms) obcinania 15-minutowych przekroczeń Mocy Umownej oraz eliminacji 10-krotnych kar sieciowych OSD.'
    },
    {
      id: 'ure-baskets',
      name: '5. Koszyki Mocowe URE (K1–K4) i Opłata Mocowa (07:00–22:00)',
      category: 'Rynek Mocy URE',
      impact: 'Krytyczny',
      formulaOrParam: 'Mnożnik A: K1=0,17 (-83%), K2=0,50, K3=0,83, K4=1,00',
      description:
        'Obliczanie stosunku poboru mocy w godzinach szczytowych (dni robocze 07:00–21:59) do godzin poza szczytem oraz symulacja awansu obiektu do niższego koszyka mocowego (rabat do 83% na stawce 0,2194 PLN/kWh).'
    },
    {
      id: 'tou-rcem',
      name: '6. Arbitraż Cenowy ToU (C12a/B23) i Ceny Dynamiczne RCEm',
      category: 'Taryfy i Rynek Spot',
      impact: 'Wysoki',
      formulaOrParam: 'Spread: Noc / Dolina PV vs Szczyt Popołudniowy',
      description:
        'Ładowanie magazynu z darmowych nadwyżek PV („Efekt Gąbki”) oraz w tanich oknach nocnych/dynamicznych i rozładowywanie w najdroższych godzinach szczytowych.'
    },
    {
      id: 'pv-region',
      name: '7. Sezonowość i Regionalizacja Uzysku PV w Polsce',
      category: 'Generacja OZE',
      impact: 'Średni',
      formulaOrParam: 'Północna PL (0,95x), Centralna (1,00x), Południowa (1,06x)',
      description:
        'Modelowanie krzywej nasłonecznienia z uwzględnieniem szerokości geograficznej w Polsce, długości dnia w poszczególnych miesiącach oraz zmienności zachmurzenia.'
    },
    {
      id: 'deg-fin',
      name: '8. Degradacja Liniowa Pojemności i Koszt Finansowania (Leasing/Kredyt)',
      category: 'Finanse i CAPEX',
      impact: 'Średni',
      formulaOrParam: 'Degradacja %/rok + rata annuitetowa CAPEX',
      description:
        'Opcjonalne uwzględnienie rocznego spadku pojemności użytkowej ogniw oraz kosztu kapitału obcego w 15-letnim rachunku przepływów pieniężnych (Cashflow).'
    }
  ],
  en: [
    {
      id: 'res-15m',
      name: '1. 15-Minute & 1-Hour Metering Resolution (DSO / OSD)',
      category: 'Metering & Grid Physics',
      impact: 'Critical',
      formulaOrParam: 'dt = 0.25h (96 windows/day) or 1.0h',
      description:
        'Exact representation of 15-minute DSO billing windows. Captures short startup power spikes from machinery (injection molding, ovens, compressors) that would be artificially smoothed out in hourly data.'
    },
    {
      id: 'pk-125',
      name: '2. PowerKeeper 12.5 kWh LFP Modularity & 90% DoD',
      category: 'Hardware Architecture',
      impact: 'High',
      formulaOrParam: 'Capacity = N × 12.5 kWh (Min SoC = 10%)',
      description:
        'Strict capacity scaling in multiples of the 12.5 kWh base module (12.5 / 25 / 37.5 / 50 / 100 / 200 kWh) while preserving a 10% SoC buffer for LiFePO4 cell longevity.'
    },
    {
      id: 'dc-coupled',
      name: '3. DC-Coupled Topology (+5–8% Higher PV Charging Efficiency)',
      category: 'Conversion Efficiency',
      impact: 'High',
      formulaOrParam: 'η_DC = 97.5% (+6.5% vs AC-Coupled)',
      description:
        'Direct DC-bus charging from the hybrid inverter bypassing double conversion (DC→AC→DC), with zero PV + BESS nameplate power summing at the DSO grid connection point.'
    },
    {
      id: 'dso-guard',
      name: '4. < 10 ms Peak Shaving (DSO Guard) & 10x OSD Penalties',
      category: 'Contracted Power & Penalties',
      impact: 'Critical',
      formulaOrParam: 'Penalty = ΔP [kW] × Network_Rate × 10',
      description:
        'Maintains a dedicated SoC reserve (55%) for ultra-fast (<10 ms) clipping of 15-minute Contracted Power exceedances and complete elimination of 10x DSO network penalties.'
    },
    {
      id: 'ure-baskets',
      name: '5. URE Capacity Market Baskets (K1–K4) & Capacity Fee (07:00–22:00)',
      category: 'URE Capacity Market',
      impact: 'Critical',
      formulaOrParam: 'Factor A: K1=0.17 (-83%), K2=0.50, K3=0.83, K4=1.00',
      description:
        'Calculates the ratio of peak window draw (workdays 07:00–21:59) to off-peak draw (Δs) and simulates promoting the facility to a better capacity basket (up to 83% discount on the 0.2194 PLN/kWh base rate).'
    },
    {
      id: 'tou-rcem',
      name: '6. ToU Tariff Arbitrage (C12a/B23) & Dynamic RCEm Spot Pricing',
      category: 'Tariffs & Spot Market',
      impact: 'High',
      formulaOrParam: 'Spread: Cheap Night / Solar Midday vs Peak Evening',
      description:
        'Charges the battery from free PV surpluses ("Sponge Effect") and cheap night/midday dynamic windows, discharging during the most expensive peak tariff hours.'
    },
    {
      id: 'pv-region',
      name: '7. Seasonality & Regional PV Yield Modeling across Poland',
      category: 'Renewable Generation',
      impact: 'Medium',
      formulaOrParam: 'North PL (0.95x), Central (1.00x), South (1.06x)',
      description:
        'Models solar irradiance curves accounting for latitude across Poland, seasonal day length across months, and cloud cover variability.'
    },
    {
      id: 'deg-fin',
      name: '8. Linear Capacity Degradation & Financing Cost (Loan / Lease)',
      category: 'Finance & CAPEX',
      impact: 'Medium',
      formulaOrParam: 'Degradation %/yr + CAPEX Annuity Payment',
      description:
        'Optional modeling of annual usable cell capacity fade and external debt service in the 15-year cumulative cashflow projection.'
    }
  ]
};

export const FORECAST_FACTORS_EXTERNAL_I18N = {
  pl: [
    {
      id: 'ext-inflation',
      name: '1. Inflacja Cen Energii i Coroczna Waloryzacja Taryf OSD / URE',
      category: 'Makroekonomia i Regulacje',
      riskOrOpportunity: 'Szansa (Szybszy ROI)',
      typicalRange: '+5% do +12% rocznie',
      description:
        'Model bazowy przyjmuje stałe dzisiejsze ceny energii i stawek sieciowych. W rzeczywistości coroczne podwyżki stawek dystrybucyjnych OSD oraz opłaty mocowej URE sprawiają, że złotówka zaoszczędzona w 5. czy 10. roku ma znacznie wyższą wartość nominalną, co skraca realny czas zwrotu.'
    },
    {
      id: 'ext-curtailment',
      name: '2. Ujemne Ceny RCEm i Redysponowanie (Wyłączenia PV przez OSD)',
      category: 'Rynek Spot i Sieć',
      riskOrOpportunity: 'Szansa (Ochrona Uzysku PV)',
      typicalRange: '150 – 450 godzin ujemnych/rok',
      description:
        'W słoneczne dni wiosenne i letnie (godz. 11:00–15:00) ceny na TGE spadają poniżej zera, a operatorzy wyłączają instalacje PV lub nie płacą za eksport. Architektura PowerKeeper DC-Coupled przechwytuje tę energię bezpośrednio po stronie DC bez straty wyprodukowanego wolumenu.'
    },
    {
      id: 'ext-backup-voll',
      name: '3. Wartość Zasilania Awaryjnego (Backup EPS < 10 ms) i Koszt Przestoju (VoLL)',
      category: 'Ciągłość Biznesowa (BCP)',
      riskOrOpportunity: 'Szansa (Ukryty Zysk)',
      typicalRange: '5 000 – 150 000 PLN / pojedynczy zanik sieci',
      description:
        'Dla zakładów z wtryskarkami (zastygnięcie tworzywa w formie), piekarni (utrata wsadu), chłodni czy serwerowni nawet 5-minutowy zanik napięcia z sieci OSD generuje ogromne straty materiałowe. Uniknięcie zaledwie 1–2 awarii w roku potrafi spłacić znaczną część magazynu PowerKeeper.'
    },
    {
      id: 'ext-reactive',
      name: '4. Kompensacja Mocy Biernej (Indukcyjnej i Pojemnościowej tg φ)',
      category: 'Jakość Energii OSD',
      riskOrOpportunity: 'Ryzyko / Szansa',
      typicalRange: 'Kary OSD od 1 000 do 8 000 PLN/mc',
      description:
        'Na fakturach C&I częstą pozycją są opłaty za ponadumowny pobór energii biernej indukcyjnej (tg φ > 0,4) oraz oddawanie energii biernej pojemnościowej (np. w nocy przez długie linie kablowe). Falownik hybrydowy może aktywnie wspierać kompensację mocy biernej.'
    },
    {
      id: 'ext-subsidies',
      name: '5. Dotacje Unijne, Krajowe, Białe Certyfikaty i Ulgi Podatkowe',
      category: 'Finansowanie i Dotacje',
      riskOrOpportunity: 'Szansa (Niższy CAPEX)',
      typicalRange: 'Dotacja 20% – 55% CAPEX',
      description:
        'Programy takie jak Kredyt Ekologiczny (FENG), Energia Plus, regionalne fundusze RPO oraz Świadectwa Efektywności Energetycznej (Białe Certyfikaty za redukcję strat dzięki topologii DC-Coupled) radykalnie obniżają koszt wejścia inwestora.'
    },
    {
      id: 'ext-aux-hvac',
      name: '6. Zużycie Własne Systemu (Aux Load: Klimatyzacja Szaf / BMS) i Temperatura',
      category: 'Eksploatacja Techniczna',
      riskOrOpportunity: 'Czynnik Korygujący',
      typicalRange: '1,5% – 3,0% wolumenu rocznego',
      description:
        'Układy utrzymania temperatury ogniw LFP (chłodzenie latem i dogrzewanie zimą) oraz elektronika sterująca zużywają niewielką ilość energii na potrzeby własne, o czym należy pamiętać przy projektowaniu bilansu netto.'
    },
    {
      id: 'ext-om-insurance',
      name: '7. Koszty Serwisu (O&M), Ubezpieczenia oraz Degradacji Kalendarzowej',
      category: 'OPEX Wieloletni',
      riskOrOpportunity: 'Czynnik Kosztowy',
      typicalRange: '0,5% – 1,2% CAPEX / rok',
      description:
        'W 10–15 letnim modelu finansowym (DCF / NPV) należy uwzględnić koszt okresowych przeglądów technicznych, polisy ubezpieczeniowej majątku C&I oraz nieliniowej degradacji zależnej od liczby pełnych cykli równoważnych (EFC).'
    },
    {
      id: 'ext-load-growth',
      name: '8. Przyszły Wzrost Zużycia Zakładu (Nowe Maszyny, Pompy Ciepła, Flota EV)',
      category: 'Skalowalność Inwestycji',
      riskOrOpportunity: 'Szansa (Skalowalność 12,5 kWh)',
      typicalRange: '+10% do +40% zapotrzebowania w 5 lat',
      description:
        'Profil historyczny odzwierciedla przeszłość firmy. Elektryfikacja transportu (ładowarki EV) lub dostawienie nowej linii produkcyjnej zwiększy szczyty mocy – modułowa budowa PowerKeeper (dokładanie bloków po 12,5 kWh) chroni inwestora przed koniecznością wymiany systemu.'
    }
  ],
  en: [
    {
      id: 'ext-inflation',
      name: '1. Electricity Price Inflation & Annual DSO / URE Tariff Escalation',
      category: 'Macroeconomics & Regulation',
      riskOrOpportunity: 'Opportunity (Faster ROI)',
      typicalRange: '+5% to +12% per year',
      description:
        'The baseline engine assumes constant today’s prices. In reality, annual increases in DSO distribution charges and URE capacity fees mean that every PLN saved in Year 5 or Year 10 has a higher nominal value, significantly shortening the real payback period.'
    },
    {
      id: 'ext-curtailment',
      name: '2. Negative Spot Prices (RCEm) & DSO PV Curtailment',
      category: 'Spot Market & Grid',
      riskOrOpportunity: 'Opportunity (PV Yield Protection)',
      typicalRange: '150 – 450 negative hours/year',
      description:
        'On sunny spring and summer days (11:00–15:00), spot prices drop below zero and DSOs curtail on-grid PV inverters. PowerKeeper’s DC-Coupled architecture captures this energy directly on the DC bus without losing generated volume.'
    },
    {
      id: 'ext-backup-voll',
      name: '3. Emergency Backup Value (EPS < 10 ms) & Value of Lost Load (VoLL)',
      category: 'Business Continuity (BCP)',
      riskOrOpportunity: 'Opportunity (Hidden Profit)',
      typicalRange: '5,000 – 150,000 PLN / single grid outage',
      description:
        'For injection molding plants (plastic solidifying in molds), bakeries (ruined dough batches), cold storage, or server rooms, even a 5-minute grid outage causes severe material losses. Avoiding just 1–2 outages per year can pay back a major portion of the PowerKeeper system.'
    },
    {
      id: 'ext-reactive',
      name: '4. Reactive Power Compensation (Inductive & Capacitive tan φ)',
      category: 'DSO Power Quality',
      riskOrOpportunity: 'Risk / Opportunity',
      typicalRange: 'DSO penalties 1,000 – 8,000 PLN/month',
      description:
        'C&I utility bills frequently include penalties for excessive inductive reactive power (tan φ > 0.4) or capacitive reactive power export (e.g. at night via long cables). The hybrid inverter can actively support reactive power compensation.'
    },
    {
      id: 'ext-subsidies',
      name: '5. EU/National Grants, White Certificates & Tax Relief',
      category: 'Financing & Grants',
      riskOrOpportunity: 'Opportunity (Lower CAPEX)',
      typicalRange: '20% – 55% CAPEX Grant',
      description:
        'Programs such as Ecological Credit (FENG), Energia Plus, regional EU funds, and Energy Efficiency Certificates (White Certificates for conversion loss reduction via DC-Coupled topology) drastically reduce net investor CAPEX.'
    },
    {
      id: 'ext-aux-hvac',
      name: '6. Auxiliary System Consumption (Cabinet HVAC / BMS) & Temperature',
      category: 'Technical Operation',
      riskOrOpportunity: 'Adjustment Factor',
      typicalRange: '1.5% – 3.0% of annual volume',
      description:
        'LFP thermal management systems (summer cooling and winter heating) plus BMS control electronics consume a small amount of auxiliary energy that should be accounted for in net energy balances.'
    },
    {
      id: 'ext-om-insurance',
      name: '7. O&M Service, Insurance & Calendar/Cycle Aging',
      category: 'Multi-Year OPEX',
      riskOrOpportunity: 'Cost Factor',
      typicalRange: '0.5% – 1.2% CAPEX / year',
      description:
        'In a 10–15 year DCF / NPV financial model, periodic technical inspections, C&I property insurance policies, and non-linear Equivalent Full Cycle (EFC) aging should be included.'
    },
    {
      id: 'ext-load-growth',
      name: '8. Future Facility Load Growth (New Machinery, Heat Pumps, EV Fleet)',
      category: 'Investment Scalability',
      riskOrOpportunity: 'Opportunity (12.5 kWh Modularity)',
      typicalRange: '+10% to +40% demand over 5 years',
      description:
        'Historical profiles reflect past operations. Fleet electrification (EV chargers) or adding a new production line will raise peak demand—PowerKeeper’s modular 12.5 kWh blocks let investors expand capacity without replacing the system.'
    }
  ]
};
