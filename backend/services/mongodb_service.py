from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional, Tuple

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("mongodb_service")

# Global MongoDB client and database references
_mongo_client: Any = None
_mongo_db: Any = None
_mongo_status: dict[str, Any] = {
    "configured": False,
    "connected": False,
    "db_name": None,
    "error": None,
    "collections": [],
    "last_checked": None,
}


def get_mongo_uri() -> str:
    return os.getenv("MONGODB_URI", "").strip()


def init_mongo() -> Tuple[bool, str]:
    """
    Attempt to initialize and connect to MongoDB using MONGODB_URI.
    Returns (success: bool, message: str).
    """
    global _mongo_client, _mongo_db, _mongo_status

    uri = get_mongo_uri()
    now_iso = datetime.now(timezone.utc).isoformat()
    _mongo_status["last_checked"] = now_iso

    if not uri:
        _mongo_status.update({
            "configured": False,
            "connected": False,
            "error": "MONGODB_URI is not set in backend/.env",
            "collections": [],
        })
        return False, "MONGODB_URI is not set."

    _mongo_status["configured"] = True

    try:
        import pymongo
        from pymongo.errors import ConnectionFailure, ConfigurationError, ServerSelectionTimeoutError

        # Close previous client if any
        if _mongo_client:
            try:
                _mongo_client.close()
            except Exception:
                pass

        # Connect with 3-second server selection timeout to avoid hanging
        client = pymongo.MongoClient(
            uri,
            serverSelectionTimeoutMS=4000,
            connectTimeoutMS=4000,
            socketTimeoutMS=4000,
            appname="StockVisionPro",
        )

        # Quick ping to verify server responsiveness
        client.admin.command("ping")

        # Determine database name from URI or fallback to 'stockvision'
        default_db_name = "stockvision"
        try:
            parsed_db = client.get_default_database()
            db_name = parsed_db.name if parsed_db is not None else default_db_name
        except Exception:
            db_name = default_db_name

        db = client[db_name]

        # Initialize collections & indexes
        db.users.create_index("email", unique=True)
        db.users.create_index("id", unique=True)
        db.refresh_tokens.create_index("token_hash", unique=True)
        db.refresh_tokens.create_index("user_id")

        _mongo_client = client
        _mongo_db = db
        collections = db.list_collection_names()

        _mongo_status.update({
            "configured": True,
            "connected": True,
            "db_name": db_name,
            "error": None,
            "collections": collections,
        })
        logger.info(f"[MongoDB] Connected successfully to database '{db_name}'. Collections: {collections}")
        return True, f"Connected to MongoDB database '{db_name}'."

    except Exception as exc:
        err_msg = str(exc)
        if "DNS query name does not exist" in err_msg or "NXDOMAIN" in err_msg:
            friendly_err = (
                "DNS resolution failed for your MongoDB cluster hostname. "
                "Please verify your MongoDB Atlas cluster name and connection string in backend/.env."
            )
        elif "bad auth" in err_msg.lower() or "authentication failed" in err_msg.lower():
            friendly_err = (
                "MongoDB authentication failed. Please verify your Atlas database user credentials "
                "(username & password) in MONGODB_URI."
            )
        elif "timed out" in err_msg.lower():
            friendly_err = (
                "MongoDB connection timed out. Please ensure Network Access in MongoDB Atlas "
                "allows IP 0.0.0.0/0 (Allow Access from Anywhere)."
            )
        else:
            friendly_err = f"MongoDB connection error: {err_msg}"

        _mongo_client = None
        _mongo_db = None
        _mongo_status.update({
            "configured": True,
            "connected": False,
            "error": friendly_err,
            "collections": [],
        })
        logger.warning(f"[MongoDB] Connection failed: {friendly_err}")
        return False, friendly_err


def is_mongo_available() -> bool:
    global _mongo_db
    if _mongo_db is None:
        # Try quick connection if configured but not yet connected
        if get_mongo_uri():
            success, _ = init_mongo()
            return success
        return False
    return True


def get_mongo_db():
    if not is_mongo_available():
        return None
    return _mongo_db


def get_connection_status() -> dict[str, Any]:
    # Refresh status if uri exists
    if get_mongo_uri() and not _mongo_status["connected"]:
        init_mongo()
    return dict(_mongo_status)


# ─────────────────────────────────────────────────────────────────────────────
# User Document Operations (Bcrypt Salted Password Storage in MongoDB)
# ─────────────────────────────────────────────────────────────────────────────

def mongo_create_user(email: str, hashed_password: str, role: str = "user") -> dict[str, Any]:
    """
    Creates a new user document in MongoDB with encrypted/hashed password.
    Plaintext password is NEVER stored.
    """
    db = get_mongo_db()
    if db is None:
        raise RuntimeError("MongoDB is not connected.")

    email_clean = email.strip().lower()
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    user_doc = {
        "id": user_id,
        "email": email_clean,
        "hashed_password": hashed_password,
        "role": role,
        "created_at": now,
        "updated_at": now,
    }

    db.users.insert_one(user_doc)
    logger.info(f"[MongoDB] Created user document for {email_clean} with ID {user_id}")
    return user_doc


def mongo_get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    db = get_mongo_db()
    if db is None:
        return None
    email_clean = email.strip().lower()
    return db.users.find_one({"email": email_clean})


def mongo_get_user_by_id(user_id: str) -> Optional[dict[str, Any]]:
    db = get_mongo_db()
    if db is None:
        return None
    return db.users.find_one({"id": user_id})


# ─────────────────────────────────────────────────────────────────────────────
# Refresh Token Operations in MongoDB
# ─────────────────────────────────────────────────────────────────────────────

def mongo_create_refresh_token(user_id: str, token_hash: str, expires_at: datetime) -> dict[str, Any]:
    db = get_mongo_db()
    if db is None:
        raise RuntimeError("MongoDB is not connected.")

    token_doc = {
        "user_id": user_id,
        "token_hash": token_hash,
        "expires_at": expires_at,
        "revoked_at": None,
        "created_at": datetime.now(timezone.utc),
    }
    db.refresh_tokens.insert_one(token_doc)
    return token_doc


def mongo_get_refresh_token(token_hash: str) -> Optional[dict[str, Any]]:
    db = get_mongo_db()
    if db is None:
        return None
    return db.refresh_tokens.find_one({"token_hash": token_hash, "revoked_at": None})


def mongo_revoke_refresh_token(token_hash: str) -> bool:
    db = get_mongo_db()
    if db is None:
        return False
    now = datetime.now(timezone.utc)
    res = db.refresh_tokens.update_one(
        {"token_hash": token_hash},
        {"$set": {"revoked_at": now}}
    )
    return res.modified_count > 0
