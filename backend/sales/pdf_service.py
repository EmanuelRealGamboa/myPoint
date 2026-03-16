"""
PDF Report Generator for Cierre de Caja — MotoQFox
Uses reportlab (pure Python, no system dependencies).
"""
import io
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Q

# ── Color palette (MotoQFox blue theme) ──────────────────────────────────────
BLUE_DARK   = (0.118, 0.251, 0.686)   # #1E40AF
BLUE_LIGHT  = (0.231, 0.510, 0.965)   # #3B82F6
BLUE_BG     = (0.937, 0.965, 1.0)     # #EFF6FF
GRAY_DARK   = (0.067, 0.094, 0.153)   # #111827
GRAY_MID    = (0.420, 0.447, 0.502)   # #6B7280
GRAY_LIGHT  = (0.898, 0.906, 0.922)   # #E5E7EB
WHITE       = (1, 1, 1)
GREEN       = (0.086, 0.639, 0.290)   # #16A34A
RED         = (0.863, 0.149, 0.149)   # #DC2626


def _fmt(value) -> str:
    try:
        return f"${Decimal(str(value)):,.2f}"
    except Exception:
        return "$0.00"


def generate_reporte_caja_pdf(apertura) -> io.BytesIO:
    """
    Generates a PDF report for the given AperturaCaja.
    Returns a BytesIO buffer ready to be saved as a FileField.
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
    except ImportError:
        raise ImportError("reportlab no está instalado. Ejecuta: pip install reportlab")

    from .models import Venta

    # ── Gather data ──────────────────────────────────────────────────────────
    sede   = apertura.sede
    cajero = apertura.cajero

    ventas_qs = Venta.objects.filter(
        sede=sede,
        cajero=cajero,
        created_at__gte=apertura.fecha_apertura,
        created_at__lte=apertura.fecha_cierre or timezone.now(),
    ).prefetch_related('items__producto').order_by('created_at')

    completadas = ventas_qs.filter(status=Venta.Status.COMPLETADA)
    canceladas  = ventas_qs.filter(status=Venta.Status.CANCELADA)

    agg = completadas.aggregate(
        monto_total=Sum('total'),
        monto_efectivo=Sum('total', filter=Q(metodo_pago='EFECTIVO')),
        monto_tarjeta=Sum('total', filter=Q(metodo_pago='TARJETA')),
        monto_transf=Sum('total', filter=Q(metodo_pago='TRANSFERENCIA')),
        total_descuentos=Sum('descuento'),
    )

    monto_total    = agg['monto_total']       or Decimal('0')
    monto_efect    = agg['monto_efectivo']    or Decimal('0')
    monto_tarj     = agg['monto_tarjeta']     or Decimal('0')
    monto_transf   = agg['monto_transf']      or Decimal('0')
    total_desc     = agg['total_descuentos']  or Decimal('0')

    n_completadas  = completadas.count()
    n_canceladas   = canceladas.count()

    # ── RL colors ─────────────────────────────────────────────────────────────
    rl_blue_dark  = colors.HexColor('#1E40AF')
    rl_blue_light = colors.HexColor('#3B82F6')
    rl_blue_bg    = colors.HexColor('#EFF6FF')
    rl_gray_light = colors.HexColor('#E5E7EB')
    rl_gray_mid   = colors.HexColor('#6B7280')
    rl_red        = colors.HexColor('#DC2626')
    rl_green      = colors.HexColor('#16A34A')
    rl_white      = colors.white
    rl_black      = colors.HexColor('#111827')

    # ── Document setup ────────────────────────────────────────────────────────
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm,   bottomMargin=2*cm,
    )
    W = letter[0] - 4*cm  # usable width

    styles = getSampleStyleSheet()
    story  = []

    # ── Styles ────────────────────────────────────────────────────────────────
    def s(name, **kw):
        return ParagraphStyle(name, **kw)

    title_style    = s('Title',    fontSize=20, textColor=rl_white,     alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=2)
    subtitle_style = s('Subtitle', fontSize=11, textColor=rl_white,     alignment=TA_CENTER, fontName='Helvetica')
    label_style    = s('Label',    fontSize=9,  textColor=rl_gray_mid,  fontName='Helvetica', spaceAfter=1)
    value_style    = s('Value',    fontSize=12, textColor=rl_black,     fontName='Helvetica-Bold')
    small_style    = s('Small',    fontSize=8,  textColor=rl_gray_mid,  fontName='Helvetica')
    section_style  = s('Section',  fontSize=10, textColor=rl_blue_dark, fontName='Helvetica-Bold', spaceBefore=10, spaceAfter=4)
    total_style    = s('TotalRow', fontSize=11, textColor=rl_black,     fontName='Helvetica-Bold')
    folio_style    = s('Folio',    fontSize=8,  textColor=rl_gray_mid,  fontName='Courier')

    # ── Header block ──────────────────────────────────────────────────────────
    header_data = [[
        Paragraph('MotoQFox', title_style),
        Paragraph('Reporte de Cierre de Caja', subtitle_style),
    ]]
    header_table = Table(header_data, colWidths=[W*0.4, W*0.6])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), rl_blue_dark),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.4*cm))

    # ── Info block ────────────────────────────────────────────────────────────
    tz_now      = timezone.localtime
    fmt_dt      = lambda dt: tz_now(dt).strftime('%d/%m/%Y %H:%M') if dt else '—'
    apertura_dt = fmt_dt(apertura.fecha_apertura)
    cierre_dt   = fmt_dt(apertura.fecha_cierre)

    info_data = [
        [
            Paragraph('Sede', label_style),
            Paragraph('Cajero/a', label_style),
            Paragraph('Apertura', label_style),
            Paragraph('Cierre', label_style),
        ],
        [
            Paragraph(sede.name, value_style),
            Paragraph(cajero.get_full_name(), value_style),
            Paragraph(apertura_dt, value_style),
            Paragraph(cierre_dt, value_style),
        ],
    ]
    info_table = Table(info_data, colWidths=[W/4]*4)
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), rl_blue_bg),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('BOX',           (0,0), (-1,-1), 0.5, rl_gray_light),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Summary ───────────────────────────────────────────────────────────────
    story.append(Paragraph('Resumen del turno', section_style))
    summary_data = [
        ['Concepto', 'Valor'],
        ['Ventas completadas',           str(n_completadas)],
        ['Ventas canceladas',            str(n_canceladas)],
        ['Total descuentos aplicados',   _fmt(total_desc)],
        ['Cobrado en efectivo',          _fmt(monto_efect)],
        ['Cobrado con tarjeta',          _fmt(monto_tarj)],
        ['Cobrado por transferencia',    _fmt(monto_transf)],
        ['TOTAL NETO DEL TURNO',         _fmt(monto_total)],
    ]
    summary_table = Table(summary_data, colWidths=[W*0.65, W*0.35])
    summary_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND',    (0,0), (-1,0), rl_blue_dark),
        ('TEXTCOLOR',     (0,0), (-1,0), rl_white),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,0), 9),
        ('ALIGN',         (1,0), (1,-1), 'RIGHT'),
        # Data rows
        ('FONTNAME',      (0,1), (-1,-2), 'Helvetica'),
        ('FONTSIZE',      (0,1), (-1,-2), 9),
        ('ROWBACKGROUNDS',(0,1), (-1,-2), [rl_white, rl_blue_bg]),
        # Total row
        ('BACKGROUND',    (0,-1), (-1,-1), rl_blue_dark),
        ('TEXTCOLOR',     (0,-1), (-1,-1), rl_white),
        ('FONTNAME',      (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,-1), (-1,-1), 10),
        # Padding
        ('TOPPADDING',    (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('BOX',           (0,0), (-1,-1), 0.5, rl_gray_light),
        ('INNERGRID',     (0,0), (-1,-1), 0.25, rl_gray_light),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Ventas detail ─────────────────────────────────────────────────────────
    if completadas.exists():
        story.append(Paragraph(f'Detalle de ventas completadas ({n_completadas})', section_style))
        rows = [['#Folio', 'Hora', 'Productos', 'Método', 'Descuento', 'Total']]
        for v in completadas:
            productos_str = ', '.join(
                f"{it.producto.name} ×{it.quantity}" for it in v.items.all()
            )
            if len(productos_str) > 60:
                productos_str = productos_str[:57] + '…'
            rows.append([
                Paragraph(f'#{v.id}', folio_style),
                Paragraph(timezone.localtime(v.created_at).strftime('%H:%M'), small_style),
                Paragraph(productos_str, small_style),
                Paragraph(v.metodo_pago, small_style),
                Paragraph(_fmt(v.descuento) if v.descuento else '—', small_style),
                Paragraph(_fmt(v.total), small_style),
            ])
        col_w = [W*0.08, W*0.08, W*0.40, W*0.14, W*0.14, W*0.16]
        venta_table = Table(rows, colWidths=col_w, repeatRows=1)
        venta_table.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0), rl_blue_light),
            ('TEXTCOLOR',     (0,0), (-1,0), rl_white),
            ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0,0), (-1,0), 8),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [rl_white, rl_blue_bg]),
            ('ALIGN',         (5,0), (5,-1), 'RIGHT'),
            ('ALIGN',         (4,0), (4,-1), 'RIGHT'),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING',   (0,0), (-1,-1), 6),
            ('BOX',           (0,0), (-1,-1), 0.5, rl_gray_light),
            ('INNERGRID',     (0,0), (-1,-1), 0.25, rl_gray_light),
        ]))
        story.append(venta_table)
        story.append(Spacer(1, 0.4*cm))

    # ── Canceladas ────────────────────────────────────────────────────────────
    if canceladas.exists():
        story.append(Paragraph(f'Ventas canceladas ({n_canceladas})', section_style))
        cancel_rows = [['#Folio', 'Hora', 'Productos', 'Total cancelado']]
        for v in canceladas:
            productos_str = ', '.join(
                f"{it.producto.name} ×{it.quantity}" for it in v.items.all()
            )
            if len(productos_str) > 70:
                productos_str = productos_str[:67] + '…'
            cancel_rows.append([
                Paragraph(f'#{v.id}', folio_style),
                Paragraph(timezone.localtime(v.created_at).strftime('%H:%M'), small_style),
                Paragraph(productos_str, small_style),
                Paragraph(_fmt(v.total), small_style),
            ])
        cancel_table = Table(cancel_rows, colWidths=[W*0.10, W*0.10, W*0.55, W*0.25])
        cancel_table.setStyle(TableStyle([
            ('BACKGROUND',    (0,0), (-1,0), rl_red),
            ('TEXTCOLOR',     (0,0), (-1,0), rl_white),
            ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',      (0,0), (-1,0), 8),
            ('ROWBACKGROUNDS',(0,1), (-1,-1), [rl_white, colors.HexColor('#FEF2F2')]),
            ('ALIGN',         (3,0), (3,-1), 'RIGHT'),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING',   (0,0), (-1,-1), 6),
            ('BOX',           (0,0), (-1,-1), 0.5, rl_gray_light),
            ('INNERGRID',     (0,0), (-1,-1), 0.25, rl_gray_light),
        ]))
        story.append(cancel_table)

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.6*cm))
    story.append(HRFlowable(width=W, color=rl_gray_light))
    story.append(Spacer(1, 0.2*cm))
    gen_time = timezone.localtime(timezone.now()).strftime('%d/%m/%Y %H:%M:%S')
    story.append(Paragraph(
        f'Reporte generado automáticamente el {gen_time} · MotoQFox Sistema de Gestión',
        ParagraphStyle('Footer', fontSize=7, textColor=rl_gray_mid, alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer


def build_reporte_from_apertura(apertura) -> 'ReporteCaja':
    """
    Generates the PDF, creates and returns a ReporteCaja instance.
    Called from CerrarCajaView after saving the apertura.
    """
    from django.core.files.base import ContentFile
    from django.db.models import Sum, Q
    from decimal import Decimal
    from .models import Venta, ReporteCaja

    sede   = apertura.sede
    cajero = apertura.cajero

    ventas_qs   = Venta.objects.filter(
        sede=sede,
        cajero=cajero,
        created_at__gte=apertura.fecha_apertura,
        created_at__lte=apertura.fecha_cierre or timezone.now(),
    )
    completadas = ventas_qs.filter(status=Venta.Status.COMPLETADA)
    canceladas  = ventas_qs.filter(status=Venta.Status.CANCELADA)

    agg = completadas.aggregate(
        monto_total=Sum('total'),
        monto_efectivo=Sum('total', filter=Q(metodo_pago='EFECTIVO')),
        monto_tarjeta=Sum('total', filter=Q(metodo_pago='TARJETA')),
        monto_transf=Sum('total', filter=Q(metodo_pago='TRANSFERENCIA')),
        total_descuentos=Sum('descuento'),
    )

    def dec(val):
        return Decimal(str(val or 0))

    # Build PDF
    pdf_buffer = generate_reporte_caja_pdf(apertura)

    from django.utils import timezone as tz
    fecha_str = tz.localtime(apertura.fecha_cierre or tz.now()).strftime('%Y%m%d_%H%M')
    filename  = f'reporte_{sede.id}_{cajero.id}_{fecha_str}.pdf'

    reporte = ReporteCaja(
        apertura            = apertura,
        total_ventas        = completadas.count(),
        total_canceladas    = canceladas.count(),
        monto_total         = dec(agg['monto_total']),
        monto_efectivo      = dec(agg['monto_efectivo']),
        monto_tarjeta       = dec(agg['monto_tarjeta']),
        monto_transferencia = dec(agg['monto_transf']),
        total_descuentos    = dec(agg['total_descuentos']),
    )
    reporte.archivo.save(filename, ContentFile(pdf_buffer.read()), save=True)
    return reporte
