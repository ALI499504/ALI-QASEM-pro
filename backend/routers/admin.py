import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from models.database import RefreshToken, User, get_db, utc_now
from models.schemas import TokenResponse, UserLogin, UserRegister, UserResponse
from services.mongodb_service import (
    is_mongo_available,
    mongo_create_user,
    mongo_get_user_by_email,
    mongo_get_user_by_id,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

security = HTTPBearer(auto_error=False)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "9a647d6c6e1db05a909477e68cf6dc8a2455e6c7fa823023e669e2501ff80e14")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "dreddred584@gmail.com")


def get_current_admin_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
):
    """Get current user and verify admin role"""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from routers.auth import JWT_SECRET_KEY, JWT_ALGORITHM
    import jwt as pyjwt

    token = credentials.credentials
    try:
        payload = pyjwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token payload.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Access token expired.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials.")

    from models.database import SessionLocal, User
    from models.database import get_db as get_db_func
    
    db_gen = get_db_func()
    db = next(db_gen)
    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
        
        if user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required."
            )
        return user
    finally:
        db.close()


@router.get("/stats")
def get_admin_stats(current_user = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Get admin dashboard statistics"""
    total_users = db.scalar(select(func.count(User.id)))
    admin_users = db.scalar(select(func.count(User.id)).where(User.role == "admin"))
    active_users = db.scalar(select(func.count(User.id)).where(User.updated_at > datetime.now(timezone.utc) - timedelta(days=30)))
    
    return {
        "total_users": total_users or 0,
        "admin_users": admin_users or 0,
        "active_users_30d": active_users or 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/users")
def get_all_users(
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role_filter: Optional[str] = Query(None),
):
    """Get all users with pagination and filtering"""
    query = select(User)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(User.email.ilike(search_term))
    
    if role_filter:
        query = query.where(User.role == role_filter)
    
    # Get total count
    total_count = db.scalar(select(func.count()).select_from(query.subquery()))
    
    # Apply pagination
    offset = (page - 1) * per_page
    users = db.scalars(query.offset(offset).limit(per_page)).all()
    
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "updated_at": u.updated_at.isoformat() if u.updated_at else None,
            }
            for u in users
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total_count or 0,
            "pages": (total_count + per_page - 1) // per_page if total_count else 0,
        }
    }


@router.post("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    new_role: str = Body(..., embed=True),
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Update user role (user/admin)"""
    if new_role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")
    
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent removing own admin role
    if user.id == current_user.id and new_role == "user":
        raise HTTPException(status_code=400, detail="Cannot remove your own admin role")
    
    user.role = new_role
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    return {"message": f"User role updated to {new_role}", "user": {"id": user.id, "email": user.email, "role": user.role}}


@router.post("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: str,
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Toggle user active status (we use role as proxy for active/inactive)"""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    # Toggle between "user" and "inactive" (using role field)
    if user.role == "user":
        user.role = "inactive"
    else:
        user.role = "user"
    
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    return {"message": f"User status updated to {user.role}", "user": {"id": user.id, "email": user.email, "role": user.role}}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Delete a user (admin only, cannot delete self)"""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}


@router.post("/create-admin")
def create_initial_admin(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Create initial admin user (only works if no admin exists)"""
    from routers.auth import pwd_context, create_access_token, create_refresh_token_record, set_refresh_cookie
    from models.schemas import UserRegister
    
    # Check if admin already exists
    existing_admin = db.scalar(select(User).where(User.role == "admin"))
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin user already exists")
    
    # Create admin user
    email = ADMIN_EMAIL
    password = "ali636636"
    
    from routers.auth import pwd_context
    hashed_pw = pwd_context.hash(password)
    import uuid
    user_id = str(uuid.uuid4())
    
    # Save to SQL database
    user = User(id=user_id, email=email, hashed_password=pwd_context.hash(password), role="admin")
    db.add(user)
    db.commit()
    db.refresh(user)
    
    access_token = create_access_token(user.id, user.email)
    from routers.auth import create_refresh_token_record, set_refresh_cookie
    raw_refresh = create_refresh_token_record(user.id, next(get_db()))
    set_refresh_cookie(response, raw_refresh)
    
    from models.schemas import UserResponse
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        expires_in=30 * 60,
    )


@router.post("/login-as-admin")
def admin_login(
    request: Request,
    response: Response,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    """Admin login endpoint"""
    from routers.auth import pwd_context, create_access_token, create_refresh_token_record, set_refresh_cookie
    from models.schemas import UserLogin, TokenResponse, UserResponse
    
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    
    if email != ADMIN_EMAIL:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    # Find user in DB
    user = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
    if not user:
        # Create admin user if doesn't exist
        hashed_pw = pwd_context.hash("ali636636")
        import uuid
        user = User(id=str(uuid.uuid4()), email=ADMIN_EMAIL, hashed_password=pwd_context.hash("ali636636"), role="admin")
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not pwd_context.verify(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    if user.role != "admin":
        user.role = "admin"
        db.commit()
        db.refresh(user)
    
    access_token = create_access_token(user.id, user.email)
    from routers.auth import create_refresh_token_record, set_refresh_cookie
    raw_refresh = create_refresh_token_record(user.id, next(get_db()))
    set_refresh_cookie(response, raw_refresh)
    
    from models.schemas import UserResponse, TokenResponse
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
        expires_in=30 * 60,
    )