"""
Class Model - Academic Class and Classroom Management
Handles: Classes, Classrooms, Class Levels, Student Assignments, Capacity Management
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
    - Class creation and management
    - Class level configuration (nursery, primary)
    - Classroom assignment and capacity management
    - Teacher assignment to classes
    - Student enrollment tracking
    - Class promotion and progression
    - Academic year management
    - Class schedules
    - Class monitoring and statistics
    """
    
    # Collection names
    CLASSES = "classes"
    CLASS_LEVELS = "class_levels"
    CLASSROOMS = "classrooms"
    
    # Valid class names for nursery
    NURSERY_CLASSES = ["Baby", "Middle", "Top"]
    
    # Valid class names for primary
    PRIMARY_CLASSES = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]
    
    # Class levels
    CLASS_LEVELS_LIST = ["nursery", "primary"]
    
    # Class statuses
    CLASS_STATUSES = ["active", "inactive", "archived", "merged"]
    
    # Room types
    ROOM_TYPES = ["classroom", "laboratory", "library", "office", "storeroom", "other"]
    
    # Room statuses
    ROOM_STATUSES = ["available", "occupied", "under_maintenance", "reserved"]
    
    # Class promotion mapping
    PROMOTION_MAP = {
        "nursery": {
            "Baby": "Middle",
            "Middle": "Top",
            "Top": "P1"  # Promote to primary
        },
        "primary": {
            "P1": "P2",
            "P2": "P3",
            "P3": "P4",
            "P4": "P5",
            "P5": "P6",
            "P6": "P7",
            "P7": "P8",
            "P8": None  # Graduation
        }
    }
    
    @staticmethod
    def get_class_schema() -> Dict[str, Any]:
        """Return class schema"""
        return {
            "class_name": "String - Class name (Baby, Middle, Top, P1-P8)",
            "class_level": "String - nursery or primary",
            "class_teacher_id": "ObjectId (optional) - Assigned class teacher",
            "classroom_id": "ObjectId (optional) - Assigned classroom",
            "academic_year": "String - Academic year",
            "max_capacity": "Integer - Maximum students allowed",
            "current_enrollment": "Integer - Current student count",
            "status": "String - active, inactive, archived, merged",
            "schedule": "Object - Class timetable/schedule",
            "section": "String (optional) - Section identifier (A, B, etc.)",
            "stream": "String (optional) - Stream (if multiple classes same level)",
            "graduation_year": "Integer (optional) - Expected graduation year",
            "created_at": "DateTime",
            "updated_at": "DateTime",
            "created_by": "ObjectId - Creator"
        }
    
    @staticmethod
    def get_classroom_schema() -> Dict[str, Any]:
        """Return classroom schema"""
        return {
            "room_number": "String - Room identifier",
            "room_name": "String - Room name/description",
            "room_type": "String - Type of room",
            "building": "String - Building name",
            "floor": "Integer - Floor number",
            "capacity": "Integer - Maximum capacity",
            "current_class_id": "ObjectId (optional) - Currently assigned class",
            "status": "String - available, occupied, under_maintenance, reserved",
            "facilities": "Array - Available facilities",
            "dimensions": "Object - Room dimensions",
            "notes": "String - Additional notes",
            "created_at": "DateTime",
            "updated_at": "DateTime"
        }
    
    @staticmethod
    async def create_indexes(db: AsyncIOMotorDatabase):
        """Create all class-related indexes"""
        try:
            # Classes indexes
            await db.classes.create_index(
                [("class_name", 1), ("academic_year", 1), ("section", 1)],
                unique=True,
                sparse=True,
                name="idx_class_name_year_section"
            )
            await db.classes.create_index("class_level", name="idx_class_level")
            await db.classes.create_index("class_teacher_id", name="idx_class_teacher")
            await db.classes.create_index("classroom_id", name="idx_class_classroom")
            await db.classes.create_index("academic_year", name="idx_class_year")
            await db.classes.create_index("status", name="idx_class_status")
            await db.classes.create_index(
                [("class_level", 1), ("status", 1)],
                name="idx_class_level_status"
            )
            
            # Class Levels indexes
            await db.class_levels.create_index(
                [("level_name", 1), ("academic_year", 1)],
                unique=True,
                name="idx_level_name_year"
            )
            
            # Classrooms indexes
            await db.classrooms.create_index(
                "room_number", 
                unique=True,
                name="idx_room_number"
            )
            await db.classrooms.create_index("room_type", name="idx_room_type")
            await db.classrooms.create_index("status", name="idx_room_status")
            await db.classrooms.create_index(
                "current_class_id", 
                name="idx_room_class",
                sparse=True
            )
            await db.classrooms.create_index(
                [("building", 1), ("floor", 1)],
                name="idx_room_location"
            )
            
            logger.info("Class collection indexes created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create class indexes: {e}")
            raise

    # =========================================================================
    # CLASS LEVEL MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def initialize_class_levels(
        db: AsyncIOMotorDatabase,
        academic_year: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Initialize default class levels for an academic year
        
        Args:
            db: Database connection
            academic_year: Academic year
            
        Returns:
            Tuple of (success, message)
        """
        
        if not academic_year:
            academic_year = ClassModel._get_current_academic_year()
        
        # Nursery levels
        nursery_levels = [
            {
                "level_name": "Nursery",
                "level_code": "NUR",
                "class_names": ClassModel.NURSERY_CLASSES,
                "age_range": {"min": 3, "max": 5},
                "duration_years": 3,
                "next_level": "Primary",
                "academic_year": academic_year,
                "status": "active",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Primary levels
        primary_levels = [
            {
                "level_name": "Primary",
                "level_code": "PRI",
                "class_names": ClassModel.PRIMARY_CLASSES,
                "age_range": {"min": 6, "max": 14},
                "duration_years": 8,
                "next_level": None,
                "academic_year": academic_year,
                "status": "active",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        all_levels = nursery_levels + primary_levels
        
        try:
            for level in all_levels:
                await db.class_levels.update_one(
                    {
                        "level_name": level["level_name"],
                        "academic_year": academic_year
                    },
                    {"$set": level},
                    upsert=True
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
        db: AsyncIOMotorDatabase,
        class_name: str,
        class_level: str,
        academic_year: str,
        class_teacher_id: Optional[str] = None,
        classroom_id: Optional[str] = None,
        max_capacity: int = 25,
        section: Optional[str] = None,
        stream: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create a new class
        
        Args:
            db: Database connection
            class_name: Class name (Baby, Middle, Top, P1-P8)
            class_level: Class level (nursery/primary)
            academic_year: Academic year
            class_teacher_id: Assigned class teacher
            classroom_id: Assigned classroom
            max_capacity: Maximum students
            section: Section identifier
            stream: Stream name
            created_by: User creating the class
            
        Returns:
            Tuple of (success, message, class_document)
        """
        
        # Validate class level
        if class_level not in ClassModel.CLASS_LEVELS_LIST:
            return False, f"Invalid class level. Must be: {', '.join(ClassModel.CLASS_LEVELS_LIST)}", None
        
        # Validate class name based on level
        valid_names = ClassModel.NURSERY_CLASSES if class_level == "nursery" else ClassModel.PRIMARY_CLASSES
        
        if class_name not in valid_names:
            return False, f"Invalid class name for {class_level}. Must be: {', '.join(valid_names)}", None
        
        # Validate academic year
        if not ClassModel._validate_academic_year(academic_year):
            return False, "Invalid academic year format. Use YYYY/YYYY", None
        
        # Validate capacity
        if max_capacity < 1:
            return False, "Maximum capacity must be at least 1", None
        
        if max_capacity > 100:
            return False, "Maximum capacity cannot exceed 100", None
        
        # Validate teacher if provided
        if class_teacher_id:
            teacher = await db.teachers.find_one({
                "_id": ObjectId(class_teacher_id),
                "status": "active"
            })
            if not teacher:
                return False, "Teacher not found or inactive", None
            
            # Check if teacher is already class teacher for another class
            existing = await db.classes.find_one({
                "class_teacher_id": ObjectId(class_teacher_id),
                "academic_year": academic_year,
                "status": "active",
                "_id": {"$ne": ObjectId(class_teacher_id)}
            })
            if existing:
                return False, f"Teacher is already assigned as class teacher for {existing['class_name']}", None
        
        # Validate classroom if provided
        if classroom_id:
            classroom = await db.classrooms.find_one({
                "_id": ObjectId(classroom_id),
                "status": {"$in": ["available", "reserved"]}
            })
            if not classroom:
                return False, "Classroom not found or not available", None
            
            if classroom["capacity"] < max_capacity:
                return False, f"Classroom capacity ({classroom['capacity']}) is less than class capacity ({max_capacity})", None
        
        # Build class document
        class_doc = {
            "class_name": class_name,
            "class_level": class_level,
            "class_teacher_id": ObjectId(class_teacher_id) if class_teacher_id else None,
            "classroom_id": ObjectId(classroom_id) if classroom_id else None,
            "academic_year": academic_year,
            "max_capacity": max_capacity,
            "current_enrollment": 0,
            "status": "active",
            "section": section,
            "stream": stream,
            "schedule": {
                "monday": [],
                "tuesday": [],
                "wednesday": [],
                "thursday": [],
                "friday": []
            },
            "graduation_year": ClassModel._calculate_graduation_year(class_name, academic_year),
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            # Check for duplicate class
            existing_filter = {
                "class_name": class_name,
                "class_level": class_level,
                "academic_year": academic_year,
                "status": "active"
            }
            if section:
                existing_filter["section"] = section
            
            existing = await db.classes.find_one(existing_filter)
            if existing:
                return False, f"Class {class_name} already exists for {academic_year}", None
            
            result = await db.classes.insert_one(class_doc)
            class_doc["_id"] = str(result.inserted_id)
            if class_doc.get("class_teacher_id"):
                class_doc["class_teacher_id"] = str(class_doc["class_teacher_id"])
            if class_doc.get("classroom_id"):
                class_doc["classroom_id"] = str(class_doc["classroom_id"])
            
            # Update classroom status if assigned
            if classroom_id:
                await db.classrooms.update_one(
                    {"_id": ObjectId(classroom_id)},
                    {
                        "$set": {
                            "status": "occupied",
                            "current_class_id": result.inserted_id,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            
            # Update teacher's class teacher assignment
            if class_teacher_id:
                await db.teachers.update_one(
                    {"_id": ObjectId(class_teacher_id)},
                    {
                        "$set": {
                            "class_teacher_of": result.inserted_id,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            
            logger.info(f"Class created: {class_name} ({class_level}) for {academic_year}")
            
            # Log audit
            await ClassModel._log_audit(
                db, "classes", str(result.inserted_id), "INSERT",
                created_by, {"class_name": class_name, "academic_year": academic_year}
            )
            
            return True, f"Class {class_name} created successfully", class_doc
            
        except DuplicateKeyError:
            return False, f"Class {class_name} already exists for {academic_year}", None
        except Exception as e:
            logger.error(f"Failed to create class: {e}")
            return False, f"Failed to create class: {str(e)}", None
    
    @staticmethod
    async def create_classes_for_year(
        db: AsyncIOMotorDatabase,
        academic_year: str,
        created_by: Optional[str] = None
    ) -> Tuple[int, int, List[str]]:
        """
        Create all default classes for an academic year
        
        Args:
            db: Database connection
            academic_year: Academic year
            created_by: User creating the classes
            
        Returns:
            Tuple of (created_count, failed_count, errors)
        """
        
        created = 0
        failed = 0
        errors = []
        
        # Initialize class levels
        await ClassModel.initialize_class_levels(db, academic_year)
        
        # Create nursery classes
        for class_name in ClassModel.NURSERY_CLASSES:
            success, message, _ = await ClassModel.create_class(
                db=db,
                class_name=class_name,
                class_level="nursery",
                academic_year=academic_year,
                max_capacity=20,  # Smaller classes for nursery
                created_by=created_by
            )
            
            if success:
                created += 1
            else:
                failed += 1
                errors.append(f"Nursery {class_name}: {message}")
        
        # Create primary classes
        for class_name in ClassModel.PRIMARY_CLASSES:
            success, message, _ = await ClassModel.create_class(
                db=db,
                class_name=class_name,
                class_level="primary",
                academic_year=academic_year,
                max_capacity=25,
                created_by=created_by
            )
            
            if success:
                created += 1
            else:
                failed += 1
                errors.append(f"Primary {class_name}: {message}")
        
        return created, failed, errors
    
    @staticmethod
    async def update_class(
        db: AsyncIOMotorDatabase,
        class_id: str,
        update_data: Dict[str, Any],
        updated_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Update class information
        
        Args:
            db: Database connection
            class_id: Class ID
            update_data: Fields to update
            updated_by: User making the update
            
        Returns:
            Tuple of (success, message, updated_class)
        """
        
        # Remove protected fields
        protected = ["_id", "created_at", "created_by", "current_enrollment", "academic_year"]
        update_data = {k: v for k, v in update_data.items() if k not in protected}
        
        if not update_data:
            return False, "No valid fields to update", None
        
        # Handle teacher change
        if "class_teacher_id" in update_data:
            new_teacher_id = update_data["class_teacher_id"]
            
            if new_teacher_id:
                teacher = await db.teachers.find_one({
                    "_id": ObjectId(new_teacher_id),
                    "status": "active"
                })
                if not teacher:
                    return False, "Teacher not found or inactive", None
            
            # Get current class info
            current_class = await db.classes.find_one({"_id": ObjectId(class_id)})
            if current_class and current_class.get("class_teacher_id"):
                # Remove class teacher assignment from old teacher
                await db.teachers.update_one(
                    {"_id": current_class["class_teacher_id"]},
                    {"$set": {"class_teacher_of": None, "updated_at": datetime.utcnow()}}
                )
            
            # Set class teacher for new teacher
            if new_teacher_id:
                await db.teachers.update_one(
                    {"_id": ObjectId(new_teacher_id)},
                    {
                        "$set": {
                            "class_teacher_of": ObjectId(class_id),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
        
        # Handle classroom change
        if "classroom_id" in update_data:
            new_classroom_id = update_data["classroom_id"]
            current_class = await db.classes.find_one({"_id": ObjectId(class_id)})
            
            if new_classroom_id:
                classroom = await db.classrooms.find_one({
                    "_id": ObjectId(new_classroom_id),
                    "status": {"$in": ["available", "reserved"]}
                })
                if not classroom:
                    return False, "Classroom not found or not available", None
            
            # Free up old classroom
            if current_class and current_class.get("classroom_id"):
                await db.classrooms.update_one(
                    {"_id": current_class["classroom_id"]},
                    {
                        "$set": {
                            "status": "available",
                            "current_class_id": None,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            
            # Assign new classroom
            if new_classroom_id:
                await db.classrooms.update_one(
                    {"_id": ObjectId(new_classroom_id)},
                    {
                        "$set": {
                            "status": "occupied",
                            "current_class_id": ObjectId(class_id),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
        
        # Handle schedule update
        if "schedule" in update_data and isinstance(update_data["schedule"], dict):
            current_class = await db.classes.find_one({"_id": ObjectId(class_id)})
            if current_class:
                current_schedule = current_class.get("schedule", {})
                current_schedule.update(update_data["schedule"])
                update_data["schedule"] = current_schedule
        
        update_data["updated_at"] = datetime.utcnow()
        
        try:
            result = await db.classes.find_one_and_update(
                {"_id": ObjectId(class_id)},
                {"$set": update_data},
                return_document=ReturnDocument.AFTER
            )
            
            if not result:
                return False, "Class not found", None
            
            result["_id"] = str(result["_id"])
            if result.get("class_teacher_id"):
                result["class_teacher_id"] = str(result["class_teacher_id"])
            if result.get("classroom_id"):
                result["classroom_id"] = str(result["classroom_id"])
            if result.get("created_by"):
                result["created_by"] = str(result["created_by"])
            
            return True, "Class updated successfully", result
            
        except Exception as e:
            logger.error(f"Failed to update class: {e}")
            return False, f"Failed to update class: {str(e)}", None
    
    @staticmethod
    async def get_class(
        db: AsyncIOMotorDatabase,
        class_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get class by ID with populated references
        
        Args:
            db: Database connection
            class_id: Class ID
            
        Returns:
            Class document with teacher and classroom info
        """
        
        pipeline = [
            {"$match": {"_id": ObjectId(class_id)}},
            {
                "$lookup": {
                    "from": "teachers",
                    "localField": "class_teacher_id",
                    "foreignField": "_id",
                    "as": "teacher_info"
                }
            },
            {"$unwind": {"path": "$teacher_info", "preserveNullAndEmptyArrays": True}},
            {
                "$lookup": {
                    "from": "classrooms",
                    "localField": "classroom_id",
                    "foreignField": "_id",
                    "as": "classroom_info"
                }
            },
            {"$unwind": {"path": "$classroom_info", "preserveNullAndEmptyArrays": True}},
            {
                "$addFields": {
                    "teacher_name": {
                        "$concat": [
                            {"$ifNull": ["$teacher_info.first_name", ""]},
                            " ",
                            {"$ifNull": ["$teacher_info.last_name", ""]}
                        ]
                    },
                    "classroom_number": "$classroom_info.room_number",
                    "classroom_name": "$classroom_info.room_name"
                }
            },
            {
                "$project": {
                    "teacher_info": 0,
                    "classroom_info": 0
                }
            }
        ]
        
        results = await db.classes.aggregate(pipeline).to_list(length=1)
        
        if not results:
            return None
        
        class_doc = results[0]
        class_doc["_id"] = str(class_doc["_id"])
        if class_doc.get("class_teacher_id"):
            class_doc["class_teacher_id"] = str(class_doc["class_teacher_id"])
        if class_doc.get("classroom_id"):
            class_doc["classroom_id"] = str(class_doc["classroom_id"])
        if class_doc.get("created_by"):
            class_doc["created_by"] = str(class_doc["created_by"])
        
        # Calculate occupancy rate
        if class_doc.get("max_capacity") and class_doc["max_capacity"] > 0:
            class_doc["occupancy_rate"] = round(
                (class_doc["current_enrollment"] / class_doc["max_capacity"] * 100), 2
            )
            class_doc["available_spots"] = class_doc["max_capacity"] - class_doc["current_enrollment"]
        
        return class_doc
    
    @staticmethod
    async def get_classes(
        db: AsyncIOMotorDatabase,
        class_level: Optional[str] = None,
        academic_year: Optional[str] = None,
        status: str = "active",
        search: Optional[str] = None,
        teacher_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
        sort_by: str = "class_name",
        sort_order: int = 1
    ) -> Dict[str, Any]:
        """
        Get classes with filtering and pagination
        
        Args:
            db: Database connection
            class_level: Filter by class level
            academic_year: Filter by academic year
            status: Filter by status
            search: Search by class name
            teacher_id: Filter by class teacher
            limit: Page size
            skip: Offset
            sort_by: Sort field
            sort_order: Sort direction
            
        Returns:
            Dictionary with classes list and pagination
        """
        
        # Build filter
        filter_query = {"status": status}
        
        if class_level:
            filter_query["class_level"] = class_level
        if academic_year:
            filter_query["academic_year"] = academic_year
        if teacher_id:
            filter_query["class_teacher_id"] = ObjectId(teacher_id)
        if search:
            filter_query["class_name"] = {"$regex": search, "$options": "i"}
        
        total = await db.classes.count_documents(filter_query)
        
        # Use aggregation to populate teacher info
        pipeline = [
            {"$match": filter_query},
            {"$sort": {sort_by: sort_order}},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "teachers",
                    "localField": "class_teacher_id",
                    "foreignField": "_id",
                    "as": "teacher_info"
                }
            },
            {"$unwind": {"path": "$teacher_info", "preserveNullAndEmptyArrays": True}},
            {
                "$lookup": {
                    "from": "classrooms",
                    "localField": "classroom_id",
                    "foreignField": "_id",
                    "as": "classroom_info"
                }
            },
            {"$unwind": {"path": "$classroom_info", "preserveNullAndEmptyArrays": True}},
            {
                "$addFields": {
                    "teacher_name": {
                        "$concat": [
                            {"$ifNull": ["$teacher_info.first_name", ""]},
                            " ",
                            {"$ifNull": ["$teacher_info.last_name", ""]}
                        ]
                    },
                    "classroom_number": "$classroom_info.room_number"
                }
            },
            {
                "$project": {
                    "teacher_info": 0,
                    "classroom_info": 0
                }
            }
        ]
        
        classes = await db.classes.aggregate(pipeline).to_list(length=limit)
        
        # Format classes
        for class_doc in classes:
            class_doc["_id"] = str(class_doc["_id"])
            if class_doc.get("class_teacher_id"):
                class_doc["class_teacher_id"] = str(class_doc["class_teacher_id"])
            if class_doc.get("classroom_id"):
                class_doc["classroom_id"] = str(class_doc["classroom_id"])
            if class_doc.get("created_by"):
                class_doc["created_by"] = str(class_doc["created_by"])
            
            # Calculate occupancy
            if class_doc.get("max_capacity") and class_doc["max_capacity"] > 0:
                class_doc["occupancy_rate"] = round(
                    (class_doc["current_enrollment"] / class_doc["max_capacity"] * 100), 2
                )
                class_doc["available_spots"] = class_doc["max_capacity"] - class_doc["current_enrollment"]
        
        return {
            "classes": classes,
            "total": total,
            "limit": limit,
            "skip": skip,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    
    @staticmethod
    async def get_class_students(
        db: AsyncIOMotorDatabase,
        class_id: str,
        include_inactive: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all students in a class
        
        Args:
            db: Database connection
            class_id: Class ID
            include_inactive: Include inactive students
            
        Returns:
            List of students in the class
        """
        
        filter_query = {"current_class_id": ObjectId(class_id)}
        
        if not include_inactive:
            filter_query["status"] = "active"
        
        students = await db.students.find(filter_query)\
            .sort([("last_name", 1), ("first_name", 1)])\
            .to_list(length=None)
        
        for student in students:
            student["_id"] = str(student["_id"])
            if student.get("current_class_id"):
                student["current_class_id"] = str(student["current_class_id"])
            # Calculate age
            if student.get("date_of_birth"):
                dob = student["date_of_birth"]
                if isinstance(dob, datetime):
                    dob = dob.date()
                elif isinstance(dob, str):
                    dob = datetime.fromisoformat(dob).date()
                today = date.today()
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                student["age"] = age
        
        return students
    
    @staticmethod
    async def get_next_class(
        db: AsyncIOMotorDatabase,
        current_class_name: str,
        current_class_level: str,
        academic_year: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get the next class for promotion
        
        Args:
            db: Database connection
            current_class_name: Current class name
            current_class_level: Current class level
            academic_year: Target academic year
            
        Returns:
            Next class document or None
        """
        
        if not academic_year:
            academic_year = ClassModel._get_next_academic_year()
        
        # Get promotion mapping
        promotion_map = ClassModel.PROMOTION_MAP.get(current_class_level, {})
        next_class_name = promotion_map.get(current_class_name)
        
        if not next_class_name:
            return None  # Graduation or end of cycle
        
        # Determine next level
        if current_class_name == "Top" and current_class_level == "nursery":
            next_level = "primary"
        else:
            next_level = current_class_level
        
        # Find the next class
        next_class = await db.classes.find_one({
            "class_name": next_class_name,
            "class_level": next_level,
            "academic_year": academic_year,
            "status": "active"
        })
        
        if next_class:
            next_class["_id"] = str(next_class["_id"])
            if next_class.get("class_teacher_id"):
                next_class["class_teacher_id"] = str(next_class["class_teacher_id"])
        
        return next_class
    
    @staticmethod
    async def promote_students(
        db: AsyncIOMotorDatabase,
        from_class_id: str,
        to_class_id: Optional[str] = None,
        student_ids: Optional[List[str]] = None,
        promote_all: bool = False,
        promoted_by: Optional[str] = None
    ) -> Tuple[int, int, List[str]]:
        """
        Promote students from one class to another
        
        Args:
            db: Database connection
            from_class_id: Source class ID
            to_class_id: Target class ID (if None, auto-detect)
            student_ids: Specific student IDs to promote
            promote_all: Promote all students
            promoted_by: User performing promotion
            
        Returns:
            Tuple of (promoted_count, failed_count, errors)
        """
        
        # Get source class
        from_class = await db.classes.find_one({"_id": ObjectId(from_class_id)})
        if not from_class:
            return 0, 1, ["Source class not found"]
        
        # Determine target class if not provided
        if not to_class_id:
            next_class = await ClassModel.get_next_class(
                db,
                from_class["class_name"],
                from_class["class_level"]
            )
            
            if not next_class:
                return 0, len(student_ids) if student_ids else 0, ["No next class available (graduation or end of cycle)"]
            
            to_class_id = next_class["_id"]
        
        # Get target class
        to_class = await db.classes.find_one({"_id": ObjectId(to_class_id)})
        if not to_class:
            return 0, 1, ["Target class not found"]
        
        # Check target class capacity
        available_spots = to_class["max_capacity"] - to_class["current_enrollment"]
        
        # Determine which students to promote
        if student_ids:
            students_to_promote = student_ids
        elif promote_all:
            all_students = await db.students.find({
                "current_class_id": ObjectId(from_class_id),
                "status": "active"
            }).to_list(length=None)
            students_to_promote = [str(s["_id"]) for s in all_students]
        else:
            return 0, 0, ["No students specified for promotion"]
        
        if len(students_to_promote) > available_spots:
            return 0, len(students_to_promote), [
                f"Target class has only {available_spots} spots available, but {len(students_to_promote)} students to promote"
            ]
        
        promoted = 0
        failed = 0
        errors = []
        
        academic_year = ClassModel._get_next_academic_year()
        
        for student_id in students_to_promote:
            try:
                # Update student's class
                result = await db.students.update_one(
                    {"_id": ObjectId(student_id)},
                    {
                        "$set": {
                            "current_class_id": ObjectId(to_class_id),
                            "updated_at": datetime.utcnow()
                        },
                        "$push": {
                            "previous_class_ids": ObjectId(from_class_id),
                            "academic_history": {
                                "from_class_id": ObjectId(from_class_id),
                                "to_class_id": ObjectId(to_class_id),
                                "academic_year": academic_year,
                                "promotion_date": datetime.utcnow(),
                                "promoted_by": ObjectId(promoted_by) if promoted_by else None
                            }
                        }
                    }
                )
                
                if result.modified_count > 0:
                    promoted += 1
                else:
                    failed += 1
                    errors.append(f"Student {student_id}: Not found or already updated")
                    
            except Exception as e:
                failed += 1
                errors.append(f"Student {student_id}: {str(e)}")
        
        # Update enrollment counts
        if promoted > 0:
            await db.classes.update_one(
                {"_id": ObjectId(from_class_id)},
                {"$inc": {"current_enrollment": -promoted}, "$set": {"updated_at": datetime.utcnow()}}
            )
            await db.classes.update_one(
                {"_id": ObjectId(to_class_id)},
                {"$inc": {"current_enrollment": promoted}, "$set": {"updated_at": datetime.utcnow()}}
            )
        
        return promoted, failed, errors

    # =========================================================================
    # CLASSROOM MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def create_classroom(
        db: AsyncIOMotorDatabase,
        room_number: str,
        room_name: Optional[str] = None,
        room_type: str = "classroom",
        building: str = "Main Building",
        floor: int = 1,
        capacity: int = 25,
        facilities: Optional[List[str]] = None,
        dimensions: Optional[Dict[str, float]] = None,
        notes: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create a new classroom
        
        Args:
            db: Database connection
            room_number: Room identifier
            room_name: Room name
            room_type: Type of room
            building: Building name
            floor: Floor number
            capacity: Maximum capacity
            facilities: Available facilities
            dimensions: Room dimensions
            notes: Additional notes
            created_by: User creating the classroom
            
        Returns:
            Tuple of (success, message, classroom_document)
        """
        
        # Validate room type
        if room_type not in ClassModel.ROOM_TYPES:
            return False, f"Invalid room type. Must be: {', '.join(ClassModel.ROOM_TYPES)}", None
        
        # Validate capacity
        if capacity < 1:
            return False, "Capacity must be at least 1", None
        
        classroom = {
            "room_number": room_number.strip().upper(),
            "room_name": room_name or f"Room {room_number}",
            "room_type": room_type,
            "building": building,
            "floor": floor,
            "capacity": capacity,
            "current_class_id": None,
            "status": "available",
            "facilities": facilities or [],
            "dimensions": dimensions or {"length": 0, "width": 0, "area_sqm": 0},
            "notes": notes,
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            result = await db.classrooms.insert_one(classroom)
            classroom["_id"] = str(result.inserted_id)
            
            logger.info(f"Classroom created: {room_number}")
            
            return True, f"Classroom {room_number} created successfully", classroom
            
        except DuplicateKeyError:
            return False, f"Classroom {room_number} already exists", None
        except Exception as e:
            logger.error(f"Failed to create classroom: {e}")
            return False, f"Failed to create classroom: {str(e)}", None
    
    @staticmethod
    async def get_classrooms(
        db: AsyncIOMotorDatabase,
        room_type: Optional[str] = None,
        status: Optional[str] = None,
        building: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get classrooms with filtering
        
        Args:
            db: Database connection
            room_type: Filter by room type
            status: Filter by status
            building: Filter by building
            search: Search by room number or name
            
        Returns:
            List of classrooms
        """
        
        filter_query = {}
        
        if room_type:
            filter_query["room_type"] = room_type
        if status:
            filter_query["status"] = status
        if building:
            filter_query["building"] = building
        if search:
            filter_query["$or"] = [
                {"room_number": {"$regex": search, "$options": "i"}},
                {"room_name": {"$regex": search, "$options": "i"}}
            ]
        
        classrooms = await db.classrooms.find(filter_query)\
            .sort([("building", 1), ("floor", 1), ("room_number", 1)])\
            .to_list(length=None)
        
        for classroom in classrooms:
            classroom["_id"] = str(classroom["_id"])
            if classroom.get("current_class_id"):
                classroom["current_class_id"] = str(classroom["current_class_id"])
            if classroom.get("created_by"):
                classroom["created_by"] = str(classroom["created_by"])
        
        return classrooms
    
    @staticmethod
    async def get_available_classrooms(
        db: AsyncIOMotorDatabase,
        min_capacity: Optional[int] = None,
        room_type: str = "classroom"
    ) -> List[Dict[str, Any]]:
        """
        Get available classrooms for class assignment
        
        Args:
            db: Database connection
            min_capacity: Minimum capacity required
            room_type: Type of room needed
            
        Returns:
            List of available classrooms
        """
        
        filter_query = {
            "room_type": room_type,
            "status": {"$in": ["available", "reserved"]}
        }
        
        if min_capacity:
            filter_query["capacity"] = {"$gte": min_capacity}
        
        classrooms = await db.classrooms.find(filter_query)\
            .sort("capacity", -1)\
            .to_list(length=None)
        
        for classroom in classrooms:
            classroom["_id"] = str(classroom["_id"])
            if classroom.get("current_class_id"):
                classroom["current_class_id"] = str(classroom["current_class_id"])
        
        return classrooms

    # =========================================================================
    # CLASS SCHEDULE MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def update_class_schedule(
        db: AsyncIOMotorDatabase,
        class_id: str,
        schedule: Dict[str, List[Dict[str, str]]],
        updated_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Update class timetable/schedule
        
        Args:
            db: Database connection
            class_id: Class ID
            schedule: Schedule dictionary by day
            updated_by: User updating schedule
            
        Returns:
            Tuple of (success, message, updated_class)
        """
        
        # Validate schedule format
        valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
        
        for day, periods in schedule.items():
            if day.lower() not in valid_days:
                return False, f"Invalid day: {day}. Must be one of: {', '.join(valid_days)}", None
            
            if not isinstance(periods, list):
                return False, f"Schedule for {day} must be a list of periods", None
            
            for period in periods:
                if not period.get("subject") or not period.get("start_time") or not period.get("end_time"):
                    return False, f"Each period must have subject, start_time, and end_time", None
        
        # Normalize day keys
        normalized_schedule = {}
        for day, periods in schedule.items():
            normalized_schedule[day.lower()] = periods
        
        result = await db.classes.find_one_and_update(
            {"_id": ObjectId(class_id)},
            {
                "$set": {
                    "schedule": normalized_schedule,
                    "updated_at": datetime.utcnow()
                }
            },
            return_document=ReturnDocument.AFTER
        )
        
        if not result:
            return False, "Class not found", None
        
        result["_id"] = str(result["_id"])
        if result.get("class_teacher_id"):
            result["class_teacher_id"] = str(result["class_teacher_id"])
        if result.get("classroom_id"):
            result["classroom_id"] = str(result["classroom_id"])
        
        return True, "Schedule updated successfully", result

    # =========================================================================
    # CLASS STATISTICS
    # =========================================================================
    
    @staticmethod
    async def get_class_statistics(
        db: AsyncIOMotorDatabase,
        class_id: str
    ) -> Dict[str, Any]:
        """
        Get comprehensive class statistics
        
        Args:
            db: Database connection
            class_id: Class ID
            
        Returns:
            Dictionary with class statistics
        """
        
        # Get class info
        class_doc = await ClassModel.get_class(db, class_id)
        if not class_doc:
            return {"error": "Class not found"}
        
        # Get student count by gender
        gender_stats = await db.students.aggregate([
            {"$match": {"current_class_id": ObjectId(class_id), "status": "active"}},
            {"$group": {"_id": "$gender", "count": {"$sum": 1}}}
        ]).to_list(length=None)
        
        # Get student count by type
        type_stats = await db.students.aggregate([
            {"$match": {"current_class_id": ObjectId(class_id), "status": "active"}},
            {"$group": {"_id": "$student_type", "count": {"$sum": 1}}}
        ]).to_list(length=None)
        
        # Get attendance rate for current term
        term = ClassModel._get_current_term()
        academic_year = ClassModel._get_current_academic_year()
        
        attendance_pipeline = [
            {
                "$match": {
                    "class_id": ObjectId(class_id),
                    "academic_year": academic_year,
                    "term": term
                }
            },
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        attendance_stats = await db.attendance.aggregate(attendance_pipeline).to_list(length=None)
        
        # Get subject performance
        exams = await db.exams.find({
            "class_id": ObjectId(class_id),
            "academic_year": academic_year,
            "term": term
        }).to_list(length=None)
        
        exam_ids = [e["_id"] for e in exams]
        
        subject_performance = []
        if exam_ids:
            perf_pipeline = [
                {"$match": {"exam_id": {"$in": exam_ids}}},
                {
                    "$lookup": {
                        "from": "exams",
                        "localField": "exam_id",
                        "foreignField": "_id",
                        "as": "exam"
                    }
                },
                {"$unwind": "$exam"},
                {
                    "$group": {
                        "_id": "$exam.subject_name",
                        "average_score": {"$avg": "$percentage"},
                        "pass_rate": {
                            "$avg": {"$cond": ["$is_passed", 100, 0]}
                        }
                    }
                }
            ]
            
            subject_performance = await db.exam_results.aggregate(perf_pipeline).to_list(length=None)
        
        # Calculate attendance rate
        total_attendance = sum(a["count"] for a in attendance_stats)
        present_count = sum(a["count"] for a in attendance_stats if a["_id"] in ["present", "late"])
        attendance_rate = round((present_count / total_attendance * 100), 2) if total_attendance > 0 else 0
        
        return {
            "class": class_doc,
            "demographics": {
                "by_gender": {item["_id"]: item["count"] for item in gender_stats},
                "by_type": {item["_id"]: item["count"] for item in type_stats},
                "total_students": class_doc.get("current_enrollment", 0),
                "occupancy_rate": class_doc.get("occupancy_rate", 0),
                "available_spots": class_doc.get("available_spots", 0)
            },
            "attendance": {
                "rate": attendance_rate,
                "breakdown": {item["_id"]: item["count"] for item in attendance_stats} if attendance_stats else {}
            },
            "academic_performance": {
                "subjects": [
                    {
                        "subject": item["_id"],
                        "average_score": round(item["average_score"], 2),
                        "pass_rate": round(item["pass_rate"], 2)
                    }
                    for item in subject_performance
                ]
            }
        }
    
    @staticmethod
    async def get_all_class_statistics(
        db: AsyncIOMotorDatabase,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get statistics for all classes
        
        Args:
            db: Database connection
            academic_year: Academic year
            
        Returns:
            Dictionary with overall class statistics
        """
        
        if not academic_year:
            academic_year = ClassModel._get_current_academic_year()
        
        pipeline = [
            {"$match": {"status": "active", "academic_year": academic_year}},
            {
                "$group": {
                    "_id": "$class_level",
                    "total_classes": {"$sum": 1},
                    "total_enrollment": {"$sum": "$current_enrollment"},
                    "total_capacity": {"$sum": "$max_capacity"},
                    "classes": {
                        "$push": {
                            "class_name": "$class_name",
                            "enrollment": "$current_enrollment",
                            "capacity": "$max_capacity",
                            "occupancy_rate": {
                                "$round": [
                                    {"$multiply": [
                                        {"$divide": ["$current_enrollment", "$max_capacity"]},
                                        100
                                    ]},
                                    2
                                ]
                            }
                        }
                    }
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        results = await db.classes.aggregate(pipeline).to_list(length=None)
        
        statistics = {
            "academic_year": academic_year,
            "levels": {},
            "overall": {
                "total_classes": 0,
                "total_enrollment": 0,
                "total_capacity": 0,
                "overall_occupancy": 0
            }
        }
        
        for result in results:
            level = result["_id"]
            statistics["levels"][level] = {
                "total_classes": result["total_classes"],
                "total_enrollment": result["total_enrollment"],
                "total_capacity": result["total_capacity"],
                "occupancy_rate": round(
                    (result["total_enrollment"] / result["total_capacity"] * 100), 2
                ) if result["total_capacity"] > 0 else 0,
                "classes": sorted(result["classes"], key=lambda x: x["class_name"])
            }
            
            statistics["overall"]["total_classes"] += result["total_classes"]
            statistics["overall"]["total_enrollment"] += result["total_enrollment"]
            statistics["overall"]["total_capacity"] += result["total_capacity"]
        
        if statistics["overall"]["total_capacity"] > 0:
            statistics["overall"]["overall_occupancy"] = round(
                (statistics["overall"]["total_enrollment"] / 
                 statistics["overall"]["total_capacity"] * 100), 2
            )
        
        return statistics

    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    def _get_current_academic_year() -> str:
        """
        Get current academic year dynamically.
        
        South Sudan Academic Calendar:
        - Academic year runs February to November
        - January belongs to the PREVIOUS academic year
        
        Examples:
            June 2026 → "2026/2027"
            January 2026 → "2025/2026"
            February 2026 → "2026/2027"
            December 2026 → "2026/2027"
        """
        now = datetime.now()
        year = now.year
        month = now.month
        
        # January is still part of the previous academic year
        if month == 1:
            start_year = year - 1
        else:
            start_year = year
        
        return f"{start_year}/{start_year + 1}"
    
    @staticmethod
    def _get_next_academic_year() -> str:
        """
        Get next academic year dynamically.
        
        Examples:
            June 2026 → "2027/2028"
            January 2026 → "2026/2027"
        """
        now = datetime.now()
        year = now.year
        month = now.month
        
        # January is still part of the previous academic year
        if month == 1:
            start_year = year
        else:
            start_year = year + 1
        
        return f"{start_year}/{start_year + 1}"
    
    @staticmethod
    def _get_current_term() -> str:
        """
        Get current academic term dynamically.
        
        South Sudan Academic Calendar:
            Term 1: February - April
            Term 2: May - July  
            Term 3: September - November
            Breaks: August, December, January
        """
        month = datetime.now().month
        
        if 2 <= month <= 4:
            return "Term 1"
        elif 5 <= month <= 7:
            return "Term 2"
        elif 9 <= month <= 11:
            return "Term 3"
        elif month == 8:
            return "Term 2 Break"
        elif month == 12:
            return "Annual Break"
        else:  # January
            return "Annual Break"
    
    @staticmethod
    def _get_current_term_number() -> int:
        """
        Get current term number (1, 2, or 3).
        Returns 0 during breaks.
        """
        month = datetime.now().month
        
        if 2 <= month <= 4:
            return 1
        elif 5 <= month <= 7:
            return 2
        elif 9 <= month <= 11:
            return 3
        else:
            return 0  # Break period
    
    @staticmethod
    def _is_school_in_session() -> bool:
        """
        Check if school is currently in session.
        """
        return ClassModel._get_current_term_number() > 0
    
    @staticmethod
    def _validate_academic_year(year_str: str) -> bool:
        """
        Validate academic year format (YYYY/YYYY).
        
        Examples:
            "2026/2027" → True
            "2026-2027" → False
            "2026" → False
        """
        try:
            parts = year_str.split("/")
            if len(parts) != 2:
                return False
            year1 = int(parts[0])
            year2 = int(parts[1])
            return year2 == year1 + 1 and year1 >= 2020
        except (ValueError, IndexError):
            return False
    
    @staticmethod
    def _calculate_graduation_year(class_name: str, academic_year: str) -> Optional[int]:
        """
        Calculate expected graduation year for a class.
        
        Args:
            class_name: Class name (Baby, P1, P8, etc.)
            academic_year: Academic year string (YYYY/YYYY)
            
        Returns:
            Expected graduation year or None for nursery
        """
        try:
            start_year = int(academic_year.split("/")[0])
            
            if class_name in ClassModel.NURSERY_CLASSES:
                # Nursery classes don't have a specific graduation year
                return None
            
            if class_name in ClassModel.PRIMARY_CLASSES:
                class_number = int(class_name[1:])  # Extract number from P1-P8
                years_remaining = 8 - class_number
                return start_year + years_remaining
            
            return None
        except (ValueError, IndexError):
            return None
    
    @staticmethod
    def _get_academic_year_for_date(target_date: datetime) -> str:
        """
        Get academic year for a specific date.
        
        Args:
            target_date: Date to check
            
        Returns:
            Academic year string (YYYY/YYYY)
        """
        year = target_date.year
        month = target_date.month
        
        if month == 1:
            start_year = year - 1
        else:
            start_year = year
        
        return f"{start_year}/{start_year + 1}"
    
    @staticmethod
    def _get_all_academic_years(from_year: int = 2020) -> List[str]:
        """
        Get list of all academic years from a starting year to current.
        
        Args:
            from_year: Starting year
            
        Returns:
            List of academic year strings
        """
        current_academic_year = ClassModel._get_current_academic_year()
        current_start_year = int(current_academic_year.split("/")[0])
        
        years = []
        for year in range(from_year, current_start_year + 1):
            years.append(f"{year}/{year + 1}")
        
        return years
    
    @staticmethod
    async def _log_audit(
        db: AsyncIOMotorDatabase,
        table_name: str,
        record_id: str,
        operation: str,
        changed_by: Optional[str],
        details: Dict[str, Any]
    ):
        """
        Log class operations to audit log.
        
        Args:
            db: Database connection
            table_name: Name of the table/collection
            record_id: ID of the modified record
            operation: Operation type (INSERT, UPDATE, DELETE)
            changed_by: User who made the change
            details: Details of the change
        """
        try:
            audit_doc = {
                "table_name": table_name,
                "record_id": record_id,
                "operation": operation,
                "changed_by": ObjectId(changed_by) if changed_by else None,
                "new_values": details,
                "changed_at": datetime.utcnow(),
                "academic_year": ClassModel._get_current_academic_year(),
                "term": ClassModel._get_current_term()
            }
            await db.audit_log.insert_one(audit_doc)
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")
