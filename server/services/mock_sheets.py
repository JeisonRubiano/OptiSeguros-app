import pandas as pd
import numpy as np
import os
import re

# Map frontend names to actual filenames
FILE_MAPPING = {
    "REPORTE": "REPORTE NEGOCIOS SALUD INTERNACIONAL -OPERACIONES 06112018.xlsx",
    "CONSECUTIVOS": "FORECAST CIERRE- CONSECUTIVOS.xlsx",
    "DETALLE": "Detalle  negocios nuevos y recaudos.xlsx",
    "CIERRE MES": "FORECAST CIERRE MES.xlsx",
    "CANCELACIONES": "SEGUIMIENTO CANCELACIONES 2025 (1) (1).xlsx"
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

def clean_currency(value):
    """Removes symbols like $, USD, - and converts to float."""
    if pd.isna(value):
        return 0
    str_val = str(value).upper()
    clean = re.sub(r'[^\d.]', '', str_val)
    try:
        return float(clean)
    except ValueError:
        return 0

def generate_mock_data(sheet_name):
    """Reads actual local Excel files with optimized DETALLE handling."""
    
    # Parse sheet name for sub-sheet requests
    search_name = sheet_name
    sub_sheet_request = None
    
    if "::" in search_name:
        parts = search_name.split("::")
        search_name = parts[0]
        
        # Extract meaningful parts (skip Corredores/A&A category names and empty strings)
        meaningful_parts = [p.strip() for p in parts[1:] if p.strip() and p.strip() not in ["Corredores", "A&A"]]
        
        if len(meaningful_parts) == 2:
            sub_sheet_request = f"{meaningful_parts[0]}-{meaningful_parts[1]}"
        elif len(meaningful_parts) == 1:
            sub_sheet_request = meaningful_parts[0]
        else:
            sub_sheet_request = parts[-1]
    
    # Find target file
    target_file = None
    for key, filename in FILE_MAPPING.items():
        if key in search_name.upper():
            target_file = filename
            break
    
    if not target_file:
        return [{"Info": "Archivo no configurado", "Nombre": sheet_name}]

    file_path = os.path.join(BASE_DIR, target_file)
    
    if not os.path.exists(file_path):
        return [{"Error": "Archivo no encontrado", "Path": file_path}]

    try:
        # =====================================================
        # FAST PATH: REPORTE - Uses unified cache, NO Excel reading
        # =====================================================
        if "REPORTE" in search_name.upper():
            from services.unified_data_processor import get_all_records
            
            print("[REPORTE] Usando caché unificado")
            todos = get_all_records()
            
            # Convertir a formato esperado por frontend
            return todos
        
        # =====================================================
        # FAST PATH: DETALLE - Uses cached DataFrame, NO Excel reading
        # =====================================================
        if "DETALLE" in search_name.upper():
            from services.data_processor import get_detalle_dataframe
            
            # Initial request -> Return Corredores/A&A options
            if not sub_sheet_request:
                return {
                    "type": "multi_sheet_metadata",
                    "sheets": ["Corredores", "A&A"],
                    "default": "Corredores"
                }
            
            # Get cached DataFrame
            df_full = get_detalle_dataframe()
            
            # "Corredores" -> Return year metadata
            if sub_sheet_request == "Corredores":
                years = []
                for y in df_full['AÑO'].dropna().unique():
                    try:
                        yr = int(float(y))
                        if 2000 <= yr <= 2030:
                            years.append(yr)
                    except:
                        continue
                years = sorted(years, reverse=True)
                return {
                    "type": "multi_sheet_metadata",
                    "sheets": [str(y) for y in years],
                    "default": str(years[0]) if years else "2025"
                }
            
            # Mapeo de nombres de mes a números
            MONTH_MAP = {
                'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
                'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
            }
            MONTH_NAMES = {v: k for k, v in MONTH_MAP.items()}
            
            # Columna de fecha de expedición
            FECHA_COL = 'FECHA EXPEDICION NEGOCIO'
            
            # Helper function to extract month/year from fecha expedicion
            def extract_date_parts(val):
                """Extrae año y mes de la fecha de expedición."""
                if pd.isna(val):
                    return None, None
                try:
                    if hasattr(val, 'year'):
                        return val.year, val.month
                    # Intenta parsear string formato YYYY-MM-DD o DD/MM/YYYY
                    s = str(val)
                    if '-' in s:
                        parts = s.split('-')
                        if len(parts[0]) == 4:  # YYYY-MM-DD
                            return int(parts[0]), int(parts[1])
                        else:  # DD-MM-YYYY
                            return int(parts[2]), int(parts[1])
                    if '/' in s:
                        parts = s.split('/')
                        if len(parts[2]) == 4:  # DD/MM/YYYY
                            return int(parts[2]), int(parts[1])
                        else:  # YYYY/MM/DD or MM/DD/YYYY
                            return int(parts[0]), int(parts[1])
                except:
                    pass
                return None, None
            
            # Year (e.g., "2025") -> Return month metadata (based on FECHA EXPEDICION)
            if sub_sheet_request.strip().isdigit() and len(sub_sheet_request.strip()) == 4:
                try:
                    year = int(sub_sheet_request.strip())
                except ValueError:
                    print(f"[ERROR] Invalid year format: {sub_sheet_request}")
                    return {"type": "multi_sheet_metadata", "sheets": [], "default": None}
                
                # Filtrar por año de fecha de expedición
                months_found = set()
                for val in df_full[FECHA_COL]:
                    y, m = extract_date_parts(val)
                    if y == year and m:
                        months_found.add(m)
                
                month_order = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                               'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
                sorted_months = [month_order[m-1] for m in sorted(months_found) if m <= 12]
                
                print(f"[DEBUG] Year {year}: found months based on FECHA EXPEDICION: {sorted_months}")
                return {
                    "type": "multi_sheet_metadata",
                    "sheets": sorted_months,
                    "default": sorted_months[-1] if sorted_months else "DICIEMBRE"
                }
            
            # "YEAR-MONTH" format -> Return filtered data (based on FECHA EXPEDICION)
            if "-" in sub_sheet_request:
                try:
                    parts = [p.strip() for p in sub_sheet_request.split("-")]
                    # Handle both "2026-ENERO" and potential "Corredores-2026" formats
                    if parts[0].isdigit():
                        year, month_name = int(parts[0]), parts[1].upper()
                    elif parts[1].isdigit():
                        year, month_name = int(parts[1]), parts[0].upper()
                    else:
                        raise ValueError(f"No valid year found in: {sub_sheet_request}")
                    
                    # Validate that month_name is a valid month
                    if month_name not in MONTH_MAP:
                        print(f"[ERROR] Invalid month name: {month_name} in request: {sub_sheet_request}")
                        return []
                        
                except (ValueError, IndexError) as e:
                    print(f"[ERROR] Invalid YEAR-MONTH format: {sub_sheet_request}, error: {e}")
                    return []
                    
                target_month = MONTH_MAP.get(month_name, 12)
                
                # Filtrar por fecha de expedición
                mask = df_full[FECHA_COL].apply(lambda val: extract_date_parts(val) == (year, target_month))
                df_filtered = df_full[mask]
                
                print(f"[DEBUG] Filter by FECHA EXPEDICION year={year}, month={month_name}: found {len(df_filtered)} rows")
                
                df_clean = df_filtered.drop(columns=['MES', 'AÑO'], errors='ignore')
                return df_clean.to_dict(orient='records')
            
            # Just month name -> Filter all years by month of fecha expedicion
            month_name = sub_sheet_request.upper().strip()
            target_month = MONTH_MAP.get(month_name, 12)
            mask = df_full[FECHA_COL].apply(lambda val: extract_date_parts(val)[1] == target_month)
            df_filtered = df_full[mask]
            df_clean = df_filtered.drop(columns=['MES'], errors='ignore')
            return df_clean.to_dict(orient='records')
        
        # =====================================================
        # STANDARD PATH: Other files (FORECAST, CONSECUTIVOS, etc.)
        # =====================================================
        if "CONSECUTIVOS" in search_name.upper() or "FORECAST" in search_name.upper() or "CANCELACIONES" in search_name.upper():
            xls = pd.ExcelFile(file_path)
            all_sheets = xls.sheet_names
            
            if not sub_sheet_request:
                if "CONSECUTIVOS" in search_name.upper():
                    monthly = [s for s in all_sheets if not s.startswith("Datos")]
                    return {"type": "multi_sheet_metadata", "sheets": monthly, "default": monthly[-1]}
                recent = all_sheets[-12:] if len(all_sheets) > 12 else all_sheets
                return {"type": "multi_sheet_metadata", "sheets": recent, "default": recent[-1]}
            
            # Read specific sheet
            if "FORECAST CIERRE MES" in search_name.upper():
                df = pd.read_excel(file_path, sheet_name=sub_sheet_request, header=3)
                if len(df.columns) >= 9:
                    new_df = pd.DataFrame()
                    new_df["Nombre"] = df.iloc[:, 1]
                    new_df["Meta"] = df.iloc[:, 2]
                    new_df["Real"] = df.iloc[:, 3]
                    new_df["Cumplimiento"] = df.iloc[:, 4]
                    new_df["Primas Expedidas"] = df.iloc[:, 5]
                    new_df["Primas Pagadas"] = df.iloc[:, 6]
                    new_df["Primas Pendientes"] = df.iloc[:, 7]
                    new_df["Primas Anuladas"] = df.iloc[:, 8]
                    df = new_df
            else:
                df = pd.read_excel(file_path, sheet_name=sub_sheet_request)
        else:
            # Generic file read
            df = pd.read_excel(file_path, sheet_name=0)
        
        # Clean currency columns
        price_cols = [c for c in df.columns if any(x in str(c).upper() for x in ["PRIMA", "VALOR", "PROYECC"])]
        for col in price_cols:
            df[col] = df[col].apply(clean_currency)

        # JSON safety
        df = df.replace([np.nan, np.inf, -np.inf], None)
        
        # Date formatting
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                df[col] = df[col].dt.strftime('%Y-%m-%d')
        
        df = df.fillna("").infer_objects(copy=False)
        return df.to_dict(orient='records')
        
    except Exception as e:
        print(f"Error reading sheet: {e}")
        return [{"Error": "Error al leer archivo", "Detalle": str(e)}]


class MockSheetsService:
    def connect(self):
        pass

    def get_sheet_data(self, sheet_name):
        return generate_mock_data(sheet_name)

mock_sheets_service = MockSheetsService()
