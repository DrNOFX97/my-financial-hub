import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI')
TOKEN_PATH = 'storage/tokens.json'

class GoogleAuth:
    def __init__(self):
        self.scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/gmail.readonly'
        ]

    def get_credentials(self, user_id):
        if not os.path.exists(TOKEN_PATH):
            return None
        
        with open(TOKEN_PATH, 'r') as f:
            tokens = json.load(f)
            
        user_tokens = tokens.get(user_id)
        if not user_tokens:
            return None
            
        creds = Credentials.from_authorized_user_info(user_tokens, self.scopes)
        
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Update storage
            tokens[user_id] = json.loads(creds.to_json())
            with open(TOKEN_PATH, 'w') as f:
                json.dump(tokens, f, indent=2)
                
        return creds

    def save_tokens(self, user_id, token_data):
        tokens = {}
        if os.path.exists(TOKEN_PATH):
            with open(TOKEN_PATH, 'r') as f:
                tokens = json.load(f)
        
        tokens[user_id] = token_data
        
        os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)
        with open(TOKEN_PATH, 'w') as f:
            json.dump(tokens, f, indent=2)

auth_service = GoogleAuth()
