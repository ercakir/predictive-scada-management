/**
 * Main Application Logic & UI Router - Fixed Layout & Collapsible Solution Drawers
 */

// Track user expanded solution drawers so live updates don't close them or shift layout
const expandedSolutionDrawers = new Set();

document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] Starting Predictive SCADA Operations Center...');

  window.chartsManager.initCharts();
  setupTabNavigation();
  window.scadaClient.subscribe(onTelemetryUpdate);
  window.scadaClient.init();
});

/**
 * Handle Tab Switching Navigation
 */
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.nav-tab');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabPanels.forEach(panel => {
        if (panel.id === targetTab) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });
}

/**
 * Primary Real-Time Telemetry Update Callback
 */
function onTelemetryUpdate(data) {
  const { devices, summary } = data;

  updateExecutiveKPIs(summary);
  window.chartsManager.updateRealtimeCharts(summary, devices);
  renderPredictiveMaintenanceModule(devices);
  renderPredictiveEnergyModule(devices, summary);
  renderGridAndTopologyModule(devices, summary);
  updateLiveTelemetryTicker(devices);
}

/**
 * Update Top Bar & Overview Cards
 */
function updateExecutiveKPIs(summary) {
  const healthEl = document.getElementById('kpi-plant-health');
  if (healthEl) healthEl.textContent = `${summary.plantHealthIndex}%`;

  const gridEl = document.getElementById('kpi-grid-stability');
  if (gridEl) gridEl.textContent = `${summary.gridStabilityIndex}%`;

  const costEl = document.getElementById('kpi-idle-cost-24h');
  if (costEl) costEl.textContent = `₺${summary.projected24hIdleLossTl.toFixed(2)}`;

  const alertCountEl = document.getElementById('kpi-active-alerts-count');
  if (alertCountEl) alertCountEl.textContent = summary.activeAlerts.length;

  const loadCountEl = document.getElementById('state-count-load');
  const idleCountEl = document.getElementById('state-count-idle');
  const offCountEl = document.getElementById('state-count-off');

  if (loadCountEl) loadCountEl.textContent = summary.stateDistribution.LOAD;
  if (idleCountEl) idleCountEl.textContent = summary.stateDistribution.IDLE;
  if (offCountEl) offCountEl.textContent = summary.stateDistribution.OFF;
}

/**
 * Module 1: Render Predictive Maintenance Cards
 * FIXED ORDER & COLLAPSIBLE BUTTON SOLUTION DRAWERS (Prevents Layout Shifting)
 */
