import hashlib
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from models.database import RefreshToken, User, get_db, utc_now
from models.schemas import TokenResponse, UserLogin, UserRegister, UserResponse
from services.mongodb_service import (
    get_connection_status,
    init_mongo,
    is_mongo_available,
    mongo_create_refresh_token,
    mongo_create_user,
    mongo_get_refresh_token,
    mongo_get_user_by_email,
    mongo_get_user_by_id,
    mongo_revoke_refresh_token,
)

logger = logging.getLogger("auth_router")

router = APIRouter(prefix="/api/auth", tags=["auth"])

limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer(auto_error=False)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "9a647d6c6e1db05a909477e68cf6dc8a2455e6c7fa823023e669e2501ff80e14")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
IS_PRODUCTION = os.getenv("ENV", "development").lower() == "production"

REFRESH_COOKIE_NAME = "svp_refresh_token"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token_record(user_id: str, db: Session) -> str:
    raw_token = secrets.token_urlsafe(48)
    token_h = hash_token(raw_token)
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    # 1. SQL Record
    record = RefreshToken(
        user_id=user_id,
        token_hash=token_h,
        expires_at=expire,
        revoked_at=None,
    )
    db.add(record)
    db.commit()

    # 2. MongoDB Record (if connected)
    if is_mongo_available():
        try:
            mongo_create_refresh_token(user_id=user_id, token_hash=token_h, expires_at=expire)
        except Exception as e:
            logger.warning(f"Could not persist refresh token in MongoDB: {e}")

    return raw_token


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    max_age = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=max_age,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/api/auth",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/api/auth",
        httponly=True,
        samesite="lax",
    )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed token payload.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_id)
    if not user:
        # Check MongoDB if user exists there and sync to SQL
        if is_mongo_available():
            mongo_user = mongo_get_user_by_id(user_id)
            if mongo_user:
                user = User(
                    id=mongo_user["id"],
                    email=mongo_user["email"],
                    hashed_password=mongo_user["hashed_password"],
                    role=mongo_user.get("role", "user"),
                )
                db.add(user)
                try:
                    db.commit()
                    db.refresh(user)
                except Exception:
                    db.rollback()
                    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


@router.get("/database-status")
def database_status():
    """
    Returns live connectivity status of MongoDB and authentication storage.
    """
    status_info = get_connection_status()
    is_connected = status_info.get("connected", False)
    return {
        "mongodb_configured": status_info.get("configured", False),
        "mongodb_connected": is_connected,
        "primary_auth_database": "MongoDB" if is_connected else "Relational SQL (Fallback)",
        "database_name": status_info.get("db_name"),
        "collections": status_info.get("collections", []),
        "error_details": status_info.get("error"),
        "encryption": "Bcrypt (Salts with one-way irreversible hashing)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/register", response_model=TokenResponse)
@limiter.limit("5/minute")
def register(request: Request, response: Response, payload: UserRegister = Body(...), db: Session = Depends(get_db)):
    try:
        payload.validate_credentials()
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    email_clean = payload.email.strip().lower()

    # 1. Check existing in MongoDB
    if is_mongo_available():
        existing_mongo = mongo_get_user_by_email(email_clean)
        if existing_mongo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    # 2. Check existing in SQL
    existing_sql = db.scalar(select(User).where(User.email == email_clean))
    if existing_sql:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")

    # Hash password with Bcrypt (never plaintext)
    hashed_pw = pwd_context.hash(payload.password)
    user_id = str(uuid.uuid4())

    # Save to MongoDB
    if is_mongo_available():
        try:
            mongo_doc = mongo_create_user(email=email_clean, hashed_password=hashed_pw, role="user")
            user_id = mongo_doc.get("id", user_id)
        except Exception as e:
            logger.warning(f"Failed to write user to MongoDB: {e}")

    # Save to SQL database (guarantees foreign key references for watchlists, alerts, backtests)
    user = User(id=user_id, email=email_clean, hashed_password=hashed_pw, role="user")
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id, user.email)
    raw_refresh = create_refresh_token_record(user.id, db)
    set_refresh_cookie(response, raw_refresh)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, response: Response, payload: UserLogin = Body(...), db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = None

    # Check MongoDB first if available
    if is_mongo_available():
        mongo_user = mongo_get_user_by_email(email_clean)
        if mongo_user:
            if not pwd_context.verify(payload.password, mongo_user["hashed_password"]):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
            
            # Ensure in SQL for relational constraints
            user = db.get(User, mongo_user["id"])
            if not user:
                user = User(
                    id=mongo_user["id"],
                    email=mongo_user["email"],
                    hashed_password=mongo_user["hashed_password"],
                    role=mongo_user.get("role", "user"),
                )
                db.add(user)
                try:
                    db.commit()
                    db.refresh(user)
                except Exception:
                    db.rollback()
                    user = db.get(User, mongo_user["id"])

    # Fallback to SQL user check
    if not user:
        user = db.scalar(select(User).where(User.email == email_clean))
        if not user or not pwd_context.verify(payload.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
        
        # If MongoDB is now available, sync this user into MongoDB
        if is_mongo_available() and not mongo_get_user_by_email(email_clean):
            try:
                mongo_create_user(email=user.email, hashed_password=user.hashed_password, role=user.role)
            except Exception as e:
                logger.warning(f"Could not backfill user to MongoDB: {e}")

    access_token = create_access_token(user.id, user.email)
    raw_refresh = create_refresh_token_record(user.id, db)
    set_refresh_cookie(response, raw_refresh)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    cookie_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not cookie_token:
        cookie_token = request.headers.get("X-Refresh-Token")

    if not cookie_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing.")

    t_hash = hash_token(cookie_token)
    token_record = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == t_hash,
            RefreshToken.revoked_at == None,
        )
    )

    if not token_record and is_mongo_available():
        mongo_tok = mongo_get_refresh_token(t_hash)
        if mongo_tok:
            user = db.get(User, mongo_tok["user_id"])
            if user:
                mongo_revoke_refresh_token(t_hash)
                new_refresh = create_refresh_token_record(user.id, db)
                set_refresh_cookie(response, new_refresh)
                new_access = create_access_token(user.id, user.email)
                return TokenResponse(
                    access_token=new_access,
                    token_type="bearer",
                    user=UserResponse.model_validate(user),
                    expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                )

    if not token_record:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or revoked refresh token.")

    if token_record.expires_at < datetime.now(timezone.utc):
        token_record.revoked_at = utc_now()
        db.commit()
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired.")

    user = db.get(User, token_record.user_id)
    if not user:
        clear_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    token_record.revoked_at = utc_now()
    db.commit()

    if is_mongo_available():
        mongo_revoke_refresh_token(t_hash)

    new_refresh = create_refresh_token_record(user.id, db)
    set_refresh_cookie(response, new_refresh)
    new_access = create_access_token(user.id, user.email)

    return TokenResponse(
        access_token=new_access,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    cookie_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if cookie_token:
        t_hash = hash_token(cookie_token)
        token_record = db.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == t_hash,
                RefreshToken.revoked_at == None,
            )
        )
        if token_record:
            token_record.revoked_at = utc_now()
            db.commit()

        if is_mongo_available():
            mongo_revoke_refresh_token(t_hash)

    clear_refresh_cookie(response)
    return {"status": "ok", "message": "Successfully logged out."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
