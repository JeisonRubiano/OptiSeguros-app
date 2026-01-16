
import pandas as pd

file_path = r'c:\Users\Jeison\Documents\Proyectos trabajo\Proyeto Pasantia\Detalle  negocios nuevos y recaudos.xlsx'
sheet_name = 'ENE 2024'

try:
    print(f"Reading '{sheet_name}'...")
    # Read without header to access by index (O=14, S=18) easily, or read with header and select by index
    # O is 15th letter -> index 14
    # S is 19th letter -> index 18
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=None, nrows=10)
    
    print("--- Sample Data (Rows 0-10) ---")
    # Print columns 14 (O) and 18 (S)
    # We might need to adjust if there are empty columns or offsets. 
    # Usually Excel reading skips empty columns? No, pandas read_excel keeps them if they are within the range or if headers exist.
    # Let's check what's at index 14 and 18.
    
    for i, row in df.iterrows():
        val_o = row.iloc[14] if len(row) > 14 else "N/A"
        val_s = row.iloc[18] if len(row) > 18 else "N/A"
        print(f"Row {i}: Col O (Poliza/Consecutivo?): '{val_o}' | Col S (Estado): '{val_s}'")

except Exception as e:
    print(f"Error: {e}")
