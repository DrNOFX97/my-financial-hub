from googleapiclient.discovery import build
from auth.google_auth import auth_service

class SheetsService:
    def __init__(self, user_id):
        creds = auth_service.get_credentials(user_id)
        if not creds:
            raise Exception("Unauthorized: No Google credentials found.")
        self.service = build('sheets', 'v4', credentials=creds)

    def get_values(self, spreadsheet_id, range_name):
        result = self.service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=range_name).execute()
        return result.get('values', [])

    def append_values(self, spreadsheet_id, range_name, values):
        body = {'values': values}
        return self.service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption='RAW',
            body=body).execute()

    def update_values(self, spreadsheet_id, range_name, values):
        body = {'values': values}
        return self.service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption='RAW',
            body=body).execute()

    def create_spreadsheet(self, title):
        spreadsheet = {
            'properties': {'title': title},
            'sheets': [
                {'properties': {'title': 'Movimentos'}},
                {'properties': {'title': 'Faturas'}},
                {'properties': {'title': 'Categorias'}},
                {'properties': {'title': 'Gastos_Fixos'}},
                {'properties': {'title': 'Dashboard_Data'}}
            ]
        }
        spreadsheet = self.service.spreadsheets().create(body=spreadsheet, fields='spreadsheetId').execute()
        return spreadsheet.get('spreadsheetId')
