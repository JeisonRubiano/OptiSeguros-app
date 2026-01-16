import os
import pickle
import io
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# Configuración de Rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__))) # Root del proyecto
SERVER_DIR = os.path.dirname(os.path.dirname(__file__)) # carpeta server/

TOKEN_FILE = os.path.join(SERVER_DIR, 'token.json')

# CONFIGURACIÓN DE ARCHIVOS A SINCRONIZAR
# ID: El ID del Google Sheet
# PATH: La ruta local donde se guardará (debe coincidir con lo que espera data_processor.py)
SYNC_CONFIG = {
    'reporte': {
        'id': '1dnaVOAoYG6lGSUW47WB8fc3Vdu3sAwIA', # Nuevo ID Personal
        'path': os.path.join(BASE_DIR, "REPORTE NEGOCIOS SALUD INTERNACIONAL -OPERACIONES 06112018.xlsx")
    },
    'cancelaciones': {
        'id': '1b7Z-nj96CZZZ3dbKBSNP6zXgayUlRDhp', # Nuevo ID Personal
        'path': os.path.join(BASE_DIR, "SEGUIMIENTO CANCELACIONES 2025 (1) (1).xlsx")
    }
}

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
]

from google.oauth2 import service_account

CREDS_FILE = os.path.join(SERVER_DIR, 'credentials.json')

def get_drive_service():
    """Autentica y retorna el servicio de Google Drive API (Soporta Service Account y Token user)."""
    creds = None
    
    # 1. Estrategia Prioritaria: Service Account (Ideal para Servidores/Nube)
    if os.path.exists(CREDS_FILE):
        try:
            print(f"[AUTH] Intentando autenticación con Service Account: {CREDS_FILE}")
            creds = service_account.Credentials.from_service_account_file(
                CREDS_FILE, scopes=SCOPES)
            return build('drive', 'v3', credentials=creds)
        except Exception as e:
            print(f"[AUTH] Error con Service Account (fallback a token): {e}")

    # 2. Estrategia Legacy: Token de Usuario (token.json)
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            try:
                creds = pickle.load(token)
            except Exception as e:
                print(f"[ERROR] Error cargando token: {e}")
                return None

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(TOKEN_FILE, 'wb') as token:
                    pickle.dump(creds, token)
            except Exception as e:
                print(f"[ERROR] No se pudo refrescar el token: {e}")
                return None
        else:
            print("[ERROR] No se encontró método de autenticación válido (ni credentials.json ni token.json).")
            return None

    return build('drive', 'v3', credentials=creds)

def download_sheet_as_excel(service, file_id, output_path):
    """Descarga un Google Sheet como Excel (.xlsx)."""
    try:
        print(f"[SYNC] Iniciando descarga de ID: {file_id}...")
        
        # Endpoint para exportar como xlsx
        # MIME type para Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        request = service.files().export_media(
            fileId=file_id,
            mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
        # Descargar en memoria primero para evitar archivos corruptos si falla a medias
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            # print(f"[SYNC] Descargando {int(status.progress() * 100)}%...")

        # Escribir a disco
        with open(output_path, 'wb') as f:
            f.write(fh.getvalue())
            
        print(f"[SYNC] [OK] Descarga exitosa: {output_path}")
        return True
        
    except Exception as e:
        print(f"[SYNC] [ERROR] Error descargando archivo: {e}")
        return False

def run_sync():
    """Ejecuta la sincronización completa."""
    print("=========================================")
    print(f"[SYNC] Iniciando sincronización con Google Sheets...")
    
    service = get_drive_service()
    if not service:
        print("[SYNC] [ERROR] Fallo en autenticación. Abortando.")
        return False
    
    success_count = 0
    total_count = 0
    
    for key, config in SYNC_CONFIG.items():
        total_count += 1
        print(f"[SYNC] Procesando '{key}'...")
        if download_sheet_as_excel(service, config['id'], config['path']):
            success_count += 1
    
    print("=========================================")
    print(f"[SYNC] Resumen: {success_count}/{total_count} archivos actualizados.")
    
    # Invalidar cachés si es necesario (borrar .cache_reporte.json)
    # Esto forzará al data_processor a leer el nuevo Excel
    cache_path = os.path.join(SERVER_DIR, ".cache_reporte.json")
    if os.path.exists(cache_path):
        try:
            os.remove(cache_path)
            print("[SYNC] Caché local (.cache_reporte.json) invalidado para forzar recarga.")
        except Exception as e:
            print(f"[SYNC] Advertencia al borrar caché: {e}")
            
    return success_count == total_count

if __name__ == '__main__':
    run_sync()
