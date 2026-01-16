import pandas as pd
import os
import json
from datetime import datetime

# Archivo de persistencia de inputs del usuario
CANCELACIONES_INPUTS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cancelaciones_inputs.json")
# Ruta del archivo Excel
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
EXCEL_FILE = os.path.join(BASE_DIR, "SEGUIMIENTO CANCELACIONES 2025 (1) (1).xlsx")
SHEET_NAME = "Cancelaciones IND"

def load_user_inputs():
    """Carga los inputs guardados por el usuario (estado actual, causal sages)."""
    if os.path.exists(CANCELACIONES_INPUTS_FILE):
        try:
            with open(CANCELACIONES_INPUTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading inputs: {e}")
    return {}

def save_user_inputs(inputs):
    """Guarda los inputs del usuario en JSON."""
    os.makedirs(os.path.dirname(CANCELACIONES_INPUTS_FILE), exist_ok=True)
    with open(CANCELACIONES_INPUTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(inputs, f, ensure_ascii=False, indent=2)

def calculate_regional(sucursal: str):
    """
    Calcula la Regional basada en la Sucursal.
    Lógica replicada de la fórmula de Excel.
    """
    if not sucursal:
        return ""
        
    s = sucursal.lower()
    
    # ANTIOQUIA Y EJE CAFETERO
    if any(x in s for x in ["medellín", "medellin", "armenia", "pereira", "manizalez", "manizales"]):
        if "corredores" in s: 
            return "CORREDORES MEDELLIN"
        return "ANTIOQUIA Y EJE CAFETERO"
        
    # BOGOTÁ
    if any(x in s for x in ["bogotá", "bogota", "pasadena"]):
        if "corredores" in s: 
            # BCM corredores bogota logic
            return "BCM corredores bogota"
        return "BOGOTÁ"
        
    # CARIBE
    if any(x in s for x in ["barranquilla", "cartagena", "santa marta", "monteria", "sincelejo", "valledupar", "bolivar"]):
        if "corredores" in s:
            return "CORREDORES BARRANQUILLA"
        return "CARIBE"
        
    # CORREDORES CALI / OCCIDENTE
    if "cali" in s:
        if "corredores" in s:
            return "CORREDORES CALI"
        return "OCCIDENTE"
        
    if "pasto" in s:
        return "OCCIDENTE"
        
    # CENTRO
    if any(x in s for x in ["neiva", "bucaramanga", "cucuta", "ibague", "villavicencio"]):
        if "corredores" in s and "bucaramanga" in s:
            return "CORREDORES BUCARAMANGA"
        return "CENTRO"
        
    # SAM
    if "sam" in s:
        return "SAM Agencias Multiples"
        
    return "OTRA"

def get_cancelaciones_data():
    """
    Lee el archivo excel y fusiona con los inputs del usuario.
    """
    if not os.path.exists(EXCEL_FILE):
        raise FileNotFoundError(f"No se encuentra el archivo: {EXCEL_FILE}")

    # Leer Excel
    # Usar header=0 para que la primera fila sea cabecera
    df = pd.read_excel(EXCEL_FILE, sheet_name=SHEET_NAME)
    
    # Limpiar nombres de columnas (eliminar espacios extra si los hay)
    df.columns = [c.strip() if isinstance(c, str) else c for c in df.columns]

    # Convertir a lista de dicts
    records = df.to_dict('records')
    
    # Cargar inputs guardados
    user_inputs = load_user_inputs()
    
    # Procesar y fusionar
    processed_data = []
    
    for record in records:
        # Limpiar NaN
        clean_record = {}
        for k, v in record.items():
            if pd.isna(v):
                clean_record[k] = ""
            elif isinstance(v, datetime):
                clean_record[k] = v.isoformat()
            else:
                clean_record[k] = v
        
        # Calcular Regional basada en Sucursal
        sucursal = str(clean_record.get('SUCURSAL', '')).strip()
        clean_record['REGIONAL'] = calculate_regional(sucursal)


                
        # Clave única: NUMERO_POLIZA (convertir a string para consistencia)
        policy_id = str(clean_record.get('NUMERO_POLIZA', ''))
        
        # Inyectar datos del usuario si existen
        if policy_id in user_inputs:
            user_data = user_inputs[policy_id]
            clean_record['ESTADO_ACTUAL'] = user_data.get('estado_actual', '')
            # Sobrescribir Causal Sages si existe en user_inputs
            if 'causal_sages' in user_data:
                clean_record['CAUSAL SAGES MANAGEMENT'] = user_data['causal_sages']
        else:
             clean_record['ESTADO_ACTUAL'] = 'Pendiente' # Default

        processed_data.append(clean_record)
        
    return processed_data

def update_cancelacion(policy_id: str, field: str, value: str):
    """
    Actualiza un campo (estado_actual o causal_sages) para una poliza.
    """
    user_inputs = load_user_inputs()
    
    if policy_id not in user_inputs:
        user_inputs[policy_id] = {}
        
    user_inputs[policy_id][field] = value
    
    save_user_inputs(user_inputs)
    return user_inputs[policy_id]
