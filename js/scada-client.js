/**
 * SCADA Client - Real-time WebSocket & REST API Integration
 */

class ScadaClient {
  constructor() {
    this.telemetryStore = {}; // Key: uns_path, Value: telemetry object
    this.statusMap = {};       // Key: node/device path, Value: status object
    this.mapping = {};         // UNS mapping
    this.isConnected = false;
    this.ws = null;
    this.heartbeatTimer = null;
    this.listeners = [];
  }

  /**
   * Register a listener for real-time state updates
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners() {
    const processed = window.predictiveEngine.processSnapshot(this.telemetryStore, this.statusMap);
    this.listeners.forEach(cb => cb(processed, this.telemetryStore, this.statusMap));
  }

  /**
   * Initialize API mapping and connect WebSocket
   */
  async init() {
    console.log('[SCADA Client] Initializing connections...');
    await this.fetchMapping();
    await this.fetchStatus();
    this.connectWebSocket();

    // Periodic HTTP fallback polling for node status
    setInterval(() => this.fetchStatus(), CONFIG.POLL_STATUS_MS);
  }

  async fetchMapping() {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/mapping`);
      if (res.ok) {
        this.mapping = await res.json();
        console.log('[SCADA Client] UNS Mapping loaded:', Object.keys(this.mapping).length, 'entries');
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
      console.warn('[SCADA Client] Failed to fetch status:', e);
    }
  }

  connectWebSocket() {
    console.log('[SCADA Client] Connecting WebSocket to:', CONFIG.WS_URL);
    try {
      this.ws = new WebSocket(CONFIG.WS_URL);

      this.ws.onopen = () => {
        console.log('[SCADA Client] WebSocket connected successfully');
        this.isConnected = true;
        this._updateConnectionIndicator(true);
        this._resetHeartbeat();
      };

      this.ws.onclose = () => {
        console.warn('[SCADA Client] WebSocket disconnected. Reconnecting in 3s...');
        this.isConnected = false;
        this._updateConnectionIndicator(false);
        clearTimeout(this.heartbeatTimer);
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = (err) => {
        console.error('[SCADA Client] WebSocket error:', err);
      };

      this.ws.onmessage = (event) => {
        this._resetHeartbeat();
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'metrics' && payload.data) {
            // Update local telemetry store with latest metrics
            Object.assign(this.telemetryStore, payload.data);
            this.notifyListeners();
          }
        } catch (e) {
          console.error('[SCADA Client] JSON parse error:', e);
        }
      };
    } catch (e) {
      console.error('[SCADA Client] WebSocket initialization failed:', e);
      setTimeout(() => this.connectWebSocket(), 5000);
    }
  }

  _resetHeartbeat() {
    clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      console.warn('[SCADA Client] WS Heartbeat timeout. Closing socket for reconnect...');
      if (this.ws) this.ws.close();
    }, CONFIG.WS_HEARTBEAT_MS);
  }

  _updateConnectionIndicator(online) {
    const el = document.getElementById('scada-ws-status');
    if (el) {
      el.className = online ? 'status-badge online' : 'status-badge offline';
      el.innerHTML = online 
        ? '<span class="pulse-dot"></span> SCADA Canlı Yayın Aktif'
        : '<span class="pulse-dot red"></span> SCADA Bağlantısı Kesildi';
    }
  }
}

// Global singleton instance
window.scadaClient = new ScadaClient();
