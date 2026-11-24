/**
 * PowerKeeper Analyst - Legacy Adapter / Facade
 * 
 * Re-exports the unified 5-module engine from `../engine/index.js`:
 * - bessConfig.js (Hardware specs & presets 12.5 kWh)
 * - pvPlantEngine.js (PV generation, 3 modes, Open-Meteo)
 * - bessDispatchEngine.js (Look-Ahead 24h & priority dispatch)
 * - tariffOsdEngine.js (OSD 10x penalties & URE Opłata Mocowa 2026 K1-K4)
 * - financialEngine.js (ROI >= 1.0 yr, LCOS, 10-year cash flow)
 * - osdParser.js (15-min / 1h OSD CSV parsing & demo profiles)
 */

export * from '../engine/index.js';
