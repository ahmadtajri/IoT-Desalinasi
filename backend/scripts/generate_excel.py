import sys
import json
import pandas as pd
import argparse
import os

# Define Sensor Groups and Colors
SENSOR_GROUPS = {
    'suhuUdara': {
        'label': 'Suhu Udara (°C)',
        'sensors': ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7_X'],
        'header_color': '#FF6B35',
        'line_colors': ['#FF6B35', '#FF8C00', '#FF4500', '#DC7828', '#FFA54F', '#C85014', '#A04010']
    },
    'suhuAir': {
        'label': 'Suhu Air (°C)',
        'sensors': ['T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'T13_X'],
        'header_color': '#0099CC',
        'line_colors': ['#0099CC', '#0077BB', '#46B4DC', '#1E64A0', '#64C8E6', '#00508C', '#004070']
    },
    'kelembapan': {
        'label': 'Kelembapan (%)',
        'sensors': ['RH1', 'RH2', 'RH3', 'RH4', 'RH5', 'RH6', 'RH7_X'],
        'header_color': '#2196F3',
        'line_colors': ['#2196F3', '#1976D2', '#42A5F5', '#0D47A1', '#64B5F6', '#1565C0', '#0A3080']
    }
}

DUMMY_COLUMNS = ['T7_X', 'T13_X', 'RH7_X']

ALL_SENSOR_ORDER = (
    SENSOR_GROUPS['suhuUdara']['sensors'] +
    SENSOR_GROUPS['suhuAir']['sensors'] +
    SENSOR_GROUPS['kelembapan']['sensors']
)

def get_sensor_info(sensor_id):
    for key, group in SENSOR_GROUPS.items():
        if sensor_id in group['sensors']:
            idx = group['sensors'].index(sensor_id)
            color = group['line_colors'][idx]
            header = group['header_color']
            unit = '%' if key == 'kelembapan' else '°C'
            return header, color, unit
    return '#333333', '#666666', ''

def main():
    parser = argparse.ArgumentParser(description='Generate Excel with Native Charts')
    parser.add_argument('input_json', help='Path to input JSON file containing pivot rows')
    parser.add_argument('output_xlsx', help='Path to output XLSX file')
    parser.add_argument('--title', default='Laporan Visualisasi Desalinasi', help='Report Title')
    args = parser.parse_args()

    if not os.path.exists(args.input_json):
        print(f"Error: File not found {args.input_json}")
        sys.exit(1)

    with open(args.input_json, 'r', encoding='utf-8') as f:
        pivot_rows = json.load(f)

    if not pivot_rows:
        # Create empty excel if no data
        wb = pd.ExcelWriter(args.output_xlsx, engine='xlsxwriter')
        ws = wb.book.add_worksheet("No Data")
        ws.write(0, 0, "No data available")
        wb.close()
        return

    # Convert to DataFrame
    df = pd.DataFrame(pivot_rows)
    
    # Ensure all sensor columns exist
    for col in ALL_SENSOR_ORDER:
        if col not in df.columns:
            df[col] = None

    # Create ExcelWriter using XlsxWriter
    writer = pd.ExcelWriter(args.output_xlsx, engine='xlsxwriter')
    workbook = writer.book

    # Formats
    header_format = workbook.add_format({
        'bold': True, 'font_color': 'white', 'bg_color': '#333333',
        'align': 'center', 'valign': 'vcenter', 'border': 1
    })
    cell_format = workbook.add_format({
        'align': 'center', 'border': 1, 'num_format': '0.00'
    })
    time_format = workbook.add_format({
        'align': 'left', 'border': 1
    })

    # --- DASHBOARD SHEET ---
    sheet_name = 'Dashboard'
    worksheet = workbook.add_worksheet(sheet_name)
    worksheet.freeze_panes(1, 0) # Freeze top row

    # Write Headers
    worksheet.set_column(0, 0, 20) # Waktu column width
    worksheet.write(0, 0, 'Waktu', header_format)
    
    col_idx = 1
    header_formats = {}
    
    # Pre-create header formats for groups
    for group_key, group in SENSOR_GROUPS.items():
        fmt = workbook.add_format({
            'bold': True, 'font_color': 'white', 'bg_color': group['header_color'],
            'align': 'center', 'valign': 'vcenter', 'border': 1
        })
        header_formats[group_key] = fmt

    for sensor_id in ALL_SENSOR_ORDER:
        worksheet.set_column(col_idx, col_idx, 9)
        # Find which group this sensor belongs to
        fmt = header_format
        for group_key, group in SENSOR_GROUPS.items():
            if sensor_id in group['sensors']:
                fmt = header_formats[group_key]
                break
        worksheet.write(0, col_idx, sensor_id, fmt)
        col_idx += 1

    # Write Data
    for row_idx, row in df.iterrows():
        excel_row = row_idx + 1
        
        c_fmt = cell_format
        t_fmt = time_format
        
        worksheet.write(excel_row, 0, str(row.get('waktuLengkap', '')), t_fmt)
        
        c_idx = 1
        for sensor_id in ALL_SENSOR_ORDER:
            val = row.get(sensor_id)
            if pd.isna(val) or val is None:
                worksheet.write(excel_row, c_idx, "", c_fmt)
            else:
                worksheet.write_number(excel_row, c_idx, float(val), c_fmt)
            c_idx += 1

    # Add Charts to Dashboard
    chart_start_col = 'W' # Column 22
    chart_row_cursor = 1

    for group_key, group in SENSOR_GROUPS.items():
        chart = workbook.add_chart({'type': 'line'})
        
        sensors_in_group = [s for s in group['sensors'] if s not in DUMMY_COLUMNS]
        has_data = False

        for i, sensor_id in enumerate(sensors_in_group):
            # Check if this sensor has any non-null data
            if df[sensor_id].notna().any():
                has_data = True
                col_num = ALL_SENSOR_ORDER.index(sensor_id) + 1
                color = group['line_colors'][i]
                
                chart.add_series({
                    'name':       [sheet_name, 0, col_num],
                    'categories': [sheet_name, 1, 0, len(df), 0],
                    'values':     [sheet_name, 1, col_num, len(df), col_num],
                    'line':       {'color': color, 'width': 1.5},
                    'marker':     {'type': 'none'}
                })

        if has_data:
            chart.set_title({'name': group['label']})
            chart.set_x_axis({'name': 'Waktu', 'label_position': 'low'})
            y_title = 'Temperatur (°C)' if 'Suhu' in group['label'] else 'Kelembapan (%)'
            chart.set_y_axis({'name': y_title})
            chart.set_legend({'position': 'bottom'})
            chart.set_size({'width': 700, 'height': 350})
            
            worksheet.insert_chart(f'{chart_start_col}{chart_row_cursor}', chart)
            chart_row_cursor += 18

    # --- INDIVIDUAL SENSOR SHEETS ---
    real_sensors = [s for s in ALL_SENSOR_ORDER if s not in DUMMY_COLUMNS]
    
    for sensor_id in real_sensors:
        if df[sensor_id].notna().any():
            sheet_name = f'Sensor_{sensor_id}'
            ws = workbook.add_worksheet(sheet_name)
            ws.freeze_panes(1, 0)
            
            h_color, l_color, unit = get_sensor_info(sensor_id)
            
            s_header_fmt = workbook.add_format({
                'bold': True, 'font_color': 'white', 'bg_color': h_color,
                'align': 'center', 'valign': 'vcenter', 'border': 1
            })
            
            ws.set_column(0, 0, 12)
            ws.set_column(1, 1, 15)
            
            ws.write(0, 0, 'Jam', s_header_fmt)
            ws.write(0, 1, f'Nilai_{sensor_id}', s_header_fmt)
            
            # Filter rows with data
            valid_df = df[df[sensor_id].notna()].reset_index(drop=True)
            
            for row_idx, row in valid_df.iterrows():
                e_row = row_idx + 1
                ws.write(e_row, 0, str(row.get('waktuSaja', '')), cell_format)
                ws.write_number(e_row, 1, float(row[sensor_id]), cell_format)
                
            # Add Chart
            if len(valid_df) > 1:
                chart = workbook.add_chart({'type': 'line'})
                chart.add_series({
                    'name':       [sheet_name, 0, 1],
                    'categories': [sheet_name, 1, 0, len(valid_df), 0],
                    'values':     [sheet_name, 1, 1, len(valid_df), 1],
                    'line':       {'color': l_color, 'width': 2},
                    'marker':     {'type': 'none'}
                })
                
                chart.set_title({'name': f'Pergerakan {sensor_id} ({unit})'})
                chart.set_x_axis({'name': 'Jam'})
                chart.set_y_axis({'name': f'Nilai ({unit})'})
                chart.set_legend({'position': 'none'})
                chart.set_size({'width': 600, 'height': 300})
                
                ws.insert_chart('D2', chart)

    workbook.close()

if __name__ == "__main__":
    main()
