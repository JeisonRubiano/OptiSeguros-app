import asyncio
import os
import json
import pandas as pd
from datetime import datetime, timedelta
from services.unified_data_processor import get_consecutivos_pendientes_dataframe
from services.consecutivos_api_client import consultar_estado_consecutivo

# Estado global para almacenar estados consultados (Legacy JSON store)
CONSECUTIVOS_ESTADOS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".consecutivos_estados.json")

def load_estados():
    """Carga estados guardados desde archivo."""
    if os.path.exists(CONSECUTIVOS_ESTADOS_FILE):
        try:
            with open(CONSECUTIVOS_ESTADOS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error cargando estados: {e}")
    return {}

def save_estados(estados):
    """Guarda estados en archivo."""
    try:
        with open(CONSECUTIVOS_ESTADOS_FILE, 'w', encoding='utf-8') as f:
            json.dump(estados, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error guardando estados: {e}")

# Cargar estados en memoria
CONSECUTIVOS_ESTADOS = load_estados()

async def update_recent_estados_background():
    """
    Actualiza estados de los últimos 3 meses de forma dinámica.
    """
    global CONSECUTIVOS_ESTADOS
    
    try:
        print("[AUTO-UPDATE] Iniciando actualización automática (Últimos 3 meses)...")
        df = get_consecutivos_pendientes_dataframe()
        
        # Calcular fecha límite (3 meses atrás)
        today = datetime.now()
        start_date = today - timedelta(days=90) # Aprox 3 meses
        
        def is_recent(row):
            try:
                y = int(row['AÑO'])
                m = int(row['MES'])
                # Crear fecha (primer día del mes)
                d = datetime(year=y, month=m, day=1)
                return d >= start_date.replace(day=1)
            except:
                return False

        # Aplicar filtro
        df_recent = df[df.apply(is_recent, axis=1)]
        
        print(f"[AUTO-UPDATE] Registros recientes encontrados: {len(df_recent)}")
        
        count = 0
        total_attempts = 0
        
        for _, row in df_recent.iterrows():
            consecutivo = str(row['Consecutivo'])
            if consecutivo and consecutivo != '0':
                # Solo actualizar si no existe o está vacío
                if consecutivo not in CONSECUTIVOS_ESTADOS or not CONSECUTIVOS_ESTADOS[consecutivo]:
                    try:
                        estado = consultar_estado_consecutivo(consecutivo)
                        CONSECUTIVOS_ESTADOS[consecutivo] = estado
                        count += 1
                        
                        # Guardar cada 10 consultas
                        if count % 10 == 0:
                            save_estados(CONSECUTIVOS_ESTADOS)
                            print(f"[AUTO-UPDATE] Progreso: {count} consecutivos actualizados")
                            await asyncio.sleep(0.5)  # Pausa respetuosa
                    except Exception as e:
                        print(f"[AUTO-UPDATE] Error con consecutivo {consecutivo}: {e}")
                    
                    total_attempts += 1
                    # Pausa pequeña cada actualización
                    await asyncio.sleep(0.1)
        
        # Guardar estados finales
        save_estados(CONSECUTIVOS_ESTADOS)
        print(f"[AUTO-UPDATE] Completado: {count} nuevos estados actualizados")
        
    except Exception as e:
        print(f"[AUTO-UPDATE] Error en actualización automática: {e}")
        import traceback
        traceback.print_exc()

async def periodic_update_recent_estados():
    """
    Tarea periódica que actualiza estados recientes cada 2 horas.
    """
    # Esperar 60 segundos para asegurar que la sincronización de Google Sheets termine
    print("[PERIODIC] Esperando finalización de sincronización inicial (60s)...")
    await asyncio.sleep(60)
    
    while True:
        try:
            print("[PERIODIC] Ejecutando actualización periódica de estados recientes...")
            await update_recent_estados_background()
            
            # Esperar 2 horas (7200 segundos) para la siguiente ejecución
            await asyncio.sleep(7200)
        except Exception as e:
            print(f"[PERIODIC] Error en actualización periódica: {e}")
            print("[PERIODIC] Reintentando en 60 segundos...")
            await asyncio.sleep(60)

async def update_consecutivos_for_month_task(month: str, year: int):
    """
    Actualiza estados para un mes y año específicos (accionado manualmente).
    """
    global CONSECUTIVOS_ESTADOS
    
    try:
        print(f"[MANUAL-UPDATE] Iniciando actualización para {month} {year}...")
        df = get_consecutivos_pendientes_dataframe()
        
        # Mapeo de meses para filtro
        month_map = {
            'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
            'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12,
            'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
        }
        
        target_month_num = month_map.get(month.upper())
        if not target_month_num:
             print(f"[MANUAL-UPDATE] Error: Mes inválido {month}")
             return

        def is_target_month(row):
            try:
                y = int(row['AÑO'])
                m = int(row['MES'])
                return y == year and m == target_month_num
            except:
                return False

        # Aplicar filtro
        df_target = df[df.apply(is_target_month, axis=1)]
        
        print(f"[MANUAL-UPDATE] Registros encontrados para {month} {year}: {len(df_target)}")
        
        count = 0
        
        for _, row in df_target.iterrows():
            consecutivo = str(row['Consecutivo'])
            if consecutivo and consecutivo != '0':
                 # Siempre actualizar en manual update, o solo si falta? 
                 # Usualmente manual force update intenta actualizar todo.
                 # Pero para no saturar, podemos checkear si ya tenemos un estado final?
                 # El usuario quiere "Actualizar", asumamos que quiere revisar todos.
                try:
                    estado = consultar_estado_consecutivo(consecutivo)
                    CONSECUTIVOS_ESTADOS[consecutivo] = estado
                    count += 1
                    
                    if count % 5 == 0:
                        save_estados(CONSECUTIVOS_ESTADOS)
                        await asyncio.sleep(0.5)
                except Exception as e:
                    print(f"[MANUAL-UPDATE] Error {consecutivo}: {e}")
                
                await asyncio.sleep(0.2)
        
        save_estados(CONSECUTIVOS_ESTADOS)
        print(f"[MANUAL-UPDATE] Finalizado. {count} estados actualizados.")

    except Exception as e:
        print(f"[MANUAL-UPDATE] Error crítico: {e}")