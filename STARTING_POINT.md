# Starting Point: PowerKeeper BESS Studio (Stan Bazowy Projektu)

> **Lokalizacja projektu**: `C:\Users\jacek\Downloads\BESS_calc\powerkeeper-bess-audit\`  
> **Wersja przenośna (Standalone)**: `C:\Users\jacek\Downloads\BESS_calc\powerkeeper-bess-audit\index.html`  
> **Status**: Wersja stabilna, w 100% sprawna, zablokowana na standard 15-min OSD i min. 1.0 rok ROI.

---

## 1. Wstęp i Cel Dokumentu

Dokument **Starting Point** definiuje dokładny stan bazowy aplikacji **PowerKeeper BESS Studio**, którą użytkownik wybrał jako punkt wyjścia do dalszego rozwoju. 

Wszystkie zbędne, archiwalne artefakty (37 plików z poprzednich iteracji, tymczasowe zrzuty ekranu oraz niedokończone szkice v2) zostały usunięte z katalogu roboczego, aby wyczyścić kontekst i wyeliminować chaos.

---

## 2. Architektura Systemu

### 2.1 Struktura Katalogów i Modułów
```
powerkeeper-bess-audit/
├── index.html                        # Pojedynczy, autonomiczny plik produkcyjny (2.48 MB)
├── index_portable.html               # Kopia zapasowa pliku portable
├── URUCHOM_LOKALNIE.bat              # Skrypt uruchamiania podglądu lokalnego
├── package.json                      # Zależności i skrypty build
├── vite.config.js                    # Konfiguracja Vite + vite-plugin-singlefile
├── public/
│   └── samples/                      # 12 rzeczywistych profili OSD w formacie CSV (15-minutowych)
│       ├── 1_OSD_Tauron_B23_Przemysl_Obrabianie_Skrawaniem_12M_15min.csv
│       ├── 2_OSD_PGE_B21_Magazyn_Chlodnia_Logistyka_12M_15min.csv
│       ├── 3_OSD_Enea_C21_Piekarnia_Cukiernia_Produkcja_12M_15min.csv
│       ├── ... (łącznie 12 profili branżowych)
└── src/
    ├── App.jsx                       # Główny interfejs aplikacji (4330 linii kodu)
    ├── components/
    │   ├── ChartSeriesFilter.jsx     # Filtry widoczności serii wykresu (Pobór, Sieć, PV, BESS, SoC)
    │   ├── KpiGroups.jsx             # Kompaktowy pasek 6 kluczowych kart KPI
    │   └── Toast.jsx                 # System powiadomień Toast (błędy, sukcesy wczytania)
    └── utils/
        ├── simulationEngine.js       # Silnik obliczeniowy BESS + PV + OSD + Rynek Mocy (1177 linii)
        ├── sampleProfilesData.js     # Metadane i generatory syntetycznych danych demo
        └── i18n.js                   # Dwujęzyczność (Polski / Angielski)
