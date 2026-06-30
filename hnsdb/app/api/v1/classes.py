"""Classes API - Production Ready"""
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Request
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime

from app.core.security import get_current_user, require_role
from app.core.database import get_database
from app.schemas.common import SuccessResponse
from app.utils.helpers import parse_mongo_document

router = APIRouter()


def _get_current_academic_year() -> str:
    """Calculate current academic year dynamically."""
    now = datetime.utcnow()
    year = now.year
    month = now.month
    start_year = year - 1 if month == 1 else year
    return f"{start_year}/{start_year + 1}"


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


# =========================================================================
# BULK CREATE - MUST be before /{class_id} routes
# =========================================================================
@router.post("/create-all")
async def create_all_classes(
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Create all default classes (Nursery + Primary) for an academic year.
    Skips classes that already exist.
    """
    db = get_database()
    
    body = {}
    if request:
        try:
            body = await request.json()
        except Exception:
            pass
    
    academic_year = body.get("academic_year", _get_current_academic_year())
    
    created = []
    skipped = []
    errors = []
    
    all_classes = [
        {"class_name": "Baby", "class_level": "nursery", "max_capacity": 20},
        {"class_name": "Middle", "class_level": "nursery", "max_capacity": 20},
        {"class_name": "Top", "class_level": "nursery", "max_capacity": 20},
        {"class_name": "P1", "class_level": "primary", "max_capacity": 25},
        {"class_name": "P2", "class_level": "primary", "max_capacity": 25},
        {"class_name": "P3", "class_level": "primary", "max_capacity": 25},
        {"class_name": "P4", "class_level": "primary", "max_capacity": 25},
        {"class_name": "P5", "class_level": "primary", "max_capacity": 25},
        {"class_name": "P6", "class_level": "primary", "max_capacity": 25},
        {"class_name": "P7", "class_level": "primary", "max_capacity": 25},
        {"class_name": "P8", "class_level": "primary", "max_capacity": 25},
    ]
    
    for cls in all_classes:
        class_name = cls["class_name"]
        class_level = cls["class_level"]
        
        existing = await db.classes.find_one({
            "class_name": class_name,
            "class_level": class_level,
            "academic_year": academic_year,
            "status": "active"
        })
        
        if existing:
            skipped.append(class_name)
            continue
        
        try:
            doc = {
                "class_name": class_name,
                "class_level": class_level,
                "academic_year": academic_year,
                "max_capacity": cls["max_capacity"],
                "current_enrollment": 0,
                "status": "active",
                "schedule": {"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": []},
                "created_by": current_user.get("_id"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            result = await db.classes.insert_one(doc)
            created.append(class_name)
        except Exception as e:
            errors.append(f"{class_name}: {str(e)}")
    
    return {
        "success": True,
        "message": f"Created {len(created)} classes, {len(skipped)} already existed, {len(errors)} errors",
        "data": {
            "academic_year": academic_year,
            "created": created,
            "skipped": skipped,
            "errors": errors,
            "total_created": len(created),
            "total_skipped": len(skipped)
        }
    }


# =========================================================================
# LIST CLASSES
# =========================================================================
@router.get("")
@router.get("/")
async def list_classes(
    class_level: Optional[str] = Query(None),
    status: str = Query(default="active"),
    academic_year: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List classes with filters"""
    db = get_database()
    filter_query = {"status": status}
    if class_level: filter_query["class_level"] = class_level
    if academic_year: filter_query["academic_year"] = academic_year
    
    skip = (page - 1) * limit
    total = await db.classes.count_documents(filter_query)
    classes = await db.classes.find(filter_query).sort("class_name", 1).skip(skip).limit(limit).to_list(length=limit)
    classes = [parse_mongo_document(c) for c in classes]
    
    for c in classes:
        c["id"] = c.get("_id", c.get("id"))
        if c.get("max_capacity") and c["max_capacity"] > 0:
            c["occupancy_rate"] = round((c.get("current_enrollment", 0) / c["max_capacity"]) * 100, 1)
            c["available_spots"] = c["max_capacity"] - c.get("current_enrollment", 0)
        else:
            c["occupancy_rate"] = 0
            c["available_spots"] = 0
    
    return {"success": True, "message": "Classes retrieved", "data": classes}


@router.get("/statistics/overview")
async def class_statistics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get class statistics overview"""
    db = get_database()
    total = await db.classes.count_documents({"status": "active"})
    by_level = await db.classes.aggregate([
        {"$match": {"status": "active"}},
        {"$group": {
            "_id": "$class_level",
            "count": {"$sum": 1},
            "total_enrollment": {"$sum": "$current_enrollment"},
            "total_capacity": {"$sum": "$max_capacity"}
        }}
    ]).to_list(length=None)
    
    return {
        "success": True, "message": "Statistics retrieved",
        "data": {
            "total_classes": total,
            "by_level": {
                item["_id"]: {
                    "classes": item["count"],
                    "enrollment": item["total_enrollment"],
                    "capacity": item["total_capacity"],
                    "occupancy_rate": round((item["total_enrollment"] / item["total_capacity"] * 100), 1) if item["total_capacity"] > 0 else 0
                } for item in by_level
            }
        }
    }


@router.get("/levels")
async def get_class_levels(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get available class levels"""
    return {
        "success": True, "message": "Levels retrieved",
        "data": [
            {"name": "Nursery", "classes": ["Baby", "Middle", "Top"], "age_range": "3-5 years", "max_capacity": 20},
            {"name": "Primary", "classes": ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"], "age_range": "6-14 years", "max_capacity": 25}
        ]
    }


@router.get("/promotion-map")
async def get_promotion_map(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get class promotion/transition map"""
    return {
        "success": True, "message": "Promotion map retrieved",
        "data": {
            "nursery": {"Baby": "Middle", "Middle": "Top", "Top": "P1 (Primary)"},
            "primary": {"P1": "P2", "P2": "P3", "P3": "P4", "P4": "P5", "P5": "P6", "P6": "P7", "P7": "P8", "P8": "Graduation"}
        }
    }


# =========================================================================
# CLASS SCHEDULE - MUST be before /{class_id} generic route
# =========================================================================

@router.get("/{class_id}/schedule")
async def get_class_schedule(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get class schedule/timetable"""
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    
    class_doc = await db.classes.find_one({"_id": obj_id})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    schedule = class_doc.get("schedule", {
        "monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": []
    })
    
    return {
        "success": True,
        "message": "Schedule retrieved",
        "data": {
            "class_id": class_id,
            "class_name": class_doc.get("class_name"),
            "class_level": class_doc.get("class_level"),
            "schedule": schedule
        }
    }


@router.put("/{class_id}/schedule")
async def update_class_schedule(
    class_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update class schedule"""
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    schedule = body.get("schedule", {})
    
    # Validate schedule format
    valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    normalized_schedule = {}
    for day, periods in schedule.items():
        if day.lower() in valid_days:
            normalized_schedule[day.lower()] = periods
    
    await db.classes.update_one(
        {"_id": obj_id},
        {"$set": {"schedule": normalized_schedule, "updated_at": datetime.utcnow()}}
    )
    
    return {"success": True, "message": "Schedule updated"}


# =========================================================================
# CLASS BY ID - generic /{class_id} route
# =========================================================================

@router.get("/{class_id}")
async def get_class(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get class details"""
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID format")
    
    class_doc = await db.classes.find_one({"_id": obj_id})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    class_doc = parse_mongo_document(class_doc)
    class_doc["id"] = class_doc.get("_id")
    
    if class_doc.get("class_teacher_id"):
        teacher_id = _safe_objectid(class_doc["class_teacher_id"])
        if teacher_id:
            try:
                teacher = await db.teachers.find_one({"_id": teacher_id})
                if teacher:
                    class_doc["teacher_name"] = f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}".strip()
            except Exception:
                class_doc["teacher_name"] = "Unknown"
    
    class_doc["student_count"] = await db.students.count_documents({
        "current_class_id": obj_id, "status": "active"
    })
    
    if class_doc.get("max_capacity") and class_doc["max_capacity"] > 0:
        class_doc["occupancy_rate"] = round((class_doc.get("student_count", 0) / class_doc["max_capacity"]) * 100, 1)
        class_doc["available_spots"] = class_doc["max_capacity"] - class_doc.get("student_count", 0)
    
    return {"success": True, "message": "Class retrieved", "data": class_doc}


@router.get("/{class_id}/students")
async def get_class_students(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get students in a class"""
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID format")
    
    students = await db.students.find({
        "current_class_id": obj_id, "status": "active"
    }).sort("last_name", 1).to_list(length=None)
    
    students = [parse_mongo_document(s) for s in students]
    
    class_doc = await db.classes.find_one({"_id": obj_id})
    class_name = class_doc["class_name"] if class_doc else "Unknown"
    
    return {
        "success": True, "message": "Students retrieved",
        "data": {"class_id": class_id, "class_name": class_name, "students": students, "total": len(students)}
    }


@router.post("")
@router.post("/")
async def create_class(
    request: Request,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Create a new class"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    class_name = body.get("class_name", "").strip()
    class_level = body.get("class_level", "").strip()
    academic_year = body.get("academic_year", "")
    
    if not class_name or not class_level:
        raise HTTPException(status_code=400, detail="Class name and level are required")
    
    if not academic_year:
        academic_year = _get_current_academic_year()
    
    valid_nursery = ["Baby", "Middle", "Top"]
    valid_primary = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]
    
    if class_level == "nursery" and class_name not in valid_nursery:
        raise HTTPException(status_code=400, detail=f"Invalid nursery class name. Must be: {', '.join(valid_nursery)}")
    if class_level == "primary" and class_name not in valid_primary:
        raise HTTPException(status_code=400, detail=f"Invalid primary class name. Must be: {', '.join(valid_primary)}")
    
    # Check for existing class (active OR inactive)
    existing = await db.classes.find_one({
        "class_name": class_name, 
        "class_level": class_level,
        "academic_year": academic_year
    })
    
    if existing:
        if existing.get("status") == "inactive":
            # Reactivate the inactive class
            await db.classes.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "status": "active",
                    "updated_at": datetime.utcnow(),
                    "max_capacity": body.get("max_capacity", existing.get("max_capacity", 20)),
                    "section": body.get("section", existing.get("section")),
                    "stream": body.get("stream", existing.get("stream"))
                }}
            )
            existing = parse_mongo_document(existing)
            existing["id"] = existing.get("_id")
            return {
                "success": True, 
                "message": f"Class {class_name} reactivated for {academic_year}",
                "data": existing
            }
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Class {class_name} already exists for {academic_year}"
            )
    
    doc = {
        "class_name": class_name, 
        "class_level": class_level,
        "academic_year": academic_year,
        "max_capacity": body.get("max_capacity", 20 if class_level == "nursery" else 25),
        "current_enrollment": 0, 
        "section": body.get("section"), 
        "stream": body.get("stream"),
        "status": "active",
        "schedule": body.get("schedule", {
            "monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": []
        }),
        "created_by": current_user.get("_id"),
        "created_at": datetime.utcnow(), 
        "updated_at": datetime.utcnow()
    }
    
    teacher_id = _safe_objectid(body.get("class_teacher_id"))
    if teacher_id: doc["class_teacher_id"] = teacher_id
    
    classroom_id = _safe_objectid(body.get("classroom_id"))
    if classroom_id: doc["classroom_id"] = classroom_id
    
    doc = {k: v for k, v in doc.items() if v is not None}
    
    try:
        result = await db.classes.insert_one(doc)
        doc["_id"] = str(result.inserted_id)
        doc["id"] = doc["_id"]
        if doc.get("class_teacher_id"): doc["class_teacher_id"] = str(doc["class_teacher_id"])
        if doc.get("classroom_id"): doc["classroom_id"] = str(doc["classroom_id"])
        return {
            "success": True, 
            "message": f"Class {class_name} created successfully", 
            "data": doc
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create class: {str(e)}")


@router.put("/{class_id}")
async def update_class(
    class_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update class"""
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID format")
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    for key in ["_id", "id", "created_at", "created_by"]:
        body.pop(key, None)
    
    teacher_id = _safe_objectid(body.get("class_teacher_id"))
    if teacher_id: body["class_teacher_id"] = teacher_id
    elif "class_teacher_id" in body: body.pop("class_teacher_id")
    
    classroom_id = _safe_objectid(body.get("classroom_id"))
    if classroom_id: body["classroom_id"] = classroom_id
    elif "classroom_id" in body: body.pop("classroom_id")
    
    body["updated_at"] = datetime.utcnow()
    
    try:
        result = await db.classes.find_one_and_update(
            {"_id": obj_id}, {"$set": body}, return_document=True
        )
        if not result: raise HTTPException(status_code=404, detail="Class not found")
        result = parse_mongo_document(result)
        result["id"] = result.get("_id")
        return {"success": True, "message": "Class updated", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update class: {str(e)}")


@router.delete("/{class_id}")
async def delete_class(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Soft delete a class (mark as inactive)"""
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID format")
    
    active_students = await db.students.count_documents({
        "current_class_id": obj_id, "status": "active"
    })
    
    if active_students > 0:
        raise HTTPException(status_code=400,
            detail=f"Cannot delete class with {active_students} active students. Transfer or deactivate students first.")
    
    result = await db.classes.update_one(
        {"_id": obj_id},
        {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Class not found")
    
    return {"success": True, "message": "Class deactivated"}


# =========================================================================
# PERMANENT DELETE - Hard delete endpoint
# =========================================================================
@router.delete("/{class_id}/permanent")
async def permanent_delete_class(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """
    Permanently delete a class from the database.
    WARNING: This action cannot be undone.
    Also removes the class reference from all associated students and teachers.
    """
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID format")
    
    # Check if class exists
    class_doc = await db.classes.find_one({"_id": obj_id})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    class_name = class_doc.get("class_name", "Unknown")
    class_level = class_doc.get("class_level", "Unknown")
    academic_year = class_doc.get("academic_year", "Unknown")
    
    # Check for active students in this class
    active_students = await db.students.count_documents({
        "current_class_id": obj_id, 
        "status": "active"
    })
    
    if active_students > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot permanently delete class with {active_students} active students. "
                   f"Transfer or deactivate students first."
        )
    
    # Remove class reference from all students (including inactive ones)
    update_students_result = await db.students.update_many(
        {"current_class_id": obj_id},
        {"$set": {
            "current_class_id": None,
            "previous_class_id": obj_id,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Remove class reference from teachers
    update_teachers_result = await db.teachers.update_many(
        {"class_id": obj_id},
        {"$set": {
            "class_id": None,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Permanently delete the class
    result = await db.classes.delete_one({"_id": obj_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Class not found or already deleted")
    
    return {
        "success": True,
        "message": f"Class '{class_name}' ({class_level}) for {academic_year} permanently deleted",
        "data": {
            "deleted_class": {
                "id": class_id,
                "class_name": class_name,
                "class_level": class_level,
                "academic_year": academic_year
            },
            "students_updated": update_students_result.modified_count,
            "teachers_updated": update_teachers_result.modified_count
        }
    }


# =========================================================================
# REACTIVATE CLASS - Reactivate an inactive class
# =========================================================================
@router.put("/{class_id}/reactivate")
async def reactivate_class(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Reactivate a soft-deleted (inactive) class"""
    db = get_database()
    
    obj_id = _safe_objectid(class_id)
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid class ID format")
    
    # Check if class exists and is inactive
    class_doc = await db.classes.find_one({"_id": obj_id})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    if class_doc.get("status") == "active":
        return {
            "success": True, 
            "message": f"Class '{class_doc.get('class_name')}' is already active",
            "data": parse_mongo_document(class_doc)
        }
    
    # Check for duplicate active class
    existing_active = await db.classes.find_one({
        "class_name": class_doc["class_name"],
        "class_level": class_doc["class_level"],
        "academic_year": class_doc["academic_year"],
        "status": "active"
    })
    
    if existing_active:
        raise HTTPException(
            status_code=400,
            detail=f"An active class with name '{class_doc['class_name']}' already exists "
                   f"for {class_doc['academic_year']}. Cannot reactivate duplicate."
        )
    
    # Reactivate the class
    result = await db.classes.find_one_and_update(
        {"_id": obj_id},
        {"$set": {
            "status": "active",
            "updated_at": datetime.utcnow()
        }},
        return_document=True
    )
    
    result = parse_mongo_document(result)
    result["id"] = result.get("_id")
    
    return {
        "success": True,
        "message": f"Class '{result.get('class_name')}' reactivated successfully",
        "data": result
    }
