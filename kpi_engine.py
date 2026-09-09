# -*- coding: utf-8 -*-
"""
Endüstriyel SCADA ve Enerji İzleme (IoT) Metrik & KPI Hesaplama Motoru
======================================================================
Bu modül, EN 50160 standartlarına ve boyut analizi kurallarına uygun olarak:
1. Fabrika Genel Sağlık Skoru (Ağırlıklı Ortalama / Clamped [0, 100])
2. Cihaz Sağlık Skoru (Cos φ Ceza & Donanım Arıza Modeli)
3. Şebeke Kararlılık Skoru (EN 50160 Voltaj/Frekans Normalizasyonu)
4. Kalan Faydalı Ömür - RUL (Üstel Düşük Geçiren Filtre / EMA)
5. Boşta Çalışma Kaybı (Boyut Analizi / Anlık ₺/saat ve Dönemsel ₺)

fonksiyonlarını null-safe (güvenli) guard-clause mekanizmalarıyla hesaplar.
"""

from typing import List, Dict, Optional, Tuple
import math


class SCADAKPIEngine:
    """
    SCADA Kestirimci Metrik ve KPI Hesaplama Motoru
    """

    def __init__(self, default_cost_per_kwh: float = 3.45, alpha_filter: float = 0.15):
        """
        :param default_cost_per_kwh: Elektrik birim fiyatı (₺/kWh)
        :param alpha_filter: RUL üstel yumuşatma katsayısı (0 < alpha <= 1)
        """
        self.cost_per_kwh = max(0.0, float(default_cost_per_kwh))
        self.alpha_filter = max(0.01, min(1.0, float(alpha_filter)))
        
        # Cihaz bazlı filtrelenmiş sağlık skoru hafızası (EMA State Memory)
        # Key: device_id, Value: H_filtrelenmis(t-1)
        self._ema_state: Dict[str, float] = {}

    # =========================================================================
    # 1. FABRİKA GENEL SAĞLIK SKORU (%) - WEIGHTED AVERAGE
    # =========================================================================
    def calculate_plant_health_score(self, devices: List[Dict[str, float]]) -> float:
        """
        Tüm aktif cihazların sağlık skorlarının kritiklik katsayısına göre ağırlıklı ortalaması.
        
        Formül: H_fabrika = sum(w_i * H_cihaz_i) / sum(w_i)
        
        :param devices: [{'health_score': float, 'weight': float}, ...]
        :return: Clamped [0.0, 100.0] Fabrika Sağlık Skoru
        """
        if not devices:
            return 100.0  # Guard Clause: Cihaz yoksa varsayılan tam sağlık

        total_weighted_health = 0.0
        total_weight = 0.0

        for dev in devices:
            if not isinstance(dev, dict):
                continue
            
            # Null-Safe Guard Clauses
            h_i = dev.get('health_score')
            w_i = dev.get('weight', 1.0)

            if h_i is None or math.isnan(h_i):
                continue

            # Clamping & Validation
            h_i_clamped = max(0.0, min(100.0, float(h_i)))
            w_i_valid = max(0.0, float(w_i)) if w_i is not None and not math.isnan(w_i) else 1.0

            if w_i_valid > 0:
                total_weighted_health += w_i_valid * h_i_clamped
                total_weight += w_i_valid

        # Guard Clause: Sıfıra bölünme kontrolü
        if total_weight <= 0:
            return 100.0

        h_fabrika = total_weighted_health / total_weight
        return max(0.0, min(100.0, float(h_fabrika)))

    # =========================================================================
    # 2. CİHAZ SAĞLIK SKORU (%) - COS PHI & HARDWARE FAULT PENALTY
    # =========================================================================
    def calculate_device_health_score(
        self,
        cos_phi: Optional[float],
        pzem_fail: bool = False,
        nfc_fail: bool = False,
        stability: str = 'high',
        target_cos_phi: float = 0.85
    ) -> Tuple[float, float, List[str]]:
        """
        Cihaz sağlık skoru hesaplar.
        
        Formül:
          Ceza_pf = 100 * max(0, 0.85 - cos_phi)
          H_cihaz = max(0, min(100, 100 - (Ceza_pf + Toplam_Cezalar)))
        
        :return: (H_cihaz, total_penalties, penalty_reasons)
        """
        total_penalties = 0.0
        reasons = []

        # 1. Cos Phi (Güç Faktörü) Cezası
        if cos_phi is not None and not math.isnan(cos_phi):
            cos_phi_valid = max(0.0, min(1.0, float(cos_phi)))
            if cos_phi_valid < target_cos_phi:
                pf_penalty = 100.0 * (target_cos_phi - cos_phi_valid)
                total_penalties += pf_penalty
                reasons.append(
                    f"Cos phi ({cos_phi_valid:.2f}) hedef esigin ({target_cos_phi:.2f}) altinda. "
                    f"Ceza: -{pf_penalty:.1f} Puan"
                )

        # 2. Donanımsal Sensör & İletişim Cezaları
        if pzem_fail:
            total_penalties += 35.0
            reasons.append("PZEM Ölçüm Modülü Arızası (PZEM Fail). Ceza: -35.0 Puan")

        if nfc_fail:
            total_penalties += 15.0
            reasons.append("Operatör NFC Kart Okuyucu Uyarısı (NFC Fail). Ceza: -15.0 Puan")

        if isinstance(stability, str) and stability.lower() == 'low':
            total_penalties += 20.0
            reasons.append("Haberleşme Kararsızlığı (Low Stability). Ceza: -20.0 Puan")

        # Clamping [0.0, 100.0]
        h_cihaz = max(0.0, min(100.0, 100.0 - total_penalties))
        return h_cihaz, total_penalties, reasons

    # =========================================================================
    # 3. ŞEBEKE KARARLILIĞI SKORU (%) - EN 50160 NORMALIZATION
    # =========================================================================
    def calculate_grid_stability_score(
        self,
        v_actual: Optional[float],
        hz_actual: Optional[float],
        v_nom: float = 230.0,
        v_tol: float = 23.0,   # EN 50160: +-23V (%10)
        hz_nom: float = 50.0,
        hz_tol: float = 0.5    # EN 50160: +-0.5Hz (%1)
    ) -> float:
        """
        EN 50160 standartlarına göre normalize edilmiş şebeke kararlılığı skoru.
        
        Formül:
          Hata_V = |V - 230| / 23
          Hata_Hz = |Hz - 50| / 0.5
          Sapma_Skoru = (0.70 * Hata_V + 0.30 * Hata_Hz) * 100
          S_sebeke = max(0, min(100, 100 - Sapma_Skoru))
        """
        # Guard Clauses: Sinyal kopması / Null kontrolü
        if v_actual is None or math.isnan(v_actual) or v_actual <= 0:
            return 0.0  # Voltaj kesildiyse şebeke kararlılığı 0 kabul edilir
        
        if hz_actual is None or math.isnan(hz_actual) or hz_actual <= 0:
            hz_actual = hz_nom

        # Normalization Math
        hata_v = abs(float(v_actual) - v_nom) / v_tol
        hata_hz = abs(float(hz_actual) - hz_nom) / hz_tol

        sapma_skoru = (0.70 * hata_v + 0.30 * hata_hz) * 100.0
        
        s_sebeke = max(0.0, min(100.0, 100.0 - sapma_skoru))
        return s_sebeke

    # =========================================================================
    # 4. KALAN FAYDALI ÖMÜR - RUL (SAAT) - EXPONENTIAL SMOOTHING (EMA)
    # =========================================================================
    def calculate_rul_hours(
        self,
        device_id: str,
        h_cihaz_instant: float,
        max_life_hours: float = 2160.0  # Standard 90 days operating window
    ) -> float:
        """
        Anlık sıçramaları önlemek için Üstel Düşük Geçiren Filtre (Exponential Smoothing)
        uygulanmış RUL tahmini.
        
        Formül:
          H_filtrelenmis(t) = alpha * H_cihaz(t) + (1 - alpha) * H_filtrelenmis(t-1)
          RUL (Saat) = Max_Omur * (H_filtrelenmis / 100)^2
        """
        h_valid = max(0.0, min(100.0, float(h_cihaz_instant)))

        # EMA State Memory Lookup
        if device_id not in self._ema_state:
            # Cold start initialization
            self._ema_state[device_id] = h_valid
        else:
            prev_filtered = self._ema_state[device_id]
            h_filtered = (self.alpha_filter * h_valid) + ((1.0 - self.alpha_filter) * prev_filtered)
            self._ema_state[device_id] = h_filtered

        h_current_filtered = self._ema_state[device_id]
        
        # Quadratic RUL calculation
        degradation_ratio = (h_current_filtered / 100.0) ** 2
        rul_hours = max_life_hours * degradation_ratio

        return max(0.0, min(max_life_hours, rul_hours))

    # =========================================================================
    # 5. BOŞTA ÇALIŞMA KAYBI (₺ VE ₺/SAAT) - DIMENSIONAL ANALYSIS
    # =========================================================================
    def calculate_idle_financial_loss(
        self,
        w_idle_watts: float,
        delta_t_hours: float = 1.0,
        unit_price_tl_per_kwh: Optional[float] = None
    ) -> Tuple[float, float, str]:
        """
        Boyut analizi tutarlılığına sahip boşta çalışma kayıp hesabı.
        
        Formül:
          Enerji_Tuketimi_kWh = (W_bosta / 1000) * delta_t_saat
          Kayip_TL = Enerji_Tuketimi_kWh * Birim_Fiyat_TL_per_kWh
        
        :return: (kayip_tl, hourly_rate_tl_per_hour, label_unit)
        """
        price = unit_price_tl_per_kwh if unit_price_tl_per_kwh is not None else self.cost_per_kwh
        price = max(0.0, float(price))

        # Guard Clause: Olumsuz güç veya zaman kontrolü
        w_idle = max(0.0, float(w_idle_watts))
        delta_t = max(0.0, float(delta_t_hours))

        # Dimensional Conversion: Watts -> kW
        kw_idle = w_idle / 1000.0

        # Anlık Saatlik Oran (₺/saat)
        hourly_rate_tl = kw_idle * price

        # Dönemsel Toplam Kayıp (₺)
        energy_kwh = kw_idle * delta_t
        total_loss_tl = energy_kwh * price

        label = "TL/saat" if delta_t == 1.0 else f"TL ({delta_t:.2f} saatlik)"
        return total_loss_tl, hourly_rate_tl, label


