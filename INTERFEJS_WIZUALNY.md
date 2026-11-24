# Interfejs Wizualny — Dokumentacja Architektury UI & UX
## PowerKeeper BESS & PV Audit Studio (C&I 15-Min Load Analyzer)

> **Lokalizacja aplikacji**: `c:\Users\jacek\Downloads\BESS_calc\`  
> **Główny komponent interfejsu**: [`PowerKeeper-Analyst/src/App.jsx`](file:///c:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/App.jsx)  
> **Moduł raportu audytowego**: [`PowerKeeper-Analyst/src/components/PrintAuditReportModal.jsx`](file:///c:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/components/PrintAuditReportModal.jsx)  
> **Design System i Style CSS**: [`PowerKeeper-Analyst/src/index.css`](file:///c:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/index.css)  
> **Zgodność produktowa**: Wyłącznie linia **PowerKeeper** (modułowość 12,5 kWh, inwertery Sungrow SH, DC-coupled, <10 ms). Kategoryczny zakaz systemów PowerStack.

---

## 1. Architektura Wizualna i Zasady Projektowe

Interfejs użytkownika zaprojektowano w standardzie **Industrial Dark Glassmorphism** (z możliwością natychmiastowego przełączenia w tryb jasny), dostosowanym do prezentacji zarządczych (C-level) oraz pracy inżynierów audytu energetycznego.

```
+----------------------------------------------------------------------------------------------------+
| TOPBAR: Tagi Widoków (Designer | Investor | Autosizer | Heatmap | Forecast)  |  Akcje & Raport PDF   |
+----------------------------------------------------------------------------------------------------+
| EDU-PILLS: Pigułki Wyjaśniające (Peak Shaving, Kary 10x, URE K1-K4, DC-Coupled, Rynek Mocy)        |
+------------------------------------+---------------------------------------------------------------+
| PANEL BOCZNY (SIDEBAR):            | GŁÓWNA PRZESTRZEŃ ROBOCZA (MAIN WORKSPACE):                   |
| 1. Profil OSD (CSV / Presety)      | ------------------------------------------------------------- |
| 2. PowerKeeper BESS (12.5 kWh)     | SZYBKIE KARTY KPI (6 kart executive: Oszczędności, Szczyt,   |
| 3. Moc Umowna & Kary OSD           | URE Koszyk, Zgolony kW, ROI BESS, Łączny CAPEX)               |
| 4. Fotowoltaika (3 tryby + Sat)    | ------------------------------------------------------------- |
| 5. Taryfy, OSD, DSR & Rynek Mocy   | AKTYWNY WIDOK:                                                |
|                                    | - Wykresy złożone Recharts (kW vs SoC%)                      |
|                                    | - Tabele 10-letnie Cash Flow / Rozbicie miesięczne OSD        |
|                                    | - Macierze doboru mocy i heatmpay 24x7                        |
+------------------------------------+---------------------------------------------------------------+
| MODALE PŁYWAJĄCE: Raport PDF / Druk A4 | Porównywarka Scenariuszy | Wyjaśnienia Edukacyjne        |
+----------------------------------------------------------------------------------------------------+
```

### Paleta Kolorów i Semantyka
- **Tło Główne (`--bg-app`)**: `#040914` (głęboki granat przemysłowy) / `#f8fafc` (tryb jasny).
- **Karty & Panele (`--bg-card`)**: `rgba(15, 23, 42, 0.75)` z efektem rozmycia tła (`backdrop-filter: blur(12px)`).
- **Akcent Szmaragdowy (`--accent-emerald`)**: `#10b981` — oszczędności finansowe, autokonsumpcja PV, ładowanie DC, wskaźniki pozytywne.
- **Akcent Błękitny (`--accent-primary`)**: `#0ea5e9` — moc magazynu PowerKeeper, redukcja piku, zgolony szczyt kW.
- **Akcent Fioletowy (`--accent-violet`)**: `#8b5cf6` — ulga Opłaty Mocowej URE 2026, koszyki K1–K4, arbitraż nocny.
- **Akcent Bursztynowy (`--accent-amber`)**: `#f59e0b` — wskaźnik ROI, generacja fotowoltaiki, ostrzeżenia o przekroczeniu.
- **Akcent Różany (`--accent-rose`)**: `#f43f5e` — kary OSD za przekroczenie mocy, profil bazowy bez BESS, koszyk K4.

