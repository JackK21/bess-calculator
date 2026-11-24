# Sungrow PowerKeeper - Autorytatywna Baza Parametrów Technicznych

## 1. Architektura i Topologia
- **Typ układu**: **DC-Coupled** (szyna DC inwertera hybrydowego, np. seria SH125CX lub C&I Hybryda).
- **Zaleta DC-Coupled**: Bezpośrednie ładowanie DC z PV bez podwójnej konwersji (DC->AC->DC), dające **5–8% wyższą sprawność ładowania** względem układów AC-coupled.
- **Przyłącze OSD**: Brak sumowania mocy baterii i PV – łączna moc AC oddawana do sieci jest sztywno ograniczona mocą inwertera. Eliminuje odmowy wydania warunków przyłączeniowych i konieczność zwiększania mocy przyłączeniowej.

## 2. Moduły Bateryjne, Wieże i Skalowalność
- **Pojemność modułu bazowego**: **12,5 kWh** (LFP / LiFePO4).
- **Struktura wieżowa (Tower Architecture)**:
  - **Najmniejsza wieża PowerKeeper**: **zawsze 4 moduły (50,0 kWh)**.
  - Wykluczone są konfiguracje mniejsze niż 1 wieża (1, 2, 3 moduły).
  - Skalowanie wieżowe:
    - **50,0 kWh** (1 wieża = 4 moduły)
    - **100,0 kWh** (2 wieże = 8 modułów)
    - **150,0 kWh** (3 wieże = 12 modułów)
    - **200,0 kWh** (4 wieże kaskada = 16 modułów)
- **Falowniki hybrydowe PowerKeeper (Inwertery C&I Sungrow seria SH)**:
  - Modele mocy i zweryfikowane ceny rynkowe:
    - **SH50CX (50 kW)**: ~15 000 PLN (~3 530 EUR)
    - **SH80CX (80 kW)**: ~19 000 PLN (~4 470 EUR)
    - **SH125CX (125 kW)**: ~25 000 PLN (~5 880 EUR)
- **Cena jednostkowa modułów bateryjnych PowerKeeper 12,5 kWh**:
  - Domyślna cena startowa w audycie (z możliwością edycji): **~700 PLN za kWh** (moduł bazowy 12,5 kWh LFP = ~8 750 PLN).
- **Kategoryczny zakaz halucynacji**: ZAKAZ podawania modułów 5,12 kWh czy 3,2 kWh. Moduł PowerKeeper to **zawsze 12,5 kWh**, a najmniejsza wieża to **4 moduły (50,0 kWh)**.

## 3. Dynamika Reakcji i Peak Shaving
- **Czas reakcji (DSO Guard)**: **< 10 ms** (błyskawiczny wtrysk mocy tłumiący szpilki rozruchowe maszyn i stacji ładowania EV).
- **Zastosowanie**:
  - Tłumienie 15-minutowych przekroczeń Mocy Umownej w MŚP / C&I.
  - Zasilanie awaryjne (EPS / Backup) wrażliwych odbiorników IT / automatyki przemysłowej.

## 4. Metodologia Finansowa i Kary za Moc Umowną
- **Formuła kary sieciowej OSD za przekroczenie mocy umownej**:
  $$\text{Kara [PLN]} = \Delta P [\text{kW}] \times \text{Stawka opłaty stałej sieciowej [PLN/kW/mc]} \times 10$$
  *(Gdzie $\Delta P$ to maksymalne 15-minutowe przekroczenie mocy umownej w danym miesiącu rozliczeniowym).*
- **Formuła CAPEX PowerKeeper**:
  $$\text{Total CAPEX} = (\text{Pojemność BESS [kWh]} \times \text{Cena za 1 kWh}) + \text{Cena falownika (50 / 80 / 125 kW)}$$
- **Wskaźnik ROI**: Oparty na sumie unikniętych kar 10x, redukcji opłaty mocowej URE (koszyki K1–K4), zwiększonej autokonsumpcji PV i arbitrażu cenowym względem całkowitego CAPEX.
