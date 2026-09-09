/**
 * Predictive Engine - Strict Physics Correlations, EN 50160 Standards & EMA Filtering
 */

class PredictiveEngine {
  constructor() {
    this.deviceStates = {}; 
    this.emaMemory = {};   // Exponential Moving Average state memory for RUL
    this.alphaFilter = 0.15; // Low-pass filter smoothing coefficient
    
    // Criticality weights for Weighted Average Plant Health
    this.deviceWeights = {
      '421': 2.5,   // Main Injection Press (Critical Primary Machine)
      '428': 1.5,   // Conveyor
      '121': 2.0,   // Cooling Tower Pump
      '443': 2.0,   // CNC Machining Center
      'ambalaj_A': 1.2,
      'ambalaj_B': 1.2,
      '307': 1.8,   // Compressor
      '301': 1.5,   // Mixer
      '352': 1.8,   // Heat Treatment Furnace
      'P414': 1.0,  // Feed Pump
      'P403': 1.0   // Vacuum Pump
    };
  }

  /**
   * Process raw SCADA metrics snapshot into predictive insights
   */
  processSnapshot(rawTelemetry, statusMap = {}) {
    const devices = {};
    const globalSummary = {
      totalDevices: 0,
      healthyCount: 0,
      warningCount: 0,
      criticalCount: 0,
      plantHealthIndex: 100,
      totalActivePowerKw: 0,
      totalIdlePowerKw: 0,
      hourlyIdleLossTl: 0,
      projected24hIdleLossTl: 0,
      gridStabilityIndex: 100,
      activeAlerts: [],
      stateDistribution: { LOAD: 0, IDLE: 0, OFF: 0 }
    };

    const pathKeys = Object.keys(rawTelemetry);
    const deviceIds = new Set();

    pathKeys.forEach(unsPath => {
      const parts = unsPath.split('/');
      if (parts.length >= 6) {
        const deviceId = parts[parts.length - 2];
        deviceIds.add(deviceId);
      }
    });

    let cumulativeGridStability = 0;
    let gridSampleCount = 0;
    let weightedHealthSum = 0;
    let totalWeightSum = 0;

    deviceIds.forEach(deviceId => {
      const deviceMetrics = this._extractDeviceMetrics(deviceId, rawTelemetry);
      const statusEntry = this._findStatusEntry(deviceId, statusMap);
      
      const analysis = this.analyzeDevice(deviceId, deviceMetrics, statusEntry);
      devices[deviceId] = analysis;

      // 1. Weighted Average Plant Health Accumulation
      const weight = this.deviceWeights[deviceId] || 1.0;
      weightedHealthSum += (analysis.healthScore * weight);
      totalWeightSum += weight;

      // Fleet Counters
      globalSummary.totalDevices++;
      if (analysis.healthScore >= 80) globalSummary.healthyCount++;
      else if (analysis.healthScore >= 50) globalSummary.warningCount++;
      else globalSummary.criticalCount++;

      globalSummary.totalActivePowerKw += (analysis.w / 1000);
      if (analysis.state === 'IDLE') {
        globalSummary.totalIdlePowerKw += (analysis.w / 1000);
      }
      globalSummary.stateDistribution[analysis.state]++;

      // Grid Stability Accumulation
      cumulativeGridStability += analysis.gridStabilityScore;
      gridSampleCount++;

      if (analysis.alerts && analysis.alerts.length > 0) {
        analysis.alerts.forEach(alert => {
          globalSummary.activeAlerts.push({
            deviceId,
            deviceName: analysis.deviceName,
            ...alert
          });
        });
      }
    });

    // 1. Plant Health Index: H_fabrika = sum(w_i * H_i) / sum(w_i) clamped [0, 100]
    if (totalWeightSum > 0) {
      globalSummary.plantHealthIndex = Math.max(0, Math.min(100, Math.round(weightedHealthSum / totalWeightSum)));
    }

    // 5. Idle Financial Loss (Dimensional Analysis: (W_idle/1000) * delta_t * Rate)
    globalSummary.hourlyIdleLossTl = globalSummary.totalIdlePowerKw * CONFIG.COST_PER_KWH;
    globalSummary.projected24hIdleLossTl = globalSummary.hourlyIdleLossTl * 24;

    // 3. Overall Grid Stability Index (EN 50160 Normalized)
    if (gridSampleCount > 0) {
      globalSummary.gridStabilityIndex = Math.max(0, Math.min(100, Math.round(cumulativeGridStability / gridSampleCount)));
    }

    this.deviceStates = devices;
    return { devices, summary: globalSummary };
  }