---

## 2. Górny Pasek Nawigacyjny (Topbar & Action Bar)

Pasek górny łączy przełączanie widoków analitycznych z globalnymi funkcjami operacyjnymi.

### 2.1 Zakładki Widoków (`view-tabs`)
1. **Profil Dobowy & Eksplorator Dni (`designer`)**:
   - Analiza 15-minutowego profilu obciążenia, pracy magazynu i generacji PV w wybranym dniu roku.
2. **Dashboard Inwestora (ROI) (`investor`)**:
   - Finansowa ocena projektu: rozbicie na 4 strumienie zysku, wykres miesięczny redukcji szczytów, tabela kar 10x OSD i 10-letnie Cash Flow.
3. **Dobór Modułów (12,5 kWh) (`autosizer`)**:
   - Macierz doboru pojemności od 50 kWh do 1000 kWh ze wskazaniem optimum bankowalności.
4. **Heatmapa 24×7 (`heatmap`)**:
   - Całoroczna macierz 168 godzin tygodnia w podziale na pobór przed i po PowerKeeper.
5. **Czynniki Forecastu (W Modelu vs Poza) (`forecast`)**:
   - Zestawienie czynników uwzględnionych w algorytmie oraz interaktywne suwaki testów wrażliwości (inflacja energii, dotacja %, O&M).

### 2.2 Pasek Akcji (`action-bar`)
- **Motyw Jasny / Ciemny**: Przełącza motyw całego interfejsu (ikony `Sun` / `Moon`).
- **Waluta (PLN / EUR)**: Zmiana waluty prezentacji wyników (przelicznik ECB: 1 EUR = 4,25 PLN).
- **Język (Polski / English)**: Kompletna dwujęzyczna lokalizacja wszystkich etykiet, opisów i tabel.
- **Zapisz Scenariusz (`BookmarkPlus`)**: Zapisuje bieżącą konfigurację BESS + PV w pamięci podręcznej do porównania.
- **Porównaj (`GitCompare`)**: Otwiera modal z tabelarycznym porównaniem zapisanych scenariuszy (z licznikiem wariantów).
- **Eksportuj Audyt CSV (`Download`)**: Pobiera szczegółowy arkusz CSV z metrykami technicznymi i finansowymi.
- **Raport Audytu PDF / Druk (`FileText`, wyróżniony zielony)**: Otwiera pełnoekranowy modal gotowego raportu inwestorskiego w formacie A4.

---

## 3. Edukacyjny Pasek Pojęć dla Klienta (Edu-Pills Bar)

Pasek umieszczony pod Topbarem eliminuje asymetrię wiedzy klienta i tłumaczy skomplikowane pojęcia rynku energii. Kliknięcie dowolnej pigułki otwiera pływający panel ze szczegółowym wyjaśnieniem:
1. **⚡ Peak Shaving (Co to jest?)**: Wyjaśnienie mechanizmu obcinania piku poniżej mocy umownej (<10 ms).
2. **⚠️ Kary 10x OSD**: Wyjaśnienie formuły OSD $\text{Kara} = \Delta P \times \text{Stawka} \times 10$.
3. **🏛️ Koszyki URE K1–K4**: Wyjaśnienie wskaźnika nierównomierności $\Delta s$ i rabatów do 83% na opłacie mocowej.
4. **🔌 Architektura DC-Coupled**: Wyjaśnienie bezpośredniego ładowania baterii z szyny DC inwertera Sungrow (o 5–8% wyższa sprawność niż AC).
5. **📅 Opłata Mocowa 2026**: Prezentacja stawki bazowej URE (0,2194 PLN/kWh) w oknie 07:00–22:00.
6. **🛡️ DSR i Usługi Sieciowe PSE**: Wyjaśnienie gotowości redukcyjnej i monetyzacji elastyczności.

