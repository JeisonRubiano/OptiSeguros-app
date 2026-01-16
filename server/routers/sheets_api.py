from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from dependencies import get_current_user
from services.google_sheets import sheets_service
from services.mock_sheets import mock_sheets_service
from services.unified_data_processor import (
    process_reporte_cached, get_all_records_paginated, 
    get_consecutivos_by_filters, clear_all_caches
)
from services.consecutivos_api_client import consultar_estado_consecutivo, get_operation_mode, set_operation_mode
from pydantic import BaseModel
import os
import json

router = APIRouter()

# --- Pydantic Models (Moved from main.py) ---
class SheetRequest(BaseModel):
    sheet_name: str

class ConsecutivoStatusRequest(BaseModel):
    consecutivo: str

class UpdatePrimaRequest(BaseModel):
    consecutivo: str
    prima: float

class UpdateMonthRequest(BaseModel):
    month: str
    year: int

# Helper
def has_read_credentials():
    # Helper duplicated or imported? Let's duplicate specifically for this scope or rely on a config file.
    # Assuming relative path from THIS file: ../credentials.json
    base_dir = os.path.dirname(os.path.dirname(__file__))
    creds_file = os.path.join(base_dir, "credentials.json")
    return os.path.exists(creds_file)

@router.get("/api/sheets/check-connection", dependencies=[Depends(get_current_user)])
def check_sheets_connection():
    if has_read_credentials():
        try:
            sheets_service.connect()
            return {"status": "connected", "mode": "Real"}
        except Exception as e:
            return {"status": "error", "detail": str(e)}
    else:
        return {"status": "connected", "mode": "Simulation", "message": "Usando datos simulados"}

@router.post("/api/sheets/data", dependencies=[Depends(get_current_user)])
def get_sheet_data(request: SheetRequest):
    if has_read_credentials():
        try:
            data = sheets_service.get_sheet_data(request.sheet_name)
            return {"data": data, "source": "Real"}
        except Exception as e:
             raise HTTPException(status_code=400, detail=str(e))
    else:
        data = mock_sheets_service.get_sheet_data(request.sheet_name)
        return {"data": data, "source": "Simulation"}

@router.get("/api/reporte/all", dependencies=[Depends(get_current_user)])
def get_all_reporte_data(page: int = 1, page_size: int = 100):
    try:
        print(f"[REPORTE] Usando caché unificado (página {page})")
        result = get_all_records_paginated(page, page_size)
        
        return {
            "success": True,
            "data": result['data'],
            "pagination": {
                "page": result['page'],
                "page_size": result['page_size'],
                "total": result['total'],
                "total_pages": result['total_pages']
            }
        }
    except Exception as e:
        print(f"[ERROR] get_all_reporte_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/process-reporte")
def process_reporte_endpoint():
    try:
        result = process_reporte_cached()
        return {
            "success": True,
            "stats": result['stats'],
            "message": f"Procesados {result['stats']['total']} registros"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando REPORTE: {str(e)}")

@router.post("/api/refresh-data")
def refresh_data_endpoint():
    try:
        clear_all_caches()
        result = process_reporte_cached()
        return {
            "success": True,
            "message": "Datos actualizados correctamente",
            "stats": result['stats']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error actualizando datos: {str(e)}")

@router.get("/api/consecutivos-pendientes", dependencies=[Depends(get_current_user)])
def get_consecutivos_pendientes():
    try:
        from services.unified_data_processor import load_unified_cache
        cache = load_unified_cache()
        consecutivos = cache['consecutivos']
        
        meses_set = set()
        for c in consecutivos:
            año = c.get('AÑO', 0)
            mes = c.get('MES', '')
            if año and mes:
                if isinstance(mes, int):
                    month_names = {1: 'ENE', 2: 'FEB', 3: 'MAR', 4: 'ABR', 5: 'MAY', 6: 'JUN', 7: 'JUL', 8: 'AGO', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DIC'}
                    mes = month_names.get(mes, f'MES{mes}')
                meses_set.add(f"{mes} {año}")
        
        month_order = {'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6, 'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12}

        def sort_key(s):
            try:
                parts = s.split()
                if len(parts) >= 2:
                    return (int(parts[-1]), month_order.get(parts[0].upper(), 0))
            except: pass
            return (0, 0)

        sheets = sorted(list(meses_set), key=sort_key, reverse=True)
        
        return {
            "success": True,
            "data": {
                "type": "multi_sheet_metadata",
                "sheets": sheets,
                "default": sheets[0] if sheets else None
            }
        }
    except Exception as e:
        print(f"[ERROR] get_consecutivos_pendientes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/consecutivos-pendientes/{month_year}", dependencies=[Depends(get_current_user)])
def get_consecutivos_by_month(month_year: str):
    try:
        parts = month_year.split()
        if len(parts) != 2: raise HTTPException(status_code=400, detail="Formato inválido")
        mes_input, año_input = parts[0], int(parts[1])
        
        month_map = {'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6, 'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12, 'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12}
        mes_num = month_map.get(mes_input.upper())
        
        consecutivos = get_consecutivos_by_filters(year=año_input, month=mes_num)
        return {"success": True, "data": consecutivos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.post("/api/consecutivos/consultar-estado", dependencies=[Depends(get_current_user)])
def consultar_estado_endpoint(request: ConsecutivoStatusRequest):
    try:
        estado = consultar_estado_consecutivo(request.consecutivo)
        return {
            "success": True,
            "consecutivo": request.consecutivo,
            "estado": estado,
            "mode": get_operation_mode()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/consecutivos/actualizar-prima", dependencies=[Depends(get_current_user)])
def actualizar_prima_endpoint(request: UpdatePrimaRequest):
    return {"success": True, "message": "Prima actualizada en frontend"}

@router.post("/api/consecutivos/update-month-estados", dependencies=[Depends(get_current_user)])
async def update_month_estados_endpoint(request: UpdateMonthRequest, background_tasks: BackgroundTasks):
    try:
        from services.background_tasks import update_consecutivos_for_month_task
        background_tasks.add_task(update_consecutivos_for_month_task, request.month, request.year)
        return {"success": True, "message": f"Actualización iniciada para {request.month} {request.year}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/consecutivos/set-mode", dependencies=[Depends(get_current_user)])
def set_api_mode(mode: str):
    try:
        set_operation_mode(mode)
        return {"success": True, "mode": get_operation_mode()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
