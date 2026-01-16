import pandas as pd
import os

file_path = r'c:\Users\Jeison\Documents\Proyectos trabajo\Proyeto Pasantia\Detalle  negocios nuevos y recaudos.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    print("Sheets found:", xl.sheet_names)
    
    for sheet in xl.sheet_names:
        try:
            df_sheet = pd.read_excel(file_path, sheet_name=sheet)
            print(f"Sheet '{sheet}': {len(df_sheet)} rows")
            if len(df_sheet) > 0:
                print(f"  Columns: {df_sheet.columns.tolist()[:5]}...")
        except Exception as e:
            print(f"  Error reading sheet '{sheet}': {e}")
except Exception as e:
    print(f"Error reading excel: {e}")
