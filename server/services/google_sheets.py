import gspread
from oauth2client.service_account import ServiceAccountCredentials
import pandas as pd
import os

class GoogleSheetsService:
    def __init__(self):
        self.scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive"
        ]
        self.creds_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "credentials.json")
        self.client = None
    
    def connect(self):
        if not os.path.exists(self.creds_file):
            raise FileNotFoundError(f"No se encontró el archivo de credenciales en: {self.creds_file}")
        
        creds = ServiceAccountCredentials.from_json_keyfile_name(self.creds_file, self.scope)
        self.client = gspread.authorize(creds)

    def get_sheet_data(self, sheet_name):
        if not self.client:
            self.connect()
        
        try:
            sheet = self.client.open(sheet_name).sheet1  # Opens the first sheet
            data = sheet.get_all_records()
            return data
        except gspread.SpreadsheetNotFound:
            raise Exception(f"No se encontró la hoja de cálculo: {sheet_name}")
        except Exception as e:
            raise Exception(f"Error al leer la hoja: {str(e)}")

sheets_service = GoogleSheetsService()
