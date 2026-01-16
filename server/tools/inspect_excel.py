import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE_PATH = r"c:/Users/Jeison/Documents/Proyectos trabajo/Proyeto Pasantia/REPORTE NEGOCIOS SALUD INTERNACIONAL -OPERACIONES 06112018.xlsx"

print(f"Inspecting file: {FILE_PATH}")

try:
    if not os.path.exists(FILE_PATH):
        print("ERROR: File not found!")
        exit(1)

    print("Reading Excel file... (this may take a moment)")
    df = pd.read_excel(FILE_PATH, sheet_name='REPORTE')
    
    print("\nColumns found:")
    print(df.columns.tolist())
    
    print("\nLooking for YEAR columns:")
    year_cols = [c for c in df.columns if 'AÑO' in str(c).upper() or 'AO' in str(c).upper() or 'YEAR' in str(c).upper()]
    print(f"Potential Year columns: {year_cols}")
    
    for col in year_cols:
        print(f"\nUnique values in '{col}':")
        print(df[col].unique()[:20]) # Show first 20 unique values
        
    print("\nRow count:", len(df))

except Exception as e:
    print(f"Error: {e}")
