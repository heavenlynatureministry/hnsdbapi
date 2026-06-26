"""
Sync endpoints for offline data synchronization
"""
from fastapi import APIRouter, HTTPException, Depends, Body, Query, Request
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from app.services.sync_service import SyncService
from app.models.sync_models import SyncPushRequest, ConflictResolution

logger = logging.getLogger(__name__)

# =========================================================================
# IMPORT get_current_user FROM THE CORRECT MODULE
# =========================================================================
try:
    from app.api.v1.auth import get_current_user
except ImportError:
    try:
        from app.api.deps import get_current_user
    except ImportError:
        try:
            from app.core.dependencies import get_current_user
        except ImportError:
            try:
                from app.dependencies import get_current_user
            except ImportError:
                # Fallback auth dependency
                async def get_current_user(request: Request):
                    from jose import JWTError, jwt
                    from app.core.config import settings
                    
                    token = request.headers.get("Authorization", "").replace("Bearer ", "")
                    
                    if not token:
                        raise HTTPException(
                            status_code=401,
                            detail="Not authenticated",
                            headers={"WWW-Authenticate": "Bearer"},
                        )
                    
                    try:
                        payload = jwt.decode(
                            token,
                            settings.JWT_SECRET_KEY,
                            algorithms=[settings.JWT_ALGORITHM]
                        )
                        user_id = payload.get("sub")
                        if user_id is None:
                            raise HTTPException(status_code=401, detail="Invalid token")
                        return {"_id": user_id, **payload}
                    except JWTError:
                        raise HTTPException(
                            status_code=401,
                            detail="Invalid token",
                            headers={"WWW-Authenticate": "Bearer"},
                        )

router = APIRouter()

sync_service = SyncService()


@router.post("/push")
async def push_changes(
    request: SyncPushRequest,
    current_user: dict = Depends(get_current_user)
):
    """Receive offline changes from client and apply them to the database."""
    try:
        user_id = str(current_user.get("_id", current_user.get("sub", "unknown")))
        
        result = await sync_service.process_push(
            changes=request.changes,
            user_id=user_id
        )
        return {
            "success": True,
            "message": f"Processed {result['processed']} changes",
            "processed": result["processed"],
            "conflicts": result["conflicts"],
            "errors": result["errors"]
        }
    except Exception as e:
        logger.error(f"Push sync error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pull")
async def pull_changes(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    since: Optional[str] = Query(None, description="ISO timestamp to get changes since"),
    current_user: dict = Depends(get_current_user)
):
    """Send latest data to client for offline sync."""
    try:
        user_id = str(current_user.get("_id", current_user.get("sub", "unknown")))
        since_dt = datetime.fromisoformat(since) if since else None
        
        data = await sync_service.get_changes(
            user_id=user_id,
            entity_type=entity_type,
            since=since_dt
        )
        
        return {
            "success": True,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Pull sync error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_sync_status(
    current_user: dict = Depends(get_current_user)
):
    """Get current sync status including pending changes and conflicts."""
    try:
        user_id = str(current_user.get("_id", current_user.get("sub", "unknown")))
        status = await sync_service.get_sync_status(user_id=user_id)
        return {"success": True, "data": status}
    except Exception as e:
        logger.error(f"Sync status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conflicts")
async def get_conflicts(
    status: Optional[str] = Query("pending", description="Filter by status: pending, resolved, all"),
    current_user: dict = Depends(get_current_user)
):
    """Get list of sync conflicts that need resolution."""
    try:
        user_id = str(current_user.get("_id", current_user.get("sub", "unknown")))
        conflicts = await sync_service.get_conflicts(user_id=user_id, status=status)
        return {"success": True, "data": conflicts}
    except Exception as e:
        logger.error(f"Get conflicts error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conflicts/resolve")
async def resolve_conflict(
    resolution: ConflictResolution,
    current_user: dict = Depends(get_current_user)
):
    """Resolve a sync conflict by choosing which version to keep."""
    try:
        user_id = str(current_user.get("_id", current_user.get("sub", "unknown")))
        result = await sync_service.resolve_conflict(
            conflict_id=resolution.conflict_id,
            resolution=resolution.resolution,
            user_id=user_id
        )
        return {"success": True, "message": "Conflict resolved", "data": result}
    except Exception as e:
        logger.error(f"Resolve conflict error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
