"""Financial API - Simplified"""
from fastapi import APIRouter, Depends, Query
from typing import Optional, Dict, Any
from app.core.security import get_current_user
from app.schemas.common import SuccessResponse

router = APIRouter()

@router.get("/", response_model=SuccessResponse)
async def root(current_user: Dict[str, Any] = Depends(get_current_user)):
    return SuccessResponse(success=True, message="Financial endpoint ready", data={})
