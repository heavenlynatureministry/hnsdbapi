"""School API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime, date

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.school import (
    SchoolInfoUpdate, SchoolInfoResponse,
    SchoolEventCreate, SchoolEventUpdate, SchoolEventResponse,
    BoardMemberCreate, BoardMemberResponse
)
from app.schemas.common import SuccessResponse

router = APIRouter()


# =========================================================================
# SCHOOL INFO
# =========================================================================
@router.get("/info", response_model=SuccessResponse)
async def get_school_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get school information"""
    db = get_database()
    school = await db.school_info.find_one({})
    if school: school["_id"] = str(school["_id"])
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


# =========================================================================
# DASHBOARD
# =========================================================================
@router.get("/dashboard", response_model=SuccessResponse)
async def get_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get dashboard statistics"""
    db = get_database()
    total_students = await db.students.count_documents({"status": "active"})
    total_teachers = await db.teachers.count_documents({"status": "active"})
    total_classes = await db.classes.count_documents({"status": "active"})
    total_staff = await db.users.count_documents({"status": "active"})
    upcoming_events = await db.school_events.count_documents({"status": "upcoming"})
    
    return SuccessResponse(success=True, message="Dashboard data retrieved", data={
        "students": {"total_active": total_students},
        "staff": {"total_teachers": total_teachers, "total_staff": total_staff, "total_classes": total_classes},
        "attendance": {"today_marked": 0, "attendance_rate": 0},
        "events": {"upcoming": upcoming_events},
        "financial": {"total_income": 0, "total_expenses": 0, "balance": 0}
    })


# =========================================================================
# CALENDAR
# =========================================================================
@router.get("/calendar/current-term", response_model=SuccessResponse)
async def get_current_term(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current academic term"""
    db = get_database()
    calendar = await db.academic_calendar.find_one({"status": "active"})
    
    now = datetime.utcnow()
    year = now.year
    month = now.month
    
    if month >= 9:
        academic_year = f"{year}/{year+1}"
    else:
        academic_year = f"{year-1}/{year}"
    
    term_name = "Term 1" if 1 <= month <= 4 else "Term 2" if 5 <= month <= 8 else "Term 3"
    
    if calendar:
        for term in calendar.get("terms", []):
            start = term.get("start_date")
            end = term.get("end_date")
            if isinstance(start, str): start = datetime.fromisoformat(start)
            if isinstance(end, str): end = datetime.fromisoformat(end)
            if start and end and start <= now <= end:
                term_name = term.get("term_name", term_name)
                break
        academic_year = calendar.get("academic_year", academic_year)
    
    return SuccessResponse(success=True, message="Current term retrieved", data={
        "academic_year": academic_year,
        "term_name": term_name
    })


# =========================================================================
# EVENTS
# =========================================================================
@router.get("/events", response_model=SuccessResponse)
async def list_events(
    status: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List school events"""
    db = get_database()
    filter_query = {}
    if status: filter_query["status"] = status
    
    events = await db.school_events.find(filter_query).sort("start_date", 1).to_list(length=None)
    for e in events: e["_id"] = str(e["_id"])
    return SuccessResponse(success=True, message="Events retrieved", data={"events": events, "total": len(events)})


@router.post("/events", response_model=SuccessResponse, status_code=201)
async def create_event(
    event: SchoolEventCreate,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create school event"""
    db = get_database()
    event_doc = {
        **event.dict(),
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.school_events.insert_one(event_doc)
    event_doc["_id"] = str(result.inserted_id)
    return SuccessResponse(success=True, message="Event created", data=event_doc)


@router.put("/events/{event_id}", response_model=SuccessResponse)
async def update_event(
    event_id: str = Path(...),
    event: SchoolEventUpdate = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update school event"""
    db = get_database()
    update_dict = {k: v for k, v in event.dict(exclude_unset=True).items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.school_events.find_one_and_update(
        {"_id": ObjectId(event_id)},
        {"$set": update_dict},
        return_document=True
    )
    if not result: raise HTTPException(status_code=404, detail="Event not found")
    result["_id"] = str(result["_id"])
    return SuccessResponse(success=True, message="Event updated", data=result)


@router.delete("/events/{event_id}", response_model=SuccessResponse)
async def cancel_event(
    event_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Cancel school event"""
    db = get_database()
    result = await db.school_events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
    )
    if result.modified_count == 0: raise HTTPException(status_code=404, detail="Event not found")
    return SuccessResponse(success=True, message="Event cancelled")


# =========================================================================
# BOARD MEMBERS
# =========================================================================
@router.get("/board", response_model=SuccessResponse)
async def list_board_members(
    status: str = Query(default="active"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List board members"""
    db = get_database()
    members = await db.board_members.find({"status": status}).to_list(length=None)
    for m in members: m["_id"] = str(m["_id"])
    return SuccessResponse(success=True, message="Board members retrieved", data={"members": members, "total": len(members)})


@router.post("/board", response_model=SuccessResponse, status_code=201)
async def add_board_member(
    member: BoardMemberCreate,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Add board member"""
    db = get_database()
    member_doc = {
        **member.dict(),
        "status": "active",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.board_members.insert_one(member_doc)
    member_doc["_id"] = str(result.inserted_id)
    return SuccessResponse(success=True, message="Board member added", data=member_doc)


@router.put("/board/{member_id}", response_model=SuccessResponse)
async def update_board_member(
    member_id: str = Path(...),
    member: BoardMemberCreate = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update board member"""
    db = get_database()
    result = await db.board_members.find_one_and_update(
        {"_id": ObjectId(member_id)},
        {"$set": {**member.dict(), "updated_at": datetime.utcnow()}},
        return_document=True
    )
    if not result: raise HTTPException(status_code=404, detail="Member not found")
    result["_id"] = str(result["_id"])
    return SuccessResponse(success=True, message="Board member updated", data=result)


@router.delete("/board/{member_id}", response_model=SuccessResponse)
async def remove_board_member(
    member_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Remove board member"""
    db = get_database()
    result = await db.board_members.update_one(
        {"_id": ObjectId(member_id)},
        {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}}
    )
    if result.modified_count == 0: raise HTTPException(status_code=404, detail="Member not found")
    return SuccessResponse(success=True, message="Board member removed")
