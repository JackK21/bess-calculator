# PowerKeeper Analyst — BESS & PV Industrial Sizing & Financial Engine

> **Kompleksowe narzędzie do symulacji techniczno-ekonomicznej magazynów energii (BESS) i fotowoltaiki przemysłowej C&I w warunkach polskiego rynku elektroenergetycznego (OSD, URE, Rynek Mocy).**

[![Netlify Status](https://api.netlify.com/api/v1/badges/169b42dd-aa73-436a-bbc4-3cc97f621b9c/deploy-status)](https://powerkeeper-analyst.netlify.app)
🌐 **Wersja demonstracyjna live**: [https://powerkeeper-analyst.netlify.app](https://powerkeeper-analyst.netlify.app)

---

## ⚡ Kluczowe Możliwości i Architektura

- **Architektura DC-Coupled**:
  - Bezpośrednie ładowanie baterii ze stringów PV przez wspólną szynę DC falownika hybrydowego Sungrow (SH50CX / SH80CX / SH125CX).
  - 5–8% wyższa sprawność cyklu fotowoltaicznego względem klasycznych układów AC-coupled.
  - Brak dławienia mocy generacji na przyłączu OSD.
- **Modułowość 12,5 kWh LFP**:
  - Pojedynczy moduł bateryjny PowerKeeper: dokładnie 12,5 kWh.
  - Minimalna wieża fizyczna: 4 moduły (50,0 kWh).
  - Skalowalność wielowieżowa: 50, 100, 150, 200 do 1000+ kWh w kaskadzie.
- **Rygorystyczne gaszenie kar OSD (Peak Shaving)**:
  - Implementacja wzoru taryfowego: $\text{Kara} = \Delta P \times \text{Stawka}_{\text{sieciowa}} \times 10$.
  - Detekcja i redukcja przekroczeń mocy w 15-minutowych oknach rozliczeniowych.
  - Czas reakcji sterownika **DSO Guard** poniżej 10 ms.
- **Reforma Opłaty Mocowej URE 2026**:
  - Automatyczny podział na godziny szczytowe (07:00–22:00 w dni robocze) i pozaszczytowe.
  - Matematyczne wyliczanie współczynnika rozpiętości poboru $\Delta S$ i kwalifikacja do koszyków K1 (rabat 83%), K2, K3 oraz K4.
- **Podręcznik Inżynierski & Centrum Feedbacku (Karta Help)**:
  - 7 interaktywnych modułów instruktażowych dla instalatorów i projektantów OZE.
  - Eksport JSON konfiguracji audytu, generator notatek do schowka i gotowych draftów e-mail.
- **Wielozakładkowy Eksport Raportów**:
  - Druk eleganckiego audytu PDF z klauzulami prawnymi (Corporate Due Diligence).
  - Generowanie natywnych, 4-arkuszowych raportów Excel (.xlsx / .xls) dla banków i komitetów inwestycyjnych.

---

## 📁 Struktura Projektu

```
PowerKeeper-Analyst/
├── public/
│   └── samples/              # 12 wzorcowych rocznych profili obciążeń OSD (15m i 1h CSV)
├── src/
│   ├── components/
│   │   ├── HelpManualView.jsx        # Karta Podręcznika Inżynierskiego & Feedbacku
│   │   ├── KpiGroups.jsx             # Wskaźniki finansowe i techniczne ROI/CAPEX
│   │   ├── PrintAuditReportModal.jsx # Generator audytu do druku / PDF
│   │   ├── ChartSeriesFilter.jsx     # Filtry serii wykresów mocy i BESS
│   │   └── Toast.jsx                 # System powiadomień
│   ├── engine/                       # Niezależne moduły kalkulacyjne BESS, PV i OSD
│   ├── utils/
│   │   ├── simulationEngine.js       # Silnik symulacji 15-minutowej, matryca doboru
│   │   ├── excelExportEngine.js      # Wielozakładkowy eksporter arkuszy kalkulacyjnych
│   │   ├── sampleProfilesData.js     # Wbudowane zbiory danych OSD
│   │   └── i18n.js                   # Dwujęzyczność PL / EN
│   ├── App.jsx                       # Główny interfejs analityczny i kokpit sterowania
│   └── index.css                     # Design system (tryb ciemny / jasny)
├── dist/                             # Skompilowany pakiet produkcyjny
├── netlify.toml                      # Konfiguracja nagłówków bezpieczeństwa i SPA dla Netlify
└── vite.config.js                    # Konfiguracja bundlera Vite + singlefile
```

---

## 🚀 Uruchomienie Lokalne

Wymagane środowisko: **Node.js v18+** (rekomendowany v20+).

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/JackK21/bess-calculator.git
cd bess-calculator

# 2. Instalacja zależności
npm install

# 3. Uruchomienie serwera deweloperskiego
npm run dev

# 4. Kompilacja wersji produkcyjnej (Single-File HTML)
npm run build
```

---

## 📜 Licencja & Zastrzeżenie Prawne

Wszelkie prawa zastrzeżone. Obliczenia symulacyjne stanowią oszacowanie inżyniersko-finansowe i wymagają weryfikacji warunków przyłączeniowych u właściwego Operatora Systemu Dystrybucyjnego (OSD).
