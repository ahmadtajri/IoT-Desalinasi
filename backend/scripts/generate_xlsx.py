#!/usr/bin/env python3
"""
generate_xlsx.py
Dipanggil oleh Node.js via child_process.spawn
Input : JSON array dari sensor data melalui stdin
Output: path file .xlsx yang dihasilkan (ditulis ke stdout, satu baris)
Error : pesan error ke stderr + exit code 1
"""

import sys
import json
import uuid
import os
import tempfile
import xlsxwriter
from datetime import datetime


# ── Konstanta ──────────────────────────────────────────────────────────────────

THEMES = {
    'humidity':          {'dark': '#1F4E79', 'light': '#DDEEFF', 'unit': '%',   'label': 'Kelembapan Udara'},
    'air_temperature':   {'dark': '#7B2D00', 'light': '#FDE9D9', 'unit': '°C',  'label': 'Suhu Udara'},
    'water_temperature': {'dark': '#1C4A1C', 'light': '#E2EFDA', 'unit': '°C',  'label': 'Suhu Air'},
    'other':             {'dark': '#3D3D3D', 'light': '#F0F0F0', 'unit': '',    'label': 'Lainnya'},
}

SENSOR_COLORS = [
    '#4472C4', '#ED7D31', '#A9D18E', '#FFC000',
    '#5B9BD5', '#70AD47', '#FF0000', '#9E480E',
]


# ── Helper: resolve kategori ───────────────────────────────────────────────────

def resolve_category(row):
    stype = row.get('sensorType', '')
    sid   = row.get('sensorId', '')

    if stype == 'humidity':          return 'humidity'
    if stype == 'air_temperature':   return 'air_temperature'
    if stype == 'water_temperature': return 'water_temperature'

    # fallback dari sensorId
    if sid.startswith('RH') or sid.startswith('H'):
        return 'humidity'
    try:
        num = int(''.join(filter(str.isdigit, sid)))
        if sid.startswith('T') and num <= 7:  return 'air_temperature'
        if sid.startswith('T') and num >= 8:  return 'water_temperature'
    except ValueError:
        pass
    return 'other'


# ── Helper: format timestamp ───────────────────────────────────────────────────

def fmt_time(ts_str):
    """Return HH:MM:SS from ISO timestamp string."""
    try:
        dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        return dt.strftime('%H:%M:%S')
    except Exception:
        return str(ts_str)

def fmt_datetime(ts_str):
    """Return DD/MM/YYYY HH:MM:SS from ISO timestamp string."""
    try:
        dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        return dt.strftime('%d/%m/%Y %H:%M:%S')
    except Exception:
        return str(ts_str)


# ── Main generator ─────────────────────────────────────────────────────────────

