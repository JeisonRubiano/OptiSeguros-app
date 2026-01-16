from fastapi import Header, HTTPException
from services.auth import verify_google_token, User

async def get_current_user(authorization: str = Header(None)) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        # Verify token using auth service
        user = verify_google_token(token)
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
