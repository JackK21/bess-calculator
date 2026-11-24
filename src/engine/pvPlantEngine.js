/**
 * PowerKeeper Analyst - PV Plant Engine (Moduł 1)
 * Grounded in: PLAN_ROZBUDOWY_SILNIKA_OBLICZENIOWEGO.md
 * 
 * Odpowiada za:
 * 1. 3 tryby pracy:
 *    - 'simulation_pure': Czysta symulacja na bazie zadanej mocy kWp, kąta, regionu i orientacji
 *    - 'client_actual': Ekstrakcja profilu generacji z pliku OSD klienta
 *    - 'client_plus_expansion': Hybryda: Rzeczywista generacja klienta + symulacja rozbudowy
 * 2. Model fizyczny PV z uwzględnieniem strat, azymutu, orientacji (Południe vs Wschód–Zachód),
 *    regionu (Północ 950 kWh/kWp, Centrum 1020 kWh/kWp, Południe 1080 kWh/kWp)
 *    oraz współczynnika temperaturowego (-0.35%/°C)
 * 3. Klient darmowego API pogodowego Open-Meteo z obsługą archiwum (dla profili z przeszłości)
 *    i prognozy bieżącej (dla bieżących/przyszłych dat)
 * 4. Generowanie wektora generacji PV dla dyspozytora BESS
 */

export const PV_MODES = {
  SIMULATION_PURE: 'simulation_pure',
  CLIENT_ACTUAL: 'client_actual',
  CLIENT_PLUS_EXPANSION: 'client_plus_expansion'
};

/**
 * Oblicza chwilową moc generacji fotowoltaicznej w trybie analitycznym
 * Geometria słoneczna dla Polski (~50°N - ~54.5°N), z krzywą dobową, sezonowością,
 * orientacją (South vs East-West) oraz nasłonecznieniem regionalnym (North / Central / South).
 */
export function calculateAnalyticalPvKw(date, pvCapacityKwp, options = {}) {
  if (!pvCapacityKwp || pvCapacityKwp <= 0) return 0;
  
  const {
    orientation = 'south',     // 'south' | 'east-west' | 'custom'
    region = 'central',         // 'north' | 'central' | 'south'
    tiltDeg = 35,               // Kąt nachylenia paneli (optimum w PL ~35°)
    tempAmbientC = 20,          // Temperatura otoczenia
    tempCoeffPmax = -0.0035,    // -0.35%/°C współczynnik temperaturowy mocy
    systemLossesFactor = 0.85   // Sprawność falownika, okablowania, zabrudzenia
  } = options;

  const month = date.getMonth() + 1; // 1 - 12
  const hourFloat = date.getHours() + date.getMinutes() / 60;

  // Wpływ regionu geograficznego w Polsce (szerokość geograficzna i roczne nasłonecznienie wg IMGW / PVGIS):
  // - 'south': Południe Polski (~50.1°N, Kraków/Katowice/Rzeszów/Wrocław) -> ~1080 kWh/kWp (+5.9% wzgl. centrum)
  // - 'central': Centrum Polski (~52.2°N, Warszawa/Łódź/Poznań) -> ~1020 kWh/kWp (baza 1.0)
  // - 'north': Północ Polski (~54.4°N, Gdańsk/Koszalin/Szczecin/Olsztyn) -> ~950 kWh/kWp (-6.9% wzgl. centrum)
  const isNorth = region === 'north';
  const isSouth = region === 'south';
  const regionFactor = isSouth ? 1.059 : isNorth ? 0.931 : 1.0;

  // Wschód i zachód słońca w Polsce z korektą na porę roku i szerokość geograficzną
  const seasonalCurve = Math.sin(((month - 1) / 11) * Math.PI);
  const latDelta = isNorth ? 0.35 : isSouth ? -0.35 : 0;
  const sunrise = (7.5 - 2.5 * seasonalCurve) + latDelta; // od ~4:45 w lecie do ~7:45 w zimie
  const sunset = (16.5 + 3.5 * seasonalCurve) - latDelta; // od ~16:15 w zimie do ~20:15 w lecie

  if (hourFloat < sunrise || hourFloat > sunset) return 0;

  const dayLength = sunset - sunrise;
  const solarNoon = (sunrise + sunset) / 2;

  let solarAngle = 0;
  let orientationLossFactor = 1.0;

  if (orientation === 'east-west') {
    // Rzeczywista fizyka dachu Wschód–Zachód (dwa stringi azymut -90° i +90°, tilt 10-15°):
    // 1. Moduły wschodnie łapią słońce wcześnie rano (szczyt ~3.0h przed południem).
    // 2. Moduły zachodnie produkują do późnego wieczora (szczyt ~3.0h po południu).
    // 3. W południe oba stringi pracują ukośnie ze spłaszczonym szerokim plateau.
    const eastPeak = solarNoon - 2.8;
    const westPeak = solarNoon + 2.8;
    const eastDist = Math.abs(hourFloat - eastPeak);
    const westDist = Math.abs(hourFloat - westPeak);

    const eastAngle = eastDist < dayLength * 0.45 
      ? Math.cos((eastDist / (dayLength * 0.45)) * (Math.PI / 2)) 
      : 0;

    const westAngle = westDist < dayLength * 0.45 
      ? Math.cos((westDist / (dayLength * 0.45)) * (Math.PI / 2)) 
      : 0;

    // Rozproszone światło zenitalne w południe
    const noonDist = Math.abs(hourFloat - solarNoon);
    const middayDiffuse = noonDist < (dayLength / 2)
      ? Math.cos((noonDist / (dayLength / 2)) * (Math.PI / 2)) * 0.32
      : 0;

    solarAngle = (0.5 * eastAngle + 0.5 * westAngle) * 0.88 + middayDiffuse;
    orientationLossFactor = 0.90; // Łączny roczny spadek nasłonecznienia E-W z powodu kąta
  } else {
    // Standardowa instalacja Południe (azymut 0°, tilt ~35°):
    // Klasyczny, ostry profil dzwonowy z silnym pikiem w południe (11:30–13:30)
    const distFromNoon = Math.abs(hourFloat - solarNoon);
    solarAngle = Math.cos((distFromNoon / (dayLength / 2)) * (Math.PI / 2));
    orientationLossFactor = 1.0;
  }

  if (solarAngle <= 0) return 0;

  // Współczynnik sezonowy promieniowania w Polsce (w zimie ~20% lata)
  const seasonalFactor = 0.20 + 0.80 * Math.pow(seasonalCurve, 1.2);

  // Wpływ temperatury ogniwa: T_cell ≈ T_ambient + (Irradiance/800) * 25
  const estimatedIrradiance = Math.max(0, solarAngle * seasonalFactor * regionFactor * 1000);
  const tCell = tempAmbientC + (estimatedIrradiance / 800) * 25;
  const tempDerating = 1 + tempCoeffPmax * Math.max(0, tCell - 25);

  // Zmienność pogodowa (profil chmur deterministyczny)
  const cloudVariation = 0.90 + 0.10 * Math.sin((date.getDate() * 5 + hourFloat * 2) % Math.PI);

  const rawGenKw = pvCapacityKwp * solarAngle * seasonalFactor * regionFactor * orientationLossFactor * tempDerating * systemLossesFactor * cloudVariation;
  
  // Ograniczenie AC falownika PV (inverter clipping przy 92% DC peak)
  const maxInverterAcKw = pvCapacityKwp * 0.92;
  return Math.max(0, Math.min(maxInverterAcKw, rawGenKw));
}

