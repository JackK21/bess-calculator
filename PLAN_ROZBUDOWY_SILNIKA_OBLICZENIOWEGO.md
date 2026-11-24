# Plan Rozbudowy Silnika Obliczeniowego (Architecture & Feature Blueprint)

> **Dokument nadrzędny**: [STARTING_POINT.md](file:///C:/Users/jacek/Downloads/BESS_calc/powerkeeper-bess-audit/STARTING_POINT.md)  
> **Projekt**: PowerKeeper BESS Studio  
> **Lokalizacja**: `C:\Users\jacek\Downloads\BESS_calc\powerkeeper-bess-audit\`  
> **Status**: Zatwierdzona specyfikacja techniczna rozbudowy silnika obliczeniowego.

---

## 1. Wstęp i Nowe Założenia Biznesowe

Obecny monolit obliczeniowy (`src/utils/simulationEngine.js`) przekształcamy w **system 5 niezależnych, modularnych silników**.

System zyskuje kluczowe możliwości rynkowe:
1. **Hybrydowe źródło danych PV**: wybór między rzeczywistym odczytem z profilu OSD (kierunek: oddanie/generacja) a symulacją, z opcją **rozbudowy istniejącej instalacji** (np. „Klient ma 50 kWp, dokładamy 70 kWp nowej fotowoltaiki”).
2. **Darmowe dane pogodowe i nasłonecznienie**: integracja z publicznymi API bezpłatnych baz satelitarnych (**PVGIS / Open-Meteo Solar API**).
3. **Inteligentny Dispatch z predykcją (Look-Ahead Dispatch)**: predykcyjne zarządzanie energią na kolejną dobę (jeśli jutro brak słońca $\rightarrow$ naładuj magazyn w dolinie nocnej; jeśli będzie nadmiar PV $\rightarrow$ zostaw wolną przestrzeń na darmowe ładowanie ze słońca).
4. **Ścisła hierarchia priorytetów dyspozytorskich**:
   $$\text{Priorytet 1: Peak Shaving (ochrona przed karami OSD)} > \text{Priorytet 2: Ulga Opłaty Mocowej URE} > \text{Priorytet 3: Arbitraż cenowy}$$
   *Uzasadnienie rynkowe: Kary OSD wynoszą $10 \times \text{stawka}$, a utrata koszyka K1 to utrata 83% rabatu. Arbitraż na spreadzie cenowym generuje zysk rzędu 0,30–0,60 PLN/kWh i nigdy nie może zagrażać przekroczeniu mocy umownej.*
5. **Polskie Usługi Sieciowe i Rynek Mocy (DSR / FCR / aFRR / Rynek Bilansujący)**: dedykowane parametry przychodowe dla magazynów C&I.
6. **Moduł Operatorów OSD i Taryf (PGE, Tauron, Enea, Energa)**: predefiniowane grupy taryfowe B21, B22, B23, C21, C22a, C22b oraz taryfy dynamiczne RCEm/RDN.

---

## 2. Architektura Przepływu Danych i Modułów

```mermaid
graph TD
    subgraph DANE WEJŚCIOWE
        OSD_File[1. Plik OSD CSV: Pobór + Opcjonalna Generacja PV]
        Weather_API[2. Darmowe API Pogodowe: PVGIS / Open-Meteo]
    end

    subgraph MODUŁ 1: PV ENGINE (pvPlantEngine.js)
        OSD_File --> Mode_Select{Tryb PV: Dane klienta czy Symulacja?}
        Mode_Select -->|Dane z OSD| PV_Actual[Rzeczywista generacja PV]
        Mode_Select -->|Symulacja / Dogęszczenie| PV_Sim[Model PV + Dane Pogodowe]
        PV_Actual --> PV_Expansion[Opcjonalna rozbudowa: Istniejące PV + Nowe kWp]
        PV_Sim --> PV_Expansion
        PV_Expansion --> PV_Output[Wektor Generacji PV 15-min kW]
    end

    subgraph MODUŁ 2: BESS SPEC & REJESTR (bessConfig.js)
        HW_Catalog[Katalog PowerKeeper 12.5 kWh] --> BESS_Config[Specyfikacja BESS: Pojemność, C-rate, DoD, PCS, DC/AC]
        Custom_JSON[Własny plik JSON / Ręczne suwaki] --> BESS_Config
    end

    subgraph MODUŁ 3: INTELIGENTNY DISPATCH (bessDispatchEngine.js)
        OSD_File --> Net_Load[Profil Netto: Zapotrzebowanie - PV]
        PV_Output --> Net_Load
        Net_Load --> Smart_Dispatch[Look-Ahead Dispatcher z oknem 24h]
        BESS_Config --> Smart_Dispatch
        
        subgraph Hierarchia Priorytetów
            P1[1. Peak Shaving: Zabezpieczenie P_umowna]
            P2[2. URE: Utrzymanie Koszyka K1/K2 07:00-22:00]
            P3[3. Nadwyżki PV: Bezpośrednie ładowanie DC]
            P4[4. Arbitraż / Dolina nocna: Ładowanie predykcyjne]
        end
        Smart_Dispatch --> P1 --> P2 --> P3 --> P4
    end

    subgraph MODUŁ 4: TARYFY & USŁUGI SIECIOWE (tariffOsdEngine.js)
        OSD_Selector[Wybór OSD: PGE / Tauron / Enea / Energa] --> Tariff_Rules[Stawki sieciowe, stałe, zmienne]
        Tariff_Selector[Taryfy: B21 / B23 / C21 / RDN Dynamiczna] --> Tariff_Rules
        Grid_Services[Usługi Sieciowe: DSR / Rynek Mocy / FCR] --> Tariff_Rules
    end

    subgraph MODUŁ 5: FINANSE & RAPORTOWANIE (financialEngine.js)
        Smart_Dispatch --> Fin_Calc[Przeliczenie oszczędności]
        Tariff_Rules --> Fin_Calc
        Fin_Calc --> ROI_PV[Czyste ROI PV]
        Fin_Calc --> ROI_BESS[Czyste ROI BESS]
        Fin_Calc --> ROI_Hybrid[ROI Projektu Łączonego + LCOS]
    end
```

---

## 3. Szczegółowy Opis 5 Nowych Modułów Obliczeniowych

### Moduł 1: `pvPlantEngine.js` (Zaawansowany Silnik Fotowoltaiki)
**Zadanie**: Dostarcza 15-minutowy wektor generacji słonecznej `[kW]` dla obiektu.
- **Trzy tryby pracy do wyboru w UI**:
  1. `client_actual`: Ekstrakcja danych o generacji bezpośrednio z pliku OSD (kolumny: *Oddanie czynna*, *Wprowadzona*, *Export*).
  2. `simulation_pure`: Obliczenie generacji na podstawie zadanej mocy `pvCapacityKwp`, kąta, azymutu i współczynnika strat.
  3. `client_plus_expansion`: Połączenie danych rzeczywistych klienta z symulacją nowo projektowanej rozbudowy:
     $$P_{\text{PV}}(t) = P_{\text{PV\_istniejąca}}(t) + P_{\text{PV\_nowa\_symulacja}}(t)$$
- **Integracja darmowych danych pogodowych (Weather Enrichment)**:
  - Podłączenie endpointu **Open-Meteo Solar API** lub bazy **PVGIS (JRC European Commission)**:
    - Parametry: `shortwave_radiation_instant` ($W/m^2$), `direct_normal_irradiance`, temperatura otoczenia (wpływ współczynnika temperaturowego Pmax modułów np. $-0{,}35\%/^\circ\text{C}$).
  - Tryb offline / fallback: wewnętrzny zoptymalizowany model bezchmurny z polską krzywą sezonowości (52°N), gdy brak połączenia z siecią.

---

### Moduł 2: `bessConfig.js` (Rejestr i Parametry Urządzeń BESS)
**Zadanie**: Enkapsulacja fizycznych ograniczeń i kosztów magazynu energii.
- **Parametry bazowe PowerKeeper**:
  - Moduły: ściśle wielokrotność **12,5 kWh** LFP.
  - Inwertery: 1 do 4 jednostek Sungrow (SH50CX / SH80CX / SH125CX).
  - Architektura: **DC-Coupled** ($\eta = 97{,}5\%$) vs **AC-Coupled** ($\eta = 94{,}5\%$).
  - Ograniczenia prądowe: $C_{\text{rate}}$ ciągły (0,5C do 1,0C), głębokość rozładowania DoD ($90\%$).
- **Obsługa plików zewnętrznych**: Walidator JSON pozwalający wgrać specyfikację dowolnego urządzenia innego producenta lub ręcznie zmienić suwaki inżynierskie.

---

### Moduł 3: `bessDispatchEngine.js` (Inteligentny Dispatcher z Look-Ahead)
**Zadanie**: Autonomiczne sterowanie magazynem w oparciu o predykcję 24-godzinną i sztywną hierarchię priorytetów.

#### Algorytm Predykcyjny (Look-Ahead 24h):
Codziennie o godzinie 23:45 dyspozytor bada okno kolejnych 24 godzin:
1. Analizuje prognozowaną generację PV na jutro ($E_{\text{PV\_jutro}}$).
2. Sprawdza zapotrzebowanie obiektu i ryzyko przekroczenia mocy umownej ($P_{\text{pik}} > P_{\text{umowna}}$).
3. **Decyzja ładowania nocnego (00:00–05:00)**:
   - *Scenariusz A (Słoneczny dzień jutro)*: Magazyn **nie ładuje się** w nocy do pełna (zostawia wolne 60–70% pojemności), aby wchłonąć darmową energię z nadwyżek PV i nie eksportować jej do sieci po niskiej cenie.
   - *Scenariusz B (Pochmurny dzień / wysokie obciążenie)*: Magazyn ładuje się w taniej dolinie nocnej do 95%, aby pokryć poranny szczyt i zabezpieczyć obiekt przed karami OSD.

#### Ścisła Hierarchia Priorytetów Dyspozytora:
```
PRIORYTET 1: Peak Shaving (Redukcja przekroczeń mocy umownej)
   └── Kara OSD = Delta_P * Stawka_sieciowa * 10 (najwyższy koszt jednostkowy!)
   └── Akcja: Natychmiastowy zrzut mocy (czas reakcji <10ms), ignorując cenę energii.

PRIORYTET 2: Utrzymanie Koszyka Opłaty Mocowej URE (07:00–22:00 dni robocze)
   └── Przeskok z K4 do K1 daje 83% rabatu na całej energii szczytowej.
   └── Akcja: Wspomaganie zasilania w oknie szczytowym, by rozpiętość Delta_S < 5%.

PRIORYTET 3: Autokonsumpcja Nadwyżek PV (Ładowanie po szynie DC)
   └── Akcja: Akumulacja nieskonsumowanej energii słonecznej zamiast oddania do sieci.

PRIORYTET 4: Arbitraż Cenowy (Kupuj tanio w dolinie, oddawaj w szczycie)
   └── Akcja: Wykonywana WYŁĄCZNIE wtedy, gdy SoC jest powyżej rezerwy na Peak Shaving.
```

---

### Moduł 4: `tariffOsdEngine.js` (Operatorzy OSD, Taryfy i Usługi Sieciowe)
**Zadanie**: Precyzyjne modelowanie specyfiki polskiego rynku energii elektrycznej.

#### 1. Wybór Operatora OSD i Stawki Dystrybucyjne:
- Predefiniowane profile operatorów: **PGE Dystrybucja**, **Tauron Dystrybucja**, **Enea Operator**, **Energa Operator**.
- Grupy taryfowe:
  - **B21 / C21**: jednostrefowe (płaskie),
  - **B22 / C22a / C22b**: dwustrefowe (szczyt / pozaszczyt),
  - **B23**: trzystrefowa (szczyt przedpołudniowy, szczyt popołudniowy, pozostałe godziny doby),
  - **Dynamiczna RDN / RCEm**: stawki zmienne godzinowo z Towarowej Giełdy Energii (TGE) z obsługą cen ujemnych.

#### 2. Usługi Sieciowe i Rynek Mocy dla BESS w Polsce:
Wprowadzenie dedykowanych parametrów monetyzacji elastyczności:
- **DSR (Demand Side Response / Redukcja zapotrzebowania na żądanie)**:
  - Gotowość do redukcji mocy na wezwanie PSE (np. programy płatności za gotowość: 80 000–160 000 PLN/MW/rok).
- **Wynagrodzenie z Rynku Mocy (Aukcje Główne / Dodatkowe)**:
  - Obowiązek mocowy w godzinach zagrożenia PSE (premia mocowa PLN/kW/rok).
- **Usługi Systemowe FCR (Frequency Containment Reserve) / aFRR**:
  - Rezerwa pierwotna częstotliwości dla certyfikowanych magazynów z czasem reakcji $<2\,\text{s}$.

---

### Moduł 5: `financialEngine.js` (Niezależna Wycena Inwestycji)
**Zadanie**: Przekształcenie bilansów technicznych w bezbłędny model bankowy.
- **Oddzielne ROI**:
  1. $\text{ROI}_{\text{PV}} = \text{CAPEX}_{\text{PV}} / \text{Oszczędności}_{\text{PV}}$,
  2. $\text{ROI}_{\text{BESS}} = \text{CAPEX}_{\text{BESS}} / (\text{Kary}_{\text{OSD}} + \text{Ulga}_{\text{URE}} + \text{Arbitraż} + \text{Usługi}_{\text{Sieciowe}})$,
  3. $\text{ROI}_{\text{Łączny}} = (\text{CAPEX}_{\text{PV}} + \text{CAPEX}_{\text{BESS}}) / \text{Oszczędności}_{\text{Suma}}$.
- **Ochrona wiarygodności**: Minimalne ROI zablokowane na **min. 1.0 rok**.
- **LCOS (Levelized Cost of Storage)**: Koszt 1 kWh przechowanej w magazynie z uwzględnieniem degradacji $1{,}8\%/\text{rok}$ i sprawności.
- **Przepływy 10-letnie (Cash Flow)**: Rozdzielenie inflacji cen energii od inflacji kosztów serwisu (O&M CPI).

---

## 4. Harmonogram Wdrożenia Krok-po-Kroku

| Etap | Zadanie | Rezultat w Kodzie |
|---|---|---|
| **Krok 1** | Utworzenie folderu `src/engine/` i wydzielenie `bessConfig.js` oraz `hardwareCatalog.js`. | Izolacja specyfikacji technicznej PowerKeeper (12,5 kWh) i walidatora JSON. |
| **Krok 2** | Implementacja `pvPlantEngine.js` z obsługą 3 trybów (klient z OSD / symulacja / rozbudowa istniejącej instalacji) oraz klienta API Open-Meteo/PVGIS. | Niezależny generator profilu fotowoltaiki. |
| **Krok 3** | Implementacja `bessDispatchEngine.js` z hierarchią priorytetów (Peak Shaving $\rightarrow$ URE $\rightarrow$ Arbitraż) i logiką predykcji 24h. | Czysty silnik pracy baterii działający na profilu netto. |
| **Krok 4** | Implementacja `tariffOsdEngine.js` z operatorami OSD, taryfami B23/C21/RDN oraz modułem usług DSR / Rynek Mocy. | Kompletne polskie otoczenie regulacyjne. |
| **Krok 5** | Implementacja `financialEngine.js` (rozdzielone ROI, LCOS, Cash Flow) oraz spięcie w fasadę adaptera. | Zgodność wsteczna z UI, pełne testy i aktualizacja wersji offline `index.html`. |
