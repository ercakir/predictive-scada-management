/**
 * SCADA Client - Real-time WebSocket, REST API & Automatic GitHub Pages Demo Mode
 */

class ScadaClient {
  constructor() {
    this.telemetryStore = {}; 
    this.statusMap = {};       
    this.mapping = {};         
    this.isConnected = false;
    this.isDemoMode = false;
    this.ws = null;
    this.heartbeatTimer = null;
    this.demoTimer = null;
    this.listeners = [];
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners() {
    const processed = window.predictiveEngine.processSnapshot(this.telemetryStore, this.statusMap);
    this.listeners.forEach(cb => cb(processed, this.telemetryStore, this.statusMap));
  }

  async init() {
    console.log('[SCADA Client] Initializing connections...');

    // Detect if running on GitHub Pages (github.io)
    if (window.location.hostname.includes('github.io')) {
      console.log('[SCADA Client] GitHub Pages environment detected. Activating Live Demo Simulation Mode...');
      this.enableDemoMode();
      return;
    }

    await this.fetchMapping();
    await this.fetchStatus();
    this.connectWebSocket();

    setInterval(() => this.fetchStatus(), CONFIG.POLL_STATUS_MS);
  }

  async fetchMapping() {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/mapping`);
      if (res.ok) {
        this.mapping = await res.json();
      }
    } catch (e) {
      console.warn('[SCADA Client] Failed to fetch UNS mapping:', e);
    }
  }

  async fetchStatus() {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/status`);
      if (res.ok) {
        this.statusMap = await res.json();
        this.notifyListeners();
      }
    } catch (e) {
      console.warn('[SCADA Client] SCADA backend unreachable. Enabling fallback demo mode...');
      if (!this.isConnected && !this.isDemoMode) {
        this.enableDemoMode();
      }
    }
  }

  connectWebSocket() {
    console.log('[SCADA Client] Connecting WebSocket to:', CONFIG.WS_URL);
    try {
      this.ws = new WebSocket(CONFIG.WS_URL);

      this.ws.onopen = () => {
        console.log('[SCADA Client] WebSocket connected successfully');
        this.isConnected = true;
        this.isDemoMode = false;
        clearInterval(this.demoTimer);
        this._updateConnectionIndicator('online', 'SCADA Canlı Yayın Aktif');
        this._resetHeartbeat();
      };

      this.ws.onclose = () => {
        console.warn('[SCADA Client] WebSocket disconnected. Reconnecting in 3s...');
        this.isConnected = false;
        this._updateConnectionIndicator('offline', 'SCADA Yeniden Bağlanıyor...');
        clearTimeout(this.heartbeatTimer);
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = () => {
        if (!this.isDemoMode) {
          this.enableDemoMode();
        }
      };

      this.ws.onmessage = (event) => {
        this._resetHeartbeat();
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'metrics' && payload.data) {
            Object.assign(this.telemetryStore, payload.data);
            this.notifyListeners();
          }
        } catch (e) {
          console.error('[SCADA Client] JSON parse error:', e);
        }
      };
    } catch (e) {
      this.enableDemoMode();
    }
  }

  /**
   * Live Demo Simulation Mode for GitHub Pages Visitors
   */
  enableDemoMode() {
    if (this.isDemoMode) return;
    this.isDemoMode = true;
    console.log('[SCADA Client] Live Demo Simulation Active');
    
    this._updateConnectionIndicator('demo', 'Canlı Demo Simülasyonu Aktif');

    // Populate initial demo telemetry
    const deviceIds = ['421', '428', '121', '443', '307', '301', '352', 'P414', 'P403', 'ambalaj_A', 'ambalaj_B'];
    
    const updateDemoPackets = () => {
      const now = new Date().toISOString();
      const mockData = {};

      deviceIds.forEach(id => {
        const isProblematic = (id === '421' || id === 'P414');
        const v = 230.0 + (Math.sin(Date.now() / 3000) * 8.0) + (Math.random() * 2 - 1);
        const hz = 50.0 + (Math.cos(Date.now() / 4000) * 0.3);
        const a = isProblematic ? 14.5 + Math.random() * 2 : 8.0 + Math.random();
        const pf = isProblematic ? 0.58 + Math.sin(Date.now() / 2000) * 0.05 : 0.88 + Math.random() * 0.04;
        const w = v * a * pf;

        mockData[`mndV1.0/consumeIQ/factory1/node_1/${id}/v`] = { value: v, time: now };
        mockData[`mndV1.0/consumeIQ/factory1/node_1/${id}/a`] = { value: a, time: now };
        mockData[`mndV1.0/consumeIQ/factory1/node_1/${id}/w`] = { value: w, time: now };
        mockData[`mndV1.0/consumeIQ/factory1/node_1/${id}/pf`] = { value: pf, time: now };
        mockData[`mndV1.0/consumeIQ/factory1/node_1/${id}/hz`] = { value: hz, time: now };
        mockData[`mndV1.0/consumeIQ/factory1/node_1/${id}/pzem_fail`] = { value: id === 'P414' ? 1 : 0, time: now };
        mockData[`mndV1.0/consumeIQ/factory1/node_1/${id}/nfc_fail`] = { value: id === '421' ? 1 : 0, time: now };
      });

      Object.assign(this.telemetryStore, mockData);
      this.notifyListeners();
    };

    updateDemoPackets();
    this.demoTimer = setInterval(updateDemoPackets, 1500);
  }

  _resetHeartbeat() {
    clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      if (this.ws) this.ws.close();
    }, CONFIG.WS_HEARTBEAT_MS);
  }

  _updateConnectionIndicator(type, labelText) {
    const el = document.getElementById('scada-ws-status');
    if (!el) return;

    if (type === 'online') {
      el.className = 'status-badge online';
      el.innerHTML = `<span class="pulse-dot"></span> ${labelText}`;
    } else if (type === 'demo') {
      el.className = 'status-badge online';
      el.style.borderColor = 'rgba(6, 182, 212, 0.4)';
      el.style.color = '#06b6d4';
      el.innerHTML = `<span class="pulse-dot" style="background-color:#06b6d4;"></span> ${labelText}`;
    } else {
      el.className = 'status-badge offline';
      el.innerHTML = `<span class="pulse-dot red"></span> ${labelText}`;
    }
  }
}

// Global singleton instance
window.scadaClient = new ScadaClient();