  /**
   * Analyze individual device telemetry using strict mathematical formulas & guard clauses
   */
  analyzeDevice(deviceId, metrics, statusEntry = {}) {
    // Null-Safe Telemetry Inputs
    const v = (metrics.v !== undefined && metrics.v !== null && !isNaN(metrics.v)) ? parseFloat(metrics.v) : CONFIG.BASELINE.VOLTAGE;
    const a = (metrics.a !== undefined && metrics.a !== null && !isNaN(metrics.a)) ? Math.max(0, parseFloat(metrics.a)) : 0;
    const w = (metrics.w !== undefined && metrics.w !== null && !isNaN(metrics.w)) ? Math.max(0, parseFloat(metrics.w)) : 0;
    const pf = (metrics.pf !== undefined && metrics.pf !== null && !isNaN(metrics.pf)) ? Math.max(0, Math.min(1.0, parseFloat(metrics.pf))) : CONFIG.BASELINE.IDEAL_PF;
    const hz = (metrics.hz !== undefined && metrics.hz !== null && !isNaN(metrics.hz)) ? parseFloat(metrics.hz) : CONFIG.BASELINE.FREQUENCY;
    const pzemFail = metrics.pzem_fail === 1 || metrics.pzem_fail === true;
    const nfcFail = metrics.nfc_fail === 1 || metrics.nfc_fail === true;
    const stability = statusEntry.stability || 'high';
    const status = statusEntry.status || (a > 0 || w > 0 ? 'online' : 'offline');

    const deviceName = CONFIG.FRIENDLY_NAMES[deviceId] || `Cihaz ${deviceId}`;

    // Operational State Classifier
    let state = 'OFF';
    if (a >= CONFIG.BASELINE.MIN_IDLE_CURRENT || w > 50) {
      if (pf < CONFIG.BASELINE.IDLE_PF_THRESHOLD) {
        state = 'IDLE'; // Unproductive Idle Load
      } else {
        state = 'LOAD'; // Productive Value-Add Work
      }
    }

    // =========================================================================
    // 2. CİHAZ SAĞLIK SKORU FORMÜLÜ (%)
    // Ceza_pf = 100 * max(0, 0.85 - cos_phi)
    // H_cihaz = max(0, min(100, 100 - (Ceza_pf + Toplam_Cezalar)))
    // =========================================================================
    let totalPenalties = 0;
    const alerts = [];

    const targetCosPhi = 0.85;
    if (pf < targetCosPhi && a > CONFIG.BASELINE.MIN_IDLE_CURRENT) {
      const pfPenalty = 100 * (targetCosPhi - pf);
      totalPenalties += pfPenalty;

      alerts.push({
        level: 'warning',
        title: 'Mekanik Sürtünme & Motor Yıpranması Uyarısı',
        cause: `Güç Faktörünün (Cos φ: ${pf.toFixed(2)}) DÜŞMESİNDEN (Hedef 0.85 altı) ve Akımın (${a.toFixed(2)}A) ARTMA SÜRECİNDEN kaynaklı ceza (-${pfPenalty.toFixed(1)} Puan).`,
        solution: '💡 Çözüm Önerisi: Motor rulmanlarını yağlayın/gresleyin, eksenel hizalamayı ve kayış gerginliğini kontrol edin.'
      });
    }

    if (pzemFail) {
      totalPenalties += 35;
      alerts.push({
        level: 'critical',
        title: 'Ölçüm Modülü Arızası (PZEM Fail)',
        cause: 'Sensör UART haberleşmesinin KESİLMESİNDEN kaynaklı donanım cezası (-35.0 Puan).',
        solution: '💡 Çözüm Önerisi: Pano içindeki PZEM kartının 5V beslemesini ve RS485/UART veri kablosunu kontrol edin; modülü yenisiyle değiştirin.'
      });
    }

    if (nfcFail) {
      totalPenalties += 15;
      alerts.push({
        level: 'warning',
        title: 'Operatör NFC Kart Okuyucu Uyarısı (NFC Fail)',
        cause: 'NFC okuyucu kart hattındaki titreşimden KOPMASINDAN veya kilitlenmesinden kaynaklı ceza (-15.0 Puan).',
        solution: '💡 Çözüm Önerisi: Panel kablosunun sokete oturduğunu doğrulayın ve modül reset butonuna basarak donanımı yeniden başlatın.'
      });
    }

    if (stability === 'low') {
      totalPenalties += 20;
      alerts.push({
        level: 'warning',
        title: 'Haberleşme Kararsızlığı (Low Stability)',
        cause: 'Ağ paket kaybının ARTMASINDAN kaynaklı ceza (-20.0 Puan).',
        solution: '💡 Çözüm Önerisi: Saha IoT Gateway anten yönünü kontrol edin veya sinyal güçlendirici (Repeater) ekleyin.'
      });
    }

    if (state === 'IDLE') {
      alerts.push({
        level: 'warning',
        title: 'Gereksiz Boşta Çalışma Enerji İsrafı',
        cause: `Makinenin iş yapmadığı halde motorunun dönmeye devam etmesinden (Cos φ: ${pf.toFixed(2)} DÜŞÜK) kaynaklı maliyet.`,
        solution: `💡 Çözüm Önerisi: Otomatik Standby/Uyku modunu devreye sokun. Anlık Kayıp: ₺${((w/1000)*CONFIG.COST_PER_KWH).toFixed(2)}/saat.`
      });
    }

    // Clamped Health Score [0, 100]
    const healthScore = Math.max(0, Math.min(100, Math.round(100 - totalPenalties)));

    // =========================================================================
    // 4. KALAN FAYDALI ÖMÜR (RUL SAAT) - LOW-PASS EXPONENTIAL FILTERING (EMA)
    // H_filtrelenmis(t) = alpha * H_cihaz(t) + (1 - alpha) * H_filtrelenmis(t-1)
    // RUL = Max_Omur * (H_filtrelenmis / 100)^2
    // =========================================================================
    if (this.emaMemory[deviceId] === undefined) {
      this.emaMemory[deviceId] = healthScore;
    } else {
      this.emaMemory[deviceId] = (this.alphaFilter * healthScore) + ((1 - this.alphaFilter) * this.emaMemory[deviceId]);
    }
    const filteredHealth = this.emaMemory[deviceId];
    const maxLifeHours = 2160; // 90 days operating window
    const degradationRatio = Math.pow(filteredHealth / 100, 2);
    const rulHours = Math.max(0, Math.min(maxLifeHours, Math.round(maxLifeHours * degradationRatio)));

    // =========================================================================
    // 3. ŞEBEKE KARARLILIĞI SKORU (%) - EN 50160 NORMALIZATION
    // Hata_V = |V - 230| / 23 (Nominal +-23V %10)
    // Hata_Hz = |Hz - 50| / 0.5 (Nominal +-0.5Hz %1)
    // Sapma_Skoru = (0.70 * Hata_V + 0.30 * Hata_Hz) * 100
    // S_sebeke = max(0, min(100, 100 - Sapma_Skoru))
    // =========================================================================
    let gridStabilityScore = 100;
    let gridStressPercent = 0;

    if (v <= 0) {
      gridStabilityScore = 0;
      gridStressPercent = 100;
    } else {
      const hataV = Math.abs(v - 230.0) / 23.0;
      const hataHz = Math.abs(hz - 50.0) / 0.5;
      const sapmaSkoru = (0.70 * hataV + 0.30 * hataHz) * 100;
      gridStabilityScore = Math.max(0, Math.min(100, Math.round(100 - sapmaSkoru)));
      gridStressPercent = Math.max(0, Math.min(100, Math.round(sapmaSkoru)));
    }

    // =========================================================================
    // 5. BOŞTA ÇALIŞMA KAYBI (₺/SAAT) - DIMENSIONAL ANALYSIS
    // Enerji_Tuketimi_kWh = (W_bosta / 1000) * 1.0 saat
    // Kayip_TL_per_hour = Enerji_Tuketimi_kWh * Rate
    // =========================================================================
    const hourlyIdleLoss = state === 'IDLE' ? (w / 1000) * CONFIG.COST_PER_KWH : 0;

    return {
      deviceId,
      deviceName,
      v,
      a,
      w,
      pf,
      hz,
      pzemFail,
      nfcFail,
      status,
      stability,
      state,
      healthScore,
      filteredHealth,
      rulHours,
      gridStabilityScore,
      gridStress: gridStressPercent,
      hourlyIdleLoss,
      alerts
    };
  }

  _extractDeviceMetrics(deviceId, rawTelemetry) {
    const metrics = {};
    const suffixList = ['v', 'a', 'w', 'pf', 'hz', 'kwh', 'pzem_fail', 'nfc_fail', 'e_stop'];
    
    suffixList.forEach(sfx => {
      for (const [path, item] of Object.entries(rawTelemetry)) {
        if (path.endsWith(`/${deviceId}/${sfx}`)) {
          metrics[sfx] = item.value;
          break;
        }
      }
    });

    return metrics;
  }

  _findStatusEntry(deviceId, statusMap) {
    for (const [path, entry] of Object.entries(statusMap)) {
      if (path.endsWith(`/${deviceId}`)) {
        return entry;
      }
    }
    return {};
  }
}

// Global singleton instance
window.predictiveEngine = new PredictiveEngine();
