"""School API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path, Request
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
from app.utils.helpers import parse_mongo_document

router = APIRouter()


# =========================================================================
# HELPER FUNCTIONS
# =========================================================================
def _get_current_academic_year() -> str:
    """Calculate current academic year dynamically."""
    now = datetime.utcnow()
    year = now.year
    month = now.month
    start_year = year - 1 if month == 1 else year
    return f"{start_year}/{start_year + 1}"


def _get_current_term() -> str:
    """Calculate current term based on the month."""
    month = datetime.utcnow().month
    if 2 <= month <= 4: return "Term 1"
    elif 5 <= month <= 7: return "Term 2"
    elif 9 <= month <= 11: return "Term 3"
    elif month == 8: return "Term 2 Break"
    elif month == 12: return "Annual Break"
    else: return "Annual Break"


def _safe_objectid(value) -> Optional[ObjectId]:
    """Safely convert a value to ObjectId, returning None if invalid/empty."""
    if not value:
        return None
    val = str(value).strip()
    if not val or val.lower() == "null" or val.lower() == "undefined":
        return None
    try:
        return ObjectId(val)
    except Exception:
        return None


def _clean_immutable_fields(data: dict) -> dict:
    """Remove immutable fields that cannot be updated in MongoDB."""
    immutable_fields = ['_id', 'id', 'created_at', 'created_by']
    cleaned = {k: v for k, v in data.items() if k not in immutable_fields}
    return cleaned


# =========================================================================
# SCHOOL INFO
# =========================================================================
@router.get("/info")
async def get_school_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get school information"""
    db = get_database()
    school = await db.school_info.find_one({})
    if school:
        school = parse_mongo_document(school)
        school["current_academic_year"] = _get_current_academic_year()
        school["current_term"] = _get_current_term()
    return {"success": True, "message": "School info retrieved", "data": school}