```

---

## 3. Kompletna Lista Funkcji (Feature Inventory)

### 3.1 Zarządzanie Danymi i Profilami OSD
1. **Parser CSV dla Polskich Standardów OSD**:
   - Obsługa separatorów: średnik (`;`), przecinek (`,`), tabulator (`\t`).
   - Obsługa formatów dwukolumnowych (`Data;Wartość`) oraz matryc OSD (Tauron, PGE, Enea, Energa: 96 kolumn kwadransowych w wierszu dla każdej doby).
   - Inteligentne łączenie rozdzielonych kolumn `Data` + `Czas`/`Godzina`.
   - Automatyczne filtrowanie kierunku przepływu (ignorowanie kolumn generacji/oddania, skupienie na poborze).
2. **Ścisły Standard 15-minutowy (OSD 15-min)**:
   - Jednolity interwał $dt = 0{,}25\,\text{h}$.
   - Domyślne traktowanie wartości z raportów OSD jako **Moc średnia [kW]** (brak ryzyka 4-krotnego przekłamania mocy).
3. **Biblioteka 12 Profili Branżowych**:
   - Gotowe profile 12-miesięczne: Przemysł skrawający (B23), Chłodnia logistyczna (B21), Piekarnia przemysłowa (C21), Wtryskarki tworzyw, Huta/Odlewnia, Suszarnia zbóż, Szpital, itp.
4. **Zwijany Kalendarz / Selektor Zakresu Dat**:
   - Wybór 1 doby, 7 dni, 30 dni lub całego roku z wizualnym oznaczeniem dni z przekroczeniami mocy umownej.

### 3.2 Dobór Urządzeń i Technologia PowerKeeper (Sungrow)
1. **Modułowość Bateryjna**:
   - Moduły bateryjne: **ściśle 12,5 kWh LFP** (wieże od 12,5 do 200 kWh).
   - Ograniczenie wyboru falowników hybrydowych do maksymalnie 4 sztuk (SH50CX, SH80CX, SH125CX).
2. **Architektura DC-Coupled**:
   - Bezpośrednie ładowanie z szyny DC inwertera hybrydowego (sprawność $97{,}5\%$).
   - Opcjonalne ładowanie z sieci AC w dolinie nocnej ($94{,}5\%$).
   - Brak blokowania mocy przyłącza AC przy ładowaniu z fotowoltaiki.

### 3.3 Silnik Dyspozytorski (Dispatch Strategies)
1. **Peak Shaving (Przycinanie Pików)**:
   - Błyskawiczny czas reakcji ($<10\,\text{ms}$).
   - Dynamiczny rozładunek baterii powyżej zadanego progu mocy umownej ($P_{\text{umowna}}$).
2. **Arbitraż Cenowy & Autokonsumpcja**:
   - Ładowanie w dolinie nocnej (00:00–05:00) lub południowej (nadmiar PV).
   - Rozładowanie w drogim szczycie popołudniowym (17:00–21:00).
   - Zachowanie bufora bezpieczeństwa SoC na wypadek wystąpienia nieoczekiwanego piku mocy.

### 3.4 Regulacje i Rynek Energii w Polsce
1. **Kary za Przekroczenie Mocy Umownej OSD**:
   - Ścisła formuła: $\text{Kara} = \Delta P_{\text{przekroczenia}} \times \text{Stawka}_{\text{sieciowa}} \times 10$.
2. **Opłata Mocowa URE (Rynek Mocy 2026)**:
   - Stawka bazowa: **`0,2194 PLN/kWh`** w oknie szczytowym dni roboczych 07:00–22:00.
   - Dynamiczny algorytm koszyków **K1–K4** na bazie rozpiętości poboru $\Delta S$:
     - **K1** ($\Delta S < 5\%$): rabat 83% (mnożnik 0,17, efektywnie 0,0373 PLN/kWh),
     - **K2** ($5\% \le \Delta S < 10\%$): rabat 50% (mnożnik 0,50, efektywnie 0,1097 PLN/kWh),
     - **K3** ($10\% \le \Delta S < 15\%$): rabat 17% (mnożnik 0,83, efektywnie 0,1821 PLN/kWh),
     - **K4** ($\Delta S \ge 15\%$): pełna stawka (mnożnik 1,00, 0,2194 PLN/kWh).

### 3.5 Metryki Finansowe i Ochrona Wiarygodności
1. **Rozbicie Zwrotu z Inwestycji (ROI)**:
   - **BESS-Only ROI**: $\text{CAPEX}_{\text{BESS}} / \text{Oszczędności}_{\text{BESS}}$,
   - **Combined Project ROI**: $(\text{CAPEX}_{\text{BESS}} + \text{CAPEX}_{\text{PV}}) / (\text{Oszczędności}_{\text{BESS}} + \text{Oszczędności}_{\text{PV}})$,
   - **Gwarantowane ograniczenie dolne**: $\text{Math.max}(1.0, \text{ROI})$ — brak nierealistycznych wyników poniżej 1 roku.
2. **Prognoza 10-letnia (Cash Flow & Degradacja)**:
   - Modelowanie rocznego spadku pojemności baterii (np. 1,8%/rok),
   - Eskalacja cen energii (inflacja),
   - Koszty O&M, dotacje (granty) oraz uniknięte straty przestoju produkcji (backup EPS <10ms).

---

## 4. Architektura UI/UX i Zwijane Panele

1. **Górny Pasek Wskaźników (KpiGroups)**:
   - 6 kompaktowych kart z kluczowymi liczbami, podnoszących wykres o 700 px w górę.
2. **Zwijany Pasek Boczny (Accordion Folders)**:
   - Dobór magazynu i CAPEX – zwijany, widoczna tylko wybrana pojemność i koszt,
   - Taryfa i ceny – zwijana, widoczny tylko typ taryfy,
   - Scenariusze (Z BESS / Bez BESS) – zwijane z opisem,
   - Zakres dat – zwijany kalendarz.
3. **Interaktywny Wykres Bilansu Mocy**:
   - Filtr serii (`ChartSeriesFilter`): możliwość ukrywania/pokazywania obciążenia bazowego, poboru z sieci, PV, pracy BESS oraz SoC baterii.

---

## 5. Podsumowanie do Startu Dalszych Prac

Wersja ta jest stabilna, poprawnie przeliczona i gotowa na wprowadzanie zaplanowanych ulepszeń (np. wydzielenie osobnego silnika PV, wdrożenie stylu Sungrow Light/Dark, wgrywanie własnych specyfikacji sprzętowych JSON oraz generator raportu PDF).