---

## 4. Panel Boczny Konfiguratora (Sidebar)

Panel boczny zorganizowano w 5 modułowych, logicznie powiązanych sekcji konfiguracyjnych.

### Sekcja 1: Profil Poboru Energii (OSD)
- **Wbudowane Profile Referencyjne (Dropdown)**:
  - 🏭 *Wtryskarki Tworzyw (PGE, 120 kW)* — praca 2-zmianowa, ostre szczyty hydrauliczne.
  - 🥐 *Piekarnia Piece (TAURON, 90 kW)* — nocne wypieki wsadowe i dogrzewanie.
  - 🚚 *Hub Kurierski EV (ENEA, 100 kW)* — popołudniowe ładowanie floty dostawczej.
  - ❄️ *Chłodnia Mroźnia 24/7 (ENERGA, 95 kW)* — cykliczne odszranianie parowników.
  - 🏗️ *Huta i Odlewnia (Megawat, 400 kW)* — przemysł ciężki, wielkie piece indukcyjne.
  - 🏢 *Biurowiec HVAC (C12a, 60 kW)* — profil korporacyjny ze szczytem klimatyzacji.
- **Strefa Upuszczenia Pliku (Drag & Drop)**:
  - Obsługa plików `.csv` z systemów OSD (PGE, Tauron, Enea, Energa).
  - Automatyczne rozpoznawanie formatu: pionowy (15-min / 1h) lub macierzowy 96-kolumnowy.
- **Detekcja Parametrów Pliku**:
  - Kod PPE (Punkt Poboru Energii).
  - Krok pomiarowy ($dt = 0{,}25\,\text{h}$ lub $1{,}0\,\text{h}$).
  - Liczba rekordów i horyzont dni (np. 365 dni / 35 040 punktów).
  - Wymuszenie jednostki wejściowej: Auto / kW / kWh.

### Sekcja 2: Magazyn Energii PowerKeeper (Hardware)
- **Przełącznik Główny BESS**: Włączenie / wyłączenie baterii (porównanie Bazy z Inwestycją).
- **Pojemność Nominalna**:
  - Suwak modułów: ściśle wielokrotność **12,5 kWh** (od 50 kWh / 4 moduły do 1000 kWh / 80 modułów).
  - Wskaźnik pojemności użytecznej: automatycznie $90\%$ DoD.
  - Wskaźnik liczby wież: $\text{Wieże} = \lceil \text{moduły} / 4 \rceil$.
- **Dobór Falownika Hybrydowego Sungrow**:
  - Modele: **SH50CX** (50 kW), **SH80CX** (80 kW), **SH125CX** (125 kW).
  - Liczba jednostek PCS: od 1 do 4 jednostek (skalowalne do 500 kW mocy ciągłej).
- **Kafelki Szybkich Presetów**:
  - 50 kWh (1w / SH50), 100 kWh (2w / SH80), 150 kWh (3w / SH125), 200 kWh (4w / SH125), 250 kWh (ST250CF Flagship), 300 kWh (6w / 2x SH80), 500 kWh (10w / 2x SH125), 750 kWh (15w / 3x SH125), 1000 kWh (20w / 4x SH125 Megawatt).
- **Architektura Łączenia**: Przełącznik DC-Coupled (97,5% sprawności) vs AC-Coupled (94,5%).
- **Priorytety Sterowania**:
  - Checkbox: *Peak Shaving (Ochrona przed karami OSD, czas reakcji <10 ms)*.
  - Checkbox: *Arbitraż Cenowy & Autokonsumpcja (Przesunięcie noc -> szczyt)*.
- **Koszty Jednostkowe**:
  - Cena modułu BESS: domyślnie 700 PLN/kWh.
  - Automatyczna wycena inwertera: 15 000 zł (50 kW), 19 000 zł (80 kW), 25 000 zł (125 kW).

