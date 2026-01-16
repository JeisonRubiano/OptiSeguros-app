"""
Procesador Unificado de Datos - Lee Excel UNA VEZ y sirve a todos los módulos.
Reemplaza: data_processor.py, negocios_nuevos_processor.py, mock_sheets.py (parcialmente)
"""
import pandas as pd
import json
import os
from datetime import datetime
from pathlib import Path
import numpy as np

# Rutas
# Usamos ruta relativa desde 'services/' para ser compatibles con Docker y Local
# Estructura Local:  .../server/services/unified.py -> ../../server/data
# Estructura Docker: /app/services/unified.py       -> ../../app/data
BASE_DIR = Path(__file__).resolve().parent.parent # Sube 2 niveles: services -> server (o app)

EXCEL_FILE = BASE_DIR.parent / "REPORTE NEGOCIOS SALUD INTERNACIONAL -OPERACIONES 06112018.xlsx"
# En Docker el Excel está en la raiz /app (que es BASE_DIR), en local está en PROJECT_ROOT (BASE_DIR.parent)
# Ajuste fino: Buscamos Excel en BASE_DIR primero (Docker), si no en BASE_DIR.parent (Local)
if (BASE_DIR / "REPORTE NEGOCIOS SALUD INTERNACIONAL -OPERACIONES 06112018.xlsx").exists():
    EXCEL_FILE = BASE_DIR / "REPORTE NEGOCIOS SALUD INTERNACIONAL -OPERACIONES 06112018.xlsx"

CACHE_FILE = BASE_DIR / ".cache_unified.json"

# Caché en memoria (singleton)
_unified_cache = {
    'loaded': False,
    'data': None
}

def clean_currency_value(value):
    """
    Convierte valores monetarios a float.
    Maneja TODOS los formatos: US$, USD$, UDS$, USAD$, usd$, espacios, puntos, comas, etc.
    """
    if pd.isna(value) or value == '' or str(value).strip() == '':
        return 0.0
    
    try:
        # Si ya es número
        if isinstance(value, (int, float)):
            return float(value)
        
        # Limpiar string
        s = str(value).strip().upper()
        
        # Detectar si parece una fecha (formato YYYY-MM-DD HH:MM:SS)
        if '-' in s and ':' in s and len(s) > 10:
            return 0.0  # Es una fecha, no un valor monetario
        
        # Remover TODOS los símbolos de moneda y variaciones
        currency_symbols = ['US$', 'USD$', 'UDS$', 'USAD$', 'UAD$', 'ISD$', 'USS$', 'USD&', 'USD%', 
                           'US%', 'US4', 'US5', 'US3', 'US ', '$US', '-US$', 'SD$']
        for symbol in currency_symbols:
            s = s.replace(symbol, '')
        
        # Remover $ restante y caracteres no numéricos excepto . y , y -
        s = s.replace('$', '').replace(' ', '').replace('\t', '')
        
        # Manejar casos especiales
        if not s or s == '-':
            return 0.0
            
        # Algoritmo heurístico para separadores
        # 1. Si hay ',' y '.' -> el que esté más a la derecha es el decimal
        # 2. Si solo hay ',' -> si hay 1 o 2 dígitos después, es decimal. Si hay 3, es miles.
        # 3. Si solo hay '.' -> ídem
        
        if ',' in s and '.' in s:
            if s.rindex(',') > s.rindex('.'): # Caso 1.234,56
                s = s.replace('.', '').replace(',', '.')
            else: # Caso 1,234.56
                s = s.replace(',', '')
        elif ',' in s:
            parts = s.split(',')
            if len(parts) > 1 and len(parts[-1]) == 3: # Caso 1,234 (miles)
                s = s.replace(',', '')
            else: # Caso 12,34 (decimal)
                s = s.replace(',', '.')
        # Si solo hay puntos, python lo interpreta bien (1234.56), 
        # excepto si son miles europeos (1.234) -> eso fallará o dará valor erróneo
        # Pero asumimos punto = decimal por defecto en sistemas US
        
        # Limpiar punto final
        if s.endswith('.'):
            s = s[:-1]
            
        return float(s)
    except (ValueError, AttributeError):
        # Fallback: intentar extraer solo números y punto
        try:
            import re
            nums = re.findall(r"[-+]?\d*\.\d+|\d+", str(value))
            if nums:
                return float(nums[0])
        except:
            pass
        return 0.0

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
                        if 2000 <= year <= 2030 and 1 <= month <= 12 and 1 <= day <= 31:
                            fecha_obj = datetime(year, month, day)
                            return year, month, fecha_obj.isoformat()
                    except (ValueError, IndexError):
                        continue
        
        return None, None, None
    except Exception as e:
        return None, None, None

