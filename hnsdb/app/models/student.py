"""
Student Model - Core student management
Handles student records, enrollment, status tracking, and guardian relationships
"""
from datetime import datetime, date
from typing import Optional, Dict, Any, List, Tuple, Union
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
import logging

logger = logging.getLogger(__name__)


class StudentModel:
    """
    Student model for MongoDB
    Collection: students
    
    Supports:
    - Student enrollment and management
    - Multiple student types (street, abundant, orphan, other)
    - Guardian management
    - Class assignment and promotion
    - Status tracking (active, inactive, graduated, transferred, suspended)
    - Profile photo management
    - Academic history
    """
    
    collection_name = "students"
    VALID_STUDENT_TYPES = ["street", "abundant", "orphan", "other"]
    VALID_GENDERS = ["Male", "Female", "Other"]
    VALID_STATUSES = ["active", "inactive", "graduated", "transferred", "suspended"]
    
    STUDENT_TYPE_DISPLAY = {
        "street": "Street Child", "abundant": "Abundant Family",
        "orphan": "Orphan", "other": "Other"
    }
    
    @staticmethod
    def get_schema() -> Dict[str, Any]:
        return {
            "first_name": "String", "last_name": "String", "middle_name": "String",
            "gender": "String", "date_of_birth": "Date", "place_of_birth": "String",
            "nationality": "String", "student_type": "String", "enrollment_date": "Date",
            "student_id_number": "String", "current_class_id": "ObjectId",
            "previous_class_ids": "Array", "status": "String", "status_history": "Array",
            "photo_url": "String", "medical_notes": "String", "special_needs": "String",
            "emergency_contact": "Object", "address": "String", "guardians": "Array",
            "academic_history": "Array", "documents": "Array",
            "created_at": "DateTime", "updated_at": "DateTime", "created_by": "ObjectId"
        }
    
    @staticmethod
    async def create_indexes(db: AsyncIOMotorDatabase):
        try:
            await db.students.create_index([("last_name", 1), ("first_name", 1)], name="idx_student_name")
            await db.students.create_index("student_id_number", unique=True, sparse=True, name="idx_student_number")
            await db.students.create_index("student_type", name="idx_student_type")
            await db.students.create_index("status", name="idx_student_status")
            await db.students.create_index("current_class_id", name="idx_student_class")
            await db.students.create_index("enrollment_date", name="idx_enrollment_date")
            await db.students.create_index("gender", name="idx_student_gender")
            await db.students.create_index([("status", 1), ("current_class_id", 1)], name="idx_status_class")
            await db.students.create_index([("student_type", 1), ("status", 1)], name="idx_type_status")
            await db.students.create_index([("first_name", "text"), ("last_name", "text"), ("student_id_number", "text")], name="idx_student_search")
            await db.students.create_index("guardians.phone_number", name="idx_guardian_phone")
            await db.students.create_index("guardians.email", name="idx_guardian_email", sparse=True)
            logger.info("Student collection indexes created successfully")
        except Exception as e:
            logger.error(f"Failed to create student indexes: {e}")
            raise
    
    @staticmethod
    async def create_student(
        db: AsyncIOMotorDatabase, first_name: str, last_name: str,
        date_of_birth: Union[date, str], gender: str, student_type: str,
        current_class_id: Optional[str] = None, middle_name: Optional[str] = None,
        place_of_birth: Optional[str] = None, nationality: Optional[str] = None,
        enrollment_date: Optional[Union[date, str]] = None, medical_notes: Optional[str] = None,
        special_needs: Optional[str] = None, address: Optional[str] = None,
        emergency_contact: Optional[Dict[str, str]] = None, created_by: Optional[str] = None,
        photo_url: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        if not first_name or not last_name: return False, "First name and last name are required", None
        if gender not in StudentModel.VALID_GENDERS: return False, f"Invalid gender", None
        if student_type not in StudentModel.VALID_STUDENT_TYPES: return False, f"Invalid student type", None
        if isinstance(date_of_birth, str):
            try: date_of_birth = datetime.strptime(date_of_birth, "%Y-%m-%d").date()
            except ValueError: return False, "Invalid date of birth format", None
        if enrollment_date and isinstance(enrollment_date, str):
            try: enrollment_date = datetime.strptime(enrollment_date, "%Y-%m-%d").date()
            except ValueError: return False, "Invalid enrollment date format", None
        age = (date.today() - date_of_birth).days / 365.25
        if age < 3: return False, f"Student must be at least 3 years old (current age: {age:.1f})", None
        if current_class_id:
            class_doc = await db.classes.find_one({"_id": ObjectId(current_class_id)})
            if not class_doc: return False, "Specified class not found", None
            if class_doc.get("current_enrollment", 0) >= class_doc.get("max_capacity", 0): return False, "Class is at maximum capacity", None
        if not enrollment_date: enrollment_date = date.today()
        student_id_number = await StudentModel._generate_student_id(db)
        student_doc = {"student_id_number": student_id_number, "first_name": first_name.strip().title(), "last_name": last_name.strip().title(), "middle_name": middle_name.strip().title() if middle_name else None, "gender": gender, "date_of_birth": datetime.combine(date_of_birth, datetime.min.time()), "place_of_birth": place_of_birth, "nationality": nationality or "South Sudanese", "student_type": student_type, "enrollment_date": datetime.combine(enrollment_date, datetime.min.time()), "current_class_id": ObjectId(current_class_id) if current_class_id else None, "previous_class_ids": [], "status": "active", "status_history": [{"status": "active", "date": datetime.utcnow(), "reason": "Initial enrollment"}], "photo_url": photo_url, "medical_notes": medical_notes, "special_needs": special_needs, "address": address, "emergency_contact": emergency_contact or {"name": None, "relationship": None, "phone_number": None}, "guardians": [], "academic_history": [], "documents": [], "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(), "created_by": ObjectId(created_by) if created_by else None}
        student_doc = {k: v for k, v in student_doc.items() if v is not None or k in ["current_class_id", "photo_url", "middle_name", "place_of_birth", "address", "medical_notes", "special_needs"]}
        try:
            result = await db.students.insert_one(student_doc)
            student_doc["_id"] = str(result.inserted_id)
            student_doc["current_class_id"] = str(student_doc["current_class_id"]) if student_doc.get("current_class_id") else None
            if current_class_id: await db.classes.update_one({"_id": ObjectId(current_class_id)}, {"$inc": {"current_enrollment": 1}})
            logger.info(f"Student created: {student_id_number} - {first_name} {last_name}")
            await StudentModel._log_audit(db, "students", str(result.inserted_id), "INSERT", created_by, {"student_id_number": student_id_number})
            return True, f"Student enrolled successfully (ID: {student_id_number})", student_doc
        except Exception as e:
            logger.error(f"Failed to create student: {e}")
            return False, f"Failed to create student: {str(e)}", None
    
    @staticmethod
    async def update_student(
        db: AsyncIOMotorDatabase, student_id: str, update_data: Dict[str, Any],
        updated_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        protected_fields = ["_id", "student_id_number", "created_at", "created_by", "academic_history"]
        update_data = {k: v for k, v in update_data.items() if k not in protected_fields}
        if not update_data: return False, "No valid fields to update", None
        if "gender" in update_data and update_data["gender"] not in StudentModel.VALID_GENDERS: return False, "Invalid gender", None
        if "student_type" in update_data and update_data["student_type"] not in StudentModel.VALID_STUDENT_TYPES: return False, "Invalid student type", None
        if "status" in update_data and update_data["status"] not in StudentModel.VALID_STATUSES: return False, "Invalid status", None
        if "status" in update_data:
            old_student = await db.students.find_one({"_id": ObjectId(student_id)})
            if old_student:
                status_history_entry = {"status": update_data["status"], "date": datetime.utcnow(), "reason": update_data.get("status_reason", "Status updated"), "changed_by": ObjectId(updated_by) if updated_by else None}
                await db.students.update_one({"_id": ObjectId(student_id)}, {"$push": {"status_history": status_history_entry}})
                if update_data["status"] == "transferred" and old_student.get("current_class_id"):
                    await db.classes.update_one({"_id": old_student["current_class_id"]}, {"$inc": {"current_enrollment": -1}})
        if "current_class_id" in update_data:
            old_student = await db.students.find_one({"_id": ObjectId(student_id)})
            if old_student and old_student.get("current_class_id"):
                old_class_id = old_student["current_class_id"]; new_class_id = ObjectId(update_data["current_class_id"])
                if old_class_id != new_class_id:
                    await db.students.update_one({"_id": ObjectId(student_id)}, {"$push": {"previous_class_ids": old_class_id}, "$set": {"current_class_id": new_class_id}})
                    await db.classes.update_one({"_id": old_class_id}, {"$inc": {"current_enrollment": -1}})
                    await db.classes.update_one({"_id": new_class_id}, {"$inc": {"current_enrollment": 1}})
                del update_data["current_class_id"]
            else:
                del update_data["current_class_id"]
        for date_field in ["date_of_birth", "enrollment_date"]:
            if date_field in update_data and isinstance(update_data[date_field], str):
                try: update_data[date_field] = datetime.strptime(update_data[date_field], "%Y-%m-%d")
                except ValueError: return False, f"Invalid {date_field} format", None
        guardians_data = update_data.pop("guardians", None)
        update_data["updated_at"] = datetime.utcnow()
        try:
            result = await db.students.find_one_and_update({"_id": ObjectId(student_id)}, {"$set": update_data}, return_document=ReturnDocument.AFTER)
            if not result: return False, "Student not found", None
            if guardians_data is not None: await StudentModel.update_guardians(db, student_id, guardians_data)
            result["_id"] = str(result["_id"])
            if result.get("current_class_id"): result["current_class_id"] = str(result["current_class_id"])
            await StudentModel._log_audit(db, "students", student_id, "UPDATE", updated_by, update_data)
            return True, "Student updated successfully", result
        except Exception as e:
            logger.error(f"Failed to update student: {e}")
            return False, f"Failed to update student: {str(e)}", None
    
    @staticmethod
    async def get_student(db: AsyncIOMotorDatabase, student_id: str) -> Optional[Dict[str, Any]]:
        try:
            pipeline = [{"$match": {"_id": ObjectId(student_id)}}, {"$lookup": {"from": "classes", "localField": "current_class_id", "foreignField": "_id", "as": "class_info"}}, {"$unwind": {"path": "$class_info", "preserveNullAndEmptyArrays": True}}, {"$addFields": {"class_name": "$class_info.class_name", "class_level": "$class_info.class_level"}}, {"$project": {"class_info": 0}}]
            results = await db.students.aggregate(pipeline).to_list(length=1)
            if not results: return None
            student = results[0]; student["_id"] = str(student["_id"])
            if student.get("current_class_id"): student["current_class_id"] = str(student["current_class_id"])
            if student.get("date_of_birth"):
                dob = student["date_of_birth"]
                if isinstance(dob, datetime): dob = dob.date()
                today = date.today()
                student["age"] = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            return student
        except Exception as e:
            logger.error(f"Failed to get student: {e}")
            return None
    
    @staticmethod
    async def get_students(
        db: AsyncIOMotorDatabase, class_id: Optional[str] = None,
        student_type: Optional[str] = None, status: Optional[str] = None,
        gender: Optional[str] = None, search: Optional[str] = None,
        enrollment_year: Optional[int] = None, limit: int = 20, skip: int = 0,
        sort_by: str = "last_name", sort_order: int = 1
    ) -> Dict[str, Any]:
        filter_query = {}
        if class_id: filter_query["current_class_id"] = ObjectId(class_id)
        if student_type: filter_query["student_type"] = student_type
        if status: filter_query["status"] = status
        if gender: filter_query["gender"] = gender
        if enrollment_year: filter_query["enrollment_date"] = {"$gte": datetime(enrollment_year, 1, 1), "$lt": datetime(enrollment_year + 1, 1, 1)}
        if search: filter_query["$or"] = [{"first_name": {"$regex": search, "$options": "i"}}, {"last_name": {"$regex": search, "$options": "i"}}, {"student_id_number": {"$regex": search, "$options": "i"}}, {"middle_name": {"$regex": search, "$options": "i"}}]
        total = await db.students.count_documents(filter_query)
        pipeline = [{"$match": filter_query}, {"$sort": {sort_by: sort_order}}, {"$skip": skip}, {"$limit": limit}, {"$lookup": {"from": "classes", "localField": "current_class_id", "foreignField": "_id", "as": "class_info"}}, {"$unwind": {"path": "$class_info", "preserveNullAndEmptyArrays": True}}, {"$addFields": {"class_name": "$class_info.class_name", "class_level": "$class_info.class_level"}}, {"$project": {"class_info": 0, "guardians": 0, "academic_history": 0, "documents": 0}}]
        students = await db.students.aggregate(pipeline).to_list(length=limit)
        for student in students:
            student["_id"] = str(student["_id"])
            if student.get("current_class_id"): student["current_class_id"] = str(student["current_class_id"])
            if student.get("created_by"): student["created_by"] = str(student["created_by"])
            if student.get("date_of_birth"):
                dob = student["date_of_birth"]
                if isinstance(dob, datetime): dob = dob.date()
                today = date.today()
                student["age"] = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return {"students": students, "total": total, "limit": limit, "skip": skip, "page": (skip // limit) + 1 if limit > 0 else 1, "total_pages": (total + limit - 1) // limit if limit > 0 else 1}
    
    @staticmethod
    async def add_guardian(
        db: AsyncIOMotorDatabase, student_id: str, first_name: str, last_name: str,
        relationship: str, phone_number: str, email: Optional[str] = None,
        address: Optional[str] = None, is_primary: bool = False,
        occupation: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        guardian = {"guardian_id": str(ObjectId()), "first_name": first_name.strip().title(), "last_name": last_name.strip().title(), "relationship": relationship, "phone_number": phone_number, "email": email.lower().strip() if email else None, "address": address, "occupation": occupation, "is_primary_contact": is_primary, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        if is_primary: await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": {"guardians.$[].is_primary_contact": False}})
        result = await db.students.update_one({"_id": ObjectId(student_id)}, {"$push": {"guardians": guardian}, "$set": {"updated_at": datetime.utcnow()}})
        if result.modified_count == 0: return False, "Student not found", None
        return True, "Guardian added successfully", guardian
    
    @staticmethod
    async def update_guardians(db: AsyncIOMotorDatabase, student_id: str, guardians: List[Dict[str, Any]]) -> Tuple[bool, str]:
        for guardian in guardians:
            if not guardian.get("first_name") or not guardian.get("last_name"): return False, "Each guardian must have first and last name"
            if not guardian.get("phone_number"): return False, "Each guardian must have a phone number"
            if not guardian.get("relationship"): return False, "Each guardian must have a relationship specified"
        for guardian in guardians:
            if "guardian_id" not in guardian: guardian["guardian_id"] = str(ObjectId())
            guardian["updated_at"] = datetime.utcnow()
            if "created_at" not in guardian: guardian["created_at"] = datetime.utcnow()
        result = await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": {"guardians": guardians, "updated_at": datetime.utcnow()}})
        if result.modified_count == 0: return False, "Student not found"
        return True, "Guardians updated successfully"
    
    @staticmethod
    async def promote_student(
        db: AsyncIOMotorDatabase, student_id: str, new_class_id: str,
        promoted_by: Optional[str] = None, academic_year: Optional[str] = None
    ) -> Tuple[bool, str]:
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if not student: return False, "Student not found"
        if student["status"] != "active": return False, f"Cannot promote student with status: {student['status']}"
        old_class_id = student.get("current_class_id")
        if old_class_id == ObjectId(new_class_id): return False, "Student is already in this class"
        if old_class_id: await db.classes.update_one({"_id": old_class_id}, {"$inc": {"current_enrollment": -1}})
        await db.classes.update_one({"_id": ObjectId(new_class_id)}, {"$inc": {"current_enrollment": 1}})
        if not academic_year: academic_year = StudentModel._get_current_academic_year()
        promotion_record = {"from_class_id": old_class_id, "to_class_id": ObjectId(new_class_id), "academic_year": academic_year, "promotion_date": datetime.utcnow(), "promoted_by": ObjectId(promoted_by) if promoted_by else None}
        await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": {"current_class_id": ObjectId(new_class_id), "updated_at": datetime.utcnow()}, "$push": {"previous_class_ids": old_class_id, "academic_history": promotion_record}})
        return True, f"Student promoted successfully to new class for {academic_year}"
    
    @staticmethod
    async def get_student_statistics(db: AsyncIOMotorDatabase, academic_year: Optional[str] = None) -> Dict[str, Any]:
        match_stage = {"status": "active"}
        pipeline = [{"$match": match_stage}, {"$facet": {"total": [{"$count": "count"}], "by_gender": [{"$group": {"_id": "$gender", "count": {"$sum": 1}}}], "by_type": [{"$group": {"_id": "$student_type", "count": {"$sum": 1}}}], "by_status": [{"$group": {"_id": "$status", "count": {"$sum": 1}}}], "enrollment_trend": [{"$group": {"_id": {"$year": "$enrollment_date"}, "count": {"$sum": 1}}}, {"$sort": {"_id": 1}}]}}]
        results = await db.students.aggregate(pipeline).to_list(length=1)
        if not results: return {"total_students": 0}
        stats = results[0]
        return {"total_students": stats["total"][0]["count"] if stats["total"] else 0, "by_gender": {item["_id"]: item["count"] for item in stats["by_gender"]}, "by_type": {item["_id"]: {"count": item["count"], "display": StudentModel.STUDENT_TYPE_DISPLAY.get(item["_id"], item["_id"])} for item in stats["by_type"]}, "by_status": {item["_id"]: item["count"] for item in stats["by_status"]}, "enrollment_trend": [{"year": item["_id"], "count": item["count"]} for item in stats["enrollment_trend"]]}
    
    @staticmethod
    async def _generate_student_id(db: AsyncIOMotorDatabase) -> str:
        current_year = datetime.now().year
        last_student = await db.students.find_one({"student_id_number": {"$regex": f"^HNS-{current_year}-"}}, sort=[("student_id_number", -1)])
        if last_student: new_number = int(last_student["student_id_number"].split("-")[-1]) + 1
        else: new_number = 1
        return f"HNS-{current_year}-{new_number:04d}"

    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    def _get_current_academic_year() -> str:
        """
        Get current academic year dynamically.
        South Sudan Calendar: Academic year runs February to November.
        January belongs to the PREVIOUS academic year.
        Examples: June 2026 → "2026/2027", January 2027 → "2026/2027"
        """
        now = datetime.now()
        year = now.year
        month = now.month
        start_year = year - 1 if month == 1 else year
        return f"{start_year}/{start_year + 1}"
    
    @staticmethod
    def _get_current_term() -> str:
        """
        Get current academic term dynamically.
        South Sudan: Term 1 (Feb-Apr), Term 2 (May-Jul), Term 3 (Sep-Nov)
        Breaks: August, December, January
        """
        month = datetime.now().month
        if 2 <= month <= 4: return "Term 1"
        elif 5 <= month <= 7: return "Term 2"
        elif 9 <= month <= 11: return "Term 3"
        elif month == 8: return "Term 2 Break"
        else: return "Annual Break"
    
    @staticmethod
    async def _log_audit(
        db: AsyncIOMotorDatabase, table_name: str, record_id: str,
        operation: str, changed_by: Optional[str], details: Dict[str, Any]
    ):
        """Log student operations to audit log"""
        try:
            await db.audit_log.insert_one({
                "table_name": table_name, "record_id": record_id,
                "operation": operation,
                "changed_by": ObjectId(changed_by) if changed_by else None,
                "new_values": details, "changed_at": datetime.utcnow(),
                "academic_year": StudentModel._get_current_academic_year(),
                "term": StudentModel._get_current_term()
            })
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")
