# ⚡ Predictive SCADA & Industrial IoT Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Industry-4.0](https://img.shields.io/badge/Industry-4.0-emerald.svg)]()
[![Standard-EN50160](https://img.shields.io/badge/Standard-EN_50160-indigo.svg)]()
[![Real Time-WebSocket](https://img.shields.io/badge/RealTime-WebSocket-cyan.svg)]()

A state-of-the-art **Predictive Maintenance, Energy Analytics & Grid Stability System** designed for Industrial IoT & SCADA environments. This platform ingests real-time telemetry from industrial nodes (over WebSocket and REST APIs), processes physical equations, and predicts equipment failures, energy losses, and grid voltage/frequency stress.

---

## 🌟 Executive Features & Key Modules

### 1. 🛠️ Predictive Maintenance & Health Engine
- **Remaining Useful Life (RUL) Forecasting**: Uses quadratic degradation modeling smoothed with an **Exponential Moving Average (EMA)** low-pass filter to prevent telemetry jitter.
- **Motor & Mechanical Stress Math**: Detects mechanical friction, coil degradation, and bearing wear via Power Factor ($\cos\phi$) penalties when $\cos\phi < 0.85$.
- **Sensor Fault Diagnostics**: Monitors micro-hardware faults (`pzem_fail`, `nfc_fail`, `stability: low`) before catastrophic equipment breakdown.
- **Actionable Solution Accordion**: Provides root causes with proportionality direction (*"caused by DECREASE in Cos φ and INCREASE in Current"*) alongside recommended maintenance protocols.

### 2. ⚡ Predictive Energy & Carbon Loss Management
- **Machine Re-engagement Classifier**: Automatically categorizes machine states:
  - 🟢 **LOAD** ($A > 0.5\text{A}$ & $\cos\phi \ge 0.48$) — Active Productive Value-Add Work
  - 🟡 **IDLE** ($A > 0.5\text{A}$ & $\cos\phi < 0.48$) — Unproductive Energy Loss
  - ⚪ **OFF** ($A \le 0.5\text{A}$) — Standby / Powered Off
- **24-Hour Predictive Energy Forecast**: Time-series forecast chart for plant energy consumption ($kWh$).
- **Live Financial Loss Ticker**: Real-time monetary loss calculation ($\text{₺/hour}$) from idle machinery based on industrial energy rates.

### 3. 🌐 Grid Quality & Cascading Line Risk (EN 50160 Compliance)
- **EN 50160 Voltage & Frequency Normalization**: Tracks nominal $230\text{V} \pm 10\%$ ($\pm 23\text{V}$) and $50.0\text{Hz} \pm 1\%$ ($\pm 0.5\text{Hz}$) grid deviations.
- **Production Line Topology**: Maps inter-machine dependencies (`factory1/node_1`, `factory2/node_2`, `ambalaj_A`, `ambalaj_B`, `machine_443`).

---

## 📐 Mathematical Formulas & Mathematical Engine

| Metric / Indicator | Formula Formulation | Standard / Unit |
| :--- | :--- | :--- |
| **1. Plant Health Index ($H_{\text{plant}}$)** | $$H_{\text{plant}} = \text{clamp}\left(0, 100, \frac{\sum w_i \cdot H_i}{\sum w_i}\right)$$ | Weighted Average ($\%$) |
| **2. Device Health Score ($H_{\text{device}}$)** | $$H_{\text{device}} = \max(0, \min(100, 100 - (\text{Penalty}_{PF} + \text{Hardware Penalties})))$$ | Penalty Model ($\%$) |
| **3. Grid Stability Index ($S_{\text{grid}}$)** | $$S_{\text{grid}} = 100 - \left(0.70 \cdot \frac{\|V - 230\|}{23} + 0.30 \cdot \frac{\|Hz - 50\|}{0.5}\right) \cdot 100$$ | EN 50160 Normalization ($\%$) |
| **4. Remaining Useful Life (RUL)** | $$\text{RUL} = \text{Max\_Life} \cdot \left(\frac{H_{\text{filtered}}(t)}{100}\right)^2 \quad (\text{EMA } \alpha = 0.15)$$ | Quadratic Decay (Hours) |
| **5. Idle Financial Loss** | $$\text{Loss} = \left(\frac{W_{\text{idle}}}{1000}\right) \cdot \Delta t_{\text{hours}} \cdot \text{Rate}_{\text{₺/kWh}}$$ | Dimensional Analysis ($\text{₺/hour}$) |

---

## 🏗️ Project Architecture

```
predictive-scada-app/
├── index.html              # Single Page Application (SPA) container
├── css/
│   └── styles.css          # Dark Glassmorphism Design System
├── js/
│   ├── config.js           # API, WS endpoints & baseline physical thresholds
│   ├── scada-client.js     # Live WebSocket listener & REST API fallback poller
│   ├── predictive-engine.js# Real-time analytics, EN 50160 normalization & RUL filter
│   ├── charts.js           # Real-time Chart.js visualization engine
│   └── app.js              # UI router, stable sorting & collapsible drawers logic
├── kpi_engine.py           # Production-ready Python KPI engine module
├── start_production_server.py # Production HTTP server (0.0.0.0:8088)
└── run_production.bat      # Windows 1-click startup launcher
```

---

## 🚀 Quick Start & Installation

### Option A: Run Local Production Server (Python)
1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/predictive-scada-management.git
   cd predictive-scada-management
   ```
2. Start the production HTTP server:
   ```bash
   python start_production_server.py
   ```
3. Open in browser:
   - Local: `http://localhost:8088`
   - LAN / Network: `http://YOUR_LOCAL_IP:8088`

### Option B: Python KPI Engine Module
You can import the standalone, null-safe `SCADAKPIEngine` Python module directly into your SCADA backend:
```python
from kpi_engine import SCADAKPIEngine

engine = SCADAKPIEngine(default_cost_per_kwh=3.45, alpha_filter=0.15)

# Calculate Device Health Score
health, penalty, reasons = engine.calculate_device_health_score(cos_phi=0.60, pzem_fail=True)
print(f"Device Health: {health}%")

# Calculate EN 50160 Grid Stability
stability = engine.calculate_grid_stability_score(v_actual=245.0, hz_actual=50.2)
print(f"Grid Stability: {stability}%")
```

---

## 👨‍💻 Developer & Author

* **Author:** Arda Erçakır
* **Contact:** ercakirarda02@gmail.com
* **License:** MIT License