def get_regional(localidad):
    """Mapea localidad/sucursal a regional usando el mapa COMPLETO."""
    # Cargar mapeo desde JSON
    SUCURSAL_TO_REGIONAL = {}
    mapping_file = BASE_DIR / "data" / "regional_mapping.json"
    
    if mapping_file.exists():
        try:
            with open(mapping_file, 'r', encoding='utf-8') as f:
                SUCURSAL_TO_REGIONAL = json.load(f)
        except Exception as e:
            print(f"[ERROR] Loading regional mapping: {e}")
            # Fallback (empty or critical default)
    else:
        print("[WARNING] Regional mapping file not found!")

    
    # Limpiar encoding
    localidad_clean = str(localidad) # Simple string conversion if clean_encoding missing
    localidad_upper = localidad_clean.upper().strip()
    
    # 1. Búsqueda exacta rápida
    if localidad_upper in SUCURSAL_TO_REGIONAL:
        print(f"[DEBUG] Exact Match: {localidad_upper} -> {SUCURSAL_TO_REGIONAL[localidad_upper]}")
        return SUCURSAL_TO_REGIONAL[localidad_upper]
    
    # 2. Búsqueda por palabras clave (Lógica Legacy)
    
    # IMPORTANTE: Verificar CORREDORES PRIMERO
    if 'CORREDOR' in localidad_upper:
        if 'MEDELLIN' in localidad_upper or 'MEDELL' in localidad_upper:
            return 'CORREDORES MEDELLIN'
        if 'BARRANQUILLA' in localidad_upper:
            return 'CORREDORES BARRANQUILLA'
        if 'CALI' in localidad_upper:
            return 'CORREDORES CALI'
        if 'BUCARAMANGA' in localidad_upper or 'BUCARA' in localidad_upper:
            return 'CORREDORES BUCARAMANGA'
        if 'BOGOTA' in localidad_upper or 'BOGOT' in localidad_upper:
            return 'CORREDORES BOGOTA'
        return 'CORREDORES' 

    # Buscar coincidencia parcial inversa dictionary keys in input
    # Ex: "123 - A&A BOGOTA" contains "BOGOTA"
    for suc, reg in SUCURSAL_TO_REGIONAL.items():
        if suc in localidad_upper:
             # print(f"[DEBUG] Fuzzy Match: '{suc}' in '{localidad_upper}' -> {reg}")
             return reg
            
    # Palabras clave específicas
    if 'IBAGUE' in localidad_upper or 'IBAG' in localidad_upper: return 'CENTRO'
    if 'NEIVA' in localidad_upper: return 'CENTRO'
    if 'BUCARAMANGA' in localidad_upper or 'BUCARA' in localidad_upper: return 'CENTRO'
    if 'CUCUTA' in localidad_upper or 'CÚCUTA' in localidad_upper: return 'CENTRO'
    if 'VILLAVICENCIO' in localidad_upper or 'VILLAVI' in localidad_upper: return 'CENTRO'
    
    if 'MEDELLIN' in localidad_upper or 'MEDELL' in localidad_upper: return 'ANTIOQUIA Y EJE CAFETERO'
    if 'BOGOTA' in localidad_upper or 'BOGOT' in localidad_upper: return 'BOGOTÁ'
    if 'BARRANQUILLA' in localidad_upper: return 'CARIBE'
    if 'CALI' in localidad_upper and 'FIDELIZ' not in localidad_upper: return 'SUROCCIDENTE'
    
    if 'AGENCIAS' in localidad_upper or 'MULTIPLES' in localidad_upper: return 'SAM'
    if 'DIRECTOS' in localidad_upper: return 'SES'
    if 'EMPLEADOS' in localidad_upper: return 'SES'
    
    print(f"[DEBUG] No Match: {localidad_upper} -> OTRA")
    return 'OTRA'