### Sekcja 3: Moc Umowna i Próg Sieci
- **Moc Umowna $P_{\text{umowna}}$ [kW]**: Wartość graniczna z umowy dystrybucyjnej z OSD.
- **Próg Ładowania z Sieci [kW]**: Maksymalny limit mocy ładowania w dolinie nocnej, zapobiegający wygenerowaniu nowego piku nocnego.
- **Stawka Stała Sieciowa OSD [PLN/kW/mc]**: Podstawa naliczania kar i opłat stałych.

### Sekcja 4: Instalacja Fotowoltaiczna (PV Plant)
- **Selektor 3 Trybów Pracy PV**:
  1. ☀️ **Czysta Symulacja (`simulation_pure`)**: Model promieniowania dla Polski (52°N), kąt 35°, profil dobowy, współczynnik temperaturowy $-0{,}35\%/^\circ\text{C}$ oraz clipping inwertera AC do 90% mocy DC.
  2. 📁 **Z pliku OSD (`client_actual`)**: Odczyt rzeczywistej generacji oddawanej z kolumny *Oddanie / Export* wgranego profilu CSV.
  3. ➕ **Rozbudowa (`client_plus_expansion`)**: Podwójny suwak: *Istniejące PV Klienta [kWp]* + *Projektowana Rozbudowa [kWp]*.
- **Pobierz Pogodę Online (Open-Meteo Solar API)**:
  - Przycisk synchroniczny pobierający dane satelitarne nasłonecznienia dla współrzędnych geograficznych obiektu (z fallbackiem offline).
- **Pewność Prognozy Pogody (Look-Ahead Dispatch)**:
  - Suwak dokładności prognozy (50% do 100%) symulujący margines błędu predykcyjnego dyspozytora 24h.
- **Orientacja Paneli**: Południe (pik południowy) vs Wschód–Zachód (szerszy profil rano i po południu).
- **Region Polski**: Północ (~950 kWh/kWp), Środek (~1020 kWh/kWp), Południe (~1080 kWh/kWp).

### Sekcja 5: Taryfy Energii, OSD & Usługi Sieciowe
- **Operator OSD w Polsce**:
  - PGE Dystrybucja (25,40 zł/kW/mc)
  - Tauron Dystrybucja (24,80 zł/kW/mc)
  - Enea Operator (23,90 zł/kW/mc)
  - Energa-Operator (26,20 zł/kW/mc)
  - Automatyczna aktualizacja stawki stałej przy zmianie operatora.
- **Struktura Taryfy Zakupu**:
  - Taryfa Strefowa B21 / B22 / B23 / C12a (Noc, Dzień, Szczyt)
  - Taryfa Dynamiczna RCEm / TGE Spot (zmienność godzinowa)
  - Taryfa Całodobowa C11 (jednostrefowa)
- **Stawki Energii Czynnej [PLN/kWh]**:
  - Tania dolina nocna (np. 0,52 zł)
  - Drogi szczyt taryfowy (np. 1,28 zł)
  - Standardowy dzień (np. 0,85 zł)
- **Usługi Sieciowe & Rynek Mocy PSE**:
  - Checkbox: *DSR (Demand Side Response)* — gotowość redukcyjna (+100 000 PLN/MW/rok).
  - Checkbox: *Rynek Mocy (Aukcje PSE)* — wynagrodzenie za obowiązek mocowy (+180 PLN/kW/rok z deratingiem dyspozycyjności).

---

## 5. Główny Panel Wyników (KpiGroups Executive Grid)

Górna część przestrzeni roboczej prezentuje 6 syntetycznych, dynamicznie przeliczanych kart KPI:

