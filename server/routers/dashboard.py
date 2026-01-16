from fastapi import APIRouter, Depends, HTTPException
from dependencies import get_current_user
from services.unified_data_processor import get_forecast_data, load_unified_cache, get_all_records, clean_currency_value as clean_currency
from services.policy_state_manager import PolicyStateManager
from datetime import datetime
import pandas as pd
import os
import json

router = APIRouter()

@router.get("/api/forecast-calculated/{year}/{month}", dependencies=[Depends(get_current_user)])
def get_calculated_forecast(year: int, month: str):
    """
    Retorna forecast calculado desde cache unificada.
    """
    try:
        # Usar nueva función unificada
        data = get_forecast_data(year, month)
        if not data:
            return {"success": True, "data": []}
            
        # Sanitización manual de NaNs
        for record in data:
            for key, value in record.items():
                if isinstance(value, float):
                    if pd.isna(value) or value == float('inf') or value == float('-inf'):
                        record[key] = None
                        
        return {"success": True, "data": data}
    except Exception as e:
        print(f"Error calculating forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/forecast-available-months")
async def get_forecast_available_months():
    """
    Automatically detect available months from data by scanning FECHA EXPEDICION NEGOCIO.
    Returns list of month-year combinations in format "MES YY" (e.g., "ENE 26", "DIC 25")
    """
    try:
        # Load unified cache
        cache = load_unified_cache()
        todos = cache.get('todos', [])
        
        if not todos:
            return {"success": True, "months": []}
        
        # Get unique year-month combinations
        year_months = set()
        
        for record in todos:
            y = record.get('AÑO')
            m = record.get('MES')
            
            if y and m and isinstance(y, int) and isinstance(m, int):
                 # Filter absurd years
                 if 2000 <= y <= 2030:
                     year_months.add((y, m))
        
        # Convert to forecast format: "MES YY"
        month_names = {
            1: 'ENE', 2: 'FEB', 3: 'MAR', 4: 'ABR', 5: 'MAY', 6: 'JUN',
            7: 'JUL', 8: 'AGO', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DIC'
        }
        
        forecast_months = []
        # Sort descending (most recent first)
        for year, month in sorted(year_months, reverse=True):
            month_name = month_names.get(month, f'M{month}')
            year_short = str(year)[-2:]  # Last 2 digits
            forecast_months.append(f"{month_name} {year_short}")
        
        return {
            "success": True,
            "months": forecast_months
        }
    except Exception as e:
        print(f"Error detecting forecast months: {e}")
        return {"success": False, "months": [], "error": str(e)}

