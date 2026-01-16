from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from services.google_sheets import sheets_service
from services.mock_sheets import mock_sheets_service
from services.google_sync_service import run_sync
from services.auth import LoginRequest, verify_google_token
from services.consecutivos_api_client import get_operation_mode
from services.background_tasks import periodic_update_recent_estados
from dependencies import get_current_user
from pydantic import BaseModel
import threading
import asyncio
import os
import json
from datetime import datetime

# Routers
from routers import dashboard, sheets_api

app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.1.14:5173",  # LAN access
    "http://192.168.1.10:5173",  # New LAN access
    "http://192.168.1.10.nip.io:5173", 
]

# Add origins from environment variable (useful for production)
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    origins.extend([origin.strip() for origin in env_origins.split(",")])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(dashboard.router)
app.include_router(sheets_api.router)

# --- Startup & Health ---

# Helper to check for real credentials
def has_read_credentials():
    creds_file = os.path.join(os.path.dirname(__file__), "credentials.json")
    return os.path.exists(creds_file)

@app.on_event("startup")
async def startup_event():
    """Startup sequence: Sync, Load Cache, Start Background Tasks."""
    def startup_sequence():
        print("======== [STARTUP] ========")
        if has_read_credentials():
            try:
                print("[STARTUP] Syncing Google Sheets...")
                success = run_sync() # Blocking sync
                print(f"[STARTUP] Sync completed: {success}")
            except Exception as e:
                print(f"[STARTUP] Sync error: {e}")
        else:
            print("[STARTUP] Simulation Mode (No Credentials)")

        try:
            print("[STARTUP] Loading Unified Cache...")
            from services.unified_data_processor import load_unified_cache
            load_unified_cache()
            print("[STARTUP] Cache Loaded.")
        except Exception as e:
            print(f"[STARTUP] Cache error: {e}")
        print("===========================")

    startup_thread = threading.Thread(target=startup_sequence, daemon=True)
    startup_thread.start()
    
    asyncio.create_task(periodic_update_recent_estados())

@app.get("/")
def read_root():
    return {"message": "OptiSeguros API (Refactored)"}

@app.get("/api/health")
def health_check():
    mode = "Real" if has_read_credentials() else "Simulation"
    return {"status": "ok", "mode": mode}

@app.post("/api/admin/sync-google")
async def trigger_google_sync():
    success = run_sync()
    if not success:
         raise HTTPException(status_code=500, detail="Sync failed")
    return {"status": "ok", "message": "Sync completed"}

@app.post("/api/auth/login")
def login(request: LoginRequest):
    user = verify_google_token(request.idToken)
    return {
        "success": True,
        "user": user.dict(),
        "token": request.idToken
    }

# --- REMAINING LEGACY MODULES (To be refactored in Phase 2) ---

# ==================== RENEWALS DATA MANAGEMENT ====================
_renewals_cache = {'data': None, 'loaded': False, 'timestamp': None}

def load_renewals_data():
    global _renewals_cache
    if _renewals_cache['loaded']: return _renewals_cache['data']
    
    try:
        import pandas as pd
        import math
        from datetime import date
        
        base_dir = os.path.dirname(__file__)
        file_path = os.path.join(base_dir, "..", "SEGUIMIENTO CANCELACIONES 2025 (1) (1).xlsx")
        
        print(f"[RENEWALS] Reading: {file_path}")
        df = pd.read_excel(file_path, sheet_name='A&A')
        data = df.to_dict(orient='records')
        
        for record in data:
            for key, value in record.items():
                if isinstance(value, float) and math.isnan(value):
                    record[key] = None
                elif isinstance(value, (datetime, date)):
                    record[key] = value.isoformat()
                elif pd.isna(value):
                    record[key] = None
        
        _renewals_cache['data'] = data
        _renewals_cache['loaded'] = True
        return data
    except Exception as e:
        print(f"[RENEWALS] Error: {e}")
        return []