```
+-------------------------------------------------------------------------------------------------------------+
| 💰 Finanse: ŁĄCZNE OSZCZĘDNOŚCI BESS | ⚡ Peak Shaving: OCHRONA PRZED KARAMI | 🏛️ URE: RABAT OPŁATY MOCOWEJ   |
| 64 122 PLN / rok                     | 28 651 PLN / rok (Uniknięte 10x kary)  | 12 571 PLN / rok (K3 -> K1: -83%)|
+--------------------------------------+----------------------------------------+-----------------------------+
| 🛡️ Moc: ZGOLONY SZCZYT MOCY          | 📊 Zwrot: ZWROT BESS (ROI)             | 🏷️ CAPEX: POWERKEEPER CAPEX |
| -38.6 kW (168.0 kW -> 129.4 kW)      | 1.48 roku (Podłoga bankowa min 1.0 r)  | 95 000 PLN (100 kWh / SH80) |
+-------------------------------------------------------------------------------------------------------------+
```

1. **Łączne Oszczędności BESS**: Suma zysków z Peak Shaving, ulgi URE K1–K4, arbitrażu, autokonsumpcji DC oraz usług sieciowych DSR/Rynek Mocy.
2. **Ochrona Przed Karami OSD**: Wartość unikniętych 10-krotnych kar dystrybucyjnych w skali roku.
3. **Rabat Opłaty Mocowej URE**: Zmniejszenie opłaty mocowej wynikające z obniżenia poboru w godzinach 07:00–22:00 i przeskoku z droższego koszyka (np. K4/K3) do K1.
4. **Zgolony Szczyt Mocy**: Wartość maksymalnej redukcji zapotrzebowania w kilowatach.
5. **Zwrot BESS (ROI)**: Czysty okres zwrotu nakładów CAPEX BESS (zabezpieczony podłogą $\max(1.0, \text{ROI})$) oraz zwrot projektu łączonego z PV.
6. **CAPEX PowerKeeper**: Całkowity koszt komponentów (magazyn + falowniki).

---

## 6. Szczegółowy Opis 5 Widoków Analitycznych

### Widok 1: Profil Dobowy & Eksplorator Dni (`designer`)
- **Pasek Filtrów Serii (ChartSeriesFilter)**:
  - Umożliwia niezależne włączanie/wyłączanie 6 krzywych: *Profil Obiektu*, *Sieć po BESS*, *Generacja PV*, *Rozładowanie Peak Shaving*, *Rozładowanie Arbitraż*, *Stan SoC%*.
- **Wykres Złożony (ComposedChart)**:
  - Oś Y lewa: Moc [kW] z czerwoną linią przerywaną Mocy Umownej.
  - Oś Y prawa: Poziom naładowania baterii SoC [%] w przedziale 10%–95%.
  - Oś X: Znaczniki czasu w krokach 15-minutowych.
- **Interaktywny Tooltip**:
  - Wyświetla chwilowy bilans mocy w wybranym kwadransie: zapotrzebowanie, oddanie PV, ładowanie po szynie DC, rozładowanie BESS, aktualny stan SoC oraz obowiązującą strefę cenową.
- **Nawigator Daty**:
  - Kalendarz z selektorem konkretnego dnia pomiarowego oraz przyciski *Dzień Wstecz* / *Dzień Wprzód*.
- **Karty Dni Ekstremalnych**:
  - Szybkie przejście do dni o kluczowym znaczeniu: *Dzień z maksymalnym szczytem*, *Dzień z największym przekroczeniem mocy umownej*, *Dzień o najwyższym poborze w oknie URE*.

### Widok 2: Dashboard Inwestora (ROI & Cash Flow) (`investor`)
- **4 Karty Strumieni Zysku**:
  1. *Strumień 1: Peak Shaving & Kary OSD* (obcięcie piku i ochrona przed formułą $10\times$).
  2. *Strumień 2: Opłata Mocowa URE 2026* (wskaźnik $\Delta s$, spłaszczenie profilu, awans do koszyka K1).
  3. *Strumień 3: Arbitraż & Autokonsumpcja* (przesunięcie taniej energii nocnej, bonus architektury DC-Coupled $+6{,}5\%$).
  4. *Strumień 4: Usługi Sieciowe & Zwrot z Inwestycji* (przychody DSR + Rynek Mocy PSE oraz prosty zwrot ROI).