function renderPredictiveMaintenanceModule(devices) {
  const container = document.getElementById('maintenance-device-grid');
  if (!container) return;

  // SORT STABLE BY DEVICE ID so cards NEVER change position on live telemetry ticks
  const deviceList = Object.values(devices).sort((a, b) => a.deviceId.localeCompare(b.deviceId, undefined, {numeric: true}));
  
  if (deviceList.length === 0) {
    container.innerHTML = '<div class="glass-card placeholder-text">SCADA verisi bekleniyor...</div>';
    return;
  }

  container.innerHTML = deviceList.map(d => {
    const healthClass = d.healthScore >= 80 ? 'emerald' : d.healthScore >= 50 ? 'amber' : 'rose';
    const pfStatus = d.pf >= 0.85 ? 'normal' : 'warning';
    const isExpanded = expandedSolutionDrawers.has(d.deviceId);
    const hasAlerts = d.alerts && d.alerts.length > 0;
    
    return `
      <div class="glass-card device-health-card border-${healthClass}" id="card-device-${d.deviceId}">
        <div class="card-header">
          <div>
            <h3 class="device-name">${d.deviceName}</h3>
            <span class="device-id-code">ID: ${d.deviceId} | ${d.status.toUpperCase()}</span>
          </div>
          <div class="health-score-badge ${healthClass}">
            ${d.healthScore}<small>% Sağlık</small>
          </div>
        </div>

        <div class="card-body">
          <div class="metric-row">
            <span class="metric-label">Kalan Faydalı Ömür (RUL):</span>
            <span class="metric-value font-bold">${d.rulHours} Saat (~${Math.round(d.rulHours/24)} Gün)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill fill-${healthClass}" style="width: ${d.healthScore}%"></div>
          </div>

          <div class="grid-2-col mt-3">
            <div class="sub-metric">
              <span class="sub-label">Aktif Yük (W)</span>
              <span class="sub-val">${d.w.toFixed(1)} W</span>
            </div>
            <div class="sub-metric">
              <span class="sub-label">Güç Faktörü (Cos φ)</span>
              <span class="sub-val ${pfStatus}">${d.pf.toFixed(2)}</span>
            </div>
            <div class="sub-metric">
              <span class="sub-label">Çekilen Akım</span>
              <span class="sub-val">${d.a.toFixed(2)} A</span>
            </div>
            <div class="sub-metric">
              <span class="sub-label">Şebeke Voltajı</span>
              <span class="sub-val">${d.v.toFixed(1)} V</span>
            </div>
          </div>

          <div class="fault-tags mt-3">
            <span class="tag ${d.pzemFail ? 'tag-danger' : 'tag-ok'}">
              PZEM Sensör: ${d.pzemFail ? 'ARIZA' : 'Normal'}
            </span>
            <span class="tag ${d.nfcFail ? 'tag-warn' : 'tag-ok'}">
              NFC Modülü: ${d.nfcFail ? 'Uyarı (Kart Yok)' : 'Normal'}
            </span>
            <span class="tag ${d.stability === 'low' ? 'tag-warn' : 'tag-ok'}">
              Kararlılık: ${d.stability.toUpperCase()}
            </span>
          </div>

          <!-- Solution Accordion Toggle Button -->
          ${hasAlerts ? `
            <div class="mt-3">
              <button class="btn btn-solution-toggle" onclick="toggleSolutionDrawer('${d.deviceId}')">
                🔍 Kök Neden & Çözüm Detayı ${isExpanded ? '▲' : '▼'}
              </button>
              
              <div id="solution-drawer-${d.deviceId}" class="solution-drawer ${isExpanded ? 'open' : ''}">
                <div class="alerts-box mt-2">
                  ${d.alerts.map(a => `
                    <div class="alert-item ${a.level}">
                      <div class="font-bold">⚠️ ${a.title}</div>
                      <div class="alert-cause text-sub mt-1">📌 <strong>Sebep / Orantı:</strong> ${a.cause}</div>
                      <div class="alert-solution text-emerald mt-1">${a.solution}</div>
                    </div>
                  `).join('<hr class="alert-divider">')}
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="card-footer mt-3">
          <button class="btn btn-outline" onclick="openMaintenanceModal('${d.deviceId}', '${d.deviceName}')">
            🔧 Çözüm İçin İş Emri Oluştur
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Toggle Collapsible Solution Drawer
 */
window.toggleSolutionDrawer = function(deviceId) {
  if (expandedSolutionDrawers.has(deviceId)) {
    expandedSolutionDrawers.delete(deviceId);
  } else {
    expandedSolutionDrawers.add(deviceId);
  }

  const drawer = document.getElementById(`solution-drawer-${deviceId}`);
  if (drawer) {
    drawer.classList.toggle('open');
  }

  // Refresh view to update button toggle arrows smoothly
  if (window.scadaClient && window.scadaClient.telemetryStore) {
    const processed = window.predictiveEngine.processSnapshot(window.scadaClient.telemetryStore, window.scadaClient.statusMap);
    renderPredictiveMaintenanceModule(processed.devices);
  }
};

/**
 * Module 2: Render Predictive Energy & Cost Cards (STABLE SORTED)
 */
function renderPredictiveEnergyModule(devices, summary) {
  const container = document.getElementById('energy-device-list');
  if (!container) return;

  const deviceList = Object.values(devices).sort((a, b) => a.deviceId.localeCompare(b.deviceId, undefined, {numeric: true}));
  
  container.innerHTML = deviceList.map(d => {
    let stateBadge = '';
    if (d.state === 'LOAD') stateBadge = '<span class="badge badge-success">🟢 ÜRETİMDE (YÜKTE)</span>';
    else if (d.state === 'IDLE') stateBadge = '<span class="badge badge-warning">🟡 BOŞTA (ENERJİ İSRAFI)</span>';
    else stateBadge = '<span class="badge badge-secondary">⚪ KAPALI (STANDBY)</span>';

    const hourlyLossText = d.state === 'IDLE' 
      ? `<span class="loss-text">Boşta Kalma Kaybı: ₺${d.hourlyIdleLoss.toFixed(2)}/saat (Cos φ ${d.pf.toFixed(2)} DÜŞÜKLÜĞÜNDEN)</span>`
      : `<span class="ok-text">Boşta İsraf Yok</span>`;

    return `
      <div class="glass-card energy-card mt-2">
        <div class="energy-card-main flex-between">
          <div>
            <h4 class="font-bold">${d.deviceName}</h4>
            <p class="text-sub">Güç: ${d.w.toFixed(0)} W | Akım: ${d.a.toFixed(2)} A | Cos φ: ${d.pf.toFixed(2)}</p>
          </div>
          <div class="text-right">
            ${stateBadge}
            <div class="mt-1">${hourlyLossText}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Module 3: Render Grid Quality & Cascading Line Topology (STABLE SORTED)
 */
function renderGridAndTopologyModule(devices, summary) {
  const gridContainer = document.getElementById('grid-matrix-container');
  if (!gridContainer) return;

  const deviceList = Object.values(devices).sort((a, b) => a.deviceId.localeCompare(b.deviceId, undefined, {numeric: true}));

  gridContainer.innerHTML = deviceList.map(d => {
    const stressClass = d.gridStress > 30 ? 'rose' : d.gridStress > 10 ? 'amber' : 'emerald';
    return `
      <div class="glass-card grid-mini-card border-${stressClass}">
        <div class="flex-between">
          <span class="font-bold">${d.deviceName}</span>
          <span class="badge bg-${stressClass}">${d.gridStress}% Stres</span>
        </div>
        <div class="text-sub mt-2">
          Voltaj: <strong>${d.v.toFixed(1)} V</strong> | Frekans: <strong>${d.hz.toFixed(2)} Hz</strong>
        </div>
        <div class="text-sub mt-1" style="font-size:0.75rem;">
          📌 <strong>Stres Sebebi:</strong> Voltajın 230V Nominal Değerden ${Math.abs(d.v - 230).toFixed(1)}V ${d.v > 230 ? 'YÜKSELMESİNDEN' : 'DÜŞMESİNDEN'} kaynaklı.
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Ticker Bar for Live Telemetry Packets
 */
function updateLiveTelemetryTicker(devices) {
  const ticker = document.getElementById('telemetry-ticker-content');
  if (!ticker) return;

  const sample = Object.values(devices).slice(0, 5);
  ticker.innerHTML = sample.map(d => `
    <span class="ticker-item">
      <strong>${d.deviceName}:</strong> ${d.w.toFixed(0)}W | ${d.v.toFixed(1)}V | Cosφ ${d.pf.toFixed(2)}
    </span>
  `).join(' &nbsp;•&nbsp; ');
}

// Modal helper
window.openMaintenanceModal = function(deviceId, deviceName) {
  alert(`[KESTİRİMCİ İŞ EMRİ]\n\nCihaz: ${deviceName} (${deviceId})\nİşlem: Anomali Çözüm Protokolü Bakım Ekiplerine (Tablet/SCADA) Başarıyla İletildi.`);
};
