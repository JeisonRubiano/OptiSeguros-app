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

# ... (inside verify_google_token)

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
