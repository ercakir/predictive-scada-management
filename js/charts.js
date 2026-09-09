/**
 * Charts Engine - Real-time Visualizations with Chart.js
 */

class ChartsManager {
  constructor() {
    this.powerChart = null;
    this.energyForecastChart = null;
    this.gridQualityChart = null;
    this.healthDistributionChart = null;
  }

  initCharts() {
    this.initPowerTrendChart();
    this.initEnergyForecastChart();
    this.initGridQualityChart();
    this.initHealthDistributionChart();
  }

  initPowerTrendChart() {
    const ctx = document.getElementById('powerTrendChart');
    if (!ctx) return;

    this.powerChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Aktif Güç (kW)',
            data: [],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: 'Boşta Güç Kaybı (kW)',
            data: [],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            fill: true,
            tension: 0.3,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } }
        },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  initEnergyForecastChart() {
    const ctx = document.getElementById('energyForecastChart');
    if (!ctx) return;

    // Generate baseline 24h labels
    const hours = Array.from({length: 24}, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const actualData = [12, 14, 15, 11, 9, 8, 18, 28, 34, 38, 42, 40];
    const forecastData = [...actualData];
    for (let i = 12; i < 24; i++) {
      forecastData.push(Math.round(35 + Math.sin(i / 2) * 8 + Math.random() * 4));
    }

    this.energyForecastChart = new Chart(ctx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Gerçekleşen Tüketim (kWh)',
            data: actualData,
            backgroundColor: '#06b6d4'
          },
          {
            label: 'Kestirimci Tahmin (kWh)',
            data: forecastData,
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: '#6366f1',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  initGridQualityChart() {
    const ctx = document.getElementById('gridQualityChart');
    if (!ctx) return;

    this.gridQualityChart = new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Şebeke Gerilimi (V)',
            data: [],
            borderColor: '#3b82f6',
            tension: 0.2,
            yAxisID: 'yV'
          },
          {
            label: 'Frekans (Hz)',
            data: [],
            borderColor: '#ec4899',
            borderDash: [5, 5],
            tension: 0.2,
            yAxisID: 'yHz'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          yV: {
            type: 'linear',
            position: 'left',
            min: 200,
            max: 250,
            ticks: { color: '#3b82f6' },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          yHz: {
            type: 'linear',
            position: 'right',
            min: 48,
            max: 52,
            ticks: { color: '#ec4899' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  initHealthDistributionChart() {
    const ctx = document.getElementById('healthDistributionChart');
    if (!ctx) return;

    this.healthDistributionChart = new Chart(ctx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Sağlıklı (>=80%)', 'Uyarı (50-79%)', 'Kritik Risk (<50%)'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8' } }
        },
        cutout: '70%'
      }
    });
  }

  updateRealtimeCharts(summary, processedDevices) {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Update Power Trend Line
    if (this.powerChart) {
      const labels = this.powerChart.data.labels;
      labels.push(now);
      this.powerChart.data.datasets[0].data.push(summary.totalActivePowerKw.toFixed(2));
      this.powerChart.data.datasets[1].data.push(summary.totalIdlePowerKw.toFixed(2));

      if (labels.length > CONFIG.MAX_HISTORY_POINTS) {
        labels.shift();
        this.powerChart.data.datasets[0].data.shift();
        this.powerChart.data.datasets[1].data.shift();
      }
      this.powerChart.update('none');
    }

    // Update Health Doughnut
    if (this.healthDistributionChart) {
      this.healthDistributionChart.data.datasets[0].data = [
        summary.healthyCount,
        summary.warningCount,
        summary.criticalCount
      ];
      this.healthDistributionChart.update();
    }

    // Update Grid Chart with reference node 421 or first online device
    if (this.gridQualityChart) {
      const dev421 = processedDevices['421'] || Object.values(processedDevices)[0];
      if (dev421) {
        const labels = this.gridQualityChart.data.labels;
        labels.push(now);
        this.gridQualityChart.data.datasets[0].data.push(dev421.v);
        this.gridQualityChart.data.datasets[1].data.push(dev421.hz);

        if (labels.length > CONFIG.MAX_HISTORY_POINTS) {
          labels.shift();
          this.gridQualityChart.data.datasets[0].data.shift();
          this.gridQualityChart.data.datasets[1].data.shift();
        }
        this.gridQualityChart.update('none');
      }
    }
  }
}

// Global singleton instance
window.chartsManager = new ChartsManager();
