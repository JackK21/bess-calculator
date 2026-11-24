# Raport Audytu Technicznego i Instrukcje Zmian — PowerKeeper Analyst
**Data sporządzenia:** `2026-10-16`  
**Audytowany projekt:** `PowerKeeper-Analyst` ([`C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst)) oraz bazowy `powerkeeper-bess-audit`  
**Punkt odniesienia (Grounding):** [`references/powerkeeper_specs.md`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/references/powerkeeper_specs.md), [`PLAN_ROZBUDOWY_SILNIKA_OBLICZENIOWEGO.md`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/PLAN_ROZBUDOWY_SILNIKA_OBLICZENIOWEGO.md)

---

## 1. Podsumowanie Wykonawcze Audytu (Executive Summary)

Przeprowadzono pełny, deterministyczny audyt kodu źródłowego, wszystkich 6 modułów silnika obliczeniowego (`src/engine/*`), 12 plików profilowych CSV (`public/samples/*.csv`), komponentów wizualizacji (`src/App.jsx`, `src/components/*`) oraz generatorów raportów (`excelExportEngine.js`, `PrintAuditReportModal.jsx`, eksport CSV).

| Obszar Audytu | Pliki Źródłowe | Status | Kluczowe Wnioski z Weryfikacji |
| :--- | :--- | :---: | :--- |
| **Moduł 1: PV Plant Engine** | [`pvPlantEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/pvPlantEngine.js) | ⚠️ **Wymaga korekty** | Model geometryczny (Północ/Centrum/Południe, S vs E-W, derating temp. `-0.35%/°C`, clipping `92%`) oraz klient Open-Meteo działają poprawnie. **Błąd:** tryby `client_actual` i `client_plus_expansion` zwracają `0 kW` z pliku OSD, ponieważ parser odrzuca wiersze eksportu. |
| **Moduł 2: BESS Config** | [`bessConfig.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessConfig.js) | ⚠️ **Wymaga korekty** | Modułowość `12.5 kWh`, minimum 1 wieża (`4 mod. = 50 kWh`), kaskada `1–4×` falowników `50 / 80 / 125 kW` zgodne ze specyfikacją. **Błąd:** `resolveBessConfig` nie ogranicza `effectivePowerKw` przez fizyczny limit prądowy ogniw `1.0C` (`nominalCapacityKwh * 1.0`). |
| **Moduł 3: BESS Dispatch** | [`bessDispatchEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js) | ❌ **Krytyczne błędy** | 1) Algorytm Look-Ahead 24h obniża nocne ładowanie do `35% SoC` w słoneczne dni nawet przy włączonym Peak Shavingu, pozbawiając magazyn bufora na szczyty. 2) Brak ładowania nocnego gdy `enableArbitrage = false`. 3) Rozładowanie arbitrażowe i szczytowe zlane w jedną tablicę (`bessDischargeArbKw = 0`). 4) Przesunięcie dni tygodnia w Heatmapie 24×7 (`getDay() = 0` dla Niedzieli zmapowane jako Poniedziałek). |
| **Moduł 4: Taryfy & OSD** | [`tariffOsdEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/tariffOsdEngine.js) | ✅ **Poprawny** | Wzór kary OSD ($\text{Kara} = \Delta P \times \text{Stawka} \times 10$), stawka bazowa URE 2026 (`0.2194 PLN/kWh`, dni robocze `07:00–22:00`), koszyki mocowe `K1 (0.17)`, `K2 (0.50)`, `K3 (0.83)`, `K4 (1.00)`, taryfy `B21/B22/B23/C21/C22a/RDN` oraz przychody `DSR / Rynek Mocy / FCR` zaimplementowane prawidłowo. |
| **Moduł 5: Finanse & ROI** | [`financialEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/financialEngine.js) | ⚠️ **Wymaga korekty** | Blokada $\text{ROI} \ge 1.0\text{ roku}$ oraz wzór LCOS działają poprawnie. **Błąd:** pętla 10-letniego Cash Flow odejmuje ratę kredytu liczoną od `CAPEX_BESS + CAPEX_PV`, ale po stronie przychodów uwzględnia wyłącznie `annualSavingsBessOnlyPln` (pomija oszczędności z PV). Ponadto flaga `enableDegradation` z UI nie jest przekazywana z `index.js`. |
| **Orkiestrator Silnika** | [`src/engine/index.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js) | ❌ **Krytyczne braki** | Brak eksportu pól `totalLoadKwh`, `selfSufficiencyPct` oraz `annualOsdPenaltiesBeforePln` w obiekcie `metrics`, co powoduje wyświetlanie `NaN MWh` i `0 PLN` kar w `KpiGroups.jsx` po wyłączeniu BESS lub Peak Shavingu. Brak `roiCombinedYears` w `runPowerKeeperSizingMatrix`. |
| **Dane Próbne CSV (12 plików)** | `public/samples/*.csv` | ❌ **Wymaga korekty (4 pliki)** | 4 z 7 głównych profili 12-miesięcznych (`2_OSD_TAURON_Piekarnia...`, `3_OSD_ENEA_Baza_Logistyczna...`, `6_OSD_TAURON_Przetwornia...`, `7_OSD_Huta_Odlewnia...`) posiadają wielogodzinne ciągłe plateau powyżej `contractedPowerKw` (wymagające 150–640 kWh na dobę), przez co domyślny magazyn rozładowuje się do `10% SoC` i ścina `0.0–0.3 kW` w skali roku. |
| **Raporty (PDF, Excel, CSV)** | [`excelExportEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/utils/excelExportEngine.js), [`PrintAuditReportModal.jsx`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/components/PrintAuditReportModal.jsx) | ⚠️ **Wymaga korekty** | Generator Excel (`.xls`) ignoruje wybraną walutę `EUR` (eksportuje zawsze kwoty w PLN z formatem `"PLN"`). W raporcie PDF/HTML występuje surowy kod LaTeX `$P_{umowna}$`, nieprzeliczony wskaźnik `LCOS` dla waluty `EUR` oraz zahardkodowany tekst `z Koszyka K4` zamiast `metrics.basketBefore`. |

---

## 2. Weryfikacja Poprawnych Mechanizmów (Co Działa Bez Zarzutu)

Poniższe elementy zostały zweryfikowane skryptem testowym i są w **100% zgodne** ze specyfikacją domenową:
1. **Wzór Kary za Przekroczenie Mocy Umownej OSD** ([`tariffOsdEngine.js#L35-L38`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/tariffOsdEngine.js#L35-L38)):
   $$\text{Kara}_{\text{mc}} = \Delta P_{\max} \times \text{Stawka}_{\text{sieciowa}} \times 10$$
   Prawidłowo naliczany od najwyższego 15-minutowego przekroczenia w danym miesiącu kalendarzowym i sumowany po 12 miesiącach.
2. **Klasyfikacja Koszyków Mocowych URE 2026 (K1–K4)** ([`tariffOsdEngine.js#L45-L106`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/tariffOsdEngine.js#L45-L106)):
   - Okno szczytowe: dni robocze (Pon–Pt) w godzinach `07:00–21:59` (15h/dobę), stawka bazowa `0.2194 PLN/kWh`.
   - Wskaźnik nierównomierności $\Delta_S = \left(\frac{P_{\text{śr,szczyt}}}{P_{\text{śr,pozaszczyt}}} - 1\right) \times 100\%$ oraz mnożniki: `K1 (<5%): 0.17`, `K2 (5–10%): 0.50`, `K3 (10–15%): 0.83`, `K4 (>=15%): 1.00`.
3. **Architektura Sprzętowa PowerKeeper LFP** ([`bessConfig.js#L11-L40`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessConfig.js#L11-L40)):
   - Moduł bazowy zawsze `12.5 kWh`, minimalna wieża `4 moduły = 50.0 kWh`, skalowanie do `20 wież = 1000 kWh`.
   - Falowniki hybrydowe `SH50CX (15 000 PLN)`, `SH80CX (19 000 PLN)`, `SH125CX (25 000 PLN)` w kaskadzie do 4 jednostek.
   - Zróżnicowanie sprawności: `97.5%` przy bezpośrednim ładowaniu po szynie DC z PV (`dcCoupledEfficiency`) vs `94.5%` przy ładowaniu AC z sieci (`acGridEfficiency`).
4. **Ochrona Wiarygodności ROI ($\ge 1.0\text{ roku}$)** ([`financialEngine.js#L35-L49`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/financialEngine.js#L35-L49)):
   - Zarówno `roiBessYears`, `roiCombinedYears`, jak i `roiPvYears` posiadają twardą dolną granicę `Math.max(1.0, ...)`.

---

## 3. Szczegółowy Wykaz Wykrytych Błędów i Instrukcje Zmian

> [!IMPORTANT]
> Poniższe instrukcje zostały podzielone według priorytetu (**P0 — Krytyczne błędy obliczeń i UI**, **P1 — Błędy funkcjonalne i dane CSV**, **P2 — Błędy w raportach PDF/Excel i spójności modelu**). Każda pozycja zawiera dokładną lokalizację oraz gotową instrukcję wdrożenia.

---

### [P0-1] Brakujące pola w `metrics` (`NaN MWh` w trybie „Bez BESS” oraz `0 PLN` kar po wyłączeniu Peak Shavingu)
- **Lokalizacja:** [`src/engine/index.js#L276-L509`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L276-L509) oraz [`src/components/KpiGroups.jsx#L58-L161`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/components/KpiGroups.jsx#L58-L161) i [`src/App.jsx#L3998-L4007`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/App.jsx#L3998-L4007)
- **Diagnoza problemu:**
  1. W [`KpiGroups.jsx#L96-L98`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/components/KpiGroups.jsx#L96-L98) (widok `Bez BESS`) komponent wyświetla `(m.totalLoadKwh / 1000).toFixed(1) MWh` oraz `m.selfSufficiencyPct%`. Ponieważ [`src/engine/index.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L438-L509) nie zwraca tych pól w `metrics`, w UI pojawia się **`NaN MWh`**!
  2. W [`src/engine/index.js#L370-L372`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L370-L372), gdy użytkownik wyłączy `Peak Shaving` (`enablePeakShaving = false`) lub wyłączy BESS (`enableBess = false`), `annualAvoidedOsdPenaltyPln` przyjmuje wartość `0`. Karta KPI próbuje użyć `annualAvoidedOsdPenaltyPln` jako kwoty kar bazowych, przez co wyświetla `0 PLN` mimo aktywnego przekroczenia mocy umownej, a zmiana Mocy Umownej w polu input nie pokazuje żadnej zmiany kar.
- **Instrukcja zmiany:**
  1. W [`src/engine/index.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L273) zsumować w pętli `totalLoadKwh += stepLoadKwh;` oraz `totalPvGenKwh += pvKw * dt;`, wyliczyć `annualOsdPenaltiesBeforePln = Math.round(totalOsdPenaltiesBeforePln * annualMonthScale)` i `annualOsdPenaltiesAfterPln = Math.round(totalOsdPenaltiesAfterPln * annualMonthScale)` oraz dodać do zwracanego obiektu `metrics`:
     ```js
     totalLoadKwh: Math.round(totalLoadKwh * annualMultiplier),
     totalPvGenKwh: Math.round(totalPvGenKwh * annualMultiplier),
     selfSufficiencyPct: totalLoadKwh > 0
       ? Number((Math.min(100, ((totalLoadKwh - totalGridAfterKwh) / totalLoadKwh) * 100)).toFixed(1))
       : 0,
     annualOsdPenaltiesBeforePln: Math.round(totalOsdPenaltiesBeforePln * annualMonthScale),
     annualOsdPenaltiesAfterPln: Math.round(totalOsdPenaltiesAfterPln * annualMonthScale),
     ```
  2. W [`src/components/KpiGroups.jsx`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/components/KpiGroups.jsx#L62) (widok `Bez BESS`) zamienić `m.annualAvoidedOsdPenaltyPln` na `m.annualOsdPenaltiesBeforePln`, a w linii 150–160 (widok `Z BESS`, gdy `enablePeakShaving === false`) wyświetlić na czerwono aktywne kary: `- {fmtMoney(m.annualOsdPenaltiesBeforePln)}` oraz przekroczenie `+{m.deltaPBeforeKw} kW`.

---

### [P0-2] Błąd priorytetu Look-Ahead 24h i regeneracji bufora Peak Shaving w [`src/engine/bessDispatchEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js)
- **Lokalizacja:** [`src/engine/bessDispatchEngine.js#L137-L172`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js#L137-L172)
- **Diagnoza problemu:**
  1. W linii 145: `const targetNightSoc = nextDayForecastPvKwh > (currentCap * 1.2) ? 0.35 : 0.90;` — jeśli na kolejny dzień prognozowana jest słoneczna pogoda (`nextDayForecastPvKwh > 1.2 * currentCap`), magazyn ładuje się w nocy tylko do **35% SoC**, nawet gdy `enablePeakShaving === true`! Gdy rano (06:00–08:30, zanim PV osiągnie moc) lub w nocy (jak w piekarni 01:30–05:30) wystąpi szczyt mocy ponad `contractedPowerKw`, magazyn ma zaledwie 35% SoC, rozładowuje się do 10% i przepuszcza szczyt na sieć OSD, generując 10-krotną karę!
  2. W linii 137: warunek ładowania nocnego `else if (enableArbitrage && isCheapNightWindow && soc < 0.92)` wymaga `enableArbitrage === true`. Gdy użytkownik włączy **tylko Peak Shaving** (`enablePeakShaving = true, enableArbitrage = false`), magazyn w ogóle nie ładuje się w oknie nocnym do pełnego bufora bezpieczeństwa (ładuje się tylko do 55% z linii 163).
- **Instrukcja zmiany:**
  W [`src/engine/bessDispatchEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js#L137-L172):
  1. Zmienić warunek `PRIORYTET 3` tak, aby działał gdy `(enableArbitrage || enablePeakShaving) && isCheapNightWindow && soc < 0.92`.
  2. Jeśli `enablePeakShaving === true`, minimalny nocny poziom naładowania `targetNightSoc` nie może spaść poniżej `0.80` (80% SoC gwarantujące pełną gotowość DSO Guard przed porannym rozruchem maszyn), natomiast gdy `enablePeakShaving === false` (czysty arbitraż/autokonsumpcja), algorytm Look-Ahead może obniżyć `targetNightSoc` do `0.30`, zostawiając 70% miejsca na darmowe słońce:
     ```js
     const rawLookAheadSoc = nextDayForecastPvKwh > (currentCap * 1.2) ? 0.30 : 0.90;
     const targetNightSoc = enablePeakShaving ? Math.max(0.80, rawLookAheadSoc) : rawLookAheadSoc;
     ```
  3. W `PRIORYTET 3B` (`DSO Guard Recovery`, linie 163–172) podnieść docelowy próg odbudowy bufora z `0.55` do `0.75` oraz dopuścić moc regeneracji do `effectivePowerKw * 0.75` poniżej bezpiecznego pułapu `Math.min(chargeLimitKw, contractedPowerKw * 0.85)`, aby po pojedynczym uderzeniu mocy w ciągu dnia magazyn sprawnie odbudował rezerwę przed kolejnym pikiem.

---

### [P0-3] Zlanie rozładowania Peak Shaving i Arbitrażu w jedną serię danych (`bessDischargeArbKw = 0`)
- **Lokalizacja:** [`src/engine/bessDispatchEngine.js#L47-L50`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js#L47-L50), [`src/engine/bessDispatchEngine.js#L227-L238`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js#L227-L238) oraz [`src/engine/index.js#L320-L321`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L320-L321)
- **Diagnoza problemu:**
  - `bessDispatchEngine.js` sumuje `pOutPeakShavingKw + pOutArbitrageKw` do jednej tablicy `dischargeSeries`, a `src/engine/index.js` w linii 321 przypisuje na sztywno `bessDischargeArbKw: 0`.
  - W efekcie na drugim wykresie („Praca Magazynu PowerKeeper”) zielona seria `Oddawanie: Autokonsumpcja & Arbitraż [kW]` jest zawsze równa `0`, a każde rozładowanie arbitrażowe wyświetla się jako czerwony `Peak Shaving`.
- **Instrukcja zmiany:**
  1. W [`src/engine/bessDispatchEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js) utworzyć i zwracać dwie osobne tablice:
     ```js
     const dischargePeakSeries = new Float32Array(len);
     const dischargeArbSeries = new Float32Array(len);
     // w pętli:
     dischargePeakSeries[i] = pOutPeakShavingKw;
     dischargeArbSeries[i] = pOutArbitrageKw;
     ```
  2. W [`src/engine/index.js#L320-L321`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L320-L321) przypisać:
     ```js
     bessDischargePeakKw: Number(dischargePeakSeries[i].toFixed(2)),
     bessDischargeArbKw: Number(dischargeArbSeries[i].toFixed(2)),
     ```

---

### [P0-4] Kalibracja 4 z 7 wbudowanych profili 12-miesięcznych CSV w `public/samples/`
- **Lokalizacja:**
  - [`public/samples/2_OSD_TAURON_Piekarnia_Piece_12M_15min.csv`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/public/samples/2_OSD_TAURON_Piekarnia_Piece_12M_15min.csv)
  - [`public/samples/3_OSD_ENEA_Baza_Logistyczna_EV_12M_15min.csv`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/public/samples/3_OSD_ENEA_Baza_Logistyczna_EV_12M_15min.csv)
  - [`public/samples/6_OSD_TAURON_Przetwornia_Suszarnia_12M_15min.csv`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/public/samples/6_OSD_TAURON_Przetwornia_Suszarnia_12M_15min.csv)
  - [`public/samples/7_OSD_Huta_Odlewnia_Przemysl_12M_15min.csv`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/public/samples/7_OSD_Huta_Odlewnia_Przemysl_12M_15min.csv)
  - oraz [`src/engine/osdParser.js#L281-L293`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/osdParser.js#L281-L293)
- **Diagnoza problemu:**
  Test wszystkich 12 plików CSV w `public/samples/` wykazał, że podczas gdy 5 plików 1-miesięcznych (`1_Biuro...` do `5_Chlodnia...`) oraz pliki `1_OSD_PGE_Wtryskarki...`, `4_OSD_ENERGA_Chlodnia...` i `5_OSD_PGE_Biurowiec...` mają realistyczną charakterystykę impulsową (baza poniżej Mocy Umownej, 15–30 minutowe piki powyżej Mocy Umownej), to w 4 wymienionych wyżej plikach 12-miesięcznych wygenerowano ciągłe wielogodzinne bloki przekraczające Moc Umowną w każdym kwadransie:

| Plik CSV (12M) | Moc Umowna Preset | BESS Preset | Co obecnie znajduje się w pliku CSV | Skutek w symulacji (Przed zmianą) | Jak powinien wyglądać profil (Zgodnie z opisem i `osdParser.js`) |
| :--- | :---: | :---: | :--- | :--- | :--- |
| `2_OSD_TAURON_Piekarnia_Piece_12M_15min.csv` | `90 kW` | `100 kWh / 80 kW` | Przez 4,75h w nocy (`01:15–06:00`) ciągły pobór `103–150 kW` (>90 kW bez przerwy) | BESS rozładowuje się o `03:45` do `10% SoC`; **Zgolono: 0.1 kW** (`149.9 → 149.8 kW`) | Baza nocna wypieku `70–82 kW` (<90 kW) z wsadowymi uderzeniami pieców (`02:00`, `03:30`, `11:30`) do `132–145 kW` |
| `3_OSD_ENEA_Baza_Logistyczna_EV_12M_15min.csv` | `100 kW` | `100 kWh / 80 kW` | Przez 4,5h wieczorem (`16:30–21:00`) ciągły pobór `137–175 kW` (wymaga >200 kWh/wieczór) | BESS rozładowuje się o `18:30` do `10% SoC`; **Zgolono: 0.0 kW** (`174.8 → 174.8 kW`) | Baza popołudniowa `78–92 kW` (<100 kW) ze szpilkami szybkich ładowarek DC (`17:15–17:45`, `19:00–19:30`) do `145–158 kW` |
| `6_OSD_TAURON_Przetwornia_Suszarnia_12M_15min.csv` | `85 kW` | `100 kWh / 80 kW` | W sezonie jesiennym przez 15h/dobę (`07:00–22:00`) ciągły pobór `108–137 kW` (>85 kW) | BESS rozładowuje się po 2h; **Zgolono: 0.3 kW** (`137.0 → 136.7 kW`), ROI = `11.9 lat` | Baza suszarni w sezonie `72–82 kW` (<85 kW) z impulsami dmuchaw/podajników i nagrzewnic co 3–4h do `128–136 kW` |
| `7_OSD_Huta_Odlewnia_Przemysl_12M_15min.csv` | `380 kW` | `800 kWh / 500 kW` | Przez 16h/dobę (`06:00–22:00`) ciągły pobór bazowy `395–430 kW` (>380 kW) + piki `580 kW` | Baza powyżej mocy umownej drenuje 800 kWh przed wieczorem; `580 → 503.8 kW` w zimie | Baza huty `310–365 kW` (<380 kW) z uderzeniami pieców indukcyjnych (`08:30`, `11:15`, `15:45`, `19:15`) do `550–580 kW` |

- **Instrukcja zmiany:**
  Zaktualizować funkcję `generateProfilePowerKw` w [`src/engine/osdParser.js#L281-L293`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/osdParser.js#L281-L293) (dla `huta-odlewnia-megawat` obniżyć bazę z `390 + 35*sin` na `325 + 35*sin`, czyli max `360 kW < 380 kW`) oraz wygenerować na nowo 4 pliki CSV w `public/samples/` tak, aby pobór bazowy mieścił się pod mocą umowną, a ponad moc umowną wystawały realistyczne szpilki technologiczne (zgodne z opisami w `BUILTIN_SAMPLE_PROFILES`).

---

### [P1-1] Fizyczny limit mocy `1.0C` (`effectivePowerKw <= nominalCapacityKwh`) w [`src/engine/bessConfig.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessConfig.js)
- **Lokalizacja:** [`src/engine/bessConfig.js#L250-L252`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessConfig.js#L250-L252)
- **Diagnoza problemu:**
  `effectivePowerKw` jest obecnie równe `invKw * invCount` bez sprawdzenia maksymalnego prądu rozładowania baterii (`MAX_CRATE_CONTINUOUS = 1.0`). Dla 1 wieży (`50 kWh`) z falownikiem `SH125CX (125 kW)` lub kaskadą `4× SH125CX (500 kW)`, silnik pozwala na rozładowanie z mocą `125–500 kW` (czyli `2.5C–10C`).
- **Instrukcja zmiany:**
  W [`src/engine/bessConfig.js#L250-L252`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessConfig.js#L250-L252) wprowadzić ograniczenie `1.0C`:
  ```js
  const effectiveInverterKw = invKw * invCount;
  const requestedPowerKw = Number(params.bessPowerKw !== undefined ? params.bessPowerKw : effectiveInverterKw);
  const maxBatteryCrateKw = nominalCapacityKwh * POWERKEEPER_HARDWARE_SPECS.MAX_CRATE_CONTINUOUS;
  const effectivePowerKw = Math.min(requestedPowerKw, effectiveInverterKw, maxBatteryCrateKw);
  ```

---

### [P1-2] Obsługa kolumny generacji/eksportu PV w [`src/engine/osdParser.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/osdParser.js) i [`src/engine/pvPlantEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/pvPlantEngine.js)
- **Lokalizacja:** [`src/engine/osdParser.js#L140-L245`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/osdParser.js#L140-L245) oraz [`src/engine/pvPlantEngine.js#L220-L245`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/pvPlantEngine.js#L220-L245)
- **Diagnoza problemu:**
  1. W [`osdParser.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/osdParser.js) linie 195 i 223 odrzucają (`continue`) wiersze o kierunku `Oddanie / Wprowadzona / Eksport` i nie rozpoznają kolumny `exportColIdx` (np. `Oddanie (kWh)`, `Generacja PV (kW)`, `Energia wprowadzona`). W rezultacie `pt.exportKw` jest zawsze `undefined`.
  2. W [`pvPlantEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/pvPlantEngine.js) tryby `CLIENT_ACTUAL` i `CLIENT_PLUS_EXPANSION` odczytują wyłącznie `pt.exportKw || 0`, przez co po wybraniu w UI trybu `📁 Z pliku OSD` generacja PV wynosi zawsze `0 kW`, a w trybie `➕ Rozbudowa` suwak `Istniejące PV Klienta [kWp]` nie ma żadnego wpływu na symulację, gdy wgrany plik CSV nie posiada kolumny eksportu.
- **Instrukcja zmiany:**
  1. W [`src/engine/osdParser.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/osdParser.js):
     - Dodać detekcję kolumny `exportColIdx` (`cell.includes('oddan') || cell.includes('eksport') || cell.includes('wprowadz') || cell.includes('pv') || cell.includes('generac')`).
     - Dla plików, w których `Oddanie` występuje jako osobny wiersz z tym samym znacznikiem czasu (z kolumną `Kierunek = Oddanie`), zapisywać wartość do mapy `exportByTimestamp.set(dtObj.getTime(), val)` i przypisywać do `pt.exportKw`!
  2. W [`src/engine/pvPlantEngine.js#L220-L245`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/pvPlantEngine.js#L220-L245):
     - Sprawdzić przed pętlą, czy `points.some(p => (p.exportKw || 0) > 0)`. Jeśli w pliku CSV są rzeczywiste pomiary oddania/PV, użyć `pt.exportKw`; jeśli plik zawiera wyłącznie pobór (brak pomiarów PV w CSV), w trybie `CLIENT_PLUS_EXPANSION` i `CLIENT_ACTUAL` wyliczyć bazową produkcję z modelu dla `existingPvKwp || pvCapacityKwp`.

---

### [P1-3] Przesunięcie dni tygodnia w Heatmapie 24×7 ([`src/engine/index.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L423-L433))
- **Lokalizacja:** [`src/engine/bessDispatchEngine.js#L98`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js#L98), [`src/engine/bessDispatchEngine.js#L211`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js#L211) oraz [`src/engine/index.js#L423-L433`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L423-L433)
- **Diagnoza problemu:**
  `pt.date.getDay()` zwraca `0` dla **Niedzieli**, `1` dla **Poniedziałku**, ..., `6` dla **Soboty**. Tymczasem w [`src/engine/index.js#L423-L427`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L423-L433) tablica `dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz']` mapuje indeks `0` jako `Pon`. Skutkuje to przesunięciem całej Heatmapy o 1 dzień (dane z Niedzieli wyświetlają się w wierszu Poniedziałek, a dane z Piątku w wierszu Sobota).
- **Instrukcja zmiany:**
  W [`src/engine/bessDispatchEngine.js#L210-L213`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/bessDispatchEngine.js#L210-L213) użyć europejskiego indeksu dnia tygodnia (`Pon = 0 ... Ndz = 6`):
  ```js
  const euDayOfWeek = (dayOfWeek + 6) % 7; // 0 = Pon, 1 = Wt, ..., 5 = Sob, 6 = Ndz
  heatmapGrid[euDayOfWeek][hour].sumBefore += loadKw;
  heatmapGrid[euDayOfWeek][hour].sumAfter += gridPowerAfterKw;
  heatmapGrid[euDayOfWeek][hour].count++;
  ```

---

### [P2-1] Spójność modelu finansowego (`financialEngine.js` i `index.js`)
- **Lokalizacja:** [`src/engine/financialEngine.js#L70-L94`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/financialEngine.js#L70-L94) oraz [`src/engine/index.js#L293`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L293), [`src/engine/index.js#L411-L421`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L411-L421), [`src/engine/index.js#L535-L554`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L535-L554)
- **Diagnoza problemu:**
  1. W [`financialEngine.js#L70`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/financialEngine.js#L70) kwota kredytu `principalPln` jest liczona od `totalCombinedCapexPln` (`bessCapexPln + pvCapexPln`), natomiast w linii 90 przepływy pieniężne `grossSavings` uwzględniają wyłącznie `annualSavingsBessOnlyPln`. Dla analizy BESS-Only (NPV i Cash Flow magazynu) kapitał własny i obsługa długu w tabeli 10-letniej powinny bazować na `bessCapexPln` (lub spójnie na całym projekcie).
  2. W [`src/engine/index.js#L411-L421`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L411-L421) brak przekazania `annualDegradationPct: enableDegradation ? degradationRate : 0` do `calculateFinancialMetrics`.
  3. W [`src/engine/index.js#L493`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L493) `annualDcCoupledBonusPln` nie jest mnożony przez `annualMultiplier` (dla profili 31-dniowych wartość w PLN jest 12x za mała).
  4. W [`src/engine/index.js#L535-L554`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L535-L554) `runPowerKeeperSizingMatrix` nie zwraca `roiCombinedYears: sim.metrics.roiCombinedYears`, którego oczekuje [`src/App.jsx#L4297`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/App.jsx#L4297).
- **Instrukcja zmiany:**
  - W [`financialEngine.js#L70-L71`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/financialEngine.js#L70-L71) użyć `bessCapexPln` do wyliczenia `principalPln` i `equityCapexPln` dla 10-letniego modelu BESS Cash Flow (ponieważ `grossSavings` i `omCost` dotyczą BESS).
  - W [`src/engine/index.js#L411-L421`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/engine/index.js#L411-L421) przekazać `annualDegradationPct: enableDegradation ? degradationRate : 1.8`, pomnożyć `dcCoupledBonusPln * annualMultiplier` w linii 493 oraz dodać `roiCombinedYears: sim.metrics.roiCombinedYears` w `runPowerKeeperSizingMatrix`.

---

### [P2-2] Korekta generatorów raportów Excel (`.xls`) i PDF (`PrintAuditReportModal.jsx`)
- **Lokalizacja:** [`src/utils/excelExportEngine.js#L20-L443`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/utils/excelExportEngine.js#L20-L443) oraz [`src/components/PrintAuditReportModal.jsx#L157-L242`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/components/PrintAuditReportModal.jsx#L157-L242)
- **Diagnoza problemu:**
  1. **Excel (`.xls`)**: Funkcja `generatePowerKeeperExcelWorkbook` przyjmuje `currency = 'PLN'`, lecz wszystkie kwoty eksportuje w `PLN` bez przeliczenia przez kurs `EUR_PLN_RATE = 4.25` i ze sztywnym formatem `#,##0 "PLN"`. Ponadto w Arkuszu 1 (linia 237) ma wpisane na stałe `Przeskok z K4 do ...` zamiast `Przeskok z ${m.basketBefore} do ${m.basketAfter}`, a w Arkuszu 4 (linia 436) zapis `-${row.omCostPln}` zamiast `${-Math.abs(row.omCostPln)}`.
  2. **PDF / HTML (`PrintAuditReportModal.jsx`)**:
     - Linia 157: `metrics.lcosPlnPerKwh` nie jest przeliczany na `EUR` gdy `currency === 'EUR'`.
     - Linia 207: `{t('Moc Umowna OSD ($P_{umowna}$):', 'Contracted Power:')}` renderuje w HTML surowy ciąg znaków `$P_{umowna}$`.
     - Linia 240: tekst mówi na sztywno `Przeskok z Koszyka K4 do` zamiast `Przeskok z Koszyka ${metrics.basketBefore} do`.
- **Instrukcja zmiany:**
  - W [`src/utils/excelExportEngine.js`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/utils/excelExportEngine.js) dodać pomocnik `const cVal = v => Math.round((v || 0) / (currency === 'EUR' ? 4.25 : 1));`, dynamiczny format waluty `#,##0\ &quot;${currency}&quot;` oraz `Przeskok z ${escapeXml(m.basketBefore || 'K4')} do ${escapeXml(m.basketAfter || 'K1')}`.
  - W [`src/components/PrintAuditReportModal.jsx`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/components/PrintAuditReportModal.jsx) zamienić `$P_{umowna}$` na `P_umowna`, przeliczyć `lcosPlnPerKwh` dla `EUR` oraz wstawić `{metrics.basketBefore}` w miejsce zahardkodowanego `K4`.

---

### [P2-3] Drobne poprawki UX/UI w [`src/App.jsx`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/App.jsx)
- **Lokalizacja:** [`src/App.jsx#L336`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/App.jsx#L336), [`src/App.jsx#L911`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/App.jsx#L911), [`src/App.jsx#L1092`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/App.jsx#L1092), [`src/App.jsx#L1306`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/App.jsx#L1306)
- **Diagnoza problemu:**
  1. Linia 336: inicjalny `datasetLabel` to `'3_Zaklad_Produkcyjny_Wtryskarki_15min.csv'` zamiast `'1_OSD_PGE_Wtryskarki_Tworzyw_12M_15min.csv'`.
  2. Linia 911: `profile.label` zwraca `undefined` w komunikacie Toast (powinno być `lang === 'en' ? profile.shortNameEn : profile.shortName`).
  3. Linia 1092: w `handleSyncOnlineWeather` zakres dat wysyłany do Open-Meteo jest obcięty do `Math.min(availableDays.length - 1, 30)` (tylko 31 dni zamiast pełnego zakresu dat z profilu `availableDays[availableDays.length - 1].dateStr`).
  4. Linia 1306: sztywny tekst `2976 wierszy (15m)` pod przyciskiem pobierania profilu próbnego, podczas gdy wczytany profil 12M ma `35 040 wierszy` (`parsedProfile.totalRecords.toLocaleString()`).
- **Instrukcja zmiany:**
  Zaktualizować powyższe 4 linie w [`src/App.jsx`](file:///C:/Users/jacek/Downloads/BESS_calc/PowerKeeper-Analyst/src/App.jsx), aby wyświetlały dynamiczną liczbę rekordów z `parsedProfile.totalRecords`, właściwą nazwę profilu oraz pobierały pełny horyzont czasowy z API pogodowego Open-Meteo.

---

## 4. Podsumowanie Gotowości do Wdrożenia

Wszystkie powyższe punkty zostały zweryfikowane na rzeczywistym kodzie projektu. Po zatwierdzeniu możemy natychmiast zaaplikować opisane poprawki w kodzie (`P0` → `P1` → `P2`) i ponownie uruchomić skrypt weryfikacyjny na wszystkich 12 profilach CSV.