/**
 * Klient Open-Meteo Solar API (darmowe, bezpłatne API satelitarne bez klucza)
 * Inteligentnie wybiera endpoint:
 * - Jeśli daty są historyczne (>80 dni wstecz), używa Historical Archive API
 * - Jeśli daty są bieżące lub brak zakresu, używa 7-dniowego Forecast API
 */
export async function fetchSolarRadiationOpenMeteo({
  latitude = 52.23,
  longitude = 21.01,
  startDate,
  endDate
} = {}) {
  try {
    let url;
    const now = new Date();
    const eightyDaysAgo = new Date(now.getTime() - 80 * 24 * 3600 * 1000);

    if (startDate && new Date(startDate) < eightyDaysAgo) {
      // Archiwum historyczne dla profili archiwalnych OSD
      const safeEndDate = endDate || startDate;
      url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${safeEndDate}&hourly=shortwave_radiation_instant,direct_normal_irradiance,temperature_2m&timezone=auto`;
    } else if (startDate && endDate) {
      // Bieżący zakres
      url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&hourly=shortwave_radiation_instant,direct_normal_irradiance,temperature_2m&timezone=auto`;
    } else {
      // Domyślna bieżąca prognoza (7 dni)
      url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=shortwave_radiation_instant,direct_normal_irradiance,temperature_2m&timezone=auto`;
    }

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Open-Meteo HTTP error: ${resp.status}`);
    }
    const data = await resp.json();
    if (data.error) {
      throw new Error(data.reason || 'Open-Meteo API error');
    }
    return {
      success: true,
      data: data.hourly
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Generuje kompletny profil generacji PV dla zbioru punktów czasowych OSD
 * @param {Array} points - punkty czasowe z profilu OSD
 * @param {Object} pvConfig - konfiguracja modułu PV
 */
export function generatePvProfileSeries(points, pvConfig = {}) {
  const {
    pvMode = PV_MODES.SIMULATION_PURE,
    pvCapacityKwp = 100,
    existingPvKwp = 0,
    expansionPvKwp = 0,
    orientation = 'south',
    region = 'central',
    tiltDeg = 35,
    enableOnlineWeather = false,
    onlineWeatherData = null,
    weatherConfidencePct = 100 // Dokładność prognozy (0 - 100%)
  } = pvConfig;

  const len = points.length;
  const actualGenSeries = new Float32Array(len);
  const forecastGenSeries = new Float32Array(len);
  const errorMargin = Math.max(0, Math.min(100, weatherConfidencePct)) / 100;

  // Indeksowanie danych pogodowych Open-Meteo (jeśli aktywne)
  const weatherMap = new Map();
  if (enableOnlineWeather && onlineWeatherData && Array.isArray(onlineWeatherData.time)) {
    const times = onlineWeatherData.time;
    const rad = onlineWeatherData.shortwave_radiation_instant || onlineWeatherData.direct_normal_irradiance || [];
    const temps = onlineWeatherData.temperature_2m || [];
    for (let j = 0; j < times.length; j++) {
      // Klucz w formacie YYYY-MM-DDTHH
      const tKey = times[j].slice(0, 13);
      weatherMap.set(tKey, {
        irradianceWm2: rad[j] || 0,
        tempC: temps[j] !== undefined ? temps[j] : 20
      });
    }
  }

  for (let i = 0; i < len; i++) {
    const pt = points[i];
    const date = pt.date;
    let actualKw = 0;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const localHourKey = `${y}-${m}-${d}T${h}`;

    switch (pvMode) {
      case PV_MODES.CLIENT_ACTUAL: {
        // Używamy zmierzonej generacji oddanej z pliku OSD, z fallbackiem analitycznym jeśli plik nie zawierał kolumny eksportu
        const measured = Math.max(0, pt.exportKw || pt.pvActualKw || pt.exportVal || pt.exportKwh || 0);
        if (measured === 0 && existingPvKwp > 0) {
          actualKw = calculateAnalyticalPvKw(date, existingPvKwp, { orientation, region, tiltDeg });
        } else {
          actualKw = measured;
        }
        break;
      }
      case PV_MODES.CLIENT_PLUS_EXPANSION: {
        // Dane klienta z OSD + nowa symulowana rozbudowa
        let baseActual = Math.max(0, pt.exportKw || pt.pvActualKw || pt.exportVal || pt.exportKwh || 0);
        if (baseActual === 0 && existingPvKwp > 0) {
          baseActual = calculateAnalyticalPvKw(date, existingPvKwp, { orientation, region, tiltDeg });
        }
        let addedSim = 0;
        if (enableOnlineWeather && weatherMap.size > 0) {
          const w = weatherMap.get(localHourKey) || weatherMap.get(date.toISOString().slice(0, 13));
          if (w) {
            const radRatio = Math.min(1.2, w.irradianceWm2 / 1000);
            const tempDerat = 1 - 0.0035 * Math.max(0, w.tempC - 25);
            const orientFactor = orientation === 'east-west' ? 0.90 : 1.0;
            addedSim = expansionPvKwp * radRatio * orientFactor * tempDerat * 0.85;
          } else {
            addedSim = calculateAnalyticalPvKw(date, expansionPvKwp, { orientation, region, tiltDeg });
          }
        } else {
          addedSim = calculateAnalyticalPvKw(date, expansionPvKwp, { orientation, region, tiltDeg });
        }
        actualKw = baseActual + addedSim;
        break;
      }
      case PV_MODES.SIMULATION_PURE:
      default: {
        const capacity = pvCapacityKwp > 0 ? pvCapacityKwp : (existingPvKwp + expansionPvKwp);
        if (enableOnlineWeather && weatherMap.size > 0) {
          const w = weatherMap.get(localHourKey) || weatherMap.get(date.toISOString().slice(0, 13));
          if (w) {
            const radRatio = Math.min(1.2, w.irradianceWm2 / 1000);
            const tempDerat = 1 - 0.0035 * Math.max(0, w.tempC - 25);
            const orientFactor = orientation === 'east-west' ? 0.90 : 1.0;
            actualKw = capacity * radRatio * orientFactor * tempDerat * 0.85;
          } else {
            actualKw = calculateAnalyticalPvKw(date, capacity, { orientation, region, tiltDeg });
          }
        } else {
          actualKw = calculateAnalyticalPvKw(date, capacity, { orientation, region, tiltDeg });
        }
        break;
      }
    }

    actualGenSeries[i] = Number(actualKw.toFixed(2));

    // Prognoza używana przez dyspozytor z uwzględnieniem zadanego błędu prognozy pogody
    const noise = (Math.sin(i * 0.17) * 0.35) * (1 - errorMargin);
    const forecastKw = Math.max(0, actualKw * (1 + noise));
    forecastGenSeries[i] = Number(forecastKw.toFixed(2));
  }

  return {
    actualGenSeries,
    forecastGenSeries
  };
}