def convert_excel_to_unified_cache():
    """
    Convierte Excel a caché unificado JSON.
    Lee UNA VEZ y genera estructura para todos los módulos.
    """
    print("=" * 60)
    print("[UNIFIED] Iniciando conversión de Excel a caché unificado...")
    print("=" * 60)
    
    if not EXCEL_FILE.exists():
        raise FileNotFoundError(f"Excel no encontrado: {EXCEL_FILE}")
    
    # Leer Excel
    print(f"[UNIFIED] Leyendo Excel: {EXCEL_FILE.name}")
    df = pd.read_excel(EXCEL_FILE, sheet_name='REPORTE')
    
    # Eliminación de columnas duplicadas (causa probable de 'ASEGURADO 1 Name:...')
    df = df.loc[:, ~df.columns.duplicated()]
    print(f"[UNIFIED] Total registros leídos: {len(df)}")
    
    # Normalizar nombres de columnas (manejar encoding)
    print("[UNIFIED] Normalizando nombres de columnas...")
    column_mapping = {}
    
    # Mapeo inverso para prioridad (evita sobrescribir con columnas "parecidas")
    # Usamos una lista de "columnas ya mapeadas" para no asignar dos veces
    mapped_targets = set()
    
    for col in df.columns:
        col_upper = str(col).upper().strip()
        
        # Fecha de expedición
        if 'EXPEDI' in col_upper and 'NEGOCIO' in col_upper and 'FECHA_EXPEDICION' not in mapped_targets:
            column_mapping[col] = 'FECHA_EXPEDICION'
            mapped_targets.add('FECHA_EXPEDICION')
            
        # Consecutivo
        elif col_upper == 'CONSECUTIVO' and 'CONSECUTIVO' not in mapped_targets:
            column_mapping[col] = 'CONSECUTIVO'
            mapped_targets.add('CONSECUTIVO')
            
        # Localidad
        elif col_upper in ['LOCALIDAD', 'SUCURSAL'] and 'LOCALIDAD' not in mapped_targets:
            column_mapping[col] = 'LOCALIDAD'
            mapped_targets.add('LOCALIDAD')
            
        # Asegurado (Causa del error: ASEGURADO 1, ASEGURADO 2, etc.)
        # Buscamos SOLO 'ASEGURADO' exacto o el primero que contenga ASEGURADO
        elif 'ASEGURADO' in col_upper and 'ASEGURADO' not in mapped_targets:
            # Priorizar "ASEGURADO" exacto sobre "ASEGURADO DIRECCION", etc.
            if col_upper == 'ASEGURADO':
                 column_mapping[col] = 'ASEGURADO'
                 mapped_targets.add('ASEGURADO')
            elif col_upper.startswith("ASEGURADO"): # Fallback
                 column_mapping[col] = 'ASEGURADO'
                 mapped_targets.add('ASEGURADO')

        # Producto
        elif 'PRODUCTO' in col_upper:
            column_mapping[col] = 'PRODUCTO'
        # Póliza (Broadened search)
        elif ('POLIZA' in col_upper or 'PÓLIZA' in col_upper) and 'EMITIDA' in col_upper:
            column_mapping[col] = 'POLIZA'
        elif ('NUMERO' in col_upper or 'NÚMERO' in col_upper) and ('POLIZA' in col_upper or 'PÓLIZA' in col_upper):
             column_mapping[col] = 'POLIZA'
        # Fallback for just "POLIZA" if not assigned yet
        elif col_upper == 'POLIZA' or col_upper == 'PÓLIZA':
             column_mapping[col] = 'POLIZA'
             
        # Prima Total USD
        elif 'PRIMA' in col_upper and 'TOTAL' in col_upper and 'DOLARES' in col_upper:
            column_mapping[col] = 'PRIMA_TOTAL_USD'
        # Prima Sin IVA USD
        elif 'PRIMA' in col_upper and 'SIN IVA' in col_upper and 'DOLARES' in col_upper:
            column_mapping[col] = 'PRIMA_SIN_IVA_USD'
        # Estado
        elif col_upper == 'ESTADO':
            column_mapping[col] = 'ESTADO'
        # Corredor (Clave)
        elif 'CLAVE' in col_upper:
            column_mapping[col] = 'CORREDOR'
        # Año
        elif col_upper in ['AÑO', 'ANO', 'AO', 'AÑO.', '# AÑO', 'G AÑO', 'G ANO']:
            column_mapping[col] = 'AÑO'
        # Mes
        elif col_upper in ['MES', 'MES.', '# MES', 'F MES']:
            column_mapping[col] = 'MES'
    
    df.rename(columns=column_mapping, inplace=True)
    print(f"[UNIFIED] Columnas normalizadas: {list(column_mapping.values())}")
    
    # Procesar registros
    negocios_nuevos = []
    consecutivos = []
    todos = []
    
    sin_fecha = 0
    con_fecha = 0
    
    print("[UNIFIED] Procesando registros...")

    def clean_bad_string_artifacts(val):
        """Limpia artefactos de conversión a string de Pandas (Series, Name: ..., dtype: object)."""
        if pd.isna(val):
            return ""
        
        s = str(val).strip()
        
        # Detectar artefactos de Pandas Series convertida a string
        if "Name:" in s and "dtype:" in s:
            parts = s.split('\n')
            if parts:
                return parts[0].strip()
            return s.split('Name:')[0].strip()
            
        return s

    def normalize_to_int_month(val):
        """Convierte MES (que puede ser 'ENE', 'ENERO', '01', 1) a entero 1-12."""
        if pd.isna(val) or val == '':
            return 0
        
        s = str(val).strip().upper()
        
        # Intento directo de conversión a número
        try:
            return int(float(s))
        except:
            pass
            
        # Mapeo de nombres
        m_map = {
            'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
            'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
            'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
        }
        
        return m_map.get(s, 0)

    for idx, row in df.iterrows():
        # Validar si el registro tiene contenido mínimo relevante
        # Si NO tiene Consecutivo, NI Asegurado, NI Póliza, se considera vacío/basura
        _c = str(row.get('CONSECUTIVO', ''))
        _a = str(row.get('ASEGURADO', ''))
        _p = str(row.get('POLIZA', ''))
        
        # Check simple para "nan", "None", o vacio
        if (not _c or _c.lower() in ['nan', 'none', '']) and \
           (not _a or _a.lower() in ['nan', 'none', '']) and \
           (not _p or _p.lower() in ['nan', 'none', '']):
            continue

        # Parsear fecha de expedición
        year, month, fecha_iso = parse_fecha_expedicion(row.get('FECHA_EXPEDICION'))
        
        # Obtener MES normalizado para consecutivos
        # Usamos la columna explícita 'MES' si existe, normalizándola a entero
        mes_raw = row.get('MES', '')
        mes_int = normalize_to_int_month(mes_raw)
        
        # Limpiar valores monetarios
        prima_total = clean_currency_value(row.get('PRIMA_TOTAL_USD'))
        prima_sin_iva = clean_currency_value(row.get('PRIMA_SIN_IVA_USD'))
        
        # Extraer datos comunes
        consecutivo = str(row.get('CONSECUTIVO', '')).strip()
        localidad = str(row.get('LOCALIDAD', '')).strip()
        regional = get_regional(localidad)
        
        # Registro base para "todos" (Reporte Principal)
        registro_completo = {
            'ESTADO': str(row.get('ESTADO', '')).strip(),
            'POLIZA': str(row.get('POLIZA', '')).strip(),
            'REGIONAL': regional,
            'LOCALIDAD': localidad,
            'CORREDOR': str(row.get('CORREDOR', '')).strip(),
            'ASEGURADO': str(row.get('ASEGURADO', '')).strip(),
            'CONSECUTIVO': consecutivo,
            'PRODUCTO': str(row.get('PRODUCTO', '')).strip(),
            'PRIMA_TOTAL_USD': prima_total,
            'PRIMA_SIN_IVA_USD': prima_sin_iva,
            'PRIMA_TOTAL_USD': prima_total,
            'PRIMA_SIN_IVA_USD': prima_sin_iva,
            'PRIMA_TOTAL_USD': prima_total,
            'PRIMA_SIN_IVA_USD': prima_sin_iva,
            'AÑO': 0, # Placeholder, will update below
            'MES': mes_int,
            'FECHA_EXPEDICION': fecha_iso
        }
        
        # Robust Parse Year
        try:
             y_val = row.get('AÑO', 0)
             if pd.notna(y_val):
                 registro_completo['AÑO'] = int(float(y_val))
        except:
             registro_completo['AÑO'] = 0
        
        todos.append(registro_completo)
        
        # Clasificar en Negocios Nuevos o Consecutivos
        if year is not None and year > 2000:
            # NEGOCIO NUEVO: Orden Específico Solicitado
            negocio = {
                'ESTADO': registro_completo['ESTADO'],
                'POLIZA': registro_completo['POLIZA'],
                'REGIONAL': regional,
                'LOCALIDAD': localidad,
                'CORREDOR': registro_completo['CORREDOR'],
                'ASEGURADO': registro_completo['ASEGURADO'],
                'PRODUCTO': registro_completo['PRODUCTO'],
                'PRIMA_TOTAL_USD': prima_total,
                'PRIMA_SIN_IVA_USD': prima_sin_iva,
                'FECHA_EXPEDICION': fecha_iso,
                'AÑO': year,
                'MES': month,
                'CONSECUTIVO': consecutivo
            }
            negocios_nuevos.append(negocio)
            con_fecha += 1
        else:
            # CONSECUTIVO: Sin fecha de expedición o incompleto
            consecutivo_rec = {
                'Estado': registro_completo['ESTADO'],
                'Poliza': registro_completo['POLIZA'],
                'Regional': regional,
                'Localidad': localidad,
                'Corredor': registro_completo['CORREDOR'],
                'Asegurado': registro_completo['ASEGURADO'],
                'Consecutivo': consecutivo,
                'Producto': registro_completo['PRODUCTO'],
                'Prima': prima_total,
                # Mantener AÑO y MES para filtrado en backend
                'AÑO': registro_completo['AÑO'],
                'MES': registro_completo['MES']
            }
            consecutivos.append(consecutivo_rec)
            sin_fecha += 1
    
    print(f"[UNIFIED] ✓ Negocios con fecha válida: {con_fecha}")
    print(f"[UNIFIED] ✓ Consecutivos sin fecha: {sin_fecha}")
    print(f"[UNIFIED] ✓ Total registros: {len(todos)}")
    
    # Guardar en caché
    cache_data = {
        'timestamp': datetime.now().isoformat(),
        'total_registros': len(todos),
        'negocios_nuevos_count': len(negocios_nuevos),
        'consecutivos_count': len(consecutivos),
        'negocios_nuevos': negocios_nuevos,
        'consecutivos': consecutivos,
        'todos': todos
    }
    
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, ensure_ascii=False, indent=2)
    
    print(f"[UNIFIED] ✓ Caché guardado: {CACHE_FILE}")
    print("=" * 60)
    return cache_data