- **Wykres Miesięczny Redukcji Szczytów (BarChart)**:
  - Porównanie słupkowe szczytu maksymalnego w każdym miesiącu: słupek czerwony (Przed BESS) vs słupek zielony (Po PowerKeeper).
- **Tabela Miesięczna Peak Shaving i Kar OSD**:
  - Kolumny: Miesiąc, Max Przed [kW], Max Po [kW], Zredukowano [kW], Kara Przed [PLN], Kara Po [PLN], Zaoszczędzona Kara [PLN].
- **Tabela 10-letniej Projekcji Cash Flow**:
  - Uwzględnia degradację baterii ($1{,}8\%/\text{rok}$), eskalację cen energii ($3{,}5\%/\text{rok}$), koszty serwisu i ubezpieczenia O&M z inflacją CPI ($2{,}5\%/\text{rok}$) oraz ewentualną ratę kredytu bankowego.
  - Prezentuje roczny Cash Flow netto, skumulowany Cash Flow oraz zdyskontowany wskaźnik NPV i LCOS (Levelized Cost of Storage [PLN/kWh]).

### Widok 3: Dobór Modułów (Module Sizer Matrix) (`autosizer`)
- **Tabela Macierzy Pojemnościowej PowerKeeper**:
  - Prezentuje 9 konfiguracji: od 50 kWh (4 moduły) do 1000 kWh (80 modułów).
  - Kolumny: Konfiguracja modułowa, Falowniki SH, CAPEX, Zgolony szczyt [kW], Koszyk URE, Roczne oszczędności [PLN], Okres zwrotu ROI [lata].
  - Automatyczne wyróżnienie wiersza optymalnego ekonomicznie (najlepszy stosunek CAPEX do rocznego zysku).

### Widok 4: Heatmapa Obciążenia 24×7 (`heatmap`)
- **Wizualizacja Matrycowa 168 Godzin Tygodnia**:
  - 7 wierszy (Poniedziałek – Niedziela) $\times$ 24 kolumny (Godziny 00:00–23:00).
  - Skala barwna: od bezpiecznego błękitu/zieleni (niski pobór) po głęboką czerwień (groźne szczyty obciążenia).
- **Przełącznik Trybu**:
  - *Profil Przed PowerKeeper* — pozwala zidentyfikować powtarzalne wzorce przeciążeń fabryki.
  - *Profil Po PowerKeeper* — ilustruje spłaszczenie poboru i eliminację czerwonych punktów zapalnych.
- **Wyróżnienie Okna Opłaty Mocowej**:
  - Wizualne oznaczenie godzin 07:00–22:00 w dni robocze podlegających opłacie mocowej URE.

### Widok 5: Czynniki Forecastu (In-Model vs External) (`forecast`)
- **Tabela Zestawienia Metodologii**:
  - Wskazuje czynniki uwzględnione deterministycznie w kodzie (symulacja 15-min, krzywa degradacji, koszyki URE, formuła OSD, sprawność DC) oraz czynniki zewnętrzne (ryzyko regulacyjne, dotacje, przerwy w zasilaniu).
- **Interaktywne Suwaki Testów Wrażliwości (Stress-Test)**:
  - *Roczna inflacja cen energii (%)*: od 0% do 15%.
  - *Dofinansowanie / Dotacja do CAPEX (%)*: od 0% do 50%.
  - *Wartość unikniętego przestoju produkcji dzięki backupowi EPS <10 ms (PLN/rok)*: od 0 do 200 000 PLN.
  - *Roczny koszt serwisu i ubezpieczenia O&M (% CAPEX)*: od 0,5% do 3,0%.
- **Natychmiastowe Przeliczenie Skorygowanego ROI**:
  - Prezentuje wpływ zmiennych makroekonomicznych na ostateczną opłacalność inwestycji w czasie rzeczywistym.

---

## 7. Modale i Okna Dialogowe