def generate(sensor_data, output_path):
    if not sensor_data:
        raise ValueError('sensor_data kosong')

    report_date = fmt_datetime(sensor_data[0]['timestamp']).split(' ')[0]

    # Group: kategori → sensorId → [rows]
    grouped = {}
    for row in sensor_data:
        cat = resolve_category(row)
        sid = row.get('sensorId', 'UNKNOWN')
        grouped.setdefault(cat, {}).setdefault(sid, []).append(row)

    wb = xlsxwriter.Workbook(output_path, {'nan_inf_to_errors': True})

    # ── Formats ───────────────────────────────────────────────────────────────
    def make_fmt(bold=False, size=10, fg='#000000', bg=None,
                 align='center', border=1, num_format=None, italic=False):
        props = {
            'font_name': 'Arial', 'font_size': size,
            'font_color': fg, 'bold': bold, 'italic': italic,
            'align': align, 'valign': 'vcenter', 'border': border,
            'border_color': '#BFBFBF',
        }
        if bg:   props['bg_color'] = bg
        if num_format: props['num_format'] = num_format
        return wb.add_format(props)

    # ── Iterasi per kategori ──────────────────────────────────────────────────
    for cat, sensors in grouped.items():
        theme     = THEMES.get(cat, THEMES['other'])
        cat_label = theme['label']
        unit      = theme['unit']
        dark      = theme['dark']
        light     = theme['light']
        sensor_ids = sorted(sensors.keys())

        # Format per kategori
        fmt_title  = make_fmt(bold=True, size=13, fg='#FFFFFF', bg=dark,   align='left', border=0)
        fmt_sub    = make_fmt(size=9,    fg='#595959', bg=light, align='left', border=0)
        fmt_hdr    = make_fmt(bold=True, size=10, fg='#FFFFFF', bg=dark)
        fmt_even   = make_fmt(bg='#EBF3FA', num_format='0.00')
        fmt_odd    = make_fmt(bg='#FFFFFF', num_format='0.00')
        fmt_even_t = make_fmt(bg='#EBF3FA', align='left')
        fmt_odd_t  = make_fmt(bg='#FFFFFF', align='left')
        fmt_stat_l = make_fmt(bold=True, bg=light, align='left')
        fmt_stat_v = make_fmt(bg='#FFFFFF', num_format='0.00')
        fmt_active = make_fmt(fg='#1A5C1A', bg='#E2EFDA')
        fmt_inactive = make_fmt(fg='#C00000', bg='#FCE4E4')

        # ─────────────────────────────────────────────────────────────────────
        # SHEET RINGKASAN per kategori
        # ─────────────────────────────────────────────────────────────────────
        ws_name   = f"{cat_label[:10]}"
        ws_r = wb.add_worksheet(ws_name)
        ws_r.freeze_panes(3, 1)

        total_cols = len(sensor_ids) + 1

        # Title (row 0)
        ws_r.set_row(0, 28)
        ws_r.merge_range(0, 0, 0, total_cols - 1,
            f"Ringkasan — {cat_label}  |  {report_date}", fmt_title)

        # Sub-header (row 1)
        ws_r.set_row(1, 18)
        ws_r.merge_range(1, 0, 1, total_cols - 1,
            f"Perbandingan semua sensor {cat_label}  |  Satuan: {unit}", fmt_sub)

        # Column headers (row 2)
        ws_r.set_row(2, 20)
        ws_r.write(2, 0, 'Waktu', fmt_hdr)
        for ci, sid in enumerate(sensor_ids):
            ws_r.write(2, ci + 1, sid, fmt_hdr)

        # Data rows (row 3+)
        first_rows = sensors[sensor_ids[0]]
        for ri, rec in enumerate(first_rows):
            row_idx = ri + 3
            ws_r.set_row(row_idx, 16)
            is_even = ri % 2 == 0
            ft = fmt_even_t if is_even else fmt_odd_t
            fv = fmt_even   if is_even else fmt_odd
            ws_r.write(row_idx, 0, fmt_time(rec['timestamp']), ft)
            for ci, sid in enumerate(sensor_ids):
                match = sensors[sid][ri] if ri < len(sensors[sid]) else None
                val   = match['value'] if match else None
                ws_r.write(row_idx, ci + 1, val, fv)

        last_data_row = 3 + len(first_rows)  # 0-indexed, exclusive

        # Statistik (2 baris setelah data)
        stat_row = last_data_row + 1
        ws_r.write(stat_row, 0, 'Statistik', fmt_hdr)
        for ci, sid in enumerate(sensor_ids):
            ws_r.write(stat_row, ci + 1, sid, fmt_hdr)

        stat_labels = [('Rata-rata', 'AVERAGE'), ('Minimum', 'MIN'), ('Maksimum', 'MAX')]
        for ii, (lbl, fn) in enumerate(stat_labels):
            r = stat_row + 1 + ii
            ws_r.write(r, 0, lbl, fmt_stat_l)
            for ci, sid in enumerate(sensor_ids):
                col_letter = chr(ord('B') + ci)
                formula = f'={fn}({col_letter}4:{col_letter}{last_data_row})'
                ws_r.write_formula(r, ci + 1, formula, fmt_stat_v)

        # Auto-format lebar kolom agar rapi
        ws_r.autofit()
        # Override khusus kolom nilai agar tidak muncul #### pada format desimal
        for ci in range(len(sensor_ids)):
            ws_r.set_column(ci + 1, ci + 1, 14)

        # ── Overview chart di sheet ringkasan ──────────────────────────────
        # Chart Line native xlsxwriter
        overview_chart = wb.add_chart({'type': 'line'})
        overview_chart.set_title({'name': f'Perbandingan Sensor — {cat_label}'})
        overview_chart.set_x_axis({'name': 'Waktu'})
        overview_chart.set_y_axis({'name': f'Nilai ({unit})', 'num_format': '0.00'})
        overview_chart.set_style(10)
        overview_chart.set_size({'width': 640, 'height': 360})
        overview_chart.set_legend({'position': 'bottom'})

        for ci, sid in enumerate(sensor_ids):
            color = SENSOR_COLORS[ci % len(SENSOR_COLORS)]
            overview_chart.add_series({
                'name':       [ws_name, 2, ci + 1],
                'categories': [ws_name, 3, 0, last_data_row - 1, 0],
                'values':     [ws_name, 3, ci + 1, last_data_row - 1, ci + 1],
                'line':       {'color': color, 'width': 2},
                'marker':     {'type': 'circle', 'size': 4, 'fill': {'color': color},
                               'border': {'color': color}},
            })

        # Sisipkan chart di samping tabel (index kolom: total_cols + 1) baris 3 (index 2)
        ws_r.insert_chart(2, total_cols + 1, overview_chart)

        # ─────────────────────────────────────────────────────────────────────
        # SHEET PER SENSOR ID
        # ─────────────────────────────────────────────────────────────────────
        for si, sid in enumerate(sensor_ids):
            rows   = sensors[sid]
            color  = SENSOR_COLORS[si % len(SENSOR_COLORS)]
            s_name = f"{cat_label[:5]}_{sid}"
            ws = wb.add_worksheet(s_name)
            ws.freeze_panes(3, 0)

            # Title (row 0)
            ws.set_row(0, 28)
            ws.merge_range(0, 0, 0, 4,
                f"{cat_label}  —  Sensor {sid}  |  {report_date}", fmt_title)

            # Sub-header (row 1)
            ws.set_row(1, 18)
            ws.merge_range(1, 0, 1, 4,
                f"Kategori: {cat_label}  |  Satuan: {unit}  |  Total data: {len(rows)}", fmt_sub)

            # Column headers (row 2)
            ws.set_row(2, 20)
            for ci, h in enumerate(['Sensor ID', f'Nilai ({unit})', 'Satuan', 'Status', 'Waktu']):
                ws.write(2, ci, h, fmt_hdr)

            # Data rows (row 3+)
            for ri, rec in enumerate(rows):
                row_idx = ri + 3
                ws.set_row(row_idx, 16)
                is_even = ri % 2 == 0
                fv = fmt_even if is_even else fmt_odd
                ft = fmt_even_t if is_even else fmt_odd_t

                ws.write(row_idx, 0, rec.get('sensorId'), fv)
                ws.write(row_idx, 1, rec.get('value'),    fv)
                ws.write(row_idx, 2, unit,                fv)

                is_active = rec.get('status') == 'active'
                ws.write(row_idx, 3, rec.get('status'),
                    fmt_active if is_active else fmt_inactive)

                ws.write(row_idx, 4,
                    fmt_time(rec.get('timestamp', '')), ft)

            last_row_sensor = 3 + len(rows)  # exclusive

            # Statistik per sensor
            sr = last_row_sensor + 1
            ws.merge_range(sr, 0, sr, 1, 'Ringkasan Statistik', fmt_hdr)
            stats_data = [
                ('Rata-rata',   f'=AVERAGE(B4:B{last_row_sensor})'),
                ('Minimum',     f'=MIN(B4:B{last_row_sensor})'),
                ('Maksimum',    f'=MAX(B4:B{last_row_sensor})'),
                ('Jumlah Data', f'=COUNT(B4:B{last_row_sensor})'),
            ]
            for ii, (lbl, formula) in enumerate(stats_data):
                r = sr + 1 + ii
                ws.write(r, 0, lbl, fmt_stat_l)
                if lbl == 'Jumlah Data':
                    ws.write_formula(r, 1, formula,
                        make_fmt(bg='#FFFFFF'))
                else:
                    ws.write_formula(r, 1, formula, fmt_stat_v)

            # Auto-format lebar kolom agar rapi
            ws.autofit()
            # Override khusus kolom nilai dan satuan agar tidak muncul #### dan rapi
            ws.set_column(1, 1, 14)
            ws.set_column(2, 2, 10)

            # ── Chart native per sensor ──────────────────────────────────────
            chart = wb.add_chart({'type': 'line'})
            chart.set_title({'name': f'Sensor {sid} — {cat_label}'})
            chart.set_x_axis({'name': 'Waktu'})
            chart.set_y_axis({'name': f'Nilai ({unit})', 'num_format': '0.00'})
            chart.set_style(10)
            chart.set_size({'width': 540, 'height': 300})
            chart.set_legend({'none': True})

            chart.add_series({
                'name':       sid,
                'categories': [s_name, 3, 4, last_row_sensor - 1, 4],  # kolom Waktu (index 4)
                'values':     [s_name, 3, 1, last_row_sensor - 1, 1],  # kolom Nilai (index 1)
                'line':       {'color': color, 'width': 2.5},
                'marker':     {'type': 'circle', 'size': 5,
                               'fill':   {'color': color},
                               'border': {'color': color}},
            })

            # Sisipkan chart di kolom G (index 6) baris 3
            ws.insert_chart(2, 6, chart)

    wb.close()


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    try:
        raw  = sys.stdin.read()
        data = json.loads(raw)

        tmp_dir  = tempfile.gettempdir()
        filename = f"sensor_report_{uuid.uuid4().hex[:8]}.xlsx"
        out_path = os.path.join(tmp_dir, filename)

        generate(data, out_path)

        # Output path ke stdout — Node.js akan membaca ini
        sys.stdout.write(out_path + '\n')
        sys.stdout.flush()
        sys.exit(0)

    except Exception as e:
        sys.stderr.write(f'[generate_xlsx.py] ERROR: {str(e)}\n')
        sys.exit(1)
