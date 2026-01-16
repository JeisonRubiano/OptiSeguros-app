import sys
import os
import pandas as pd
from pathlib import Path

# Add server directory to path
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

from services.unified_data_processor import clean_currency_value, get_regional, get_consecutivos_pendientes_dataframe, load_unified_cache

def test_currency():
    print("\n[TEST] Currency Cleaning")
    cases = [
        ("1.200,50", 1200.50),
        ("USD 1,200.50", 1200.50),
        ("1,200", 1200.0),
        ("12,34", 12.34),
        ("$ 0", 0.0),
        ("", 0.0),
        ("2024-01-01 10:00:00", 0.0),
        ("US$ 500", 500.0)
    ]
    
    for inp, expected in cases:
        res = clean_currency_value(inp)
        print(f"Input: {inp!r} -> Got: {res} (Expected: {expected}) - {'PASS' if res == expected else 'FAIL'}")

def test_regional():
    print("\n[TEST] Regional Mapping")
    cases = [
        ("MEDELLIN", "ANTIOQUIA Y EJE CAFETERO"),
        ("MEDELLÍN (LAURELES)", "ANTIOQUIA Y EJE CAFETERO"),
        ("OFICINA BOGOTA", "BOGOTÁ"),
        ("CORREDORES MEDELLIN", "CORREDORES MEDELLIN"),
        ("CORREDORES BOGOTA", "CORREDORES BOGOTA"),
        ("CALI", "SUROCCIDENTE"),
        ("IBAGUE", "CENTRO"), # Fuzzy Check
        ("Sucursal Inexistente", "OTRA")
    ]
    
    for inp, expected in cases:
        res = get_regional(inp)
        status = 'PASS' if res == expected else 'FAIL'
        print(f"Input: {inp!r} -> Got: {res} (Expected: {expected}) - {status}")

def test_dataframe():
    print("\n[TEST] DataFrame Generation")
    try:
        # Force load if not loaded
        load_unified_cache()
        
        df = get_consecutivos_pendientes_dataframe()
        if df.empty:
            print("[WARN] DataFrame is empty (might be expected if no data)")
        else:
            print(f"DataFrame Rows: {len(df)}")
            print("Columns:", df.columns.tolist())
            
            # Check for critical columns
            required = ['Consecutivo', 'Localidad', 'Prima']
            missing = [c for c in required if c not in df.columns]
            if missing:
                print(f"[FAIL] Missing columns: {missing}")
            else:
                print("[PASS] All required columns present")
                
            # Sample data
            print(df.head(1).to_dict('records'))
    except Exception as e:
        print(f"[FAIL] Error generating DataFrame: {e}")

if __name__ == "__main__":
    test_currency()
    test_regional()
    test_dataframe() 
