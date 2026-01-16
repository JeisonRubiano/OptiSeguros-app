
import pandas as pd
import json
import os
import shutil
from datetime import datetime

# Rutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE = r'c:\Users\Jeison\Documents\Proyectos trabajo\Proyeto Pasantia\Detalle  negocios nuevos y recaudos.xlsx'
JSON_FILE = os.path.join(BASE_DIR, 'data', 'policy_states.json')
BACKUP_FILE = os.path.join(BASE_DIR, 'data', f'policy_states_backup_{datetime.now().strftime("%Y%m%d%H%M%S")}.json')

# Mapeo de estados
# Excel Value -> JSON Value
STATE_MAPPING = {
    'SOLICITUD EN ESTUDIO': 'PENDIENTE',
    'PENDIENTE': 'PENDIENTE',
    'EXPEDIDA': 'PENDIENTE', 
    'RECAUDADA': 'RECAUDADA',
    'PAGADA': 'RECAUDADA',
    'ANULADA': 'ANULADA',
    'CANCELADA': 'ANULADA',
    'DEVUELTA': 'ANULADA',
    'NO TOMADO': 'ANULADA'
}

def normalize_status(status_raw):
    """Normaliza el estado del Excel a los valores del sistema."""
    if pd.isna(status_raw):
        return 'PENDIENTE' # Default safe
    
    s = str(status_raw).upper().strip()
    
    # Búsqueda directa
    if s in STATE_MAPPING:
        return STATE_MAPPING[s]
    
    # Búsqueda parcial
    if 'ANULAD' in s or 'CANCEL' in s:
        return 'ANULADA'
    if 'RECAUD' in s or 'PAGAD' in s:
        return 'RECAUDADA'
    if 'PENDIENTE' in s or 'ESTUDIO' in s or 'TRAMITE' in s:
        return 'PENDIENTE'
        
    return 'PENDIENTE' # Default fallback

def main():
    print("="*60)
    print("INICIANDO ACTUALIZACIÓN DE ESTADOS MASIVA")
    print("="*60)

    # 1. Crear Backup
    if os.path.exists(JSON_FILE):
        print(f"[INFO] Creando backup en: {BACKUP_FILE}")
        shutil.copy2(JSON_FILE, BACKUP_FILE)
        
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            current_states = json.load(f)
    else:
        print("[INFO] No existe policy_states.json, se creará uno nuevo.")
        current_states = {}

    # 2. Leer Excel
    # 2. Leer Excel (Buscando la hoja correcta con datos)
    print(f"[INFO] Analizando archivo Excel: {EXCEL_FILE}")
    try:
        xl = pd.ExcelFile(EXCEL_FILE)
        best_sheet = None
        max_rows = 0
        
        sheet_names = xl.sheet_names
        print(f"[INFO] Hojas encontradas: {sheet_names}")
        
        # Prioridad a hojas conocidas
        priority_keywords = ['REPORTE', 'DETALLE', 'DATOS', 'BASE']
        sheets_to_check = []
        
        # Ordenar: primero las que coinciden con keywords, luego el resto
        for name in sheet_names:
            upper_name = name.upper()
            if any(k in upper_name for k in priority_keywords):
                sheets_to_check.insert(0, name)
            else:
                sheets_to_check.append(name)
        
        for sheet_name in sheets_to_check:
            try:
                # Leer headers primero para ver si vale la pena
                print(f"  - Verificando '{sheet_name}'...")
                
                # Leer solo primeras filas para validar columnas
                df_preview = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name, nrows=5)
                cols_upper = [str(c).upper().strip() for c in df_preview.columns]
                has_relevant_cols = 'CONSECUTIVO' in cols_upper or 'ESTADO' in cols_upper
                
                if not has_relevant_cols:
                    print(f"    -> Descartada (sin columnas requeridas)")
                    continue
                
                # Si tiene columnas, leer completa (o estimar?? No, necesitamos leer para actualizar)
                # Pero si es la REPORTE, asumimos que es la buena y leemos.
                print(f"    -> Columnas OK. Leyendo hoja completa...")
                df_temp = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name)
                rows_count = len(df_temp)
                print(f"    -> {rows_count} filas.")
                
                if rows_count > max_rows:
                    max_rows = rows_count
                    best_sheet = sheet_name
                    df = df_temp
                    
                # Si encontramos una hoja con muchos datos (>1000) y tiene nombre relevante, paramos
                is_priority = any(k in sheet_name.upper() for k in priority_keywords)
                if rows_count > 1000 and is_priority:
                     print(f"[INFO] ¡Hoja candidata '{sheet_name}' encontrada con {rows_count} registros! Usando esta.")
                     break
                     
            except Exception as e_sheet:
                print(f"  [WARNING] Error leyendo hoja '{sheet_name}': {e_sheet}")

        if best_sheet:
            print(f"[INFO] Seleccionada hoja principal: '{best_sheet}' con {max_rows} filas.")
            # Asegurar que df es la best_sheet (ya asignado en loop)
        else:
            print("[ERROR] No se encontró ninguna hoja con datos válidos (columnas CONSECUTIVO/ESTADO).")
            return

    except Exception as e:
        print(f"[ERROR] No se pudo leer el Excel: {e}")
        return

    print(f"[INFO] Total filas en Excel: {len(df)}")
    
    # 3. Procesar Filas
    updates_count = 0
    new_entries_count = 0
    
    for idx, row in df.iterrows():
        # Obtener Consecutivo
        consecutivo = row.get('CONSECUTIVO')
        if pd.isna(consecutivo):
            continue
            
        consecutivo_str = str(consecutivo).strip()
        if consecutivo_str == 'nan' or not consecutivo_str:
            continue
            
        excel_status_raw = row.get('ESTADO')
        new_status = normalize_status(excel_status_raw)
        
        # Validar si existe en persistencia
        if consecutivo_str in current_states:
            current_obj = current_states[consecutivo_str]
            current_status = current_obj.get('estado')
            
            # Solo actualizar si es diferente
            if current_status != new_status:
                current_states[consecutivo_str]['estado'] = new_status
                # Actualizar fecha solo si cambia? O mantenemos la original de cuando se creó?
                # Generalmente queremos saber cuando cambió el estado, así que actualizamos fecha
                current_states[consecutivo_str]['fecha'] = datetime.now().isoformat()
                current_states[consecutivo_str]['usuario'] = 'Sistema (Script Masivo)'
                updates_count += 1
        else:
            # Crear nueva entrada
            current_states[consecutivo_str] = {
                'estado': new_status,
                'fecha': datetime.now().isoformat(),
                'usuario': 'Sistema (Script Masivo)'
            }
            new_entries_count += 1

    # 4. Guardar Cambios
    print(f"[INFO] Guardando cambios en {JSON_FILE}...")
    try:
        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(current_states, f, indent=2, ensure_ascii=False)
        print("[SUCCESS] Actualización completada exitosamente.")
        print(f"  - Actualizados: {updates_count}")
        print(f"  - Nuevos: {new_entries_count}")
        print(f"  - Total en sistema: {len(current_states)}")
        
        # Forzar regeneración de caché unificada si existe para que la UI lo vea de inmediato
        unified_cache_path = os.path.join(BASE_DIR, '.cache_unified.json')
        if os.path.exists(unified_cache_path):
            print("[INFO] Eliminando caché unificada antigua para forzar recarga...")
            os.remove(unified_cache_path)
            
    except Exception as e:
        print(f"[ERROR] Falló al guardar JSON: {e}")

if __name__ == '__main__':
    main()
