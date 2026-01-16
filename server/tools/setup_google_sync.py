import os
import pickle
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# Scopes obligatorios para leer Drive y Sheets
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
]

# Determinar rutas absolutas basadas en la ubicación del script
# El script está en server/tools/, y credentials.json está en server/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDENTIALS_FILE = os.path.join(BASE_DIR, 'credentials.json')
TOKEN_FILE = os.path.join(BASE_DIR, 'token.json')

def authenticate():
    creds = None
    # 1. Cargar token existente si hay
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            try:
                creds = pickle.load(token)
            except Exception:
                print("Token inválido, se regenerará.")

    # 2. Si no hay creds válidas, loguearse
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                print(f"ERROR: No se encontró {CREDENTIALS_FILE}. Asegúrate de haberlo descargado.")
                return None
            
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            # Usar puerto fijo 8080 para evitar errores de URI dinámico
            creds = flow.run_local_server(port=8080)

        # 3. Guardar el token para la próxima
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)
            print("Login exitoso! Token guardado en", TOKEN_FILE)
    
    return creds

def list_recent_sheets(creds, limit=15):
    try:
        service = build('drive', 'v3', credentials=creds)
        
        # Buscar solo hojas de cálculo modificadas recientemente
        query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
        results = service.files().list(
            q=query,
            pageSize=limit,
            fields="nextPageToken, files(id, name, modifiedTime, owners)",
            orderBy="modifiedTime desc"
        ).execute()
        
        items = results.get('files', [])

        if not items:
            print("No se encontraron hojas de cálculo recientes.")
        else:
            print("\n--- HOJAS DE CÁLCULO RECIENTES ---")
            print(f"{'ID':<35} | {'NOMBRE':<40} | {'MODIFICADO'}")
            print("-" * 90)
            for item in items:
                name = item['name'][:38] + '..' if len(item['name']) > 38 else item['name']
                print(f"{item['id']:<35} | {name:<40} | {item['modifiedTime']}")
            print("-" * 90)
            print("Copia los ID de los archivos 'REPORTE' y 'SEGUIMIENTO CANCELACIONES'.")

    except Exception as e:
        print(f"Error listando archivos: {e}")

if __name__ == '__main__':
    print("Iniciando autenticación con Google...")
    creds = authenticate()
    if creds:
        list_recent_sheets(creds)
