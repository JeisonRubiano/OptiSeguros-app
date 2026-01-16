import sys
import os
import pandas as pd
from datetime import datetime
from pathlib import Path

# Add server directory to path
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

from services.unified_data_processor import load_unified_cache

def debug_dashboard_logic():
    print("Loading cache...")
    try:
        data = load_unified_cache()
    except Exception as e:
        print(f"Error loading cache: {e}")
        return

    print(f"Cache keys: {list(data.keys())}")
    
    if 'todos' in data:
        print(f"Count 'todos': {len(data['todos'])}")
        if len(data['todos']) > 0:
            print(f"Sample 'todos' record: {data['todos'][0]}")
    else:
        print("'todos' key MISSING in cache")
        
    if 'negocios_nuevos' in data:
        print(f"Count 'negocios_nuevos': {len(data['negocios_nuevos'])}")
    
    # Simulate extraction used in main.py
    all_data = data.get('detalle') or data.get('todos') or data.get('negocios_nuevos') or []
    print(f"Records extracted for dashboard: {len(all_data)}")
    
    if not all_data:
        print("CRITICAL: No data extracted for dashboard processing")
        return

    # Simulate filtering for a known date (e.g., JAN 2026 as seen in screenshot)
    # The screenshot shows "enero de 2026".
    target_year = 2026
    target_month = 1
    
    print(f"\nSimulating filter for Year={target_year}, Month={target_month}")
    
    match_count = 0
    sample_dates = []
    
    for i, record in enumerate(all_data):
        # Logic from main.py
        fecha_val = record.get('FECHA_EXPEDICION') or record.get('FECHA EXPEDICION NEGOCIO DIA-MES-AÑO') or record.get('FECHA EXPEDICION NEGOCIO')
        
        if i < 5:
            sample_dates.append(fecha_val)
            
        if not fecha_val:
            continue
            
        try:
            fecha_dt = None
            if isinstance(fecha_val, str):
                if 'T' in fecha_val:
                    fecha_dt = datetime.fromisoformat(fecha_val)
                else:
                    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"]:
                        try:
                            fecha_dt = datetime.strptime(fecha_val, fmt)
                            break
                        except:
                            pass
            
            if fecha_dt:
                if fecha_dt.year == target_year and fecha_dt.month == target_month:
                    match_count += 1
        except Exception as e:
            pass

    print(f"Sample raw dates: {sample_dates}")
    print(f"Records matching {target_year}-{target_month}: {match_count}")
    
    if match_count == 0:
        print("\nDIAGNOSIS: Zero matches found. Checking available years/months...")
        # Check what we DO have
        stats = {}
        for record in all_data:
            fecha_val = record.get('FECHA_EXPEDICION')
            if fecha_val:
                try:
                    dt = datetime.fromisoformat(fecha_val)
                    key = (dt.year, dt.month)
                    stats[key] = stats.get(key, 0) + 1
                except:
                    pass
        
        sorted_stats = sorted(stats.items(), reverse=True)
        print("Available Year-Month counts (Top 10):")
        for k, v in sorted_stats[:10]:
            print(f"  {k}: {v}")

if __name__ == "__main__":
    debug_dashboard_logic()
