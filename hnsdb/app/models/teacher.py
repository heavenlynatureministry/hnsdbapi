"""
Teacher Model - Staff teacher management
Handles teacher records, qualifications, subject assignments, and class management
"""
from datetime import datetime, date
from typing import Optional, Dict, Any, List, Tuple, Union
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
import logging

logger = logging.getLogger(__name__)


class TeacherModel:
    """
    Teacher model for MongoDB
    Collection: teachers
    
    Supports:
    - Teacher profile management
    - Qualification and specialization tracking
    - Class assignments
    - Subject expertise management
    - Employment history
    - Status tracking
    """
    
    collection_name = "teachers"
    
    # Valid statuses
    VALID_STATUSES = ["active", "inactive", "on_leave", "suspended", "resigned", "retired"]
    
    # Valid qualifications
    VALID_QUALIFICATIONS = [
        "Certificate", "Diploma", "B.Ed", "B.Sc", "B.A", 
        "M.Ed", "M.Sc", "M.A", "PhD", "PGDE", "Other"
    ]
    
    # Status display mapping
    STATUS_DISPLAY = {
        "active": "Active",
        "inactive": "Inactive",
        "on_leave": "On Leave",
        "suspended": "Suspended",
        "resigned": "Resigned",
        "retired": "Retired"
    }
    
    @staticmethod
    def get_schema() -> Dict[str, Any]:
        """Return teacher schema definition"""
        return {
            "user_id": "ObjectId (optional) - Reference to users collection if has login",
            "employee_id": "String - Unique employee ID (e.g., HNS-TCH-001)",
            "first_name": "String - Teacher first name",
            "last_name": "String - Teacher last name",
            "middle_name": "String (optional) - Middle name",
            "gender": "String - Male, Female, or Other",
            "date_of_birth": "Date - Date of birth",
            "nationality": "String - Nationality",
            "qualification": "String - Highest qualification",
            "specialization": "String - Area of specialization",
            "subjects": "Array - Subjects teacher can teach",
            "assigned_classes": "Array - Currently assigned classes",
            "class_teacher_of": "ObjectId (optional) - Class where teacher is class teacher",
            "hire_date": "Date - Date of employment",
            "contract_end_date": "Date (optional) - End of contract",
            "years_of_experience": "Number - Years of teaching experience",
            "status": "String - Current employment status",
            "status_history": "Array - History of status changes",
            "phone_number": "String - Contact phone",
            "email": "String - Professional email",
            "address": "String - Home address",
            "emergency_contact": "Object - Emergency contact info",
            "photo_url": "String (optional) - URL to photo",
            "salary_grade": "String - Salary grade/scale",
            "bank_account": "Object - Bank account details",
            "qualification_documents": "Array - Uploaded qualification documents",
            "performance_reviews": "Array - Performance review history",
            "training_history": "Array - Professional development history",
            "notes": "String (optional) - Additional notes",
            "created_at": "DateTime",
            "updated_at": "DateTime",
            "created_by": "ObjectId - User who created the record"
        }
    
    @staticmethod
    async def create_indexes(db: AsyncIOMotorDatabase):
        """Create indexes for teachers collection"""
        try:
            # Basic indexes
            await db.teachers.create_index(
                [("last_name", 1), ("first_name", 1)],
                name="idx_teacher_name"
            )
            await db.teachers.create_index(
                "employee_id", 
                unique=True, 
                name="idx_employee_id"
            )
            await db.teachers.create_index(
                "email", 
                unique=True, 
                sparse=True,
                name="idx_teacher_email"
            )
            await db.teachers.create_index("status", name="idx_teacher_status")
            await db.teachers.create_index("specialization", name="idx_teacher_specialization")
            await db.teachers.create_index("qualification", name="idx_teacher_qualification")
            await db.teachers.create_index("hire_date", name="idx_hire_date")
            
            # Compound indexes
            await db.teachers.create_index(
                [("status", 1), ("specialization", 1)],
                name="idx_status_specialization"
            )
            
            # Text index for search
            await db.teachers.create_index(
                [
                    ("first_name", "text"),
                    ("last_name", "text"),
                    ("specialization", "text"),
                    ("qualification", "text")
                ],
                name="idx_teacher_search"
            )
            
            logger.info("Teacher collection indexes created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create teacher indexes: {e}")
            raise
    
    @staticmethod
    async def create_teacher(
        db: AsyncIOMotorDatabase,
        first_name: str,
        last_name: str,
        date_of_birth: Union[date, str],
        gender: str,
        qualification: str,
        hire_date: Union[date, str],
        phone_number: str,
        email: str,
        specialization: Optional[str] = None,
        middle_name: Optional[str] = None,
        nationality: Optional[str] = None,
        subjects: Optional[List[str]] = None,
        address: Optional[str] = None,
        emergency_contact: Optional[Dict[str, str]] = None,
        years_of_experience: int = 0,
        salary_grade: Optional[str] = None,
        user_id: Optional[str] = None,
        created_by: Optional[str] = None,
        photo_url: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create a new teacher record
        
        Args:
            db: Database connection
            first_name: Teacher's first name
            last_name: Teacher's last name
            date_of_birth: Date of birth
            gender: Gender (Male/Female/Other)
            qualification: Highest qualification
            hire_date: Employment start date
            phone_number: Contact phone number
            email: Professional email
            specialization: Area of specialization
            middle_name: Middle name (optional)
            nationality: Nationality (optional)
            subjects: List of subjects teacher can teach
            address: Home address (optional)
            emergency_contact: Emergency contact info (optional)
            years_of_experience: Years of teaching experience
            salary_grade: Salary grade/scale
            user_id: Associated user account ID
            created_by: Admin user ID creating the record
            photo_url: URL to teacher photo
            
        Returns:
            Tuple of (success, message, teacher_document)
        """
        
        # Validate required fields
        if not first_name or not last_name:
            return False, "First name and last name are required", None
        
        if not phone_number:
            return False, "Phone number is required", None
        
        if not email:
            return False, "Email is required", None
        
        # Validate gender
        if gender not in ["Male", "Female", "Other"]:
            return False, "Invalid gender", None
        
        # Validate qualification
        if qualification not in TeacherModel.VALID_QUALIFICATIONS:
            return False, f"Invalid qualification. Must be one of: {', '.join(TeacherModel.VALID_QUALIFICATIONS)}", None
        
        # Parse dates
        if isinstance(date_of_birth, str):
            try:
                date_of_birth = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
            except ValueError:
                return False, "Invalid date of birth format. Use YYYY-MM-DD", None
        
        if isinstance(hire_date, str):
            try:
                hire_date = datetime.strptime(hire_date, "%Y-%m-%d").date()
            except ValueError:
                return False, "Invalid hire date format. Use YYYY-MM-DD", None
        
        # Validate age (at least 21 years old)
        age = (date.today() - date_of_birth).days / 365.25
        if age < 21:
            return False, f"Teacher must be at least 21 years old (current age: {age:.1f} years)", None
        
        # Check if email already exists
        existing = await db.teachers.find_one({"email": email.lower().strip()})
        if existing:
            return False, "A teacher with this email already exists", None
        
        # Generate employee ID
        employee_id = await TeacherModel._generate_employee_id(db)
        
        # Build teacher document
        teacher_doc = {
            "employee_id": employee_id,
            "first_name": first_name.strip().title(),
            "last_name": last_name.strip().title(),
            "middle_name": middle_name.strip().title() if middle_name else None,
            "gender": gender,
            "date_of_birth": datetime.combine(date_of_birth, datetime.min.time()),
            "nationality": nationality or "South Sudanese",
            "qualification": qualification,
            "specialization": specialization,
            "subjects": subjects or [],
            "assigned_classes": [],
            "class_teacher_of": None,
            "hire_date": datetime.combine(hire_date, datetime.min.time()),
            "contract_end_date": None,
            "years_of_experience": years_of_experience,
            "status": "active",
            "status_history": [{
                "status": "active",
                "date": datetime.utcnow(),
                "reason": "Initial employment",
                "changed_by": ObjectId(created_by) if created_by else None
            }],
            "phone_number": phone_number,
            "email": email.lower().strip(),
            "address": address,
            "emergency_contact": emergency_contact or {
                "name": None,
                "relationship": None,
                "phone_number": None
            },
            "photo_url": photo_url,
            "salary_grade": salary_grade,
            "bank_account": {
                "bank_name": None,
                "account_number": None,
                "account_name": None
            },
            "qualification_documents": [],
            "performance_reviews": [],
            "training_history": [],
            "notes": None,
            "user_id": ObjectId(user_id) if user_id else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": ObjectId(created_by) if created_by else None
        }
        
        # Remove None values (keep empty arrays)
        teacher_doc = {k: v for k, v in teacher_doc.items() 
                      if v is not None or k in ["middle_name", "specialization", "address", 
                                                   "salary_grade", "photo_url", "notes",
                                                   "class_teacher_of", "contract_end_date"]}
        
        try:
            result = await db.teachers.insert_one(teacher_doc)
            teacher_doc["_id"] = str(result.inserted_id)
            
            logger.info(f"Teacher created: {employee_id} - {first_name} {last_name}")
            
            # Log audit
            await TeacherModel._log_audit(
                db, "teachers", str(result.inserted_id), "INSERT",
                created_by, {"employee_id": employee_id}
            )
            
            return True, f"Teacher registered successfully (ID: {employee_id})", teacher_doc
            
        except Exception as e:
            logger.error(f"Failed to create teacher: {e}")
            return False, f"Failed to create teacher: {str(e)}", None
    
    @staticmethod
    async def update_teacher(
        db: AsyncIOMotorDatabase,
        teacher_id: str,
        update_data: Dict[str, Any],
        updated_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Update teacher information
        
        Args:
            db: Database connection
            teacher_id: Teacher ID to update
            update_data: Dictionary of fields to update
            updated_by: User ID making the update
            
        Returns:
            Tuple of (success, message, updated_teacher)
        """
        
        # Remove protected fields
        protected = ["_id", "employee_id", "created_at", "created_by", 
                    "status_history", "performance_reviews", "training_history"]
        update_data = {k: v for k, v in update_data.items() if k not in protected}
        
        if not update_data:
            return False, "No valid fields to update", None
        
        # Handle status change
        if "status" in update_data:
            if update_data["status"] not in TeacherModel.VALID_STATUSES:
                return False, f"Invalid status", None
            
            status_history_entry = {
                "status": update_data["status"],
                "date": datetime.utcnow(),
                "reason": update_data.pop("status_reason", "Status updated"),
                "changed_by": ObjectId(updated_by) if updated_by else None
            }
            
            await db.teachers.update_one(
                {"_id": ObjectId(teacher_id)},
                {"$push": {"status_history": status_history_entry}}
            )
        
        # Handle date fields
        for date_field in ["date_of_birth", "hire_date", "contract_end_date"]:
            if date_field in update_data and isinstance(update_data[date_field], str):
                try:
                    update_data[date_field] = datetime.strptime(
                        update_data[date_field], "%Y-%m-%d"
                    )
                except ValueError:
                    return False, f"Invalid {date_field} format. Use YYYY-MM-DD", None
        
        # Handle nested objects
        if "bank_account" in update_data:
            current = await db.teachers.find_one({"_id": ObjectId(teacher_id)})
            if current:
                current_bank = current.get("bank_account", {})
                current_bank.update(update_data["bank_account"])
                update_data["bank_account"] = current_bank
        
        update_data["updated_at"] = datetime.utcnow()
        
        try:
            result = await db.teachers.find_one_and_update(
                {"_id": ObjectId(teacher_id)},
                {"$set": update_data},
                return_document=ReturnDocument.AFTER
            )
            
            if not result:
                return False, "Teacher not found", None
            
            result["_id"] = str(result["_id"])
            if result.get("user_id"):
                result["user_id"] = str(result["user_id"])
            if result.get("class_teacher_of"):
                result["class_teacher_of"] = str(result["class_teacher_of"])
            
            # Log audit
            await TeacherModel._log_audit(
                db, "teachers", teacher_id, "UPDATE",
                updated_by, update_data
            )
            
            return True, "Teacher updated successfully", result
            
        except Exception as e:
            logger.error(f"Failed to update teacher: {e}")
            return False, f"Failed to update teacher: {str(e)}", None
    
    @staticmethod
    async def get_teacher(
        db: AsyncIOMotorDatabase,
        teacher_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get teacher by ID with populated references
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            
        Returns:
            Teacher document with populated class info
        """
        try:
            pipeline = [
                {"$match": {"_id": ObjectId(teacher_id)}},
                {
                    "$lookup": {
                        "from": "classes",
                        "localField": "assigned_classes",
                        "foreignField": "_id",
                        "as": "classes_info"
                    }
                },
                {
                    "$lookup": {
                        "from": "classes",
                        "localField": "class_teacher_of",
                        "foreignField": "_id",
                        "as": "class_teacher_info"
                    }
                },
                {
                    "$addFields": {
                        "class_teacher_of_name": {
                            "$arrayElemAt": ["$class_teacher_info.class_name", 0]
                        }
                    }
                },
                {
                    "$project": {
                        "class_teacher_info": 0
                    }
                }
            ]
            
            results = await db.teachers.aggregate(pipeline).to_list(length=1)
            
            if not results:
                return None
            
            teacher = results[0]
            teacher["_id"] = str(teacher["_id"])
            if teacher.get("user_id"):
                teacher["user_id"] = str(teacher["user_id"])
            if teacher.get("class_teacher_of"):
                teacher["class_teacher_of"] = str(teacher["class_teacher_of"])
            
            # Format classes info
            if teacher.get("classes_info"):
                teacher["classes_info"] = [
                    {
                        "class_id": str(c["_id"]),
                        "class_name": c["class_name"],
                        "class_level": c["class_level"]
                    }
                    for c in teacher["classes_info"]
                ]
            
            return teacher
            
        except Exception as e:
            logger.error(f"Failed to get teacher: {e}")
            return None
    
    @staticmethod
    async def get_teachers(
        db: AsyncIOMotorDatabase,
        status: Optional[str] = None,
        specialization: Optional[str] = None,
        qualification: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 20,
        skip: int = 0,
        sort_by: str = "last_name",
        sort_order: int = 1
    ) -> Dict[str, Any]:
        """
        Get teachers with filtering and pagination
        
        Args:
            db: Database connection
            status: Filter by status
            specialization: Filter by specialization
            qualification: Filter by qualification
            search: Search in name, email, or employee ID
            limit: Page size
            skip: Offset
            sort_by: Sort field
            sort_order: Sort direction
            
        Returns:
            Dictionary with teachers list and pagination info
        """
        
        # Build filter
        filter_query = {}
        
        if status:
            filter_query["status"] = status
        if specialization:
            filter_query["specialization"] = specialization
        if qualification:
            filter_query["qualification"] = qualification
        if search:
            filter_query["$or"] = [
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"employee_id": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.teachers.count_documents(filter_query)
        
        teachers = await db.teachers.find(filter_query)\
            .sort(sort_by, sort_order)\
            .skip(skip)\
            .limit(limit)\
            .to_list(length=limit)
        
        # Format teachers
        for teacher in teachers:
            teacher["_id"] = str(teacher["_id"])
            if teacher.get("user_id"):
                teacher["user_id"] = str(teacher["user_id"])
            if teacher.get("class_teacher_of"):
                teacher["class_teacher_of"] = str(teacher["class_teacher_of"])
            # Remove sensitive data from list view
            teacher.pop("bank_account", None)
            teacher.pop("performance_reviews", None)
        
        return {
            "teachers": teachers,
            "total": total,
            "limit": limit,
            "skip": skip,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    
    @staticmethod
    async def assign_subjects(
        db: AsyncIOMotorDatabase,
        teacher_id: str,
        subjects: List[str],
        assigned_by: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Assign subjects to a teacher
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            subjects: List of subject names
            assigned_by: User ID making the assignment
            
        Returns:
            Tuple of (success, message)
        """
        
        result = await db.teachers.update_one(
            {"_id": ObjectId(teacher_id)},
            {
                "$set": {
                    "subjects": subjects,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            return False, "Teacher not found"
        
        # Log audit
        await TeacherModel._log_audit(
            db, "teachers", teacher_id, "ASSIGN_SUBJECTS",
            assigned_by, {"subjects": subjects}
        )
        
        return True, "Subjects assigned successfully"
    
    @staticmethod
    async def add_training_record(
        db: AsyncIOMotorDatabase,
        teacher_id: str,
        training_name: str,
        provider: str,
        start_date: Union[date, str],
        end_date: Optional[Union[date, str]] = None,
        certificate_url: Optional[str] = None,
        description: Optional[str] = None,
        added_by: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Add professional development training record
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            training_name: Name of training
            provider: Training provider
            start_date: Training start date
            end_date: Training end date (optional)
            certificate_url: URL to certificate (optional)
            description: Training description (optional)
            added_by: User ID adding the record
            
        Returns:
            Tuple of (success, message)
        """
        
        # Parse dates
        if isinstance(start_date, str):
            try:
                start_date = datetime.strptime(start_date, "%Y-%m-%d")
            except ValueError:
                return False, "Invalid start date format"
        
        if end_date and isinstance(end_date, str):
            try:
                end_date = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                return False, "Invalid end date format"
        
        training_record = {
            "training_id": str(ObjectId()),
            "training_name": training_name,
            "provider": provider,
            "start_date": start_date,
            "end_date": end_date,
            "certificate_url": certificate_url,
            "description": description,
            "added_by": ObjectId(added_by) if added_by else None,
            "added_at": datetime.utcnow()
        }
        
        result = await db.teachers.update_one(
            {"_id": ObjectId(teacher_id)},
            {
                "$push": {"training_history": training_record},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count == 0:
            return False, "Teacher not found"
        
        return True, "Training record added successfully"
    
    @staticmethod
    async def add_performance_review(
        db: AsyncIOMotorDatabase,
        teacher_id: str,
        review_date: Union[date, str],
        reviewer: str,
        rating: float,
        strengths: List[str],
        areas_for_improvement: List[str],
        overall_comments: str,
        next_review_date: Optional[Union[date, str]] = None,
        reviewed_by: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Add performance review record
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            review_date: Date of review
            reviewer: Name of reviewer
            rating: Performance rating (1-5)
            strengths: List of strengths
            areas_for_improvement: Areas to improve
            overall_comments: Overall assessment
            next_review_date: Next review date
            reviewed_by: User ID performing review
            
        Returns:
            Tuple of (success, message)
        """
        
        # Validate rating
        if not 1 <= rating <= 5:
            return False, "Rating must be between 1 and 5"
        
        # Parse dates
        if isinstance(review_date, str):
            try:
                review_date = datetime.strptime(review_date, "%Y-%m-%d")
            except ValueError:
                return False, "Invalid review date format"
        
        if next_review_date and isinstance(next_review_date, str):
            try:
                next_review_date = datetime.strptime(next_review_date, "%Y-%m-%d")
            except ValueError:
                return False, "Invalid next review date format"
        
        review_record = {
            "review_id": str(ObjectId()),
            "review_date": review_date,
            "reviewer": reviewer,
            "rating": rating,
            "strengths": strengths,
            "areas_for_improvement": areas_for_improvement,
            "overall_comments": overall_comments,
            "next_review_date": next_review_date,
            "reviewed_by": ObjectId(reviewed_by) if reviewed_by else None,
            "created_at": datetime.utcnow()
        }
        
        result = await db.teachers.update_one(
            {"_id": ObjectId(teacher_id)},
            {
                "$push": {"performance_reviews": review_record},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count == 0:
            return False, "Teacher not found"
        
        return True, "Performance review added successfully"
    
    @staticmethod
    async def get_teacher_statistics(
        db: AsyncIOMotorDatabase
    ) -> Dict[str, Any]:
        """
        Get teacher statistics
        
        Returns:
            Dictionary with teacher statistics
        """
        
        pipeline = [
            {
                "$facet": {
                    "total": [{"$match": {"status": "active"}}, {"$count": "count"}],
                    "by_status": [
                        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
                    ],
                    "by_qualification": [
                        {"$match": {"status": "active"}},
                        {"$group": {"_id": "$qualification", "count": {"$sum": 1}}}
                    ],
                    "by_specialization": [
                        {"$match": {"status": "active"}},
                        {"$group": {"_id": "$specialization", "count": {"$sum": 1}}}
                    ],
                    "average_experience": [
                        {"$match": {"status": "active"}},
                        {
                            "$group": {
                                "_id": None,
                                "avg_experience": {"$avg": "$years_of_experience"},
                                "total_teachers": {"$sum": 1}
                            }
                        }
                    ]
                }
            }
        ]
        
        results = await db.teachers.aggregate(pipeline).to_list(length=1)
        
        if not results:
            return {"total_teachers": 0}
        
        stats = results[0]
        
        return {
            "total_active_teachers": stats["total"][0]["count"] if stats["total"] else 0,
            "by_status": {
                item["_id"]: item["count"] 
                for item in stats["by_status"]
            },
            "by_qualification": {
                item["_id"]: item["count"] 
                for item in stats["by_qualification"]
            },
            "by_specialization": {
                item["_id"] if item["_id"] else "Unspecified": item["count"] 
                for item in stats["by_specialization"]
            },
            "average_experience": round(
                stats["average_experience"][0]["avg_experience"], 1
            ) if stats["average_experience"] else 0
        }
    
    @staticmethod
    async def _generate_employee_id(db: AsyncIOMotorDatabase) -> str:
        """Generate unique employee ID"""
        # Find the last employee ID
        last_teacher = await db.teachers.find_one(
            sort=[("employee_id", -1)]
        )
        
        if last_teacher and last_teacher.get("employee_id"):
            last_number = int(last_teacher["employee_id"].split("-")[-1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"HNS-TCH-{new_number:03d}"
    
    @staticmethod
    async def _log_audit(
        db: AsyncIOMotorDatabase,
        table_name: str,
        record_id: str,
        operation: str,
        changed_by: Optional[str],
        details: Dict[str, Any]
    ):
        """Log teacher operations to audit log"""
        try:
            await db.audit_log.insert_one({
                "table_name": table_name,
                "record_id": record_id,
                "operation": operation,
                "changed_by": ObjectId(changed_by) if changed_by else None,
                "new_values": details,
                "changed_at": datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")