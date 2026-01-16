"""
Servicio para consultar el estado de consecutivos en la API de Seguros Bolívar.
Replica la funcionalidad del script de Google Apps Script.
"""

import requests
import re
from typing import Optional, Dict
from functools import lru_cache
import html
import urllib3

# Suppress InsecureRequestWarning
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuración de la API
API_URL = "https://transac.segurosbolivar.com/pestadis/CONS_PENDIENTES_ACORDE_SISE.VALIDA_ENTRADA1"
API_CREDENTIALS = {
    "P_LOGIN": "tqxwxuow",
    "P_COD_MOD": "1306",
    "P_COD_PROV": "ppqxu",
    "P_TIEMPO": "50",
    "P_RESULTADO": "rsstxrot"
}

# Modo de operación: 'real' o 'mock'
OPERATION_MODE = 'real'  # Default a REAL como solicitó el usuario implícitamente


def clean_tags(text: str) -> str:
    """Elimina tags HTML y normaliza espacios."""
    if not text:
        return ""
    # Eliminar tags HTML
    text = re.sub(r'<[^>]+>', '', text)
    # Normalizar espacios y saltos de línea
    text = re.sub(r'\r?\n|\r', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def normalize_and_clean(text: str) -> str:
    """Limpia tags y normaliza caracteres acentuados."""
    text = clean_tags(text).lower()
    # Normalizar caracteres acentuados
    replacements = {
        'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a',
        'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
        'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
        'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o',
        'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
        'ñ': 'n', 'ç': 'c'
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return re.sub(r'\s+', ' ', text).strip()


def decode_html_entities(text: str) -> str:
    """Decodifica entidades HTML."""
    if not text:
        return text
    
    # Decodificar entidades numéricas decimales
    text = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), text)
    # Decodificar entidades numéricas hexadecimales
    text = re.sub(r'&#x([0-9A-Fa-f]+);', lambda m: chr(int(m.group(1), 16)), text)
    
    # Mapa de entidades HTML comunes
    entity_map = {
        'aacute': 'á', 'eacute': 'é', 'iacute': 'í', 'oacute': 'ó', 'uacute': 'ú',
        'Aacute': 'Á', 'Eacute': 'É', 'Iacute': 'Í', 'Oacute': 'Ó', 'Uacute': 'Ú',
        'ntilde': 'ñ', 'Ntilde': 'Ñ', 'uuml': 'ü', 'Uuml': 'Ü',
        'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'", 'nbsp': ' '
    }
    
    def replace_entity(match):
        entity = match.group(1)
        return entity_map.get(entity, match.group(0))
    
    text = re.sub(r'&([a-zA-Z]+);', replace_entity, text)
    return text


def decode_response(content: bytes, content_type: str = "") -> str:
    """
    Intenta decodificar la respuesta usando diferentes encodings.
    Replica la lógica de decodificarRespuesta del script original.
    """
    # Intentar extraer charset del Content-Type
    declared_charset = None
    if content_type:
        match = re.search(r'charset=([^;]+)', content_type, re.IGNORECASE)
        if match:
            declared_charset = match.group(1).strip().strip('"\'')
    
    # Lista de encodings a probar
    candidates = [declared_charset, 'UTF-8', 'ISO-8859-1', 'Windows-1252']
    candidates = [c for c in candidates if c]  # Filtrar None
    
    for encoding in candidates:
        try:
            text = content.decode(encoding)
            # Verificar si contiene caracteres españoles o palabras clave
            if re.search(r'[áéíóúñÁÉÍÓÚÑ]', text) or re.search(r'Observaciones|causa de devolucion', text, re.IGNORECASE):
                return text
            # Si es el último candidato, retornar de todas formas
            if encoding == candidates[-1]:
                return text
        except (UnicodeDecodeError, LookupError):
            continue
    
    # Fallback: intentar UTF-8
    return content.decode('utf-8', errors='replace')


def parse_html_tables(html_content: str) -> Dict[str, str]:
    """
    Parsea el HTML para extraer 'Causa de devolución' y 'Observaciones'.
    """
    # Extraer todas las tablas
    tables = re.findall(r'<table[^>]*>[\s\S]*?</table>', html_content, re.IGNORECASE)
    
    causa_comentario = ""
    observacion_comentario = ""
    
    for table in tables:
        # Extraer headers (th)
        ths = re.findall(r'<th[^>]*>([\s\S]*?)</th>', table, re.IGNORECASE)
        ths_normalized = [normalize_and_clean(th) for th in ths]
        
        # Normalizar contenido completo de la tabla
        table_normalized = normalize_and_clean(table)
        
        # Verificar si es tabla de "Causa de devolución"
        is_causa = any('causa' in h and 'devolucion' in h for h in ths_normalized) or 'causa de devolucion' in table_normalized
        
        # Verificar si es tabla de "Observaciones"
        is_observaciones = any('observaciones' in h for h in ths_normalized) or 'observaciones' in table_normalized
        
        if is_causa and not causa_comentario:
            # Extraer todas las celdas (td)
            tds = re.findall(r'<td[^>]*>([\s\S]*?)</td>', table, re.IGNORECASE)
            tds_clean = [decode_html_entities(clean_tags(td)) for td in tds]
            if tds_clean:
                causa_comentario = tds_clean[-1].strip()
        
        if is_observaciones and not observacion_comentario:
            # Extraer todas las filas (tr)
            rows = re.findall(r'<tr[^>]*>[\s\S]*?</tr>', table, re.IGNORECASE)
            # Filtrar filas que contienen td (datos, no headers)
            data_rows = [r for r in rows if re.search(r'<td', r, re.IGNORECASE)]
            if data_rows:
                # Tomar la última fila
                last_row = data_rows[-1]
                # Extraer celdas de la última fila
                cells = re.findall(r'<td[^>]*>([\s\S]*?)</td>', last_row, re.IGNORECASE)
                cells_clean = [decode_html_entities(clean_tags(cell)) for cell in cells]
                if cells_clean:
                    observacion_comentario = cells_clean[-1].strip()
        
        # Si ya encontramos ambos, salir del loop
        if causa_comentario and observacion_comentario:
            break
    
    return {
        'causa': causa_comentario,
        'observacion': observacion_comentario
    }


