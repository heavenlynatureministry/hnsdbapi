"""
Sync data models
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class SyncChange(BaseModel):
    """Individual sync change"""
    entityType: str
    action: str  # create, update, delete
    data: Dict[str, Any]
    clientTimestamp: Optional[str] = None
    id: Optional[str] = None


class SyncPushRequest(BaseModel):
    """Request to push changes to server"""
    changes: List[SyncChange]


class SyncPullRequest(BaseModel):
    """Request to pull changes from server"""
    entityType: Optional[str] = None
    since: Optional[str] = None


class ConflictResolution(BaseModel):
    """Conflict resolution request"""
    conflict_id: str
    resolution: str  # "keep_client", "keep_server", or "merge"


class SyncStatus(BaseModel):
    """Sync status response"""
    pendingChanges: int = 0
    unresolvedConflicts: int = 0
    lastSyncTime: Optional[str] = None
    isOnline: bool = True


class SyncResponse(BaseModel):
    """Generic sync response"""
    success: bool
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