@router.put("/info")
async def update_school_info(
    update_data: SchoolInfoUpdate,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update school information"""
    db = get_database()
    update_dict = {k: v for k, v in update_data.dict(exclude_unset=True).items() if v is not None}
    update_dict = _clean_immutable_fields(update_dict)
    update_dict["updated_at"] = datetime.utcnow()
    await db.school_info.update_one({}, {"$set": update_dict}, upsert=True)
    return {"success": True, "message": "School info updated"}


# =========================================================================
# DASHBOARD
# =========================================================================
@router.get("/dashboard")
async def get_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get dashboard statistics"""
    db = get_database()
    total_students = await db.students.count_documents({"status": "active"})
    total_teachers = await db.teachers.count_documents({"status": "active"})
    total_classes = await db.classes.count_documents({"status": "active"})
    total_staff = await db.users.count_documents({"status": "active"})
    upcoming_events = await db.school_events.count_documents({"status": "upcoming"})
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_attendance = await db.attendance.count_documents({"date": today})
    return {
        "success": True, "message": "Dashboard data retrieved",
        "data": {
            "academic_year": _get_current_academic_year(),
            "current_term": _get_current_term(),
            "students": {"total_active": total_students},
            "staff": {"total_teachers": total_teachers, "total_staff": total_staff, "total_classes": total_classes},
            "attendance": {"today_marked": today_attendance, "attendance_rate": 0},
            "events": {"upcoming": upcoming_events},
            "financial": {"total_income": 0, "total_expenses": 0, "balance": 0}
        }
    }


# =========================================================================
# CALENDAR
# =========================================================================
@router.get("/calendar/current-term")
async def get_current_term(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current academic term"""
    db = get_database()
    calendar = await db.academic_calendar.find_one({"status": "active"})
    now = datetime.utcnow()
    academic_year = _get_current_academic_year()
    term_name = _get_current_term()
    if calendar:
        for term in calendar.get("terms", []):
            start = term.get("start_date")
            end = term.get("end_date")
            if isinstance(start, str): start = datetime.fromisoformat(start)
            if isinstance(end, str): end = datetime.fromisoformat(end)
            if start and end and start <= now <= end:
                term_name = term.get("term_name", term_name)
                break
        if calendar.get("academic_year"):
            academic_year = calendar.get("academic_year")
    return {
        "success": True, "message": "Current term retrieved",
        "data": {
            "academic_year": academic_year, "term_name": term_name,
            "current_date": now.isoformat(),
            "is_school_day": _get_current_term() not in ["Annual Break", "Term 2 Break"]
        }
    }


@router.get("/calendar/check-day")
async def check_school_day(
    check_date: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Check if a specific date is a school day"""
    db = get_database()
    if check_date:
        try: target_date = datetime.fromisoformat(check_date)
        except ValueError: raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else: target_date = datetime.utcnow()
    day_of_week = target_date.weekday()
    is_weekend = day_of_week >= 5
    date_str = target_date.strftime("%Y-%m-%d")
    holiday = await db.school_events.find_one({
        "start_date": {"$lte": date_str}, "end_date": {"$gte": date_str}, "event_type": "holiday"
    })
    is_holiday = holiday is not None
    is_school_day = not is_weekend and not is_holiday
    return {
        "success": True, "message": "Day check complete",
        "data": {
            "date": date_str, "day_of_week": target_date.strftime("%A"),
            "is_weekend": is_weekend, "is_holiday": is_holiday, "is_school_day": is_school_day,
            "academic_year": _get_current_academic_year(), "current_term": _get_current_term()
        }
    }


# =========================================================================
# EVENTS
# =========================================================================
@router.get("/events")
async def list_events(
    status: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List school events"""
    db = get_database()
    filter_query = {}
    if status: filter_query["status"] = status
    if event_type: filter_query["event_type"] = event_type
    events = await db.school_events.find(filter_query).sort("start_date", 1).to_list(length=None)
    events = [parse_mongo_document(e) for e in events]
    return {"success": True, "message": "Events retrieved", "data": {"events": events, "total": len(events)}}


@router.post("/events", status_code=201)
async def create_event(
    event: SchoolEventCreate,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create school event"""
    db = get_database()
    event_doc = {**event.dict(), "created_by": current_user["_id"], "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
    result = await db.school_events.insert_one(event_doc)
    event_doc["_id"] = str(result.inserted_id)
    event_doc = parse_mongo_document(event_doc)
    return {"success": True, "message": "Event created", "data": event_doc}


@router.get("/events/{event_id}")
async def get_event(event_id: str = Path(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get single event"""
    db = get_database()
    event = await db.school_events.find_one({"_id": ObjectId(event_id)})
    if not event: raise HTTPException(status_code=404, detail="Event not found")
    event = parse_mongo_document(event)
    return {"success": True, "message": "Event retrieved", "data": event}


@router.put("/events/{event_id}")
async def update_event(
    event_id: str = Path(...), event: SchoolEventUpdate = Body(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update school event"""
    db = get_database()
    update_dict = {k: v for k, v in event.dict(exclude_unset=True).items() if v is not None}
    update_dict = _clean_immutable_fields(update_dict)
    update_dict["updated_at"] = datetime.utcnow()
    result = await db.school_events.find_one_and_update(
        {"_id": ObjectId(event_id)}, {"$set": update_dict}, return_document=True
    )
    if not result: raise HTTPException(status_code=404, detail="Event not found")
    result = parse_mongo_document(result)
    return {"success": True, "message": "Event updated", "data": result}


@router.delete("/events/{event_id}")
async def cancel_event(
    event_id: str = Path(...), reason: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Cancel school event"""
    db = get_database()
    update_data = {"status": "cancelled", "updated_at": datetime.utcnow()}
    if reason: update_data["cancellation_reason"] = reason
    result = await db.school_events.update_one({"_id": ObjectId(event_id)}, {"$set": update_data})
    if result.modified_count == 0: raise HTTPException(status_code=404, detail="Event not found")
    return {"success": True, "message": "Event cancelled"}


# =========================================================================
# BOARD MEMBERS
# =========================================================================
@router.get("/board")
async def list_board_members(
    status: str = Query(default="active"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List board members"""
    db = get_database()
    members = await db.board_members.find({"status": status}).sort([("position_order", 1), ("last_name", 1)]).to_list(length=None)
    members = [parse_mongo_document(m) for m in members]
    return {"success": True, "message": "Board members retrieved", "data": {"members": members, "total": len(members)}}


@router.post("/board", status_code=201)
async def add_board_member(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Add board member with photo support"""
    db = get_database()
    from app.models.school import SchoolModel
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    first_name = (body.get('first_name', '') or '').strip()
    last_name = (body.get('last_name', '') or '').strip()
    position = (body.get('position', '') or '').strip()
    phone_number = (body.get('phone_number', '') or '').strip()
    
    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="First name and last name are required")
    if not position:
        raise HTTPException(status_code=400, detail="Position is required")
    if not phone_number:
        raise HTTPException(status_code=400, detail="Phone number is required")
    
    success, message, result = await SchoolModel.add_board_member(
        db=db,
        first_name=first_name,
        last_name=last_name,
        position=position,
        phone_number=phone_number,
        email=body.get('email'),
        address=body.get('address'),
        middle_name=body.get('middle_name'),
        valid_from=body.get('valid_from'),
        valid_until=body.get('valid_until'),
        photo_url=body.get('photo_url'),
        bio=body.get('bio'),
        created_by=str(current_user.get("_id", ""))
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    if result:
        result = parse_mongo_document(result)
    
    return {"success": True, "message": message, "data": result}


@router.get("/board/{member_id}")
async def get_board_member(
    member_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get single board member"""
    db = get_database()
    
    obj_id = _safe_objectid(member_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    member = await db.board_members.find_one({"_id": obj_id})
    if not member:
        raise HTTPException(status_code=404, detail="Board member not found")
    
    member = parse_mongo_document(member)
    return {"success": True, "message": "Board member retrieved", "data": member}


@router.put("/board/{member_id}")
async def update_board_member(
    member_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update board member"""
    db = get_database()
    from app.models.school import SchoolModel
    
    obj_id = _safe_objectid(member_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Clean immutable fields
    for key in ['_id', 'board_member_id', 'created_at', 'created_by']:
        body.pop(key, None)
    
    success, message, result = await SchoolModel.update_board_member(
        db=db,
        member_id=member_id,
        update_data=body,
        updated_by=str(current_user.get("_id", ""))
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    if result:
        result = parse_mongo_document(result)
    
    return {"success": True, "message": message, "data": result}


@router.delete("/board/{member_id}")
async def remove_board_member(
    member_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Remove board member (soft delete)"""
    db = get_database()
    from app.models.school import SchoolModel
    
    obj_id = _safe_objectid(member_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    success, message = await SchoolModel.remove_board_member(
        db=db,
        member_id=member_id,
        removed_by=str(current_user.get("_id", ""))
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Board member not found")
    
    return {"success": True, "message": message}


@router.delete("/board/{member_id}/permanent")
async def permanently_delete_board_member(
    member_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Permanently delete board member"""
    db = get_database()
    
    obj_id = _safe_objectid(member_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    member = await db.board_members.find_one({"_id": obj_id})
    if not member:
        raise HTTPException(status_code=404, detail="Board member not found")
    
    member_name = f"{member.get('first_name', '')} {member.get('last_name', '')}"
    
    # Delete photo file if exists
    old_photo = member.get("photo_url", "")
    if old_photo and old_photo.startswith("/uploads/"):
        from pathlib import Path as FilePath
        old_path = FilePath(old_photo.lstrip("/"))
        if old_path.exists():
            try:
                old_path.unlink()
            except Exception:
                pass
    
    await db.board_members.delete_one({"_id": obj_id})
    
    return {"success": True, "message": f"Board member '{member_name}' permanently deleted"}


# =========================================================================
# BOARD MEMBER PHOTO UPLOAD
# =========================================================================

@router.post("/board/{member_id}/photo")
async def upload_board_member_photo(
    member_id: str = Path(...),
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Upload board member photo"""
    db = get_database()
    
    obj_id = _safe_objectid(member_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    member = await db.board_members.find_one({"_id": obj_id})
    if not member:
        raise HTTPException(status_code=404, detail="Board member not found")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP")
    
    # Validate file size (max 2MB)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 2MB")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"board_{member_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{file_extension}"
    
    # Create upload directory if not exists
    upload_dir = FilePath("uploads/board_members")
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Update board member record with photo URL
    photo_url = f"/uploads/board_members/{filename}"
    await db.board_members.update_one(
        {"_id": obj_id},
        {"$set": {"photo_url": photo_url, "updated_at": datetime.utcnow()}}
    )
    
    # Delete old photo if exists
    old_photo = member.get("photo_url", "")
    if old_photo and old_photo.startswith("/uploads/board_members/"):
        old_path = FilePath(old_photo.lstrip("/"))
        if old_path.exists():
            try:
                old_path.unlink()
            except Exception:
                pass
    
    return {
        "success": True,
        "message": "Photo uploaded successfully",
        "data": {"photo_url": photo_url}
    }


@router.delete("/board/{member_id}/photo")
async def delete_board_member_photo(
    member_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Delete board member photo"""
    db = get_database()
    
    obj_id = _safe_objectid(member_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid member ID")
    
    member = await db.board_members.find_one({"_id": obj_id})
    if not member:
        raise HTTPException(status_code=404, detail="Board member not found")
    
    old_photo = member.get("photo_url", "")
    if old_photo and old_photo.startswith("/uploads/board_members/"):
        old_path = FilePath(old_photo.lstrip("/"))
        if old_path.exists():
            try:
                old_path.unlink()
            except Exception:
                pass
    
    await db.board_members.update_one(
        {"_id": obj_id},
        {"$set": {"photo_url": None, "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "message": "Photo deleted successfully"}


@router.get("/board/statistics")
async def get_board_statistics(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get board member statistics"""
    db = get_database()
    from app.models.school import SchoolModel
    
    stats = await SchoolModel.get_board_statistics(db)
    return {"success": True, "message": "Board statistics retrieved", "data": stats}
    

# =========================================================================
# ACADEMIC RESET (ADMIN ONLY)
# =========================================================================

@router.post("/reset-academic")
async def reset_academic_data(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    ⚠️ DANGER: Reset all academic data for a new academic year.
    """
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        body = {}
    
    confirmation = body.get("confirmation", "").strip().upper()
    
    if confirmation != "DELETE ALL ACADEMIC DATA":
        raise HTTPException(status_code=400, detail="You must type 'DELETE ALL ACADEMIC DATA' to confirm reset")
    
    academic_year = body.get("academic_year", _get_current_academic_year())
    results = {}
    
    try:
        if body.get("reset_students", True):
            student_count = await db.students.count_documents({})
            await db.students.delete_many({})
            results["students_deleted"] = student_count
        
        if body.get("reset_teachers", True):
            teacher_count = await db.teachers.count_documents({})
            await db.teachers.delete_many({})
            results["teachers_deleted"] = teacher_count
        
        if body.get("reset_classes", True):
            class_count = await db.classes.count_documents({})
            await db.classes.delete_many({})
            results["classes_deleted"] = class_count
        
        if body.get("reset_exams", True):
            exam_count = await db.exams.count_documents({})
            await db.exams.delete_many({})
            results["exams_deleted"] = exam_count
        
        if body.get("reset_exam_results", True):
            result_count = await db.exam_results.count_documents({})
            await db.exam_results.delete_many({})
            results["exam_results_deleted"] = result_count
        
        if body.get("reset_attendance", True):
            att_count = await db.attendance.count_documents({})
            await db.attendance.delete_many({})
            results["attendance_deleted"] = att_count
        
        if body.get("reset_events", True):
            event_count = await db.school_events.count_documents({})
            await db.school_events.delete_many({})
            results["events_deleted"] = event_count
        
        # ✅ Fixed: Safe audit log - don't fail if user_id can't be converted
        try:
            changed_by = None
            uid = current_user.get("_id")
            if uid:
                converted = _safe_objectid(uid)
                if converted:
                    changed_by = converted
            
            await db.audit_log.insert_one({
                "table_name": "academic_reset",
                "record_id": f"ACADEMIC-RESET-{academic_year}",
                "operation": "RESET_ALL_ACADEMIC",
                "changed_by": changed_by,
                "details": results,
                "changed_at": datetime.utcnow()
            })
        except Exception as e:
            print(f"⚠️ Audit log error (non-critical): {e}")
        
        print(f"🔄 Academic data reset for {academic_year}: {results}")
        
        return {
            "success": True,
            "message": f"Academic data reset for {academic_year}",
            "data": {
                "academic_year": academic_year,
                "results": results,
                "total_deleted": sum(results.values())
            }
        }
        
    except Exception as e:
        print(f"❌ Academic reset error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reset academic data: {str(e)}")
         

# =========================================================================
# SUBJECTS
# =========================================================================
@router.get("/subjects")
async def get_subjects(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get list of available subjects"""
    subjects = [
        "English Language", "Mathematics", "Science", "Social Studies",
        "Religious Education", "Creative Arts", "Physical Education",
        "Local Language", "Computer Studies", "Agriculture",
        "Business Studies", "History", "Geography", "Civics"
    ]
    return {"success": True, "message": "Subjects retrieved", "data": subjects}


# =========================================================================
# SETTINGS
# =========================================================================
@router.get("/settings")
async def get_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get school settings"""
    db = get_database()
    settings_doc = await db.settings.find_one({}) or await db.system_settings.find_one({}) or {}
    if settings_doc:
        settings_doc = parse_mongo_document(settings_doc)
    settings_doc["current_academic_year"] = _get_current_academic_year()
    if "subjects" not in settings_doc:
        settings_doc["subjects"] = [
            "English Language", "Mathematics", "Science", "Social Studies",
            "Religious Education", "Creative Arts", "Physical Education",
            "Local Language", "Computer Studies", "Agriculture",
            "Business Studies", "History", "Geography", "Civics"
        ]
    if "_id" in settings_doc:
        settings_doc["id"] = str(settings_doc["_id"]) if isinstance(settings_doc["_id"], ObjectId) else str(settings_doc["_id"])
    return {"success": True, "message": "Settings retrieved", "data": settings_doc}


@router.put("/settings")
async def update_settings(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update school settings"""
    db = get_database()
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    if not body:
        raise HTTPException(status_code=400, detail="No data to update")
    body = _clean_immutable_fields(body)
    body["updated_at"] = datetime.utcnow()
    body["updated_by"] = str(current_user.get("_id", ""))
    try:
        result = await db.settings.update_one({}, {"$set": body}, upsert=True)
        if result.matched_count == 0 and result.upserted_id is None:
            await db.system_settings.update_one({}, {"$set": body}, upsert=True)
        updated_settings = await db.settings.find_one({}) or await db.system_settings.find_one({})
        if updated_settings:
            updated_settings = parse_mongo_document(updated_settings)
            updated_settings["id"] = str(updated_settings.get("_id", ""))
            updated_settings["current_academic_year"] = _get_current_academic_year()
        return {"success": True, "message": "Settings saved successfully", "data": updated_settings}
    except Exception as e:
        error_msg = str(e)
        if "immutable field" in error_msg.lower() or "code': 66" in error_msg or "code\": 66" in error_msg:
            aggressive_immutable = ['_id', 'id', 'created_at', 'created_by', 'updated_at', 'updated_by']
            for field in aggressive_immutable:
                body.pop(field, None)
            body["updated_at"] = datetime.utcnow()
            try:
                await db.settings.update_one({}, {"$set": body}, upsert=True)
                return {"success": True, "message": "Settings saved successfully (after cleanup)"}
            except Exception as retry_error:
                raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(retry_error)}")
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {error_msg}")


# =========================================================================
# INITIALIZATION
# =========================================================================
@router.post("/initialize")
async def initialize_school(current_user: Dict[str, Any] = Depends(require_role("admin"))):
    """Initialize/reinitialize school data"""
    db = get_database()
    settings_data = {
        "school_name": "Heavenly Nature Nursery & Primary School",
        "motto": "Nurturing Right Leaders",
        "academic_year": _get_current_academic_year(),
        "current_term": _get_current_term(),
        "terms_per_year": 3, "language": "en", "currency": "SSP", "timezone": "Africa/Juba",
        "subjects": [
            "English Language", "Mathematics", "Science", "Social Studies",
            "Religious Education", "Creative Arts", "Physical Education",
            "Local Language", "Computer Studies", "Agriculture",
            "Business Studies", "History", "Geography", "Civics"
        ],
        "updated_at": datetime.utcnow()
    }
    try:
        await db.settings.update_one({}, {"$set": settings_data}, upsert=True)
    except Exception:
        await db.system_settings.update_one({}, {"$set": settings_data}, upsert=True)
    return {
        "success": True, "message": "School initialized successfully",
        "data": {"academic_year": _get_current_academic_year(), "current_term": _get_current_term()}
    }