@lru_cache(maxsize=1000)
def consultar_estado_consecutivo_real(consecutivo: str) -> str:
    """
    Consulta el estado de un consecutivo en la API real de Seguros Bolívar.
    Usa caché LRU para evitar consultas repetidas.
    """
    # Limpiar y validar consecutivo
    consecutivo = str(consecutivo).strip().replace('.0', '')
    
    # Validar que sea un número
    if not re.match(r'^\d+$', consecutivo):
        return ""
    
    # Preparar payload
    payload = {
        **API_CREDENTIALS,
        "p_consecutivo": consecutivo
    }
    
    headers = {
        'Accept-Charset': 'UTF-8, ISO-8859-1;q=0.9, Windows-1252;q=0.8',
        'Accept-Language': 'es-CO,es;q=0.9',
        'User-Agent': 'Mozilla/5.0 (AppsScript)', # Mimic GAS
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
    
    try:
        print(f"[API-CLIENT] Consultando: {consecutivo} ...", end="", flush=True)
        response = requests.post(
            API_URL,
            data=payload,
            headers=headers,
            timeout=30,
            allow_redirects=True,
            verify=False  # Disable SSL verification for internal corporate sites
        )
        
        # Check status code explicitly
        if response.status_code != 200:
            print(f" ERROR HTTP {response.status_code}")
            return f"Error HTTP {response.status_code}"

        # Decodificar respuesta
        content_type = response.headers.get('Content-Type', '')
        html_content = decode_response(response.content, content_type)
        
        # Parsear tablas
        result = parse_html_tables(html_content)
        
        # Combinar causa y observación
        parts = [result['causa'], result['observacion']]
        combined = ' | '.join([p for p in parts if p])
        
        final_result = combined if combined else "Comentario no encontrado"
        print(" OK")
        return final_result
        
    except requests.RequestException as e:
        print(f" ERROR CONNECTION: {e}")
        return "Error de consulta"
    except Exception as e:
        print(f" ERROR UNEXPECTED: {e}")
        return "Error de consulta"


def consultar_estado_consecutivo_mock(consecutivo: str) -> str:
    """
    Versión mock para desarrollo y testing.
    Retorna datos simulados basados en el consecutivo.
    """
    consecutivo = str(consecutivo).strip()
    
    # Validar formato
    if not re.match(r'^\d+$', consecutivo):
        return ""
    
    # Generar respuesta mock basada en el último dígito
    last_digit = int(consecutivo[-1])
    
    mock_responses = [
        "Documentación incompleta | Falta copia de cédula del asegurado",
        "Pendiente de firma | Asegurado no ha firmado la solicitud",
        "Verificación de datos | En proceso de validación de información",
        "Aprobado | Pendiente de emisión de póliza",
        "Rechazado | No cumple requisitos de asegurabilidad",
        "En revisión médica | Pendiente de concepto médico",
        "Documentación adicional requerida | Falta exámenes médicos",
        "Pendiente de pago | Esperando confirmación de pago de prima",
        "En proceso | Documentación en revisión",
        "Subsanación requerida | Corregir datos del formulario"
    ]
    
    return mock_responses[last_digit]


def consultar_estado_consecutivo(consecutivo: str) -> str:
    """
    Función principal para consultar el estado de un consecutivo.
    Usa modo real o mock según configuración.
    """
    if OPERATION_MODE == 'real':
        return consultar_estado_consecutivo_real(consecutivo)
    else:
        return consultar_estado_consecutivo_mock(consecutivo)


def set_operation_mode(mode: str):
    """
    Cambia el modo de operación entre 'real' y 'mock'.
    """
    global OPERATION_MODE
    if mode in ['real', 'mock']:
        OPERATION_MODE = mode
        print(f"[INFO] Modo de operación cambiado a: {mode}")
    else:
        raise ValueError("Modo debe ser 'real' o 'mock'")


def get_operation_mode() -> str:
    """Retorna el modo de operación actual."""
    return OPERATION_MODE
