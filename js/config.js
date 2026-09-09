/**
 * Predictive SCADA Management System - Configuration & Baselines
 */

const CONFIG = {
  // SCADA Gateway Endpoints
  API_BASE_URL: 'http://192.168.3.88:8003',
  WS_URL: 'ws://192.168.3.88:8003/ws',
  SCADA_FRONTEND_URL: 'http://192.168.3.88:8080/frontend.html',

  // Electrical Baselines
  BASELINE: {
    VOLTAGE: 230.0,       // Nominal Volts
    VOLTAGE_TOLERANCE: 15.0, // +/- 15V acceptable range
    FREQUENCY: 50.0,      // Nominal Hz
    FREQUENCY_TOLERANCE: 0.5, // +/- 0.5Hz acceptable range
    IDEAL_PF: 0.92,       // Target Power Factor
    IDLE_PF_THRESHOLD: 0.48, // PF below this with Current > 0.5A is IDLE
    MIN_IDLE_CURRENT: 0.5,   // Amps to consider machine powered on
  },

  // Financial & Carbon Factors
  COST_PER_KWH: 3.45,     // ₺ per kWh (Industrial Rate)
  CARBON_PER_KWH: 0.44,   // kg CO2 per kWh

  // Refresh & Buffer Rates
  WS_HEARTBEAT_MS: 10000,
  POLL_STATUS_MS: 10000,
  MAX_HISTORY_POINTS: 30,  // Real-time time series buffer length

  // Device Mapping Overrides / Friendly Names
  FRIENDLY_NAMES: {
    '421': 'Ana Enjeksiyon Presi 421',
    '428': 'Hidrolik Konveyör 428',
    '121': 'Soğutma Kulesi Pompa 121',
    'ambalaj_A': 'Otomatik Ambalaj Hattı A',
    'ambalaj_B': 'Paletleme & Ambalaj B',
    '443': 'CNC İşleme Merkezi 443',
    '307': 'Kompresör Grubu 307',
    '301': 'Karıştırıcı Mikser 301',
    '352': 'Isıl İşlem Fırını 352',
    'P414': 'Besleme Pompası P414',
    'P403': 'Vakum Pompası P403'
  }
};