@router.get("/api/dashboard/stats", dependencies=[Depends(get_current_user)])
def get_dashboard_stats(year: int, month: int):
    """
    Obtiene estadísticas del dashboard para un mes específico.
    """
    try:
        # Obtener datos de detalle usando unificado
        all_data = get_all_records()
        
        if not all_data:
             return {"success": False, "error": "No data available"}
             
        month_data = []
        
        for record in all_data:
            # Buscar fecha en varias columnas posibles
            fecha_val = record.get('FECHA_EXPEDICION') or record.get('FECHA EXPEDICION NEGOCIO DIA-MES-AÑO') or record.get('FECHA EXPEDICION NEGOCIO')
            
            if not fecha_val:
                continue
                
            fecha_dt = None
            try:
                if isinstance(fecha_val, str):
                    if 'T' in fecha_val:
                        fecha_dt = datetime.fromisoformat(fecha_val)
                    else:
                        for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"]:
                            try:
                                fecha_dt = datetime.strptime(fecha_val, fmt)
                                break
                            except:
                                continue
                elif isinstance(fecha_val, (datetime, pd.Timestamp)): # pd.Timestamp fix
                     fecha_dt = fecha_val
            except:
                pass
                
            if fecha_dt:
                 r_year = fecha_dt.year
                 r_month = fecha_dt.month
                 if r_year == year and r_month == month:
                     month_data.append(record)
        
        # Cargar estados guardados
        base_dir = os.path.dirname(os.path.dirname(__file__))
        policy_states_path = os.path.join(base_dir, 'data', 'policy_states.json')
        
        state_manager = PolicyStateManager(file_path=policy_states_path)
        saved_states = state_manager.get_all_states()
        
        # Contar estados
        pendientes = []
        recaudadas = []
        anuladas = []
        
        for record in month_data:
            consecutivo = str(record.get('CONSECUTIVO', ''))
            
            # Obtener estado
            estado_config = saved_states.get(consecutivo)
            if estado_config and isinstance(estado_config, dict):
                estado_final = estado_config.get('estado', '')
            else:
                estado_excel = str(record.get('ESTADO', '')).upper()
                if 'RECAUD' in estado_excel or 'PAGAD' in estado_excel:
                    estado_final = 'RECAUDADA'
                elif 'ANULAD' in estado_excel or 'CANCEL' in estado_excel:
                    estado_final = 'ANULADA'
                else:
                    estado_final = 'PENDIENTE'
            
            estado_final = estado_final.upper()
            
            if 'RECAUDADA' in estado_final:
                recaudadas.append(record)
            elif 'ANULADA' in estado_final:
                anuladas.append(record)
            else:
                pendientes.append(record)
        
        def calculate_total_usd(records):
            total = 0.0
            for r in records:
                val = r.get('PRIMA_TOTAL_USD', 0)
                if val == 0:
                     val = r.get('PRIMA_SIN_IVA_USD', 0)
                total += clean_currency(val)
            return total

        total_usd_recaudadas = calculate_total_usd(recaudadas)
        total_usd_pendientes = calculate_total_usd(pendientes)
        total_usd_anuladas = calculate_total_usd(anuladas)
        total_usd = total_usd_recaudadas + total_usd_pendientes + total_usd_anuladas
        
        efectividad_recaudo = round((total_usd_recaudadas / total_usd * 100), 1) if total_usd > 0 else 0

        # Alertas de pendientes > 20 días
        today = datetime.now()
        pendientes_20_dias = []
        
        for record in pendientes:
            fecha_val = record.get('FECHA EXPEDICION NEGOCIO DIA-MES-AÑO') or record.get('FECHA_EXPEDICION')
            if not fecha_val: continue
            
            try:
                if isinstance(fecha_val, str):
                    if 'T' in fecha_val:
                        fecha_dt = datetime.fromisoformat(fecha_val)
                    else: 
                         # Try simple parsing if allowed, but unified usually has ISO
                         try:
                             fecha_dt = datetime.strptime(fecha_val, "%Y-%m-%d") 
                         except:
                             continue
                else:
                    fecha_dt = fecha_val
                
                # Check delta
                if isinstance(fecha_dt, datetime):
                    delta = today - fecha_dt
                else:
                    # pd.Timestamp or date
                    delta = today - pd.to_datetime(fecha_dt) # ensure format

                if hasattr(delta, 'days'):
                    dias = delta.days
                    if dias > 20:
                        rec = record.copy()
                        rec['dias_pendiente'] = dias
                        pendientes_20_dias.append(rec)
            except:
                pass
        
        pendientes_20_dias.sort(key=lambda x: x.get('dias_pendiente', 0), reverse=True)
        
        return {
            "success": True,
            "year": year,
            "month": month,
            "summary": {
                "total": len(month_data),
                "pendientes": len(pendientes),
                "recaudadas": len(recaudadas),
                "anuladas": len(anuladas),
                "total_usd_recaudadas": total_usd_recaudadas,
                "total_usd_pendientes": total_usd_pendientes,
                "total_usd_anuladas": total_usd_anuladas,
                "recaudo_percentage_count": round((len(recaudadas) / len(month_data) * 100), 1) if month_data else 0,
                "efectividad_recaudo": efectividad_recaudo
            },
            "alerts": {
                "pendientes_20_dias_count": len(pendientes_20_dias),
                "pendientes_20_dias_list": pendientes_20_dias
            }
        }

    except Exception as e:
        print(f"[DASHBOARD] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/cobros/pending", dependencies=[Depends(get_current_user)])
def get_cobros_pending():
    """
    Retorna TODAS las pólizas pendientes agrupadas por RESPONSABLE.
    """
    try:
        from services.unified_data_processor import get_all_records
        
        all_data = get_all_records() or []
        
        # Cargar Mapping Responsables
        base_dir = os.path.dirname(os.path.dirname(__file__))
        mapping_path = os.path.join(base_dir, 'data', 'responsables_mapping.json')
        responsables_map = {}
        if os.path.exists(mapping_path):
            with open(mapping_path, 'r', encoding='utf-8') as f:
                responsables_map = json.load(f)
                
        # Cargar Estados Guardados
        policy_states_path = os.path.join(base_dir, 'data', 'policy_states.json')
        state_manager = PolicyStateManager(file_path=policy_states_path)
        saved_states = state_manager.get_all_states()
        
        grouped = {}
        
        for record in all_data:
            consecutivo = str(record.get('CONSECUTIVO', ''))
            
            # Determinar Estado
            estado_config = saved_states.get(consecutivo)
            if estado_config:
                 estado_final = estado_config.get('estado', '')
            else:
                 estado_final = 'PENDIENTE' # Default si no está guardado? 
                 # Unified data 'ESTADO' might be 'Solicitud en estudio' etc.
                 # Replicar lógica simple: si no dice RECAUDADA o ANULADA es PENDIENTE
                 est_excel = str(record.get('ESTADO', '')).upper()
                 if 'RECAUD' in est_excel or 'PAGAD' in est_excel: estado_final = 'RECAUDADA'
                 elif 'ANULAD' in est_excel or 'CANCEL' in est_excel: estado_final = 'ANULADA'
                 else: estado_final = 'PENDIENTE'

            if estado_final != 'PENDIENTE':
                continue
                
            # Agrupar por Regional
            regional = record.get('REGIONAL', 'SIN REGIONAL')
            responsable = responsables_map.get(regional, 'SIN ASIGNAR')
            
            if responsable not in grouped:
                grouped[responsable] = {'items': [], 'total_usd': 0, 'count': 0}
            
            grouped[responsable]['items'].append(record)
            
            # Sumar
            val = record.get('PRIMA_TOTAL_USD', 0) or record.get('PRIMA_SIN_IVA_USD', 0)
            grouped[responsable]['total_usd'] += clean_currency(val)
            grouped[responsable]['count'] += 1
            
        return {"success": True, "data": grouped}

    except Exception as e:
        print(f"[COBROS] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