def load_unified_cache():
    """
    Carga caché unificado. Si no existe o está desactualizado, lo regenera.
    """
    global _unified_cache
    
    # Si ya está en memoria, retornar (Validando que sea datos reales)
    if _unified_cache['loaded'] and _unified_cache['data'] is not None:
        print("[UNIFIED] Usando caché en memoria")
        return _unified_cache['data']
    
    # Si estaba loaded pero data es None, resetear flag
    _unified_cache['loaded'] = False

    # Verificar si existe caché en disco
    if not CACHE_FILE.exists():
        print("[UNIFIED] Caché no existe. Generando...")
        data = convert_excel_to_unified_cache()
        _unified_cache['data'] = data
        _unified_cache['loaded'] = True
        return data
    
    # Verificar si Excel es más reciente que caché
    if EXCEL_FILE.exists():
        excel_mtime = EXCEL_FILE.stat().st_mtime
        cache_mtime = CACHE_FILE.stat().st_mtime
        
        if excel_mtime > cache_mtime:
            print("[UNIFIED] Excel modificado. Regenerando caché...")
            data = convert_excel_to_unified_cache()
            _unified_cache['data'] = data
            _unified_cache['loaded'] = True
            return data
    
    # Cargar caché existente
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        timestamp = datetime.fromisoformat(data['timestamp'])
        age_hours = (datetime.now() - timestamp).total_seconds() / 3600
        
        print(f"[UNIFIED] Caché cargado ({age_hours:.1f}h antiguo, {data['total_registros']} registros)")
        _unified_cache['data'] = data
        _unified_cache['loaded'] = True
        return data
    except Exception as e:
        print(f"[UNIFIED] Error leyendo caché: {e}. Regenerando...")
        data = convert_excel_to_unified_cache()
        _unified_cache['data'] = data
        _unified_cache['loaded'] = True
        return data

