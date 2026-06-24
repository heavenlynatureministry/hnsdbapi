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


@router.get("", response_model=SuccessResponse)
@router.get("/", response_model=SuccessResponse)
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
    
    # Calculate occupancy
    for c in classes:
        if c.get("max_capacity") and c["max_capacity"] > 0:
            c["occupancy_rate"] = round((c.get("current_enrollment", 0) / c["max_capacity"]) * 100, 1)
            c["available_spots"] = c["max_capacity"] - c.get("current_enrollment", 0)
    
    return SuccessResponse(success=True, message="Classes retrieved", data={
        "classes": classes, "total": total, "page": page, "limit": limit
    })


@router.get("/statistics/overview", response_model=SuccessResponse)
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
    
    return SuccessResponse(success=True, message="Statistics retrieved", data={
        "total_classes": total,
        "by_level": {
            item["_id"]: {
                "classes": item["count"],
                "enrollment": item["total_enrollment"],
                "capacity": item["total_capacity"],
                "occupancy_rate": round((item["total_enrollment"] / item["total_capacity"] * 100), 1) if item["total_capacity"] > 0 else 0
            } for item in by_level
        }
    })


@router.get("/levels", response_model=SuccessResponse)
async def get_class_levels(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get available class levels"""
    return SuccessResponse(success=True, message="Levels retrieved", data={
        "levels": [
            {"name": "Nursery", "classes": ["Baby", "Middle", "Top"], "age_range": "3-5 years", "max_capacity": 20},
            {"name": "Primary", "classes": ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"], "age_range": "6-14 years", "max_capacity": 25}
        ]
    })


@router.get("/promotion-map", response_model=SuccessResponse)
async def get_promotion_map(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get class promotion/transition map"""
    return SuccessResponse(success=True, message="Promotion map retrieved", data={
        "nursery": {"Baby": "Middle", "Middle": "Top", "Top": "P1 (Primary)"},
        "primary": {"P1": "P2", "P2": "P3", "P3": "P4", "P4": "P5", "P5": "P6", "P6": "P7", "P7": "P8", "P8": "Graduation"}
    })


@router.get("/{class_id}", response_model=SuccessResponse)
async def get_class(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get class details"""
    db = get_database()
    class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_doc: raise HTTPException(status_code=404, detail="Class not found")
    
    class_doc = parse_mongo_document(class_doc)
    
    if class_doc.get("class_teacher_id"):
        try:
            teacher = await db.teachers.find_one({"_id": ObjectId(class_doc["class_teacher_id"])})
            if teacher: class_doc["teacher_name"] = f"{teacher['first_name']} {teacher['last_name']}"
        except Exception:
            class_doc["teacher_name"] = "Unknown"
    
    class_doc["student_count"] = await db.students.count_documents({
        "current_class_id": ObjectId(class_id), "status": "active"
    })
    
    return SuccessResponse(success=True, message="Class retrieved", data=class_doc)


@router.get("/{class_id}/students", response_model=SuccessResponse)
async def get_class_students(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get students in a class"""
    db = get_database()
    students = await db.students.find({
        "current_class_id": ObjectId(class_id), "status": "active"
    }).sort("last_name", 1).to_list(length=None)
    
    students = [parse_mongo_document(s) for s in students]
    
    class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
    class_name = class_doc["class_name"] if class_doc else "Unknown"
    
    return SuccessResponse(success=True, message="Students retrieved", data={
        "class_id": class_id,
        "class_name": class_name,
        "students": students,
        "total": len(students)
    })


@router.post("", response_model=SuccessResponse, status_code=201)
@router.post("/", response_model=SuccessResponse, status_code=201)
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
        now = datetime.utcnow()
        year = now.year
        month = now.month
        academic_year = f"{year}/{year+1}" if month >= 9 else f"{year-1}/{year}"
    
    existing = await db.classes.find_one({
        "class_name": class_name, "class_level": class_level,
        "academic_year": academic_year, "status": "active"
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Class {class_name} already exists for {academic_year}")
    
    doc = {
        "class_name": class_name,
        "class_level": class_level,
        "academic_year": academic_year,
        "max_capacity": body.get("max_capacity", 20 if class_level == "nursery" else 25),
        "current_enrollment": 0,
        "class_teacher_id": ObjectId(body["class_teacher_id"]) if body.get("class_teacher_id") else None,
        "classroom_id": ObjectId(body["classroom_id"]) if body.get("classroom_id") else None,
        "section": body.get("section"),
        "stream": body.get("stream"),
        "status": "active",
        "schedule": body.get("schedule", {}),
        "created_by": ObjectId(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    doc = {k: v for k, v in doc.items() if v is not None}
    
    result = await db.classes.insert_one(doc)
    doc = parse_mongo_document(doc)
    
    return SuccessResponse(success=True, message=f"Class {class_name} created", data=doc)


@router.put("/{class_id}", response_model=SuccessResponse)
async def update_class(
    class_id: str = Path(...),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Update class"""
    db = get_database()
    
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    if not body:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    for key in ["_id", "created_at", "created_by"]:
        body.pop(key, None)
    
    body["updated_at"] = datetime.utcnow()
    
    result = await db.classes.find_one_and_update(
        {"_id": ObjectId(class_id)},
        {"$set": body},
        return_document=True
    )
    
    if not result: raise HTTPException(status_code=404, detail="Class not found")
    result = parse_mongo_document(result)
    
    return SuccessResponse(success=True, message="Class updated", data=result)


@router.delete("/{class_id}", response_model=SuccessResponse)
async def delete_class(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Soft delete a class (mark as inactive)"""
    db = get_database()
    
    # Check if class has active students
    active_students = await db.students.count_documents({
        "current_class_id": ObjectId(class_id),
        "status": "active"
    })
    
    if active_students > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete class with {active_students} active students. Transfer or deactivate students first."
        )
    
    result = await db.classes.update_one(
        {"_id": ObjectId(class_id)},
        {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Class not found")
    
    return SuccessResponse(success=True, message="Class deactivated")


@router.delete("/{class_id}/permanent", response_model=SuccessResponse)
async def permanently_delete_class(
    class_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(require_role("admin"))
):
    """Permanently delete a class (admin only) - Only if no students enrolled"""
    db = get_database()
    
    # Check class exists
    class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not class_doc:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Check for active students
    active_students = await db.students.count_documents({
        "current_class_id": ObjectId(class_id),
        "status": "active"
    })
    
    if active_students > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot permanently delete class with {active_students} active students"
        )
    
    class_name = class_doc.get("class_name", "Unknown")
    
    try:
        # Delete schedule records if any
        await db.class_schedules.delete_many({"class_id": ObjectId(class_id)})
        
        # Delete the class
        await db.classes.delete_one({"_id": ObjectId(class_id)})
        
        # Log the deletion
        await db.audit_log.insert_one({
            "table_name": "classes",
            "record_id": class_id,
            "operation": "DELETE_PERMANENT",
            "changed_by": ObjectId(current_user["_id"]) if current_user.get("_id") else None,
            "details": {"class_name": class_name, "class_level": class_doc.get("class_level")},
            "changed_at": datetime.utcnow()
        })
        
        return SuccessResponse(success=True, message=f"Class '{class_name}' permanently deleted")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete class: {str(e)}")