@app.get("/api/renewals/months", dependencies=[Depends(get_current_user)])
def get_renewals_months():
    try:
        data = load_renewals_data() or []
        month_names = {1: 'ENE', 2: 'FEB', 3: 'MAR', 4: 'ABR', 5: 'MAY', 6: 'JUN', 7: 'JUL', 8: 'AGO', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DIC'}
        unique_months = set()
        for record in data:
            mes = record.get('# MES')
            if mes and not pd.isna(mes): unique_months.add(int(mes))
        
        month_list = sorted([month_names.get(m, f'MES{m}') for m in unique_months if m in month_names])
        return {"success": True, "data": {"type": "multi_sheet_metadata", "sheets": month_list, "default": month_list[0] if month_list else None}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/renewals/{month}", dependencies=[Depends(get_current_user)])
def get_renewals_by_month(month: str):
    try:
        data = load_renewals_data() or []
        month_map = {'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6, 'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12}
        month_num = month_map.get(month.upper())
        if not month_num: raise HTTPException(status_code=400, detail=f"Mes inválido: {month}")
        
        filtered = [r for r in data if r.get('# MES') == month_num]
        return {"success": True, "data": filtered, "total": len(filtered), "month": month}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

# ==================== POLICY STATE MANAGEMENT ====================
from services.policy_state_manager import policy_state_manager, PolicyStateRequest

@app.post("/api/policy-states/save", dependencies=[Depends(get_current_user)])
async def save_policy_state(request: PolicyStateRequest):
    try:
        result = policy_state_manager.save_state(request.consecutivo, request.estado, request.usuario)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/policy-states", dependencies=[Depends(get_current_user)])
async def get_all_policy_states():
    return {"success": True, "data": policy_state_manager.get_all_states()}

# ==================== FORECAST METAS ====================
class ForecastMetasRequest(BaseModel): # Redefining locally if not moved
    sheetName: str
    metas: dict

# Note: Pydantic models should ideally be in schemas.py. For now, redefining is ok or import if moved.
# Since pydantic models are simple, I'll keep them here or move to routers/..
# But main.py shouldn't have models if possible.
# Actually I'm keeping these endpoints here so I need the models here.

FORECAST_METAS_FILE = os.path.join(os.path.dirname(__file__), "data", "forecast_metas.json")

@app.post("/api/forecast-metas/save", dependencies=[Depends(get_current_user)])
async def save_forecast_meta_values(request: ForecastMetasRequest):
    try:
        os.makedirs(os.path.dirname(FORECAST_METAS_FILE), exist_ok=True)
        # Load existing to merge?
        all_metas = {}
        if os.path.exists(FORECAST_METAS_FILE):
             with open(FORECAST_METAS_FILE, 'r', encoding='utf-8') as f: all_metas = json.load(f)
        
        all_metas[request.sheetName] = request.metas
        
        with open(FORECAST_METAS_FILE, 'w', encoding='utf-8') as f:
            json.dump(all_metas, f, ensure_ascii=False, indent=2)
            
        return {"success": True, "message": "Metas guardadas"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/forecast-metas/{sheet_name}", dependencies=[Depends(get_current_user)])
async def get_forecast_meta_values(sheet_name: str):
    try:
        if os.path.exists(FORECAST_METAS_FILE):
             with open(FORECAST_METAS_FILE, 'r', encoding='utf-8') as f: 
                 all_metas = json.load(f)
                 return {"success": True, "data": all_metas.get(sheet_name, {})}
        return {"success": True, "data": {}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== CANCELACIONES ====================
from services.cancelaciones_service import get_cancelaciones_data, update_cancelacion

class UpdateCancelacionRequest(BaseModel): # Redefine
    policy_id: str
    field: str
    value: str

@app.get("/api/cancelaciones", dependencies=[Depends(get_current_user)])
def get_cancelaciones():
    try:
        return {"success": True, "data": get_cancelaciones_data()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cancelaciones/update", dependencies=[Depends(get_current_user)])
def update_cancelacion_endpoint(request: UpdateCancelacionRequest):
    try:
        return {"success": True, "data": update_cancelacion(request.policy_id, request.field, request.value)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DETALLE VIEW ====================
@app.get("/api/detalle/years", dependencies=[Depends(get_current_user)])
def get_detalle_years():
    try:
        from services.unified_data_processor import get_negocios_nuevos_years
        years = get_negocios_nuevos_years()
        years_str = [str(y) for y in years]
        return {"success": True, "data": {"type": "multi_sheet_metadata", "sheets": years_str, "default": years_str[0] if years_str else None}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/detalle/months/{year}", dependencies=[Depends(get_current_user)])
def get_detalle_months(year: str):
    try:
        from services.unified_data_processor import get_negocios_nuevos_months
        months = get_negocios_nuevos_months(year)
        return {"success": True, "data": {"type": "multi_sheet_metadata", "sheets": months, "default": months[0] if months else None}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/detalle/data/{year}/{month}", dependencies=[Depends(get_current_user)])
def get_detalle_data_by_month(year: str, month: str):
    try:
        from services.unified_data_processor import get_negocios_nuevos_by_month
        negocios = get_negocios_nuevos_by_month(year, month)
        return {"success": True, "data": negocios}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== OTHER LEGACY ENDPOINTS IF ANY ====================
# Renewal States JSON/ endpoints omitted for brevity but should be here if used.
# Consecutivos Prima endpoints omitted...
# I'll add them back quickly to be safe.

class ConsecutivosPrimaRequest(BaseModel):
    sheetName: str
    primas: dict
CONSECUTIVOS_PRIMA_FILE = "server/data/consecutivos_primas.json"

@app.post("/api/consecutivos-primas/save", dependencies=[Depends(get_current_user)])
async def save_consecutivos_prima_values(request: ConsecutivosPrimaRequest):
    try:
        os.makedirs(os.path.dirname(CONSECUTIVOS_PRIMA_FILE), exist_ok=True)
        all_primas = {}
        if os.path.exists(CONSECUTIVOS_PRIMA_FILE):
            with open(CONSECUTIVOS_PRIMA_FILE, 'r', encoding='utf-8') as f: all_primas = json.load(f)
        all_primas[request.sheetName] = request.primas
        with open(CONSECUTIVOS_PRIMA_FILE, 'w', encoding='utf-8') as f: json.dump(all_primas, f)
        return {"success": True}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/consecutivos-primas/{sheet_name}", dependencies=[Depends(get_current_user)])
async def get_consecutivos_prima_values(sheet_name: str):
    try:
        if os.path.exists(CONSECUTIVOS_PRIMA_FILE):
             with open(CONSECUTIVOS_PRIMA_FILE, 'r', encoding='utf-8') as f: 
                 return {"success": True, "data": json.load(f).get(sheet_name, {})}
        return {"success": True, "data": {}}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

