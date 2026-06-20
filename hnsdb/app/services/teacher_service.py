"""
Teacher Service
Handles teacher management business logic, assignments, workload, and professional development
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.models.teacher import TeacherModel

logger = logging.getLogger(__name__)


class TeacherService:
    """Teacher management service with business logic"""
    
    # Maximum classes a teacher can be assigned
    MAX_CLASSES_PER_TEACHER = 5
    # Maximum periods per week
    MAX_PERIODS_PER_WEEK = 40
    # Maximum subjects per teacher
    MAX_SUBJECTS_PER_TEACHER = 5
    
    @staticmethod
    async def register_teacher_with_user(
        db: AsyncIOMotorDatabase,
        first_name: str,
        last_name: str,
        date_of_birth: date,
        gender: str,
        qualification: str,
        hire_date: date,
        phone_number: str,
        email: str,
        specialization: Optional[str] = None,
        subjects: Optional[List[str]] = None,
        create_user_account: bool = True,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Register teacher and optionally create user account
        
        Args:
            db: Database connection
            first_name: Teacher first name
            last_name: Teacher last name
            date_of_birth: Date of birth
            gender: Gender
            qualification: Highest qualification
            hire_date: Employment start date
            phone_number: Contact phone
            email: Professional email
            specialization: Area of specialization
            subjects: Subjects to teach
            create_user_account: Create system user account
            created_by: Admin creating the record
            
        Returns:
            Tuple of (success, message, teacher_with_user)
        """
        
        # Check for duplicate email
        existing = await db.teachers.find_one({"email": email.lower().strip()})
        if existing:
            return False, "A teacher with this email already exists", None
        
        # Create teacher record
        success, message, teacher = await TeacherModel.create_teacher(
            db=db,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            gender=gender,
            qualification=qualification,
            hire_date=hire_date,
            phone_number=phone_number,
            email=email,
            specialization=specialization,
            subjects=subjects,
            created_by=created_by
        )
        
        if not success:
            return False, message, None
        
        # Create user account if requested
        if create_user_account:
            from app.models.user import UserModel
            
            # Generate password from name and hire date
            temp_password = f"HNS@{last_name[:3].capitalize()}{hire_date.year}"
            
            user_success, user_message, user = await UserModel.create_user(
                db=db,
                email=email,
                password=temp_password,
                first_name=first_name,
                last_name=last_name,
                role="teacher",
                phone_number=phone_number,
                created_by=created_by
            )
            
            if user_success:
                # Link user account to teacher
                await db.teachers.update_one(
                    {"_id": ObjectId(teacher["_id"])},
                    {"$set": {"user_id": ObjectId(user["_id"])}}
                )
                teacher["user_id"] = user["_id"]
                teacher["temp_password"] = temp_password
                message += " (User account created)"
            else:
                logger.warning(f"Failed to create user account for teacher: {user_message}")
        
        return True, message, teacher
    
    @staticmethod
    async def get_teacher_full_profile(
        db: AsyncIOMotorDatabase,
        teacher_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get complete teacher profile with all related data
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            
        Returns:
            Complete teacher profile
        """
        teacher = await TeacherModel.get_teacher(db, teacher_id)
        
        if not teacher:
            return None
        
        # Get current academic year assignments
        academic_year = TeacherService._get_current_academic_year()
        
        # Get assigned classes with student counts
        if teacher.get("assigned_classes"):
            classes = await db.classes.find({
                "_id": {"$in": [ObjectId(c) if isinstance(c, str) else c for c in teacher["assigned_classes"]]}
            }).to_list(length=None)
            
            teacher["classes_detail"] = []
            for class_doc in classes:
                student_count = await db.students.count_documents({
                    "current_class_id": class_doc["_id"],
                    "status": "active"
                })
                
                teacher["classes_detail"].append({
                    "class_id": str(class_doc["_id"]),
                    "class_name": class_doc["class_name"],
                    "class_level": class_doc["class_level"],
                    "student_count": student_count,
                    "schedule": class_doc.get("schedule", {})
                })
        
        # Get subject assignments
        from app.models.exam import ExamModel
        subject_assignments = await ExamModel.get_teacher_subjects(
            db, teacher_id, academic_year
        )
        teacher["subject_assignments"] = subject_assignments
        
        # Calculate workload metrics
        workload = await TeacherService.calculate_workload(db, teacher_id)
        teacher["workload_metrics"] = workload
        
        # Get attendance summary if user account exists
        if teacher.get("user_id"):
            login_history = await db.users.find_one(
                {"_id": ObjectId(teacher["user_id"])},
                {"login_history": 1}
            )
            if login_history:
                teacher["login_activity"] = login_history.get("login_history", [])[-10:]
        
        # Get recent performance reviews
        reviews = teacher.get("performance_reviews", [])
        if reviews:
            teacher["latest_review"] = reviews[-1]
            teacher["average_rating"] = round(
                sum(r.get("rating", 0) for r in reviews) / len(reviews), 1
            )
        
        # Calculate years of service
        if teacher.get("hire_date"):
            hire_date = teacher["hire_date"]
            if isinstance(hire_date, datetime):
                hire_date = hire_date.date()
            years = (date.today() - hire_date).days / 365.25
            teacher["years_of_service"] = round(years, 1)
        
        return teacher
    
    @staticmethod
    async def calculate_workload(
        db: AsyncIOMotorDatabase,
        teacher_id: str
    ) -> Dict[str, Any]:
        """
        Calculate detailed teacher workload
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            
        Returns:
            Workload metrics
        """
        teacher = await db.teachers.find_one({"_id": ObjectId(teacher_id)})
        
        if not teacher:
            return {}
        
        assigned_classes = teacher.get("assigned_classes", [])
        total_periods = 0
        total_students = 0
        
        # Get class schedules
        if assigned_classes:
            classes = await db.classes.find({
                "_id": {"$in": assigned_classes}
            }).to_list(length=None)
            
            for class_doc in classes:
                schedule = class_doc.get("schedule", {})
                class_periods = sum(len(periods) for periods in schedule.values())
                total_periods += class_periods
                
                # Count students
                student_count = await db.students.count_documents({
                    "current_class_id": class_doc["_id"],
                    "status": "active"
                })
                total_students += student_count
        
        # Get subject count
        subjects_count = len(teacher.get("subjects", []))
        
        # Calculate workload level
        workload_level = "low"
        if total_periods > 30:
            workload_level = "high"
        elif total_periods > 20:
            workload_level = "medium"
        
        # Check if exceeding limits
        warnings = []
        if len(assigned_classes) > TeacherService.MAX_CLASSES_PER_TEACHER:
            warnings.append(f"Exceeds maximum classes ({TeacherService.MAX_CLASSES_PER_TEACHER})")
        if total_periods > TeacherService.MAX_PERIODS_PER_WEEK:
            warnings.append(f"Exceeds maximum periods ({TeacherService.MAX_PERIODS_PER_WEEK})")
        if subjects_count > TeacherService.MAX_SUBJECTS_PER_TEACHER:
            warnings.append(f"Exceeds maximum subjects ({TeacherService.MAX_SUBJECTS_PER_TEACHER})")
        
        return {
            "total_classes": len(assigned_classes),
            "total_subjects": subjects_count,
            "total_periods_per_week": total_periods,
            "total_students": total_students,
            "is_class_teacher": teacher.get("class_teacher_of") is not None,
            "workload_level": workload_level,
            "max_classes": TeacherService.MAX_CLASSES_PER_TEACHER,
            "max_periods": TeacherService.MAX_PERIODS_PER_WEEK,
            "max_subjects": TeacherService.MAX_SUBJECTS_PER_TEACHER,
            "warnings": warnings,
            "utilization_percentage": round(
                (total_periods / TeacherService.MAX_PERIODS_PER_WEEK * 100), 1
            ) if TeacherService.MAX_PERIODS_PER_WEEK > 0 else 0
        }
    
    @staticmethod
    async def find_available_teachers(
        db: AsyncIOMotorDatabase,
        subject: Optional[str] = None,
        class_level: Optional[str] = None,
        min_qualification: Optional[str] = None,
        exclude_teachers: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Find available teachers for assignment
        
        Args:
            db: Database connection
            subject: Subject expertise required
            class_level: Class level preference
            min_qualification: Minimum qualification
            exclude_teachers: Teachers to exclude
            
        Returns:
            List of available teachers with workload info
        """
        
        filter_query = {"status": "active"}
        
        if subject:
            filter_query["subjects"] = subject
        
        if min_qualification:
            qual_levels = {
                "Certificate": 1, "Diploma": 2, "B.Ed": 3, "B.Sc": 3,
                "B.A": 3, "PGDE": 4, "M.Ed": 5, "M.Sc": 5, "M.A": 5, "PhD": 6
            }
            min_level = qual_levels.get(min_qualification, 0)
            valid_quals = [q for q, level in qual_levels.items() if level >= min_level]
            filter_query["qualification"] = {"$in": valid_quals}
        
        if exclude_teachers:
            filter_query["_id"] = {"$nin": [ObjectId(t) for t in exclude_teachers]}
        
        teachers = await db.teachers.find(filter_query).sort("last_name", 1).to_list(length=None)
        
        available = []
        for teacher in teachers:
            workload = await TeacherService.calculate_workload(db, str(teacher["_id"]))
            
            available.append({
                "teacher_id": str(teacher["_id"]),
                "employee_id": teacher.get("employee_id"),
                "name": f"{teacher['first_name']} {teacher['last_name']}",
                "qualification": teacher.get("qualification"),
                "specialization": teacher.get("specialization"),
                "subjects": teacher.get("subjects", []),
                "current_classes": workload["total_classes"],
                "current_periods": workload["total_periods_per_week"],
                "workload_level": workload["workload_level"],
                "is_class_teacher": workload["is_class_teacher"],
                "can_take_more": workload["total_periods_per_week"] < TeacherService.MAX_PERIODS_PER_WEEK,
                "available_periods": max(0, TeacherService.MAX_PERIODS_PER_WEEK - workload["total_periods_per_week"]),
                "warnings": workload["warnings"]
            })
        
        # Sort by workload (least busy first)
        available.sort(key=lambda x: x["current_periods"])
        
        return available
    
    @staticmethod
    async def process_leave_request(
        db: AsyncIOMotorDatabase,
        teacher_id: str,
        leave_type: str,
        start_date: date,
        end_date: date,
        reason: str,
        substitute_teacher_id: Optional[str] = None,
        requested_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Process teacher leave request with validations
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            leave_type: Type of leave
            start_date: Leave start
            end_date: Leave end
            reason: Leave reason
            substitute_teacher_id: Optional substitute
            requested_by: User requesting leave
            
        Returns:
            Tuple of (success, message, leave_record)
        """
        
        # Validate teacher exists and is active
        teacher = await db.teachers.find_one({"_id": ObjectId(teacher_id)})
        if not teacher:
            return False, "Teacher not found", None
        
        if teacher["status"] == "on_leave":
            return False, "Teacher is already on leave", None
        
        # Validate leave dates
        if start_date < date.today():
            return False, "Leave cannot start in the past", None
        
        if end_date < start_date:
            return False, "End date must be after start date", None
        
        # Calculate leave duration
        leave_days = (end_date - start_date).days + 1
        
        # Check leave balance
        leave_balance = await TeacherService._get_leave_balance(db, teacher_id, leave_type)
        
        if leave_days > leave_balance.get("remaining", 0):
            return False, f"Insufficient leave balance. Remaining: {leave_balance['remaining']} days", None
        
        # Check for overlapping leave
        overlapping = await db.teacher_leaves.find_one({
            "teacher_id": ObjectId(teacher_id),
            "status": {"$in": ["pending", "approved"]},
            "$or": [
                {"start_date": {"$lte": datetime.combine(end_date, datetime.max.time())},
                 "end_date": {"$gte": datetime.combine(start_date, datetime.min.time())}}
            ]
        })
        
        if overlapping:
            return False, "Leave request overlaps with existing leave", None
        
        # Validate substitute teacher
        if substitute_teacher_id:
            sub_teacher = await db.teachers.find_one({
                "_id": ObjectId(substitute_teacher_id),
                "status": "active"
            })
            if not sub_teacher:
                return False, "Substitute teacher not found or not active", None
            
            # Check substitute availability
            sub_workload = await TeacherService.calculate_workload(db, substitute_teacher_id)
            if sub_workload["total_periods_per_week"] >= TeacherService.MAX_PERIODS_PER_WEEK:
                return False, "Substitute teacher has maximum workload", None
        
        # Create leave record
        leave_record = {
            "teacher_id": ObjectId(teacher_id),
            "teacher_name": f"{teacher['first_name']} {teacher['last_name']}",
            "leave_type": leave_type,
            "start_date": datetime.combine(start_date, datetime.min.time()),
            "end_date": datetime.combine(end_date, datetime.max.time()),
            "duration_days": leave_days,
            "reason": reason,
            "substitute_teacher_id": ObjectId(substitute_teacher_id) if substitute_teacher_id else None,
            "status": "pending",
            "approved_by": None,
            "approved_at": None,
            "requested_by": ObjectId(requested_by) if requested_by else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.teacher_leaves.insert_one(leave_record)
        leave_record["_id"] = str(result.inserted_id)
        leave_record["teacher_id"] = str(leave_record["teacher_id"])
        
        logger.info(f"Leave request created for teacher {teacher_id}: {leave_type} ({leave_days} days)")
        
        return True, f"Leave request submitted ({leave_days} days)", leave_record
    
    @staticmethod
    async def approve_leave(
        db: AsyncIOMotorDatabase,
        leave_id: str,
        approved_by: str,
        is_approved: bool = True,
        comments: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Approve or reject leave request
        
        Args:
            db: Database connection
            leave_id: Leave ID
            approved_by: Approver ID
            is_approved: Approve or reject
            comments: Optional comments
            
        Returns:
            Tuple of (success, message)
        """
        leave = await db.teacher_leaves.find_one({"_id": ObjectId(leave_id)})
        
        if not leave:
            return False, "Leave request not found"
        
        if leave["status"] != "pending":
            return False, f"Leave is already {leave['status']}"
        
        new_status = "approved" if is_approved else "rejected"
        
        update_data = {
            "status": new_status,
            "approved_by": ObjectId(approved_by),
            "approved_at": datetime.utcnow(),
            "approval_comments": comments,
            "updated_at": datetime.utcnow()
        }
        
        await db.teacher_leaves.update_one(
            {"_id": ObjectId(leave_id)},
            {"$set": update_data}
        )
        
        # Update teacher status if approved
        if is_approved:
            await db.teachers.update_one(
                {"_id": leave["teacher_id"]},
                {"$set": {"status": "on_leave", "updated_at": datetime.utcnow()}}
            )
            
            # If substitute assigned, update their workload
            if leave.get("substitute_teacher_id"):
                logger.info(f"Substitute teacher {leave['substitute_teacher_id']} assigned")
        
        logger.info(f"Leave {leave_id} {new_status}")
        
        return True, f"Leave request {new_status}"
    
    @staticmethod
    async def get_leave_statistics(
        db: AsyncIOMotorDatabase,
        teacher_id: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get leave statistics
        
        Args:
            db: Database connection
            teacher_id: Optional teacher filter
            academic_year: Optional year filter
            
        Returns:
            Leave statistics
        """
        match_stage = {}
        
        if teacher_id:
            match_stage["teacher_id"] = ObjectId(teacher_id)
        
        if academic_year:
            year_start = int(academic_year.split("/")[0])
            match_stage["start_date"] = {
                "$gte": datetime(year_start, 9, 1),
                "$lt": datetime(year_start + 1, 9, 1)
            }
        
        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": "$leave_type",
                    "total_requests": {"$sum": 1},
                    "approved": {
                        "$sum": {"$cond": [{"$eq": ["$status", "approved"]}, 1, 0]}
                    },
                    "rejected": {
                        "$sum": {"$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]}
                    },
                    "pending": {
                        "$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}
                    },
                    "total_days": {"$sum": "$duration_days"}
                }
            }
        ]
        
        results = await db.teacher_leaves.aggregate(pipeline).to_list(length=None)
        
        leave_stats = {}
        total_requests = 0
        total_approved = 0
        
        for result in results:
            leave_stats[result["_id"]] = {
                "total_requests": result["total_requests"],
                "approved": result["approved"],
                "rejected": result["rejected"],
                "pending": result["pending"],
                "total_days": result["total_days"]
            }
            total_requests += result["total_requests"]
            total_approved += result["approved"]
        
        return {
            "teacher_id": teacher_id,
            "academic_year": academic_year,
            "by_type": leave_stats,
            "total_requests": total_requests,
            "total_approved": total_approved,
            "approval_rate": round((total_approved / total_requests * 100), 2) if total_requests > 0 else 0
        }
    
    @staticmethod
    async def schedule_performance_review_reminder(
        db: AsyncIOMotorDatabase,
        teacher_id: str,
        review_date: date,
        reviewer_id: str
    ) -> Tuple[bool, str]:
        """
        Schedule a performance review and create reminder
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            review_date: Review date
            reviewer_id: Reviewer ID
            
        Returns:
            Tuple of (success, message)
        """
        teacher = await db.teachers.find_one({"_id": ObjectId(teacher_id)})
        
        if not teacher:
            return False, "Teacher not found"
        
        # Create reminder/notification
        reminder = {
            "type": "performance_review",
            "teacher_id": ObjectId(teacher_id),
            "teacher_name": f"{teacher['first_name']} {teacher['last_name']}",
            "review_date": datetime.combine(review_date, datetime.min.time()),
            "reviewer_id": ObjectId(reviewer_id),
            "status": "scheduled",
            "notify_before_days": [7, 3, 1],  # Remind 7, 3, and 1 day before
            "created_at": datetime.utcnow()
        }
        
        await db.notifications.insert_one(reminder)
        
        return True, f"Performance review scheduled for {review_date}"
    
    @staticmethod
    async def get_teacher_development_plan(
        db: AsyncIOMotorDatabase,
        teacher_id: str
    ) -> Dict[str, Any]:
        """
        Generate teacher professional development plan
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            
        Returns:
            Development plan
        """
        teacher = await TeacherModel.get_teacher(db, teacher_id)
        
        if not teacher:
            return {}
        
        # Analyze training history
        trainings = teacher.get("training_history", [])
        recent_trainings = [t for t in trainings if t.get("start_date") and 
                          (datetime.utcnow() - t["start_date"]).days < 365]
        
        # Analyze performance reviews
        reviews = teacher.get("performance_reviews", [])
        latest_review = reviews[-1] if reviews else None
        
        # Identify areas for improvement
        improvement_areas = []
        if latest_review:
            improvement_areas = latest_review.get("areas_for_improvement", [])
        
        # Calculate training hours
        total_training_hours = sum(
            (t.get("end_date", t.get("start_date")) - t["start_date"]).days * 6 
            for t in trainings if t.get("start_date")
        )
        
        # Generate recommendations
        recommendations = []
        
        if total_training_hours < 40:
            recommendations.append("Complete minimum 40 hours of professional development this year")
        
        if len(recent_trainings) < 2:
            recommendations.append("Attend at least 2 training sessions per year")
        
        for area in improvement_areas[:3]:
            recommendations.append(f"Focus on improving: {area}")
        
        if teacher.get("qualification") in ["Certificate", "Diploma"]:
            recommendations.append("Consider pursuing higher qualification (B.Ed or equivalent)")
        
        return {
            "teacher_id": teacher_id,
            "teacher_name": f"{teacher.get('first_name', '')} {teacher.get('last_name', '')}",
            "qualification": teacher.get("qualification"),
            "years_of_experience": teacher.get("years_of_experience", 0),
            "recent_trainings": len(recent_trainings),
            "total_training_hours": total_training_hours,
            "latest_review_rating": latest_review.get("rating") if latest_review else None,
            "improvement_areas": improvement_areas,
            "recommendations": recommendations,
            "suggested_trainings": [
                "Classroom Management Techniques",
                "Modern Teaching Methodologies",
                "Educational Technology Integration",
                "Student Assessment Strategies",
                "Special Needs Education"
            ][:3]
        }
    
    @staticmethod
    async def _get_leave_balance(
        db: AsyncIOMotorDatabase,
        teacher_id: str,
        leave_type: str
    ) -> Dict[str, int]:
        """
        Calculate remaining leave balance
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            leave_type: Type of leave
            
        Returns:
            Leave balance
        """
        current_year = date.today().year
        
        # Default annual allocations
        allocations = {
            "annual": 30,
            "sick": 15,
            "maternity": 90,
            "paternity": 14,
            "study": 20,
            "unpaid": 30
        }
        
        allocated = allocations.get(leave_type, 10)
        
        # Get used days this year
        used_days = 0
        leaves = await db.teacher_leaves.find({
            "teacher_id": ObjectId(teacher_id),
            "leave_type": leave_type,
            "status": "approved",
            "start_date": {
                "$gte": datetime(current_year, 1, 1),
                "$lt": datetime(current_year + 1, 1, 1)
            }
        }).to_list(length=None)
        
        for leave in leaves:
            used_days += leave.get("duration_days", 0)
        
        return {
            "allocated": allocated,
            "used": used_days,
            "remaining": max(0, allocated - used_days)
        }
    
    @staticmethod
    def _get_current_academic_year() -> str:
        """Get current academic year"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        if current_month >= 9:
            return f"{current_year}/{current_year + 1}"
        else:
            return f"{current_year - 1}/{current_year}"