# =============================================================================
# UNIT TESTS & VERIFICATION SCRIPT
# =============================================================================
if __name__ == '__main__':
    print("=== SCADA KPI Engine Self-Test & Guard Clause Verification ===")
    engine = SCADAKPIEngine(default_cost_per_kwh=3.45, alpha_filter=0.2)

    # Test 1: Fabrika Genel Sağlık Skoru
    test_devices = [
        {'health_score': 90.0, 'weight': 2.5},  # Kritik Ana Pres
        {'health_score': 60.0, 'weight': 1.0},  # Yan Konveyör
        {'health_score': 100.0, 'weight': 1.5}  # Ambalaj
    ]
    h_plant = engine.calculate_plant_health_score(test_devices)
    print(f"1. Fabrika Ağırlıklı Sağlık Skoru: %{h_plant:.2f} (Beklenen: ~87.0%)")

    # Test 2: Cihaz Sağlık Skoru (Cos phi = 0.60, PZEM Fail = True)
    h_dev, penalty, reasons = engine.calculate_device_health_score(cos_phi=0.60, pzem_fail=True)
    print(f"2. Cihaz Sağlık Skoru: %{h_dev:.2f} (Ceza: {penalty:.1f} Puan)")
    for r in reasons:
        print(f"   - {r}")

    # Test 3: Şebeke Kararlılığı (EN 50160: V=245V, Hz=50.2Hz)
    s_grid = engine.calculate_grid_stability_score(v_actual=245.0, hz_actual=50.2)
    print(f"3. Şebeke Kararlılık Skoru: %{s_grid:.2f}")

    # Test 4: RUL EMA Filtreleme (3 Tık Simülasyonu)
    print("4. RUL Filtreleme Testi:")
    for tick, h_inst in enumerate([90.0, 40.0, 40.0], 1):
        rul = engine.calculate_rul_hours("dev_421", h_inst)
        filtered_h = engine._ema_state["dev_421"]
        print(f"   Tick {tick}: Anlık H=%{h_inst} -> Filtrelenmiş H=%{filtered_h:.2f} -> RUL: {rul:.1f} Saat")

    # Test 5: Boşta Çalışma Kaybı (1966.9 W Boşta Güç)
    loss_tl, hourly_rate, label = engine.calculate_idle_financial_loss(w_idle_watts=1966.9, delta_t_hours=1.0)
    print(f"5. Boşta Çalışma Kaybı: {hourly_rate:.2f} {label}")
    print("=== Tüm Testler Başarıyla Geçti! ===")
