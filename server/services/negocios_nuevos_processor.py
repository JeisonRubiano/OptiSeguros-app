"""
Procesador optimizado para Negocios Nuevos.
Convierte Excel pesado a JSON ligero, filtrando por FECHA EXPEDICION NEGOCIO.
"""
import pandas as pd
import json
import os
from datetime import datetime
from pathlib import Path

# Apuntar al directorio raíz del proyecto (donde está el Excel)
BASE_DIR = Path(__file__).parent.parent.parent  # server/services -> server -> proyecto_raiz
EXCEL_FILE = BASE_DIR / "REPORTE NEGOCIOS SALUD INTERNACIONAL -OPERACIONES 06112018.xlsx"
CACHE_FILE = BASE_DIR / "server" / ".cache_negocios_nuevos.json"

def parse_fecha_expedicion(fecha_val):
    """
    Parsea FECHA EXPEDICION NEGOCIO de forma robusta.
    Retorna: (año, mes_numero, fecha_iso_string) o (None, None, None)
    """
    if pd.isna(fecha_val) or fecha_val == '':
        return None, None, None
    
    try:
        # Si ya es datetime
        if hasattr(fecha_val, 'year'):
            return fecha_val.year, fecha_val.month, fecha_val.isoformat()
        
        # Intentar parsear string
        fecha_str = str(fecha_val).strip()
        
        # Formato: DD/MM/YYYY o DD-MM-YYYY
        for sep in ['/', '-']:
            if sep in fecha_str:
                parts = fecha_str.split(sep)
                if len(parts) == 3:
                    try:
                        # Detectar formato
                        if len(parts[0]) == 4:  # YYYY/MM/DD
                            year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                        else:  # DD/MM/YYYY
                            day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                        
                        # Ajustar año de 2 dígitos
                        if year < 100:
                            year += 2000
                        
                        # Validar rango
                        if 2000 <= year <= 2030 and 1 <= month <= 12:
                            fecha_obj = datetime(year, month, day)
                            return year, month, fecha_obj.isoformat()
                    except (ValueError, IndexError):
                        continue
        
        return None, None, None
    except Exception as e:
        print(f"[WARN] Error parseando fecha '{fecha_val}': {e}")
        return None, None, None

def convert_excel_to_cache():
    """
    Convierte Excel a JSON optimizado, filtrando solo negocios con fecha de expedición.
    """
    print(f"[NEGOCIOS] Iniciando conversión de Excel a caché optimizado...")
    
    if not EXCEL_FILE.exists():
        raise FileNotFoundError(f"Excel no encontrado: {EXCEL_FILE}")
    
    # Leer Excel
    print(f"[NEGOCIOS] Leyendo Excel: {EXCEL_FILE.name}")
    df = pd.read_excel(EXCEL_FILE, sheet_name='REPORTE')
    print(f"[NEGOCIOS] Total registros leídos: {len(df)}")
    
    # Buscar columna de fecha de expedición (manejo de encoding)
    fecha_col = None
    for col in df.columns:
        col_upper = str(col).upper()
        if 'EXPEDI' in col_upper and 'NEGOCIO' in col_upper:
            fecha_col = col
            break
    
    if not fecha_col:
        raise ValueError("No se encontró columna 'FECHA EXPEDICION NEGOCIO'")
    
    print(f"[NEGOCIOS] Columna de fecha detectada: '{fecha_col}'")
    
    # Normalizar nombres de columnas clave
    column_mapping = {}
    for col in df.columns:
        col_upper = str(col).upper().strip()
        if 'EXPEDI' in col_upper and 'NEGOCIO' in col_upper:
            column_mapping[col] = 'FECHA_EXPEDICION'
        elif col_upper in ['CONSECUTIVO']:
            column_mapping[col] = 'CONSECUTIVO'
        elif col_upper in ['LOCALIDAD', 'SUCURSAL']:
            column_mapping[col] = 'LOCALIDAD'
        elif 'ASEGURADO' in col_upper:
            column_mapping[col] = 'ASEGURADO'
        elif 'PRODUCTO' in col_upper:
            column_mapping[col] = 'PRODUCTO'
        elif 'POLIZA' in col_upper and 'EMITIDA' in col_upper:
            column_mapping[col] = 'POLIZA'
        elif 'PRIMA TOTAL' in col_upper and 'DOLARES' in col_upper:
            column_mapping[col] = 'PRIMA_TOTAL_USD'
        elif 'PRIMA' in col_upper and 'SIN IVA' in col_upper and 'DOLARES' in col_upper:
            column_mapping[col] = 'PRIMA_SIN_IVA_USD'
        elif col_upper in ['ESTADO']:
            column_mapping[col] = 'ESTADO'
        elif 'CLAVE' in col_upper:
            column_mapping[col] = 'CORREDOR'
    
    df.rename(columns=column_mapping, inplace=True)
    
    # Procesar registros
    negocios_nuevos = []
    sin_fecha = 0
    
    for idx, row in df.iterrows():
        # Parsear fecha de expedición
        year, month, fecha_iso = parse_fecha_expedicion(row.get('FECHA_EXPEDICION'))
        
        if year is None:
            sin_fecha += 1
            continue  # Saltar registros sin fecha válida
        
        # Extraer datos relevantes
        registro = {
            'AÑO': year,
            'MES': month,
            'FECHA_EXPEDICION': fecha_iso,
            'CONSECUTIVO': str(row.get('CONSECUTIVO', '')).strip(),
            'LOCALIDAD': str(row.get('LOCALIDAD', '')).strip(),
            'CORREDOR': str(row.get('CORREDOR', '')).strip(),
            'ASEGURADO': str(row.get('ASEGURADO', '')).strip(),
            'PRODUCTO': str(row.get('PRODUCTO', '')).strip(),
            'POLIZA': str(row.get('POLIZA', '')).strip(),
            'PRIMA_TOTAL_USD': float(row.get('PRIMA_TOTAL_USD', 0)) if pd.notna(row.get('PRIMA_TOTAL_USD')) else 0,
            'PRIMA_SIN_IVA_USD': float(row.get('PRIMA_SIN_IVA_USD', 0)) if pd.notna(row.get('PRIMA_SIN_IVA_USD')) else 0,
            'ESTADO': str(row.get('ESTADO', '')).strip()
        }
        
        negocios_nuevos.append(registro)
    
    print(f"[NEGOCIOS] Negocios con fecha válida: {len(negocios_nuevos)}")
    print(f"[NEGOCIOS] Registros sin fecha (ignorados): {sin_fecha}")
    
    # Guardar en caché
    cache_data = {
        'timestamp': datetime.now().isoformat(),
        'total_negocios': len(negocios_nuevos),
        'negocios': negocios_nuevos
    }
    
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2)
    
    print(f"[NEGOCIOS] Caché guardado: {CACHE_FILE}")
    return cache_data

