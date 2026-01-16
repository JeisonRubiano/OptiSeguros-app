from google.oauth2 import id_token
from google.auth.transport import requests
import requests as req
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from fastapi import HTTPException, Header, Depends
from pydantic import BaseModel
import os
from typing import Optional
import time
from cachetools import TTLCache

# Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "756441602485-knirenrd0dnbse9alndu9f0leru1397f.apps.googleusercontent.com")
ALLOWED_DOMAINS = ["segurosbolivar.com", "uptc.edu.co"]

# Cache settings: Store up to 1000 tokens for 10 minutes (600 seconds)
token_cache = TTLCache(maxsize=1000, ttl=600)

class User(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None
    domain: Optional[str] = None

class LoginRequest(BaseModel):
    idToken: str

# Robust HTTP Session setup
def get_retry_session():
    session = req.Session()
    retry = Retry(
        total=3,
        read=3,
        connect=3,
        backoff_factor=0.5,
        status_forcelist=[500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('https://', adapter)
    return session

# Global session instance
_http_session = get_retry_session()

def verify_google_token(token: str) -> User:
    # 1. Check in-memory cache first
    if token in token_cache:
        return token_cache[token]

    try:
        # 2. Verify with Google (using robust session)
        # requests.Request(session=...) uses our configured session
        request = requests.Request(session=_http_session)
        
        id_info = id_token.verify_oauth2_token(token, request, GOOGLE_CLIENT_ID)

        # Check domain
        domain = id_info.get('hd')
        email = id_info.get('email')

        # Enforce domain check
        if domain not in ALLOWED_DOMAINS:
           # Special exception for specific emails if needed, or just fail
           raise ValueError(f"Acceso denegado. Dominio no autorizado: {domain}")

        user = User(
            email=email,
            name=id_info.get('name'),
            picture=id_info.get('picture'),
            domain=domain
        )
        
        # 3. Save to cache
        token_cache[token] = user
        return user

    except ValueError as e:
        print(f"Token Verification ValueError: {e}")
        raise HTTPException(status_code=401, detail=f"Token Value Error: {str(e)}")
    except Exception as e:
        print(f"Token Verification Critical Failure: {e}")
        import traceback
        traceback.print_exc()
        # If cache miss and network fail -> 401
        raise HTTPException(status_code=401, detail=f"Token Network/Server Error: {str(e)}")
