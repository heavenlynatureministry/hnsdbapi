"""
Sync endpoints for offline data synchronization
"""
from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.deps import get_current_user
from app.services.sync_service import SyncService
from app.models.sync_models import SyncPushRequest, SyncPullResponse, ConflictResolution

router = APIRouter(prefix="/sync", tags=["Sync"])

sync_service = SyncService()


@router.post("/push")
async def push_changes(
    request: SyncPushRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Receive offline changes from client and apply them to the database.
    Returns any conflicts that need resolution.
    """
    try:
        result = await sync_service.process_push(
            changes=request.changes,
            user_id=str(current_user["_id"])
        )
        return {
            "success": True,
            "message": f"Processed {result['processed']} changes",
            "processed": result["processed"],
            "conflicts": result["conflicts"],
            "errors": result["errors"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pull")
async def pull_changes(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    since: Optional[str] = Query(None, description="ISO timestamp to get changes since"),
    current_user: dict = Depends(get_current_user)
):
    """
    Send latest data to client for offline sync.
    Returns all data modified after the 'since' timestamp.
    """
    try:
        since_dt = datetime.fromisoformat(since) if since else None
        
        data = await sync_service.get_changes(
            user_id=str(current_user["_id"]),
            entity_type=entity_type,
            since=since_dt
        )
        
        return {
            "success": True,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_sync_status(
    current_user: dict = Depends(get_current_user)
):
    """
    Get current sync status including pending changes and conflicts.
    """
    try:
        status = await sync_service.get_sync_status(
            user_id=str(current_user["_id"])
        )
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conflicts")
async def get_conflicts(
    status: Optional[str] = Query("pending", description="Filter by status: pending, resolved, all"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of sync conflicts that need resolution.
    """
    try:
        conflicts = await sync_service.get_conflicts(
            user_id=str(current_user["_id"]),
            status=status
        )
        return {
            "success": True,
            "data": conflicts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conflicts/resolve")
async def resolve_conflict(
    resolution: ConflictResolution,
    current_user: dict = Depends(get_current_user)
):
    """
    Resolve a sync conflict by choosing which version to keep.
    """
    try:
        result = await sync_service.resolve_conflict(
            conflict_id=resolution.conflict_id,
            resolution=resolution.resolution,  # "keep_client" or "keep_server"
            user_id=str(current_user["_id"])
        )
        return {
            "success": True,
            "message": "Conflict resolved",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
