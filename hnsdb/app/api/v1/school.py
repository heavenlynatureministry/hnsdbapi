"""School API - Simplified"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.school import (
    SchoolInfoUpdate, SchoolInfoResponse,
    AcademicCalendarCreate, AcademicCalendarResponse,
    SchoolEventCreate, SchoolEventUpdate, SchoolEventResponse,
    BoardMemberCreate, BoardMemberResponse,
    DashboardStatistics
)
from app.schemas.common import SuccessResponse

router = APIRouter()

@router.get("/info", response_model=SuccessResponse)
async def get_school_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get school information"""
    db = get_database()
    school = await db.school_info.find_one({})
    if school:
        school["_id"] = str(school["_id"])
    return SuccessResponse(success=True, message="School info retrieved", data=school)

@router.put("/info", response_model=SuccessResponse)
async def update_school_info(
    update_data: SchoolInfoUpdate,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update school information"""
    db = get_database()
    update_dict = {k: v for k, v in update_data.dict(exclude_unset=True).items() if v is not None}
    await db.school_info.update_one({}, {"$set": update_dict}, upsert=True)
    return SuccessResponse(success=True, message="School info updated")

@router.get("/dashboard", response_model=SuccessResponse)
async def get_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get dashboard statistics"""
    db = get_database()
    total_students = await db.students.count_documents({"status": "active"})
    total_teachers = await db.teachers.count_documents({"status": "active"})
    total_classes = await db.classes.count_documents({"status": "active"})
    
    return SuccessResponse(
        success=True,
        message="Dashboard data retrieved",
        data={
            "students": {"total_active": total_students},
            "staff": {"total_teachers": total_teachers, "total_classes": total_classes},
            "attendance": {"today_marked": 0, "attendance_rate": 0},
            "events": {"upcoming": 0},
            "financial": {"total_income": 0, "total_expenses": 0, "balance": 0}
        }
    )

@router.get("/events", response_model=SuccessResponse)
async def list_events(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List school events"""
    db = get_database()
    events = await db.school_events.find().sort("start_date", 1).to_list(length=None)
    for e in events: e["_id"] = str(e["_id"])
    return SuccessResponse(success=True, message="Events retrieved", data={"events": events})

@router.post("/events", response_model=SuccessResponse, status_code=201)
async def create_event(
    event: SchoolEventCreate,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create school event"""
    db = get_database()
    event_doc = {**event.dict(), "created_by": current_user["_id"], "created_at": datetime.utcnow()}
    result = await db.school_events.insert_one(event_doc)
    event_doc["_id"] = str(result.inserted_id)
    return SuccessResponse(success=True, message="Event created", data=event_doc)

@router.get("/board", response_model=SuccessResponse)
async def list_board_members(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List board members"""
    db = get_database()
    members = await db.board_members.find({"status": "active"}).to_list(length=None)
    for m in members: m["_id"] = str(m["_id"])
    return SuccessResponse(success=True, message="Board members retrieved", data={"members": members})

@router.post("/board", response_model=SuccessResponse, status_code=201)
async def add_board_member(
    member: BoardMemberCreate,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Add board member"""
    db = get_database()
    member_doc = {**member.dict(), "status": "active", "created_at": datetime.utcnow()}
    result = await db.board_members.insert_one(member_doc)
    member_doc["_id"] = str(result.inserted_id)
    return SuccessResponse(success=True, message="Board member added", data=member_doc)