def load_negocios_cache():
    """
    Carga caché de negocios nuevos. Si no existe o está desactualizado, lo regenera.
    """
    # Verificar si existe caché
    if not CACHE_FILE.exists():
        print("[NEGOCIOS] Caché no existe. Generando...")
        return convert_excel_to_cache()
    
    # Verificar si Excel es más reciente que caché
    if EXCEL_FILE.exists():
        excel_mtime = EXCEL_FILE.stat().st_mtime
        cache_mtime = CACHE_FILE.stat().st_mtime
        
        if excel_mtime > cache_mtime:
            print("[NEGOCIOS] Excel modificado. Regenerando caché...")
            return convert_excel_to_cache()
    
    # Cargar caché existente
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
        
        timestamp = datetime.fromisoformat(cache_data['timestamp'])
        age_hours = (datetime.now() - timestamp).total_seconds() / 3600
        
        print(f"[NEGOCIOS] Caché cargado ({age_hours:.1f}h antiguo, {cache_data['total_negocios']} negocios)")
        return cache_data
    except Exception as e:
        print(f"[NEGOCIOS] Error leyendo caché: {e}. Regenerando...")
        return convert_excel_to_cache()

def get_available_years():
    """Retorna lista de años disponibles (ordenados desc)."""
    cache = load_negocios_cache()
    years = sorted(set(n['AÑO'] for n in cache['negocios']), reverse=True)
    return years

def get_available_months(year):
    """Retorna lista de meses disponibles para un año (ordenados)."""
    cache = load_negocios_cache()
    
    # Filtrar por año
    negocios_year = [n for n in cache['negocios'] if n['AÑO'] == int(year)]
    
    # Obtener meses únicos
    months_num = sorted(set(n['MES'] for n in negocios_year))
    
    # Convertir a nombres
    month_names = {
        1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
        5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
        9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
    }
    
    return [month_names[m] for m in months_num if m in month_names]

def get_negocios_by_month(year, month_name):
    """Retorna negocios filtrados por año y mes."""
    cache = load_negocios_cache()
    
    # Convertir nombre de mes a número
    month_map = {
        'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
        'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
        'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
    }
    
    month_num = month_map.get(month_name.upper())
    if not month_num:
        return []
    
    # Filtrar
    negocios_filtered = [
        n for n in cache['negocios']
        if n['AÑO'] == int(year) and n['MES'] == month_num
    ]
    
    return negocios_filtered
