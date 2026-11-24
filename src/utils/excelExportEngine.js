/**
 * PowerKeeper Analyst - Professional Multi-Sheet Excel (.xls / SpreadsheetML) Generator
 * Zero-dependency, native Excel workbook with 4 structured worksheets:
 * 1. Karta_Projektu_CAPEX
 * 2. Bilans_12M_OSD_Kary
 * 3. Koszyki_Mocowe_URE
 * 4. CashFlow_10Lat_Bankability
 */

function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generatePowerKeeperExcelWorkbook({
  metrics,
  params,
  monthlyBreakdown = [],
  cashFlowTimeline = [],
  currency = 'PLN'
}) {
  const m = metrics || {};
  const today = new Date().toISOString().slice(0, 10);
  const currRate = currency === 'EUR' ? 1 / 4.25 : 1.0;
  const cVal = v => Math.round((v || 0) * currRate);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>PowerKeeper BESS Audit Studio</Author>
  <Created>${today}T12:00:00Z</Created>
  <Company>PowerKeeper Polska</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderGreen">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#047857" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="LabelBold">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataNumber">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataDec">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataMoney">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0\ &quot;${currency}&quot;"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="HighlightGreen">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#047857"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0\ &quot;${currency}&quot;"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
   </Borders>
  </Style>
  <Style ss:ID="HighlightRed">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#BE123C"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0\ &quot;${currency}&quot;"/>
   <Interior ss:Color="#FFF1F2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRow">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0\ &quot;${currency}&quot;"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#0F172A"/>
   </Borders>
  </Style>
 </Styles>

 <!-- ARKUSZ 1: KARTA PROJEKTU & CAPEX -->
 <Worksheet ss:Name="1. Karta Projektu &amp; CAPEX">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="230"/>
   <Column ss:Width="160"/>
   <Column ss:Width="110"/>
   <Column ss:Width="240"/>
   
   <Row ss:Height="24">
    <Cell ss:MergeAcross="3" ss:StyleID="Title"><Data ss:Type="String">RAPORT AUDYTU ENERGETYCZNEGO — POWERKEEPER BESS &amp; PV</Data></Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:MergeAcross="3" ss:StyleID="Subtitle"><Data ss:Type="String">Model Finansowy Bankability • Dobór Wież 12,5 kWh LFP • Ochrona Mocy Umownej OSD (10x)</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <!-- METADANE -->
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Punkt Poboru Energii (PPE):</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(m.ppeCode || '590243893032990758')}</Data></Cell>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Data Audytu:</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${today}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Operator OSD / Grupa Taryfowa:</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml((m.osdOperator || 'PGE').toUpperCase())} / ${escapeXml(m.tariffGroup || 'B21')}</Data></Cell>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Stawka sieciowa OSD:</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${(params.osdNetworkRatePlnKwMonth || 25.40).toFixed(2)} PLN/kW/mc</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Moc Umowna Obiektu (P_umowna):</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${m.contractedPowerKw || 120} kW</Data></Cell>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Horyzont Danych OSD:</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${m.datasetSpanDays || 365} dni (15-min)</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <!-- KONFIGURACJA SPRZĘTOWA -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="Header"><Data ss:Type="String">1. SPECYFIKACJA TECHNOLOGICZNA POWERKEEPER (DC-COUPLED)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Model Magazynu Energii BESS:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="DataCell"><Data ss:Type="String">PowerKeeper ${m.nominalBessCapacityKwh || 100} kWh (${m.powerKeeperTowers || 2} Wież / ${m.powerKeeperModules || 8} Modułów 12,5 kWh LFP)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Moc Inwerterów Hybrydowych PCS:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="DataCell"><Data ss:Type="String">${m.effectiveBessPowerKw || 80} kW (${m.inverterCount || 1}× SH${m.singleInverterKw || 80}CX Sungrow)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Topologia &amp; Czas Reakcji:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="DataCell"><Data ss:Type="String">DC-Coupled (+5-8% wyższa sprawność) • Reakcja DSO Guard &lt; 10 ms</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Instalacja Fotowoltaiczna (PV):</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="DataCell"><Data ss:Type="String">${params.pvCapacityKwp || 0} kWp (${params.pvOrientation === 'east-west' ? 'Wschód-Zachód' : 'Południe'})</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <!-- NAKŁADY INWESTYCYJNE CAPEX -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="Header"><Data ss:Type="String">2. NAKŁADY INWESTYCYJNE (CAPEX)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Baterie PowerKeeper 12,5 kWh:</Data></Cell>
    <Cell ss:StyleID="DataMoney"><Data ss:Type="Number">${cVal(m.batteryCapexPln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">${m.nominalBessCapacityKwh || 100} kWh × ${Math.round((params.pricePerKwhBess || 700) * currRate)} ${currency}/kWh</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Falowniki Hybrydowe PCS:</Data></Cell>
    <Cell ss:StyleID="DataMoney"><Data ss:Type="Number">${cVal(m.inverterPricePln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">${m.inverterCount || 1}× Inwerter Sungrow SH${m.singleInverterKw || 80}CX</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Łączny CAPEX PowerKeeper BESS:</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${cVal(m.totalCapexPln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">Baterie + Inwertery hybrydowe DC</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Szacunkowy CAPEX Fotowoltaiki (PV):</Data></Cell>
    <Cell ss:StyleID="DataMoney"><Data ss:Type="Number">${cVal(m.pvEstimatedCapexPln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">${params.pvCapacityKwp || 0} kWp × ${Math.round(2800 * currRate)} ${currency}/kWp</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Łączny CAPEX Projektu (PV + BESS):</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${cVal(m.totalCombinedCapexPln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">Inwestycja hybrydowa kompleksowa</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <!-- STRUKTURA ROCZNYCH KORZYŚCI -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="HeaderGreen"><Data ss:Type="String">3. STRUKTURA PRZYCHODÓW I OSZCZĘDNOŚCI ROCZNYCH (${currency}/ROK)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Uniknięte Kary OSD za Moc Umowną:</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="Number">${cVal(m.annualAvoidedOsdPenaltyPln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">Tłumienie 15-min przekroczeń (Formuła OSD 10x)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Rabat w Opłacie Mocowej URE 2026:</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="Number">${cVal(m.annualUreCapacityFeeSavingsPln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">Przeskok z ${escapeXml(m.basketBefore || 'K4')} do ${escapeXml(m.basketAfter || 'K1')} (Rabat ${m.basketDiscountAfterPct || 0}%)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Arbitraż Cenowy &amp; Autokonsumpcja PV:</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="Number">${cVal(m.annualEnergySavingsBessOnlyPln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">Kupno w dolinie nocnej + akumulacja PV</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Usługi Sieciowe PSE (DSR + Rynek Mocy + FCR):</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="Number">${cVal(m.totalAnnualGridRevenuePln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">DSR: ${cVal(m.annualDsrRevenuePln)} ${currency} | RM: ${cVal(m.annualCapacityMarketRevenuePln)} ${currency} | FCR: ${cVal(m.annualFcrRevenuePln)} ${currency}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">SUMA OSZCZĘDNOŚCI ROCZNYCH BESS:</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${cVal(m.annualSavingsBessOnlyPln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">Bezpośrednie korzyści finansowe BESS-Only</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <!-- METRYKI INWESTYCYJNE ROI / NPV -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="Header"><Data ss:Type="String">4. WSKAŹNIKI OPŁACALNOŚCI INWESTYCJI (BANKABILITY)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Prosty Czas Zwrotu BESS (ROI):</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${m.roiYears || 1.0}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">Lata zwrotu (CAPEX BESS / Oszczędności)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Łączny Zwrot Projektu (PV + BESS):</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${m.roiCombinedYears || 1.0}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">Lata zwrotu całej inwestycji hybrydowej</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Wartość Bieżąca Netto (NPV 10 lat):</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="Number">${cVal(m.npvPln)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">WACC dyskonto 6.0%, degradacja LFP 1.8%/rok</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">LCOS (Koszt Przechowania Energii):</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${Number(((m.lcosPlnPerKwh || 0.35) * currRate).toFixed(3))}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCell"><Data ss:Type="String">${currency}/kWh w horyzoncie 10 lat z O&amp;M</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- ARKUSZ 2: BILANS 12M OSD I KARY -->
 <Worksheet ss:Name="2. Bilans 12M OSD &amp; Kary">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="90"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   
   <Row ss:Height="24">
    <Cell ss:MergeAcross="8" ss:StyleID="Title"><Data ss:Type="String">ZESTAWIENIE MIESIĘCZNYCH SZCZYTÓW MOCY I UNIKNIĘTYCH KAR OSD (FORMUŁA 10x)</Data></Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:MergeAcross="8" ss:StyleID="Subtitle"><Data ss:Type="String">Formuła kary OSD = Delta_P [kW] × Stawka sieciowa [PLN/kW/mc] × 10</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Miesiąc</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Szczyt Przed [kW]</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Szczyt Po [kW]</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Zgolono [kW]</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Kara OSD Przed</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Kara OSD Po</Data></Cell>
    <Cell ss:StyleID="HeaderGreen"><Data ss:Type="String">Oszczędność Kar 10x</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Zużycie [kWh]</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Z BESS [kWh]</Data></Cell>
   </Row>

   ${monthlyBreakdown.map(r => `
   <Row>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(r.month)}</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${r.maxKwOrig}</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${r.maxKwAfterBess}</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${r.shavedKw}</Data></Cell>
    <Cell ss:StyleID="HighlightRed"><Data ss:Type="Number">${cVal(r.penaltyBeforePln)}</Data></Cell>
    <Cell ss:StyleID="DataMoney"><Data ss:Type="Number">${cVal(r.penaltyAfterPln)}</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="Number">${cVal(r.penaltySavedPln)}</Data></Cell>
    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${r.loadKwh}</Data></Cell>
    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${r.bessDischargedKwh}</Data></Cell>
   </Row>`).join('')}

   <Row ss:Height="12"></Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">SUMA ROCZNA:</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${m.maxKwBefore || 0}</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${m.maxKwAfter || 0}</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${m.powerShavedKw || 0}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${cVal(monthlyBreakdown.reduce((s, r) => s + (r.penaltyBeforePln || 0), 0))}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${cVal(monthlyBreakdown.reduce((s, r) => s + (r.penaltyAfterPln || 0), 0))}</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="Number">${cVal(monthlyBreakdown.reduce((s, r) => s + (r.penaltySavedPln || 0), 0))}</Data></Cell>
    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${monthlyBreakdown.reduce((s, r) => s + (r.loadKwh || 0), 0)}</Data></Cell>
    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${monthlyBreakdown.reduce((s, r) => s + (r.bessDischargedKwh || 0), 0)}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- ARKUSZ 3: KOSZYKI MOCOWE URE 2026 -->
 <Worksheet ss:Name="3. Koszyki Mocowe URE 2026">
  <Table ss:DefaultColumnWidth="150">
   <Column ss:Width="260"/>
   <Column ss:Width="160"/>
   <Column ss:Width="260"/>
   
   <Row ss:Height="24">
    <Cell ss:MergeAcross="2" ss:StyleID="Title"><Data ss:Type="String">ANALIZA KOSZYKÓW OPŁATY MOCOWEJ URE 2026 (K1–K4)</Data></Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:MergeAcross="2" ss:StyleID="Subtitle"><Data ss:Type="String">Okno szczytowe: dni robocze 07:00–22:00 • Stawka bazowa URE: 0,2194 PLN/kWh</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <Row ss:Height="20">
    <Cell ss:MergeAcross="2" ss:StyleID="Header"><Data ss:Type="String">PORÓWNANIE KOSZYKÓW PRZED I PO POWERKEEPER BESS</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Koszyk Opłaty Mocowej Przed BESS:</Data></Cell>
    <Cell ss:StyleID="HighlightRed"><Data ss:Type="String">${escapeXml(m.basketBefore || 'K4')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Mnożnik ${m.basketFactorBefore || 1.0} (Brak ulgi)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Rozpiętość poboru Delta_S Przed BESS:</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${m.basketDeltaSBeforePct || 0}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Rozpiętość szczyt/pozaszczyt</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Koszyk Opłaty Mocowej Po PowerKeeper:</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="String">${escapeXml(m.basketAfter || 'K1')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Mnożnik ${m.basketFactorAfter || 0.17} (Rabat ${m.basketDiscountAfterPct || 83}%)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Rozpiętość poboru Delta_S Po PowerKeeper:</Data></Cell>
    <Cell ss:StyleID="DataDec"><Data ss:Type="Number">${m.basketDeltaSAfterPct || 0}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Wyrównanie profilu przez BESS</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <Row ss:Height="20">
    <Cell ss:MergeAcross="2" ss:StyleID="HeaderGreen"><Data ss:Type="String">ROZLICZENIE FINANSOWE OPŁATY MOCOWEJ (${currency}/ROK)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Roczny Koszt Opłaty Mocowej Przed BESS:</Data></Cell>
    <Cell ss:StyleID="HighlightRed"><Data ss:Type="Number">${cVal(m.annualUreCapacityFeeBeforePln)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Pełna stawka bazowa 0,2194 PLN/kWh</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Roczny Koszt Opłaty Mocowej Po PowerKeeper:</Data></Cell>
    <Cell ss:StyleID="DataMoney"><Data ss:Type="Number">${cVal(m.annualUreCapacityFeeAfterPln)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Efektywna stawka po rabacie koszykowym</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">ROCZNA OSZCZĘDNOŚĆ OPŁATY MOCOWEJ:</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="Number">${cVal(m.annualUreCapacityFeeSavingsPln)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">Czysty zysk z przeskoku koszykowego URE</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- ARKUSZ 4: CASH FLOW 10-LETNI -->
 <Worksheet ss:Name="4. Cash Flow 10-Letni">
  <Table ss:DefaultColumnWidth="130">
   <Column ss:Width="80"/>
   <Column ss:Width="140"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="140"/>
   <Column ss:Width="160"/>
   
   <Row ss:Height="24">
    <Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">10-LETNIA PROJEKCJA PRZEPŁYWÓW GOTÓWKOWYCH (CASH FLOW &amp; BANKABILITY)</Data></Cell>
   </Row>
   <Row ss:Height="16">
    <Cell ss:MergeAcross="5" ss:StyleID="Subtitle"><Data ss:Type="String">Degradacja pojemności LFP 1,8%/rok • Eskalacja cen energii • Koszty O&amp;M z CPI</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Rok</Data></Cell>
    <Cell ss:StyleID="HeaderGreen"><Data ss:Type="String">Oszczędności Brutto</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Koszty O&amp;M (CPI)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Obsługa Długu</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Przepływ Netto</Data></Cell>
    <Cell ss:StyleID="HeaderGreen"><Data ss:Type="String">Skumulowany Cash Flow</Data></Cell>
   </Row>

   ${cashFlowTimeline.map(row => `
   <Row>
    <Cell ss:StyleID="LabelBold"><Data ss:Type="String">Rok ${row.year}</Data></Cell>
    <Cell ss:StyleID="HighlightGreen"><Data ss:Type="Number">${cVal(row.grossSavingsPln)}</Data></Cell>
    <Cell ss:StyleID="DataMoney"><Data ss:Type="Number">-${cVal(row.omCostPln)}</Data></Cell>
    <Cell ss:StyleID="DataMoney"><Data ss:Type="Number">${row.debtServicePln > 0 ? `-${cVal(row.debtServicePln)}` : 0}</Data></Cell>
    <Cell ss:StyleID="${row.netCashFlowPln >= 0 ? 'HighlightGreen' : 'HighlightRed'}"><Data ss:Type="Number">${cVal(row.netCashFlowPln)}</Data></Cell>
    <Cell ss:StyleID="${row.cumulativeCashFlowPln >= 0 ? 'HighlightGreen' : 'HighlightRed'}"><Data ss:Type="Number">${cVal(row.cumulativeCashFlowPln)}</Data></Cell>
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;

  return xml;
}

export function downloadPowerKeeperExcel({
  metrics,
  params,
  monthlyBreakdown,
  cashFlowTimeline,
  currency = 'PLN',
  filename
}) {
  const xmlContent = generatePowerKeeperExcelWorkbook({
    metrics,
    params,
    monthlyBreakdown,
    cashFlowTimeline,
    currency
  });

  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Audyt_PowerKeeper_${metrics?.ppeCode || 'PPE'}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