# ==================== FUNCIONES PARA NEGOCIOS NUEVOS ====================

def get_negocios_nuevos_years():
    """Retorna lista de años disponibles en Negocios Nuevos."""
    cache = load_unified_cache()
    if not cache or 'negocios_nuevos' not in cache:
        return []
    years = sorted(set(n['AÑO'] for n in cache['negocios_nuevos']), reverse=True)
    return years

def get_negocios_nuevos_months(year):
    """Retorna lista de meses disponibles para un año."""
    cache = load_unified_cache()
    if not cache or 'negocios_nuevos' not in cache:
        return []
        
    # Filtrar por año
    negocios_year = [n for n in cache['negocios_nuevos'] if n['AÑO'] == int(year)]
    
    # Obtener meses únicos
    months_num = sorted(set(n['MES'] for n in negocios_year))
    
    # Convertir a nombres
    month_names = {
        1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
        5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
        9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
    }
    
    return [month_names[m] for m in months_num if m in month_names]

def get_negocios_nuevos_by_month(year, month_name):
    """Retorna negocios filtrados por año y mes."""
    cache = load_unified_cache()
    
    # Convertir nombre de mes a número
    month_map = {
        'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
        'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
        'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12,
        'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
        'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
    }
    
    month_num = month_map.get(month_name.upper())
    if not month_num:
        # Intentar mapeo inverso si month_name es número string
        try:
            val = int(month_name)
            if 1 <= val <= 12:
                month_num = val
        except:
            pass
            
    if not month_num:
        return []
    
    # Filtrar
    negocios_filtered = [
        n for n in cache['negocios_nuevos']
        if n['AÑO'] == int(year) and n['MES'] == month_num
    ]
    
    return negocios_filtered

