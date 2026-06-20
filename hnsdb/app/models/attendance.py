"""
Attendance Model - Handles student attendance tracking
Supports: present, absent, excused, late statuses
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError
import logging

logger = logging.getLogger(__name__)


class AttendanceModel:
    """
    Attendance model for MongoDB
    Collection: attendance
    """
    
    collection_name = "attendance"
    
    # Allowed attendance statuses
    VALID_STATUSES = ["present", "absent", "excused", "late"]
    
    # Status display mapping
    STATUS_DISPLAY = {
        "present": "Present",
        "absent": "Absent", 
        "excused": "Excused",
        "late": "Late"
    }
    
    @staticmethod
    def get_schema() -> Dict[str, Any]:
        """Return the attendance schema definition"""
        return {
            "student_id": "ObjectId - Reference to students collection",
            "class_id": "ObjectId - Reference to classes collection",
            "date": "Date - Attendance date (YYYY-MM-DD)",
            "status": "String - One of: present, absent, excused, late",
            "arrival_time": "DateTime (optional) - Time student arrived if late",
            "notes": "String (optional) - Additional notes",
            "recorded_by": "ObjectId - Reference to users collection (teacher/admin)",
            "term": "String - Academic term (Term 1, Term 2, Term 3)",
            "academic_year": "String - Academic year (e.g., 2024/2025)",
            "is_excused_verified": "Boolean - Whether excused absence is verified",
            "excuse_document_url": "String (optional) - URL to excuse document",
            "created_at": "DateTime",
            "updated_at": "DateTime"
        }
    
    @staticmethod
    async def create_indexes(db: AsyncIOMotorDatabase):
        """Create necessary indexes for attendance collection"""
        try:
            # Unique compound index to prevent duplicate attendance records
            await db.attendance.create_index(
                [
                    ("student_id", 1),
                    ("class_id", 1),
                    ("date", 1),
                    ("term", 1),
                    ("academic_year", 1)
                ],
                unique=True,
                name="idx_unique_attendance"
            )
            
            # Index for attendance queries
            await db.attendance.create_index("date", name="idx_attendance_date")
            await db.attendance.create_index("status", name="idx_attendance_status")
            await db.attendance.create_index("class_id", name="idx_attendance_class")
            await db.attendance.create_index("student_id", name="idx_attendance_student")
            await db.attendance.create_index("academic_year", name="idx_attendance_academic_year")
            await db.attendance.create_index("term", name="idx_attendance_term")
            
            # Compound index for attendance reports
            await db.attendance.create_index(
                [
                    ("class_id", 1),
                    ("date", 1),
                    ("status", 1)
                ],
                name="idx_attendance_report"
            )
            
            logger.info("Attendance collection indexes created")
            
        except Exception as e:
            logger.error(f"Failed to create attendance indexes: {e}")
            raise
    
    @staticmethod
    async def mark_attendance(
        db: AsyncIOMotorDatabase,
        student_id: str,
        class_id: str,
        attendance_date: date,
        status: str,
        recorded_by: str,
        notes: Optional[str] = None,
        arrival_time: Optional[datetime] = None,
        term: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Mark attendance for a student
        
        Args:
            db: Database connection
            student_id: Student ObjectId string
            class_id: Class ObjectId string  
            attendance_date: Date of attendance
            status: Attendance status
            recorded_by: User who recorded attendance
            notes: Optional notes
            arrival_time: Time student arrived (for late status)
            term: Academic term
            academic_year: Academic year
            
        Returns:
            Tuple of (success, message, attendance_record)
        """
        
        # Validate status
        if status not in AttendanceModel.VALID_STATUSES:
            return False, f"Invalid status. Must be one of: {', '.join(AttendanceModel.VALID_STATUSES)}", None
        
        # Validate date is not in the future
        if attendance_date > date.today():
            return False, "Cannot mark attendance for future dates", None
        
        # Validate students exist and are active
        student = await db.students.find_one({
            "_id": ObjectId(student_id),
            "status": "active"
        })
        if not student:
            return False, "Student not found or inactive", None
        
        # Validate class exists
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            return False, "Class not found", None
        
        # Set default term and academic year if not provided
        if not term:
            term = AttendanceModel._get_current_term()
        if not academic_year:
            academic_year = AttendanceModel._get_current_academic_year()
        
        # Prepare attendance record
        attendance_record = {
            "student_id": ObjectId(student_id),
            "class_id": ObjectId(class_id),
            "date": datetime.combine(attendance_date, datetime.min.time()),
            "status": status,
            "recorded_by": ObjectId(recorded_by),
            "notes": notes,
            "term": term,
            "academic_year": academic_year,
            "is_excused_verified": False if status == "excused" else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Add arrival time for late status
        if status == "late" and arrival_time:
            attendance_record["arrival_time"] = arrival_time
        
        try:
            # Use upsert to handle updates
            filter_query = {
                "student_id": ObjectId(student_id),
                "class_id": ObjectId(class_id),
                "date": datetime.combine(attendance_date, datetime.min.time()),
                "term": term,
                "academic_year": academic_year
            }
            
            update_query = {
                "$set": {
                    "status": status,
                    "notes": notes,
                    "recorded_by": ObjectId(recorded_by),
                    "updated_at": datetime.utcnow()
                }
            }
            
            if status == "late" and arrival_time:
                update_query["$set"]["arrival_time"] = arrival_time
            
            result = await db.attendance.update_one(
                filter_query,
                update_query,
                upsert=True
            )
            
            # Log the operation
            await AttendanceModel._log_audit(
                db,
                "attendance",
                str(result.upserted_id) if result.upserted_id else student_id,
                "UPSERT",
                recorded_by,
                {"status": status, "date": str(attendance_date)}
            )
            
            action = "updated" if result.modified_count > 0 else "created"
            message = f"Attendance {action} successfully for {student['first_name']} {student['last_name']}"
            
            # Fetch the created/updated record
            record = await db.attendance.find_one(filter_query)
            if record:
                record["_id"] = str(record["_id"])
                record["student_id"] = str(record["student_id"])
                record["class_id"] = str(record["class_id"])
                record["recorded_by"] = str(record["recorded_by"])
            
            return True, message, record
            
        except DuplicateKeyError:
            return False, "Attendance already marked for this student on this date", None
        except Exception as e:
            logger.error(f"Failed to mark attendance: {e}")
            return False, f"Failed to mark attendance: {str(e)}", None
    
    @staticmethod
    async def bulk_mark_attendance(
        db: AsyncIOMotorDatabase,
        class_id: str,
        attendance_date: date,
        attendance_data: List[Dict[str, str]],
        recorded_by: str,
        term: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> Tuple[int, int, List[str]]:
        """
        Bulk mark attendance for multiple students
        
        Args:
            db: Database connection
            class_id: Class ID
            attendance_date: Date of attendance
            attendance_data: List of {"student_id": "...", "status": "..."}
            recorded_by: User ID recording attendance
            term: Academic term
            academic_year: Academic year
            
        Returns:
            Tuple of (successful_count, failed_count, error_messages)
        """
        
        successful = 0
        failed = 0
        errors = []
        
        if not term:
            term = AttendanceModel._get_current_term()
        if not academic_year:
            academic_year = AttendanceModel._get_current_academic_year()
        
        # Process each student
        for data in attendance_data:
            student_id = data.get("student_id")
            status = data.get("status", "present")
            notes = data.get("notes")
            
            success, message, _ = await AttendanceModel.mark_attendance(
                db=db,
                student_id=student_id,
                class_id=class_id,
                attendance_date=attendance_date,
                status=status,
                recorded_by=recorded_by,
                notes=notes,
                term=term,
                academic_year=academic_year
            )
            
            if success:
                successful += 1
            else:
                failed += 1
                errors.append(f"Student {student_id}: {message}")
        
        return successful, failed, errors
    
    @staticmethod
    async def get_student_attendance(
        db: AsyncIOMotorDatabase,
        student_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        term: Optional[str] = None,
        academic_year: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Get attendance records for a specific student
        
        Returns:
            Dictionary with attendance records and summary statistics
        """
        
        # Build filter
        filter_query = {"student_id": ObjectId(student_id)}
        
        if start_date:
            filter_query["date"] = {
                "$gte": datetime.combine(start_date, datetime.min.time())
            }
        if end_date:
            if "date" not in filter_query:
                filter_query["date"] = {}
            filter_query["date"]["$lte"] = datetime.combine(end_date, datetime.max.time())
        
        if term:
            filter_query["term"] = term
        if academic_year:
            filter_query["academic_year"] = academic_year
        
        # Get total count
        total_count = await db.attendance.count_documents(filter_query)
        
        # Get attendance records
        cursor = db.attendance.find(filter_query)\
            .sort("date", -1)\
            .skip(skip)\
            .limit(limit)
        
        records = []
        async for record in cursor:
            record["_id"] = str(record["_id"])
            record["student_id"] = str(record["student_id"])
            record["class_id"] = str(record["class_id"])
            record["recorded_by"] = str(record["recorded_by"])
            records.append(record)
        
        # Calculate summary
        summary = await AttendanceModel._calculate_attendance_summary(
            db, filter_query
        )
        
        return {
            "records": records,
            "total": total_count,
            "limit": limit,
            "skip": skip,
            "summary": summary
        }
    
    @staticmethod
    async def get_class_attendance(
        db: AsyncIOMotorDatabase,
        class_id: str,
        attendance_date: Optional[date] = None,
        term: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get attendance for an entire class on a specific date or date range
        
        Returns:
            Dictionary with attendance records and statistics
        """
        
        # Build filter
        filter_query = {"class_id": ObjectId(class_id)}
        
        if attendance_date:
            filter_query["date"] = datetime.combine(attendance_date, datetime.min.time())
        if term:
            filter_query["term"] = term
        if academic_year:
            filter_query["academic_year"] = academic_year
        
        # Get all students in class
        students = await db.students.find({
            "current_class_id": ObjectId(class_id),
            "status": "active"
        }).to_list(length=None)
        
        # Get attendance records
        attendance_records = await db.attendance.find(filter_query).to_list(length=None)
        
        # Create lookup dictionary
        attendance_lookup = {
            str(record["student_id"]): record 
            for record in attendance_records
        }
        
        # Build student attendance list
        student_attendance = []
        present_count = 0
        absent_count = 0
        excused_count = 0
        late_count = 0
        unmarked_count = 0
        
        for student in students:
            student_id = str(student["_id"])
            record = attendance_lookup.get(student_id)
            
            if record:
                status = record["status"]
                if status == "present":
                    present_count += 1
                elif status == "absent":
                    absent_count += 1
                elif status == "excused":
                    excused_count += 1
                elif status == "late":
                    late_count += 1
                
                student_attendance.append({
                    "student_id": student_id,
                    "student_name": f"{student['first_name']} {student['last_name']}",
                    "status": status,
                    "status_display": AttendanceModel.STATUS_DISPLAY.get(status, status),
                    "notes": record.get("notes"),
                    "arrival_time": record.get("arrival_time"),
                    "recorded": True
                })
            else:
                unmarked_count += 1
                student_attendance.append({
                    "student_id": student_id,
                    "student_name": f"{student['first_name']} {student['last_name']}",
                    "status": "unmarked",
                    "status_display": "Not Marked",
                    "notes": None,
                    "arrival_time": None,
                    "recorded": False
                })
        
        return {
            "class_id": class_id,
            "date": str(attendance_date) if attendance_date else None,
            "students": student_attendance,
            "statistics": {
                "total_students": len(students),
                "present": present_count,
                "absent": absent_count,
                "excused": excused_count,
                "late": late_count,
                "unmarked": unmarked_count,
                "attendance_rate": round(
                    ((present_count + late_count) / len(students) * 100) if students else 0, 
                    2
                )
            }
        }
    
    @staticmethod
    async def get_attendance_report(
        db: AsyncIOMotorDatabase,
        class_id: Optional[str] = None,
        student_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        term: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate detailed attendance report with statistics
        
        Returns:
            Comprehensive attendance report with trends and analytics
        """
        
        # Build match stage
        match_stage = {}
        
        if class_id:
            match_stage["class_id"] = ObjectId(class_id)
        if student_id:
            match_stage["student_id"] = ObjectId(student_id)
        if start_date:
            match_stage["date"] = {
                "$gte": datetime.combine(start_date, datetime.min.time())
            }
        if end_date:
            if "date" not in match_stage:
                match_stage["date"] = {}
            match_stage["date"]["$lte"] = datetime.combine(end_date, datetime.max.time())
        if term:
            match_stage["term"] = term
        if academic_year:
            match_stage["academic_year"] = academic_year
        
        # Aggregation pipeline
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1},
                    "dates": {"$push": "$date"}
                }
            }
        ]
        
        status_counts = await db.attendance.aggregate(pipeline).to_list(length=None)
        
        # Daily attendance trend
        daily_pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
                        "status": "$status"
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.date": 1}},
            {
                "$group": {
                    "_id": "$_id.date",
                    "statuses": {
                        "$push": {
                            "status": "$_id.status",
                            "count": "$count"
                        }
                    },
                    "total": {"$sum": "$count"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        daily_trend = await db.attendance.aggregate(daily_pipeline).to_list(length=None)
        
        # Format results
        status_summary = {}
        total_records = 0
        
        for item in status_counts:
            status = item["_id"]
            count = item["count"]
            status_summary[status] = {
                "count": count,
                "display": AttendanceModel.STATUS_DISPLAY.get(status, status)
            }
            total_records += count
        
        # Calculate percentages
        for status in status_summary:
            status_summary[status]["percentage"] = round(
                (status_summary[status]["count"] / total_records * 100) if total_records else 0,
                2
            )
        
        return {
            "status_summary": status_summary,
            "total_records": total_records,
            "daily_trend": daily_trend,
            "attendance_rate": round(
                ((status_summary.get("present", {}).get("count", 0) + 
                  status_summary.get("late", {}).get("count", 0)) / total_records * 100)
                if total_records else 0,
                2
            )
        }
    
    @staticmethod
    async def verify_excuse(
        db: AsyncIOMotorDatabase,
        attendance_id: str,
        verified_by: str,
        is_verified: bool = True
    ) -> Tuple[bool, str]:
        """Verify or reject an excused absence"""
        
        attendance = await db.attendance.find_one({"_id": ObjectId(attendance_id)})
        
        if not attendance:
            return False, "Attendance record not found"
        
        if attendance["status"] != "excused":
            return False, "Can only verify excused absences"
        
        await db.attendance.update_one(
            {"_id": ObjectId(attendance_id)},
            {
                "$set": {
                    "is_excused_verified": is_verified,
                    "verified_by": ObjectId(verified_by),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return True, f"Excuse {'verified' if is_verified else 'rejected'} successfully"
    
    @staticmethod
    def _get_current_term() -> str:
        """Get current academic term based on date"""
        current_month = datetime.now().month
        
        if 1 <= current_month <= 4:
            return "Term 1"
        elif 5 <= current_month <= 8:
            return "Term 2"
        else:
            return "Term 3"
    
    @staticmethod
    def _get_current_academic_year() -> str:
        """Get current academic year"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        if current_month >= 9:
            return f"{current_year}/{current_year + 1}"
        else:
            return f"{current_year - 1}/{current_year}"
    
    @staticmethod
    async def _calculate_attendance_summary(
        db: AsyncIOMotorDatabase,
        filter_query: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate attendance summary statistics"""
        
        pipeline = [
            {"$match": filter_query},
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        results = await db.attendance.aggregate(pipeline).to_list(length=None)
        
        summary = {
            "present": 0,
            "absent": 0,
            "excused": 0,
            "late": 0,
            "total": 0
        }
        
        for result in results:
            status = result["_id"]
            count = result["count"]
            if status in summary:
                summary[status] = count
            summary["total"] += count
        
        if summary["total"] > 0:
            summary["attendance_rate"] = round(
                ((summary["present"] + summary["late"]) / summary["total"] * 100),
                2
            )
        else:
            summary["attendance_rate"] = 0
        
        return summary
    
    @staticmethod
    async def _log_audit(
        db: AsyncIOMotorDatabase,
        table_name: str,
        record_id: str,
        operation: str,
        changed_by: str,
        details: Dict[str, Any]
    ):
        """Log attendance operations to audit log"""
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