### 7.1 Raport Audytu Techniczno-Ekonomicznego (`PrintAuditReportModal.jsx`)
Dedykowane okno generowania dokumentacji audytowej dla zarządu i instytucji finansujących:
- **Pasek Narzędziowy**:
  - Przycisk `Drukuj / Zapisz do PDF` (`window.print()`).
  - Przycisk `Pobierz Plik Raportu` (generuje samodzielny plik `.html` z pełnymi stylami do wysłania e-mailem lub pracy offline).
  - Przycisk `Zamknij`.
- **Układ Dokumentu Format A4 (`.report-paper`)**:
  - **Nagłówek**: Logo PowerKeeper C&I Studio, numer PPE, data audytu, architektura DC-Coupled.
  - **Sekcja 1: Executive Summary**: Zestawienie wskaźników ROI, CAPEX, rocznych zysków i unikniętych kar.
  - **Sekcja 2: Specyfikacja Techniczna BESS & PV**: Liczba modułów 12,5 kWh, liczba wież, model falowników Sungrow SH, sprawność 97,5%, czas reakcji <10 ms.
  - **Sekcja 3: Zestawienie Oszczędności Rocznych**: Tabela z podziałem na Peak Shaving, Koszyki URE K1–K4, Arbitraż oraz Usługi Sieciowe PSE (DSR + Rynek Mocy).
  - **Sekcja 4: 10-letnia Projekcja Cash Flow**: Pełna tabela finansowa z degradacją i wskaźnikiem LCOS.
  - **Sekcja 5: Certyfikacja i Podpisy**: Oficjalny blok z oświadczeniem inżyniera audytora oraz miejscem na pieczęć i podpis inwestora.
- **Style Drukarskie (`@media print`)**:
  - Całkowite ukrycie elementów interfejsu (pasek narzędzi, tło modalne).
  - Zastosowanie białego tła dokumentu i czarnego tekstu o wysokim kontraście.
  - Wymuszenie `page-break-inside: avoid` na tabelach i sekcjach, gwarantujące estetyczne łamanie stron A4.

### 7.2 Porównywarka Scenariuszy (`showCompareModal`)
- Zbiorcze zestawienie wszystkich wariantów zapisanych przyciskiem *Zapisz Scenariusz*.
- Prezentuje w jednej tabeli: Nazwę scenariusza, Pojemność [kWh], Koszyk URE przed $\rightarrow$ po, CAPEX [PLN], Zysk z Peak Shaving [PLN], Zysk z URE [PLN], Arbitraż [PLN], Łączny Zysk Roczny [PLN] oraz ROI [lata].
- Opcje: usunięcie pojedynczego wariantu lub wyczyszczenie całej listy.

### 7.3 System Powiadomień (`ToastContainer`)
- Pływające powiadomienia w prawym dolnym rogu ekranu z automatycznym znikaniem (4,5 s) lub ręcznym zamknięciem.
- 4 stany wizualne: `success` (zielony), `warning` (bursztynowy), `error` (czerwony), `info` (błękitny).
- Informuje o zdarzeniach: zapisaniu scenariusza, synchronizacji pogody Open-Meteo, błędach parsowania pliku CSV czy wygenerowaniu eksportu.

---

## 8. Zgodność z Wymaganiami Technologicznymi i Dystrybucyjnymi

1. **Zero Zależności Zewnętrznych w Runtime**:
   - Wygenerowany plik [`c:\Users\jacek\Downloads\BESS_calc\index.html`](file:///c:/Users/jacek/Downloads/BESS_calc/index.html) oraz [`powerkeeper-bess-audit\index_portable.html`](file:///c:/Users/jacek/Downloads/BESS_calc/powerkeeper-bess-audit/index_portable.html) zawiera kompletny kod JavaScript, silnik obliczeniowy i style CSS w pojedynczym pliku (2,51 MB).
   - Działa natychmiastowo po dwukrotnym kliknięciu w dowolnej przeglądarce, również bez dostępu do Internetu.
2. **Responsywność i Wydajność**:
   - Płynne skalowanie wykresów Recharts dzięki `ResponsiveContainer`.
   - Obliczenia 35 040 punktów 15-minutowych wykonywane na zoptymalizowanych tablicach `Float32Array` w czasie poniżej 150 ms.