# ==================== FUNCIONES PARA CONSECUTIVOS ====================

def get_consecutivos_all():
    """Retorna todos los consecutivos."""
    cache = load_unified_cache()
    return cache['consecutivos']

def get_consecutivos_by_filters(year=None, month=None):
    """Retorna consecutivos filtrados por año/mes (Case Insensitive)."""
    cache = load_unified_cache()
    consecutivos = cache['consecutivos']
    
    if year:
        consecutivos = [c for c in consecutivos if c.get('AÑO') == int(year)]
    
    if month:
        # Manejar si month es int o str
        if isinstance(month, int):
            consecutivos = [c for c in consecutivos if c.get('MES') == month]
        else:
            consecutivos = [c for c in consecutivos if str(c.get('MES', '')).upper() == str(month).upper()]

    # --- MERGE CON ESTADOS ACTUALIZADOS ---
    try:
        updated_states_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".consecutivos_estados.json")
        if os.path.exists(updated_states_file):
            with open(updated_states_file, 'r', encoding='utf-8') as f:
                updated_states = json.load(f)
            
            # Sobreescribir estado si existe actualización
            for c in consecutivos:
                cons_id = str(c.get('Consecutivo', '')).strip()
                if cons_id in updated_states and updated_states[cons_id]:
                    c['Estado'] = updated_states[cons_id]
    except Exception as e:
        print(f"[UNIFIED] Error merging consolidated states: {e}")
    
    return consecutivos

# ==================== FUNCIONES PARA REPORTE PRINCIPAL ====================

def get_all_records():
    """Retorna todos los registros para Reporte Principal."""
    cache = load_unified_cache()
    return cache['todos']

def get_all_records_paginated(page=1, page_size=100):
    """Retorna registros paginados."""
    cache = load_unified_cache()
    # Invertir orden para mostrar los más recientes primero
    todos = cache['todos'][::-1]
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    return {
        'data': todos[start_idx:end_idx],
        'total': len(todos),
        'page': page,
        'page_size': page_size,
        'total_pages': (len(todos) + page_size - 1) // page_size
    }

def get_consecutivos_pendientes_dataframe():
    """
    Retorna DataFrame de consecutivos para compatibilidad con main.py.
    """
    cache = load_unified_cache()
    df = pd.DataFrame(cache['consecutivos'])
    
    # Asegurar columnas esperadas por el frontend/main.py legacy
    if not df.empty:
        # Renombrar para compatibilidad si es necesario o asegurar existencia
        # El cache ya tiene keys: CONSECUTIVO, LOCALIDAD, REGIONAL, ...
        # Main legacy espera: 'Consecutivo', 'Localidad', 'Prima', 'Estado'
        
        # Mapeo de nombres si el cache usa UPPERCASE
        if 'CONSECUTIVO' in df.columns: df['Consecutivo'] = df['CONSECUTIVO']
        if 'LOCALIDAD' in df.columns: df['Localidad'] = df['LOCALIDAD']
        # Regional ya está en caché
        
        df['Prima'] = df['PRIMA'] if 'PRIMA' in df.columns else 0.0
        # df['Estado'] = df['ESTADO'] # Ya existe
        
    return df

# ==================== CACHE MEMORIA ====================

