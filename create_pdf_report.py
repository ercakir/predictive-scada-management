# -*- coding: utf-8 -*-
"""
SCADA Predictive Industrial Management System - Comprehensive Engineering Report Generator (PDF)
"""

import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, HRFlowable, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Segoe UI TrueType fonts for full Turkish unicode support
font_dir = r'C:\Windows\Fonts'
pdfmetrics.registerFont(TTFont('SegoeUI', os.path.join(font_dir, 'segoeui.ttf')))
pdfmetrics.registerFont(TTFont('SegoeUI-Bold', os.path.join(font_dir, 'segoeuib.ttf')))
pdfmetrics.registerFont(TTFont('SegoeUI-Italic', os.path.join(font_dir, 'segoeuii.ttf')))

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        rightMargin=36, leftMargin=36, topMargin=40, bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor('#0f172a')     # Dark Slate/Navy
    SECONDARY = colors.HexColor('#4338ca')   # Indigo Accent
    EMERALD = colors.HexColor('#059669')     # Emerald Green
    AMBER = colors.HexColor('#d97706')       # Amber Gold
    ROSE = colors.HexColor('#dc2626')        # Rose Red
    BG_LIGHT = colors.HexColor('#f8fafc')    # Slate Light
    TEXT_MAIN = colors.HexColor('#1e293b')   # Dark Neutral Text
    BORDER_COLOR = colors.HexColor('#e2e8f0')

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        fontName='SegoeUI-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        fontName='SegoeUI',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        fontName='SegoeUI-Bold',
        fontSize=15,
        leading=19,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        fontName='SegoeUI-Bold',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        fontName='SegoeUI',
        fontSize=9.5,
        leading=14,
        textColor=TEXT_MAIN,
        spaceAfter=8
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        fontName='SegoeUI',
        fontSize=9,
        leading=13.5,
        textColor=TEXT_MAIN
    )

    formula_style = ParagraphStyle(
        'Formula_Text',
        fontName='SegoeUI-Bold',
        fontSize=10,
        leading=14,
        textColor=SECONDARY
    )

    story = []

    # =========================================================================
    # HEADER BANNER & COVER METADATA
    # =========================================================================
    story.append(Paragraph("SCADA KESTİRİMCİ YÖNETİM & BAKIM SİSTEMİ", title_style))
    story.append(Paragraph("Detaylı Mühendislik, Fiziksel Korelasyon ve Matematiksel Hesaplama Raporu", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=SECONDARY, spaceAfter=15))

    # Metadata Box Table
    meta_data = [
        [
            Paragraph("<b>Tarih:</b> 9 Eylül 2026", body_style),
            Paragraph("<b>Canlı SCADA Gateway:</b> http://192.168.3.88:8003", body_style)
        ],
        [
            Paragraph("<b>Altyapı:</b> Rest API & WebSocket Live Telemetry", body_style),
            Paragraph("<b>Modüller:</b> Bakım (RUL), Enerji (İsraf), Şebeke (Stres)", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # =========================================================================
    # SECTION 1: GENEL SİSTEM MİMARİSİ VE TELEMETRİ VERİ HARİTASI
    # =========================================================================
    story.append(Paragraph("1. Genel Sistem Mimarisi ve Telemetri Veri Haritası", h1_style))
    story.append(Paragraph(
        "Mevcut SCADA altyapısı, Port 8080 üzerinde çalışan static web ön yüzü ve Port 8003 üzerinde hizmet veren "
        "API Gateway & WebSocket yayın servisinden oluşmaktadır. Sistemdeki telemetry verileri Unified Name Space (UNS) "
        "hiyerarşisine göre organze edilmiş olup, endüstriyel makine düğümlerinden (nodes) anlık olarak toplanmaktadır.",
        body_style
    ))

    # Telemetry Headers Table
    headers_data = [
        [Paragraph("<b>Parametre</b>", body_style), Paragraph("<b>Açıklama & Birim</b>", body_style), Paragraph("<b>Kestirimci Analizdeki Rolü</b>", body_style)],
        [Paragraph("<b>v</b> (Voltage)", body_style), Paragraph("Şebeke Gerilimi (Volt)", body_style), Paragraph("Şebeke kalitesi ve voltaj çökmelerinin (sag/swell) cihaz stresine etkisi.", body_style)],
        [Paragraph("<b>a</b> (Current)", body_style), Paragraph("Çekilen Akım (Amper)", body_style), Paragraph("Motor ve ekipmanın anlık yüklenme miktarı.", body_style)],
        [Paragraph("<b>w</b> (Active Power)", body_style), Paragraph("Aktif Güç (Watt)", body_style), Paragraph("Gerçekleştirilen aktif iş ve enerji tüketimi.", body_style)],
        [Paragraph("<b>pf</b> (Power Factor)", body_style), Paragraph("Güç Faktörü (Cos φ: 0 - 1.0)", body_style), Paragraph("<b>Kritik!</b> Motor mekanik sürtünmesi, rulman aşınması ve verimlilik.", body_style)],
        [Paragraph("<b>hz</b> (Frequency)", body_style), Paragraph("Şebeke Frekansı (Hertz)", body_style), Paragraph("Enerji besleme stabilietesi (Nominal 50.0 Hz).", body_style)],
        [Paragraph("<b>pzem_fail</b>", body_style), Paragraph("Ölçüm Sensör Arızası (0/1)", body_style), Paragraph("PZEM donanımsal voltaj/akım ölçüm sensörü bağlantı arızası.", body_style)],
        [Paragraph("<b>nfc_fail</b>", body_style), Paragraph("Operatör NFC Arızası (0/1)", body_style), Paragraph("Pano üzerindeki RFID/NFC operatör doğrulama kart okuyucu arızası.", body_style)],
        [Paragraph("<b>stability</b>", body_style), Paragraph("Bağlantı Kararlılığı (High/Low)", body_style), Paragraph("Cihazın haberleşme paket kaybı ve ağ kararlılık durumu.", body_style)]
    ]
    t_headers = Table(headers_data, colWidths=[90, 150, 280])
    t_headers.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_headers)
    story.append(Spacer(1, 15))

    # =========================================================================
    # SECTION 2: MATEMATİKSEL FORMÜLLER VE HESAPLAMA ALGORİTMALARI
    # =========================================================================
    story.append(Paragraph("2. Matematiksel Formüller ve Hesaplama Algoritmaları", h1_style))
    story.append(Paragraph(
        "Sitede görüntülenen tüm yüzdesel ve kestirimci metrikler, fiziksel yasalar ve matematiksel ceza modelleri "
        "ile anlık olarak hesaplanmaktadır. Aşağıda her gösterim için kullanılan formüller açıklanmıştır:",
        body_style
    ))

    # Formula 1 & 2
    f1_box = [
        [Paragraph("<b>1. Cihaz Sağlık Skoru Formülü (% - Health Score)</b>", h2_style)],
        [Paragraph(
            "Cihazın başlangıç puanı 100 kabul edilir. Anlık verilerin standartlardan sapmasına göre ceza puanları düşülür:<br/>"
            "<b>• Güç Faktörü Cezası:</b> <i>Ceza_PF = (0.85 - Cos φ) * 100</i> (Cos φ &lt; 0.85 ise)<br/>"
            "<b>• Reaktif Dengesizlik Cezası:</b> (V * A) / W &gt; 1.8 ise <i>15 Puan</i><br/>"
            "<b>• Sensör Arızası (PZEM Fail):</b> <i>35 Puan</i> | <b>• NFC Arızası:</b> <i>15 Puan</i> | <b>• Düşük Kararlılık:</b> <i>20 Puan</i><br/>"
            "<b>Formül:</b> <font color='#4338ca'><b>H_cihaz = max(0, min(100, 100 - Toplam_Cezalar))</b></font>",
            body_style
        )]
    ]
    t_f1 = Table(f1_box, colWidths=[520])
    t_f1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_f1)
    story.append(Spacer(1, 10))

    # Formula 3 & 4
    f2_box = [
        [Paragraph("<b>2. Kalan Faydalı Ömür Projeksiyonu (RUL - Remaining Useful Life)</b>", h2_style)],
        [Paragraph(
            "Tam sağlıklı cihazın standart bakım periyodu 2160 saat (~90 gün) kabul edilir. Ekipman yıpranması fizikte "
            "doğrusal değil ivmelenerek gerçekleştiği için karesel deformasyon modeli uygulanır:<br/>"
            "<b>Formül:</b> <font color='#4338ca'><b>RUL (Saat) = 2160 * (H_cihaz / 100)^2</b></font><br/>"
            "<i>Örnek: Sağlık skoru %100 ➔ 2160 Saat; %70 ➔ 1058 Saat; %50 ➔ 540 Saat.</i>",
            body_style
        )]
    ]
    t_f2 = Table(f2_box, colWidths=[520])
    t_f2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_f2)
    story.append(Spacer(1, 10))

    # Formula 5 & 6
    f3_box = [
        [Paragraph("<b>3. Şebeke Kararlılık İndeksi ve Cihaz Stresi (%)</b>", h2_style)],
        [Paragraph(
            "Nominal Voltaj V_nom = 230.0V, Nominal Frekans Hz_nom = 50.0Hz kabul edilir.<br/>"
            "<b>• Voltaj Sapması (ΔV):</b> |V_anlık - 230| / 230 | <b>• Frekans Sapması (ΔHz):</b> |Hz_anlık - 50| / 50<br/>"
            "<b>• Şebeke Stresi (%):</b> (ΔV * 70% + ΔHz * 30%) * 100<br/>"
            "<b>Formül:</b> <font color='#4338ca'><b>Şebeke Kararlılığı (%) = 100 - Ortalama_Şebeke_Stresi</b></font>",
            body_style
        )]
    ]
    t_f3 = Table(f3_box, colWidths=[520])
    t_f3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_f3)
    story.append(Spacer(1, 15))

    # =========================================================================
    # SECTION 3: KÖK NEDEN (ORANTI YÖNÜ) VE KESTİRİMCİ ÇÖZÜMLER
    # =========================================================================
    story.append(Paragraph("3. Kök Neden (Neden-Sonuç İlişkisi) ve Çözüm Protokolleri", h1_style))
    story.append(Paragraph(
        "Sistemdeki anomali durumlarında tespit edilen problemin hangi parametrenin artmasından veya azalmasından "
        "kaynaklandığı (doğru/ters orantı) ve uygulanması gereken teknik çözüm protokolleri aşağıda maddelenmiştir:",
        body_style
    ))

    causes_data = [
        [Paragraph("<b>Anomali Türü</b>", body_style), Paragraph("<b>Kök Neden & Orantı Yönü (Neden-Sonuç)</b>", body_style), Paragraph("<b>Kestirimci Çözüm Protokolü</b>", body_style)],
        [
            Paragraph("<b>Mekanik Sürtünme & Motor Yıpranması</b>", body_style),
            Paragraph("Güç Faktörünün (Cos φ) <b>DÜŞMESİNDEN</b> ve Çekilen Akımın (A) <b>ARTMA SÜRECİNDEN</b> kaynaklı mekanik direnç yükselmesi (Ters Orantı).", body_style),
            Paragraph("<b>Çözüm:</b> Motor rulmanlarını gresleyin/yağlayın, eksenel hizalamayı ve kayış gerginliğini kontrol edin.", body_style)
        ],
        [
            Paragraph("<b>Reaktif Güç İsrafı</b>", body_style),
            Paragraph("Kör Güç Oranının <b>YÜKSELMESİNDEN</b> ve Aktif Güç Veriminin <b>DÜŞMESİNDEN</b> kaynaklı enerji kaybı (Doğru Orantı).", body_style),
            Paragraph("<b>Çözüm:</b> Lokal kompanzasyon kondansatör grubunu ve sürücü (VFD) parametrelerini inceleyin.", body_style)
        ],
        [
            Paragraph("<b>NFC Modül Uyarısı</b>", body_style),
            Paragraph("NFC/RFID kart okuyucu çipinin I2C/SPI veri hattındaki titreşimden <b>GEVŞEMESİNDEN</b> veya kilitlenmesinden kaynaklı sinyalsizlik.", body_style),
            Paragraph("<b>Çözüm:</b> Panel kablosunun sokete oturduğunu doğrulayın ve modül reset butonuna basarak donanımı yeniden başlatın.", body_style)
        ],
        [
            Paragraph("<b>PZEM Sensör Arızası</b>", body_style),
            Paragraph("Sensör besleme voltajının <b>ÇÖKMESİNDEN</b> veya UART haberleşme iletkenliğinin <b>KESİLMESİNDEN</b> kaynaklı veri kaybı.", body_style),
            Paragraph("<b>Çözüm:</b> Pano içindeki PZEM kartının 5V beslemesini ve RS485/UART veri kablosunu kontrol edin; modülü değiştirin.", body_style)
        ],
        [
            Paragraph("<b>Gereksiz Boşta Çalışma İsrafı</b>", body_style),
            Paragraph("Makinenin iş yapmadığı halde motorunun dönmeye devam etmesinden (Cos φ <b>DÜŞÜKLÜĞÜNDEN</b>) kaynaklı maliyet.", body_style),
            Paragraph("<b>Çözüm:</b> Otomatik Standby/Uyku modunu devreye sokun. (Saatlik ortalama kayıp: ₺6.78).", body_style)
        ]
    ]
    t_causes = Table(causes_data, colWidths=[110, 205, 205])
    t_causes.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_causes)
    story.append(Spacer(1, 15))

    # =========================================================================
    # SECTION 4: WEB PLATFORMU UX VE YENİLİKLER
    # =========================================================================
    story.append(Paragraph("4. Web Platformu Kullanıcı Deneyimi (UX) İyileştirmeleri", h1_style))
    story.append(Paragraph(
        "Kullanıcı geribildirimleri doğrultusunda web sitesinde (http://localhost:3000) aşağıdaki kritik iyileştirmeler yapılmıştır:<br/>"
        "<b>1. Sabit Sıralı Kart Yapısı (Zero Layout Shift):</b> Canlı SCADA WebSocket paketleri her saniye geldikçe kartların zıplaması ve yukarı-aşağı kayması engellenmiş, kartlar Cihaz ID'sine göre sabitlenmiştir.<br/>"
        "<b>2. Butonlu Çözüm Çekmecesi (Collapsible Accordion):</b> Çözüm detayları varsayılan olarak gizlenmiş, <i>'🔍 Kök Neden & Çözüm Detayı ▼'</i> butonuna basıldığında akordeon şeklinde açılacak yapıya dönüştürülmüştür.<br/>"
        "<b>3. Durum Koruma (State Persistence):</b> Açılan bir çözüm butonu canlı veri aktığında kendiliğinden kapanmaz.",
        body_style
    ))
    story.append(Spacer(1, 15))

    # =========================================================================
    # SECTION 5: İNFOGRAFİK GÖRSEL HARİTASI
    # =========================================================================
    img_path = r'C:\Users\Lenovo\.gemini\antigravity\brain\ccc34267-1947-4e05-894b-90d65c4e42ba\scada_formulas_infographic_1788939860863.jpg'
    if os.path.exists(img_path):
        story.append(Paragraph("5. Kestirimci Matematiksel Formüller İnfografik Haritası", h1_style))
        story.append(Image(img_path, width=520, height=292))
        story.append(Spacer(1, 10))

    # Footer Note
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=10, spaceAfter=10))
    story.append(Paragraph(
        "<i>Bu rapor SCADA Predictive Industrial Center AI Engine tarafından otomatik olarak üretilmiştir. © 2026</i>",
        ParagraphStyle('Footer_Text', fontName='SegoeUI-Italic', fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=1)
    ))

    doc.build(story)
    print("PDF build successful:", filename)

if __name__ == '__main__':
    pdf_filename = r'C:\Users\Lenovo\.gemini\antigravity\scratch\predictive-scada-app\SCADA_Kestirimci_Yonetim_ve_Bakim_Raporu.pdf'
    build_pdf(pdf_filename)

    # Also copy to artifacts directory for user quick download link
    artifact_pdf = r'C:\Users\Lenovo\.gemini\antigravity\brain\ccc34267-1947-4e05-894b-90d65c4e42ba\SCADA_Kestirimci_Yonetim_ve_Bakim_Raporu.pdf'
    import shutil
    shutil.copy(pdf_filename, artifact_pdf)
    print("Artifact PDF copied to:", artifact_pdf)
