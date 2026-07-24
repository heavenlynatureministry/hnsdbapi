"""
Class Model - Academic Class and Classroom Management
Handles: Classes, Classrooms, Class Levels, Student Assignments, Capacity Management
Supports: Nursery (3 rooms), Primary (8 rooms), Secondary (4 rooms) = 15 total
"""
from datetime import datetime, date
from typing import Optional, Dict, Any, List, Tuple, Union
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
import logging

logger = logging.getLogger(__name__)


class ClassModel:
    """
    Class model for MongoDB
    Collections: classes, class_levels, classrooms
    
    Supports:
    - Nursery: Baby, Middle, Top (3 classes)
    - Primary: P1-P8 (8 classes)
    - Secondary: S1-S4 (4 classes)
    - Total: 15 rooms
    """
    
    CLASSES = "classes"
    CLASS_LEVELS = "class_levels"
    CLASSROOMS = "classrooms"
    
    # ✅ Updated: Nursery (3), Primary (8), Secondary (4) = 15 total
    NURSERY_CLASSES = ["Baby", "Middle", "Top"]
    PRIMARY_CLASSES = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]
    SECONDARY_CLASSES = ["S1", "S2", "S3", "S4"]
    
    # ✅ Updated: All three levels
    CLASS_LEVELS_LIST = ["nursery", "primary", "secondary"]
    
    CLASS_STATUSES = ["active", "inactive", "archived", "merged"]
    ROOM_TYPES = ["classroom", "laboratory", "library", "office", "storeroom", "other"]
    ROOM_STATUSES = ["available", "occupied", "under_maintenance", "reserved"]
    
    # ✅ Updated: Promotion map includes secondary
    PROMOTION_MAP = {
        "nursery": {"Baby": "Middle", "Middle": "Top", "Top": "P1"},
        "primary": {"P1": "P2", "P2": "P3", "P3": "P4", "P4": "P5", "P5": "P6", "P6": "P7", "P7": "P8", "P8": "S1"},
        "secondary": {"S1": "S2", "S2": "S3", "S3": "S4", "S4": None}
    }
    
    @staticmethod
    def get_class_schema() -> Dict[str, Any]:
        return {
            "class_name": "String - Class name (Baby, Middle, Top, P1-P8, S1-S4)",
            "class_level": "String - nursery, primary, or secondary",
            "class_teacher_id": "ObjectId (optional)",
            "classroom_id": "ObjectId (optional)",
            "academic_year": "String - Academic year",
            "max_capacity": "Integer - Maximum students allowed",
            "current_enrollment": "Integer - Current student count",
            "status": "String - active, inactive, archived, merged",
            "schedule": "Object - Class timetable/schedule",
            "section": "String (optional)",
            "stream": "String (optional)",
            "graduation_year": "Integer (optional)",
            "created_at": "DateTime",
            "updated_at": "DateTime",
            "created_by": "ObjectId"
        }
    
    @staticmethod
    def get_classroom_schema() -> Dict[str, Any]:
        return {
            "room_number": "String", "room_name": "String", "room_type": "String",
            "building": "String", "floor": "Integer", "capacity": "Integer",
            "current_class_id": "ObjectId (optional)", "status": "String",
            "facilities": "Array", "dimensions": "Object", "notes": "String",
            "created_at": "DateTime", "updated_at": "DateTime"
        }
    
    @staticmethod
    async def create_indexes(db: AsyncIOMotorDatabase):
        try:
            await db.classes.create_index([("class_name", 1), ("academic_year", 1), ("section", 1)], unique=True, sparse=True, name="idx_class_name_year_section")
            await db.classes.create_index("class_level", name="idx_class_level")
            await db.classes.create_index("class_teacher_id", name="idx_class_teacher")
            await db.classes.create_index("classroom_id", name="idx_class_classroom")
            await db.classes.create_index("academic_year", name="idx_class_year")
            await db.classes.create_index("status", name="idx_class_status")
            await db.classes.create_index([("class_level", 1), ("status", 1)], name="idx_class_level_status")
            await db.class_levels.create_index([("level_name", 1), ("academic_year", 1)], unique=True, name="idx_level_name_year")
            await db.classrooms.create_index("room_number", unique=True, name="idx_room_number")
            await db.classrooms.create_index("room_type", name="idx_room_type")
            await db.classrooms.create_index("status", name="idx_room_status")
            await db.classrooms.create_index("current_class_id", name="idx_room_class", sparse=True)
            await db.classrooms.create_index([("building", 1), ("floor", 1)], name="idx_room_location")
            logger.info("Class collection indexes created successfully")
        except Exception as e:
            logger.error(f"Failed to create class indexes: {e}")
            raise

    # =========================================================================
    # CLASS LEVEL MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def initialize_class_levels(db: AsyncIOMotorDatabase, academic_year: Optional[str] = None) -> Tuple[bool, str]:
        """Initialize default class levels for an academic year - Nursery, Primary, Secondary"""
        if not academic_year:
            academic_year = ClassModel._get_current_academic_year()
        
        nursery_levels = [{
            "level_name": "Nursery", "level_code": "NUR",
            "class_names": ClassModel.NURSERY_CLASSES,
            "age_range": {"min": 3, "max": 5}, "duration_years": 3,
            "next_level": "Primary", "academic_year": academic_year,
            "status": "active", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
        }]
        
        primary_levels = [{
            "level_name": "Primary", "level_code": "PRI",
            "class_names": ClassModel.PRIMARY_CLASSES,
            "age_range": {"min": 6, "max": 14}, "duration_years": 8,
            "next_level": "Secondary", "academic_year": academic_year,
            "status": "active", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
        }]
        
        # ✅ NEW: Secondary level
        secondary_levels = [{
            "level_name": "Secondary", "level_code": "SEC",
            "class_names": ClassModel.SECONDARY_CLASSES,
            "age_range": {"min": 15, "max": 19}, "duration_years": 4,
            "next_level": None, "academic_year": academic_year,
            "status": "active", "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
        }]
        
        all_levels = nursery_levels + primary_levels + secondary_levels
        
        try:
            for level in all_levels:
                await db.class_levels.update_one(
                    {"level_name": level["level_name"], "academic_year": academic_year},
                    {"$set": level}, upsert=True
                )
            logger.info(f"Class levels initialized for {academic_year}")
            return True, f"Class levels initialized for {academic_year}"
        except Exception as e:
            logger.error(f"Failed to initialize class levels: {e}")
            return False, f"Failed to initialize class levels: {str(e)}"

    # =========================================================================
    # CLASS MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def create_class(
        db: AsyncIOMotorDatabase, class_name: str, class_level: str,
        academic_year: str, class_teacher_id: Optional[str] = None,
        classroom_id: Optional[str] = None, max_capacity: int = 25,
        section: Optional[str] = None, stream: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Create a new class"""
        if class_level not in ClassModel.CLASS_LEVELS_LIST:
            return False, f"Invalid class level. Must be: {', '.join(ClassModel.CLASS_LEVELS_LIST)}", None
        
        # ✅ Updated: Check valid names for all levels
        if class_level == "nursery":
            valid_names = ClassModel.NURSERY_CLASSES
        elif class_level == "primary":
            valid_names = ClassModel.PRIMARY_CLASSES
        else:
            valid_names = ClassModel.SECONDARY_CLASSES
        
        if class_name not in valid_names:
            return False, f"Invalid class name for {class_level}. Must be: {', '.join(valid_names)}", None
        
        if not ClassModel._validate_academic_year(academic_year):
            return False, "Invalid academic year format. Use YYYY/YYYY", None
        
        if max_capacity < 1: return False, "Maximum capacity must be at least 1", None
        if max_capacity > 100: return False, "Maximum capacity cannot exceed 100", None
        
        if class_teacher_id:
            teacher = await db.teachers.find_one({"_id": ObjectId(class_teacher_id), "status": "active"})
            if not teacher: return False, "Teacher not found or inactive", None
        
        if classroom_id:
            classroom = await db.classrooms.find_one({"_id": ObjectId(classroom_id), "status": {"$in": ["available", "reserved"]}})
            if not classroom: return False, "Classroom not found or not available", None
            if classroom["capacity"] < max_capacity:
                return False, f"Classroom capacity ({classroom['capacity']}) is less than class capacity ({max_capacity})", None
        
        class_doc = {
            "class_name": class_name, "class_level": class_level,
            "class_teacher_id": ObjectId(class_teacher_id) if class_teacher_id else None,
            "classroom_id": ObjectId(classroom_id) if classroom_id else None,
            "academic_year": academic_year, "max_capacity": max_capacity,
            "current_enrollment": 0, "status": "active",
            "section": section, "stream": stream,
            "schedule": {"monday": [], "tuesday": [], "wednesday": [], "thursday": [], "friday": []},
            "graduation_year": ClassModel._calculate_graduation_year(class_name, academic_year),
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
        }
        
        try:
            existing = await db.classes.find_one({
                "class_name": class_name, "class_level": class_level,
                "academic_year": academic_year, "status": "active"
            })
            if existing: return False, f"Class {class_name} already exists for {academic_year}", None
            
            result = await db.classes.insert_one(class_doc)
            class_doc["_id"] = str(result.inserted_id)
            if class_doc.get("class_teacher_id"): class_doc["class_teacher_id"] = str(class_doc["class_teacher_id"])
            if class_doc.get("classroom_id"): class_doc["classroom_id"] = str(class_doc["classroom_id"])
            
            if classroom_id:
                await db.classrooms.update_one({"_id": ObjectId(classroom_id)}, {"$set": {"status": "occupied", "current_class_id": result.inserted_id, "updated_at": datetime.utcnow()}})
            if class_teacher_id:
                await db.teachers.update_one({"_id": ObjectId(class_teacher_id)}, {"$set": {"class_teacher_of": result.inserted_id, "updated_at": datetime.utcnow()}})
            
            logger.info(f"Class created: {class_name} ({class_level}) for {academic_year}")
            return True, f"Class {class_name} created successfully", class_doc
        except DuplicateKeyError:
            return False, f"Class {class_name} already exists for {academic_year}", None
        except Exception as e:
            logger.error(f"Failed to create class: {e}")
            return False, f"Failed to create class: {str(e)}", None
    
    @staticmethod
    async def create_classes_for_year(db: AsyncIOMotorDatabase, academic_year: str, created_by: Optional[str] = None) -> Tuple[int, int, List[str]]:
        """Create all default classes for an academic year - Nursery, Primary, Secondary"""
        created, failed, errors = 0, 0, []
        await ClassModel.initialize_class_levels(db, academic_year)
        
        # Nursery (max 20)
        for class_name in ClassModel.NURSERY_CLASSES:
            success, message, _ = await ClassModel.create_class(db=db, class_name=class_name, class_level="nursery", academic_year=academic_year, max_capacity=20, created_by=created_by)
            if success: created += 1
            else: failed += 1; errors.append(f"Nursery {class_name}: {message}")
        
        # Primary (max 25)
        for class_name in ClassModel.PRIMARY_CLASSES:
            success, message, _ = await ClassModel.create_class(db=db, class_name=class_name, class_level="primary", academic_year=academic_year, max_capacity=25, created_by=created_by)
            if success: created += 1
            else: failed += 1; errors.append(f"Primary {class_name}: {message}")
        
        # ✅ Secondary (max 30)
        for class_name in ClassModel.SECONDARY_CLASSES:
            success, message, _ = await ClassModel.create_class(db=db, class_name=class_name, class_level="secondary", academic_year=academic_year, max_capacity=30, created_by=created_by)
            if success: created += 1
            else: failed += 1; errors.append(f"Secondary {class_name}: {message}")
        
        return created, failed, errors

    # ... (rest of the methods remain the same as original)

    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    def _get_current_academic_year() -> str:
        now = datetime.now()
        year = now.year; month = now.month
        start_year = year - 1 if month == 1 else year
        return f"{start_year}/{start_year + 1}"
    
    @staticmethod
    def _get_next_academic_year() -> str:
        now = datetime.now()
        year = now.year; month = now.month
        start_year = year if month == 1 else year + 1
        return f"{start_year}/{start_year + 1}"
    
    @staticmethod
    def _get_current_term() -> str:
        month = datetime.now().month
        if 2 <= month <= 4: return "Term 1"
        elif 5 <= month <= 7: return "Term 2"
        elif 9 <= month <= 11: return "Term 3"
        elif month == 8: return "Term 2 Break"
        else: return "Annual Break"
    
    @staticmethod
    def _get_current_term_number() -> int:
        month = datetime.now().month
        if 2 <= month <= 4: return 1
        elif 5 <= month <= 7: return 2
        elif 9 <= month <= 11: return 3
        else: return 0
    
    @staticmethod
    def _is_school_in_session() -> bool:
        return ClassModel._get_current_term_number() > 0
    
    @staticmethod
    def _validate_academic_year(year_str: str) -> bool:
        try:
            parts = year_str.split("/")
            if len(parts) != 2: return False
            year1, year2 = int(parts[0]), int(parts[1])
            return year2 == year1 + 1 and year1 >= 2020
        except (ValueError, IndexError): return False
    
    @staticmethod
    def _calculate_graduation_year(class_name: str, academic_year: str) -> Optional[int]:
        try:
            start_year = int(academic_year.split("/")[0])
            if class_name in ClassModel.NURSERY_CLASSES: return None
            if class_name in ClassModel.PRIMARY_CLASSES:
                class_number = int(class_name[1:])
                return start_year + (8 - class_number)
            # ✅ Secondary
            if class_name in ClassModel.SECONDARY_CLASSES:
                class_number = int(class_name[1:])
                return start_year + (4 - class_number)
            return None
        except (ValueError, IndexError): return None
    
    @staticmethod
    def _get_academic_year_for_date(target_date: datetime) -> str:
        year, month = target_date.year, target_date.month
        start_year = year - 1 if month == 1 else year
        return f"{start_year}/{start_year + 1}"
    
    @staticmethod
    def _get_all_academic_years(from_year: int = 2020) -> List[str]:
        current_academic_year = ClassModel._get_current_academic_year()
        current_start_year = int(current_academic_year.split("/")[0])
        return [f"{year}/{year + 1}" for year in range(from_year, current_start_year + 1)]
    
    @staticmethod
    async def _log_audit(db: AsyncIOMotorDatabase, table_name: str, record_id: str, operation: str, changed_by: Optional[str], details: Dict[str, Any]):
        try:
            await db.audit_log.insert_one({
                "table_name": table_name, "record_id": record_id, "operation": operation,
                "changed_by": ObjectId(changed_by) if changed_by else None,
                "new_values": details, "changed_at": datetime.utcnow(),
                "academic_year": ClassModel._get_current_academic_year(),
                "term": ClassModel._get_current_term()
            })
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")