# Singleton para caché en memoria
_memory_cache = {
    'data': None,
    'loaded': False
}

# Cache específico para DataFrames (optimización de rendimiento)
_df_cache = {
    'detalle': None,
    'consecutivos': None
}

def process_reporte_cached():
    """Procesa REPORTE con caché en memoria. (Wrapper para compatibilidad)"""
    # 1. Intentar cargar si no está marcado como loaded
    if not _memory_cache.get('loaded'):
        data = load_unified_cache()
        if data is not None:
             _memory_cache['data'] = data
             _memory_cache['loaded'] = True
        else:
             # Si load_unified_cache falló retornando None (raro pero posible en catch-all exceptions)
             print("[ERROR] load_unified_cache retornó None!")
             return {} # Retornar dict vacío para evitar crash
             
    # 2. Verificar integridad
    if _memory_cache.get('data') is None:
         # Intento de recuperación final
         data = load_unified_cache()
         if data:
             _memory_cache['data'] = data
             _memory_cache['loaded'] = True
             return data
         return {}
         
    return _memory_cache['data']

def clear_all_caches():
    """Limpia todos los cachés en memoria para forzar recarga."""
    global _unified_cache, _memory_cache, _df_cache
    
    print("[UNIFIED] Limpiando todos los cachés...")
    
    # 1. Unified Cache
    _unified_cache['loaded'] = False
    _unified_cache['data'] = None
    
    # 2. Memory Cache Wrapper
    _memory_cache['loaded'] = False
    _memory_cache['data'] = None
    
    # 3. DataFrame Cache
    _df_cache['detalle'] = None
    _df_cache['consecutivos'] = None
    
    print("[UNIFIED] Cachés limpiados.")


# ==================== FORECAST MODULE (MIGRATED) ====================

def get_forecast_data(year: int, month: str):
    """
    Calcula el forecast para un mes específico usando la cache unificada.
    Reemplaza: data_processor.calculate_forecast_from_detalle
    """
    cache = load_unified_cache()
    if not cache or not cache.get('todos'):
        return []
        
    df = pd.DataFrame(cache['todos'])
    
    # 1. Normalizar mes objetivo (str/int -> int)
    month_map = {
        'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
        'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
        'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12,
        'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4,
        'MAY': 5, 'JUN': 6, 'JUL': 7, 'AGO': 8,
        'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
    }
    
    target_month_num = 0
    if isinstance(month, int):
        target_month_num = month
    elif isinstance(month, str):
        if month.isdigit():
            target_month_num = int(month)
        else:
            target_month_num = month_map.get(month.upper().strip(), 0)
            
    # 2. Ajustar año de 2 dígitos
    adjusted_year = year
    if adjusted_year < 100:
        adjusted_year += 2000
        
    # 3. Filtrar DataFrame (Optimizado)
    # En Unified, ya tenemos AÑO y MES normalizados como Enteros
    if 'AÑO' in df.columns and 'MES' in df.columns:
        filtered_df = df[
            (df['AÑO'] == adjusted_year) & 
            (df['MES'] == target_month_num)
        ].copy()
    else:
        return []
        
    if filtered_df.empty:
        return []

    # 4. Asegurar columnas de valores
    # Usamos PRIMA_TOTAL_USD que es la columna unificada limpia
    val_col = 'PRIMA_TOTAL_USD'
    if val_col not in filtered_df.columns:
        return []
        
    # 5. Agrupar por REGIONAL
    # En Unified, 'REGIONAL' ya está normalizada por get_regional()
    grouped = filtered_df.groupby('REGIONAL')[val_col].sum().to_dict()
    
    # 6. Cargar Metas
    saved_metas = {}
    
    # Mapeo inverso de número a nombre corto para la key de metas (ej: "DIC 25")
    month_name_map = {
        1: 'ENE', 2: 'FEB', 3: 'MAR', 4: 'ABR', 5: 'MAY', 6: 'JUN',
        7: 'JUL', 8: 'AGO', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DIC'
    }
    month_short = month_name_map.get(target_month_num, 'DIC')
    year_short = str(adjusted_year)[-2:]
    sheet_key = f"{month_short} {year_short}"
    
    metas_path = PROJECT_ROOT / "server" / "data" / "forecast_metas.json"
    if metas_path.exists():
        try:
            with open(metas_path, 'r', encoding='utf-8') as f:
                all_metas = json.load(f)
                saved_metas = all_metas.get(sheet_key, {})
        except:
            pass

    # 7. Construir Estructura de Reporte (Grupos 1, 2, 3)
    # Helper local
    def get_val(keys):
        total = 0
        for k in keys:
            total += grouped.get(k, 0)
        return total
        
    def normalize_key(k):
        return k.upper().strip()

    rows = []
    
    # --- Definición de Grupos ---
    # GRUPO 1: LUZ ADRIANA ARCHILA
    group_1 = [
        ('SAM', ['SAM']),
        ('CORREDORES CALI', ['CORREDORES CALI']),
        ('CORREDORES BARRANQUILLA', ['CORREDORES BARRANQUILLA']),
        ('CARIBE', ['CARIBE']),
        ('OCCIDENTE', ['OCCIDENTE', 'SUROCCIDENTE']), 
        ('GERENCIA', ['GERENCIA']) 
    ]
    
    # GRUPO 2: MAYERLY ORTIZ
    group_2 = [
        ('CORREDORES MEDELLIN', ['CORREDORES MEDELLIN']),
        ('BOGOTA', ['BOGOTA', 'BOGOTA DC', 'BOGOTÁ']),
        ('ANTIOQUIA Y EJE CAFETERO', ['ANTIOQUIA Y EJE CAFETERO'])
    ]
    
    # GRUPO 3: ELVIA PATRICIA BARRAGAN
    group_3 = [
        ('BCM', ['BCM', 'OF.CORREDORES BOGOTA']),
        ('CORREDORES BUCARAMANGA', ['CORREDORES BUCARAMANGA']),
        ('SEGUROS ESPECIALES', ['SES', 'SEGUROS ESPECIALES']),
        ('CENTRO', ['CENTRO'])
    ]
    
    def process_group(items, total_name):
        total_meta = 0
        total_real = 0
        
        for name, keys in items:
            # Calcular Real
            real_val = get_val([normalize_key(k) for k in keys])
            
            # Obtener Meta
            meta_val = saved_metas.get(name, 0)
            
            # Cálculos derivados
            forecast = real_val
            cumplimiento = (real_val / meta_val) if meta_val > 0 else 0
            forecast_pct = (forecast / meta_val) if meta_val > 0 else 0
            faltante = max(0, meta_val - forecast)
            
            rows.append({
                'Nombre': name,
                'Meta': meta_val,
                'Real': real_val, # Se mantiene nombre 'Real' por compatibilidad frontend
                'Cumplimiento': cumplimiento,
                'Casos': 0,
                'Primas_Est': 0,
                'Forecast': forecast,
                'Forecast_Pct': forecast_pct,
                'Faltante': faltante,
                'is_total': False
            })
            
            total_meta += meta_val
            total_real += real_val
            
        # Fila Total Grupo
        rows.append({
            'Nombre': total_name,
            'Meta': total_meta,
            'Real': total_real,
            'Cumplimiento': (total_real / total_meta) if total_meta > 0 else 0,
            'Casos': 0,
            'Primas_Est': 0,
            'Forecast': total_real,
            'Forecast_Pct': (total_real / total_meta) if total_meta > 0 else 0,
            'Faltante': max(0, total_meta - total_real),
            'is_total': True
        })
        rows.append({}) # Separador
        
    # Procesar
    process_group(group_1, 'Total LUZ ADRIANA ARCHILA')
    process_group(group_2, 'Total MAYERLY ORTIZ')
    process_group(group_3, 'Total ELVIA PATRICIA BARRAGAN')
    
    # --- FILA TOTAL GLOBAL ---
    # Sumar totales de los 3 grupos (filtrando las rows is_total)
    totals = [r for r in rows if r.get('is_total')]
    
    grand_meta = sum(t['Meta'] for t in totals)
    grand_real = sum(t['Real'] for t in totals)
    grand_forecast = sum(t['Forecast'] for t in totals)
    
    rows.append({
        'Nombre': 'TOTAL GERENCIA',
        'Meta': grand_meta,
        'Real': grand_real,
        'Cumplimiento': (grand_real / grand_meta) if grand_meta > 0 else 0,
        'Casos': 0,
        'Primas_Est': 0,
        'Forecast': grand_forecast,
        'Forecast_Pct': (grand_forecast / grand_meta) if grand_meta > 0 else 0,
        'Faltante': max(0, grand_meta - grand_forecast),
        'is_total': True,
        'is_grand_total': True
    })
    
    return rows
