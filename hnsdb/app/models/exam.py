"""
Exam Model - Examination and Academic Assessment Management
Handles: Exams, Results, Grading, Report Cards, Subject Management, Academic Performance
"""
from datetime import datetime, date
from typing import Optional, Dict, Any, List, Tuple, Union
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from decimal import Decimal, ROUND_HALF_UP
import logging

logger = logging.getLogger(__name__)


class ExamModel:
    """
    Exam model for MongoDB
    Collections: exams, exam_results, subjects, class_subjects, report_cards, grading_systems
    
    Supports:
    - Subject management
    - Class-subject assignments
    - Exam creation and scheduling
    - Result entry and management
    - Automatic grading
    - Report card generation
    - Academic performance analytics
    - Student rankings
    - Grade point average (GPA) calculation
    """
    
    # Collection names
    EXAMS = "exams"
    EXAM_RESULTS = "exam_results"
    SUBJECTS = "subjects"
    CLASS_SUBJECTS = "class_subjects"
    REPORT_CARDS = "report_cards"
    GRADING_SYSTEMS = "grading_systems"
    
    # Exam types
    EXAM_TYPES = [
        "mid_term", "end_term", "final", "mock", 
        "quiz", "assignment", "project", "oral", "practical"
    ]
    
    # Curriculum levels
    CURRICULUM_LEVELS = ["nursery", "primary"]
    
    # Default grading system
    DEFAULT_GRADING = {
        "name": "Standard Primary Grading",
        "description": "Standard grading system for primary education",
        "grade_boundaries": [
            {"grade": "A", "min_score": 80, "max_score": 100, "remarks": "Excellent", "gpa": 4.0},
            {"grade": "B", "min_score": 70, "max_score": 79, "remarks": "Very Good", "gpa": 3.0},
            {"grade": "C", "min_score": 60, "max_score": 69, "remarks": "Good", "gpa": 2.0},
            {"grade": "D", "min_score": 50, "max_score": 59, "remarks": "Satisfactory", "gpa": 1.0},
            {"grade": "F", "min_score": 0, "max_score": 49, "remarks": "Fail", "gpa": 0.0}
        ],
        "is_default": True
    }
    
    # Subject categories
    SUBJECT_CATEGORIES = [
        "languages", "mathematics", "sciences", "social_studies",
        "religious_education", "creative_arts", "physical_education",
        "vocational", "local_language"
    ]
    
    # Report card statuses
    REPORT_CARD_STATUSES = ["draft", "published", "archived"]
    
    @staticmethod
    def get_exam_schema() -> Dict[str, Any]:
        """Return exam schema"""
        return {
            "exam_name": "String - Name of the exam",
            "exam_type": "String - Type of exam",
            "class_id": "ObjectId - Class taking the exam",
            "subject_id": "ObjectId - Subject being examined",
            "exam_date": "Date - Date of examination",
            "start_time": "String - Start time (HH:MM)",
            "end_time": "String - End time (HH:MM)",
            "max_score": "Float - Maximum possible score",
            "pass_mark": "Float - Minimum passing score",
            "weight": "Float - Weight in final grade calculation",
            "academic_year": "String - Academic year",
            "term": "String - Academic term",
            "status": "String - scheduled, ongoing, completed, cancelled",
            "grading_system_id": "ObjectId - Grading system to use",
            "instructions": "String - Exam instructions",
            "created_by": "ObjectId - Creator",
            "created_at": "DateTime",
            "updated_at": "DateTime"
        }
    
    @staticmethod
    def get_result_schema() -> Dict[str, Any]:
        """Return exam result schema"""
        return {
            "exam_id": "ObjectId - Reference to exam",
            "student_id": "ObjectId - Student who took the exam",
            "score": "Float - Score achieved",
            "grade": "String - Calculated grade",
            "remarks": "String - Teacher remarks",
            "gpa_points": "Float - GPA points earned",
            "is_passed": "Boolean - Whether student passed",
            "recorded_by": "ObjectId - Teacher who recorded result",
            "verified_by": "ObjectId - Who verified the result",
            "submission_date": "DateTime - When result was submitted",
            "created_at": "DateTime",
            "updated_at": "DateTime"
        }
    
    @staticmethod
    async def create_indexes(db: AsyncIOMotorDatabase):
        """Create all exam-related indexes"""
        try:
            # Exams indexes
            await db.exams.create_index(
                [("class_id", 1), ("subject_id", 1), ("term", 1), ("academic_year", 1)],
                name="idx_exam_class_subject_term"
            )
            await db.exams.create_index("exam_date", name="idx_exam_date")
            await db.exams.create_index("exam_type", name="idx_exam_type")
            await db.exams.create_index("status", name="idx_exam_status")
            await db.exams.create_index("academic_year", name="idx_exam_year")
            
            # Exam Results indexes
            await db.exam_results.create_index(
                [("exam_id", 1), ("student_id", 1)],
                unique=True,
                name="idx_result_exam_student"
            )
            await db.exam_results.create_index("student_id", name="idx_result_student")
            await db.exam_results.create_index("grade", name="idx_result_grade")
            
            # Compound index for result aggregation
            await db.exam_results.create_index(
                [("student_id", 1), ("exam_id", 1), ("score", -1)],
                name="idx_result_student_exam_score"
            )
            
            # Subjects indexes
            await db.subjects.create_index(
                [("subject_name", 1), ("curriculum_level", 1)],
                unique=True,
                name="idx_subject_name_level"
            )
            await db.subjects.create_index("category", name="idx_subject_category")
            
            # Class Subjects indexes
            await db.class_subjects.create_index(
                [("class_id", 1), ("subject_id", 1), ("academic_year", 1)],
                unique=True,
                name="idx_class_subject_year"
            )
            await db.class_subjects.create_index("teacher_id", name="idx_class_subject_teacher")
            
            # Report Cards indexes
            await db.report_cards.create_index(
                [("student_id", 1), ("academic_year", 1), ("term", 1)],
                unique=True,
                name="idx_report_card_student"
            )
            await db.report_cards.create_index("class_id", name="idx_report_card_class")
            await db.report_cards.create_index("status", name="idx_report_card_status")
            
            # Grading Systems indexes
            await db.grading_systems.create_index("name", unique=True, name="idx_grading_name")
            await db.grading_systems.create_index("is_default", name="idx_grading_default")
            
            logger.info("Exam collection indexes created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create exam indexes: {e}")
            raise

    # =========================================================================
    # SUBJECT MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def create_subject(
        db: AsyncIOMotorDatabase,
        subject_name: str,
        curriculum_level: str,
        category: Optional[str] = None,
        description: Optional[str] = None,
        subject_code: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create a new subject
        
        Args:
            db: Database connection
            subject_name: Name of subject
            curriculum_level: Curriculum level (nursery/primary)
            category: Subject category
            description: Subject description
            subject_code: Unique subject code
            created_by: User creating the subject
            
        Returns:
            Tuple of (success, message, subject_document)
        """
        
        # Validate curriculum level
        if curriculum_level not in ExamModel.CURRICULUM_LEVELS:
            return False, f"Invalid curriculum level. Must be: {', '.join(ExamModel.CURRICULUM_LEVELS)}", None
        
        # Validate category
        if category and category not in ExamModel.SUBJECT_CATEGORIES:
            return False, f"Invalid category. Must be: {', '.join(ExamModel.SUBJECT_CATEGORIES)}", None
        
        # Generate subject code if not provided
        if not subject_code:
            subject_code = subject_name[:3].upper() + "-" + curriculum_level[:3].upper()
        
        subject = {
            "subject_name": subject_name.strip(),
            "subject_code": subject_code.upper(),
            "curriculum_level": curriculum_level,
            "category": category,
            "description": description,
            "status": "active",
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            result = await db.subjects.insert_one(subject)
            subject["_id"] = str(result.inserted_id)
            
            logger.info(f"Subject created: {subject_name} ({subject_code})")
            
            return True, f"Subject '{subject_name}' created successfully", subject
            
        except Exception as e:
            if "duplicate" in str(e).lower():
                return False, f"Subject '{subject_name}' already exists for {curriculum_level} level", None
            logger.error(f"Failed to create subject: {e}")
            return False, f"Failed to create subject: {str(e)}", None
    
    @staticmethod
    async def get_subjects(
        db: AsyncIOMotorDatabase,
        curriculum_level: Optional[str] = None,
        category: Optional[str] = None,
        status: str = "active"
    ) -> List[Dict[str, Any]]:
        """
        Get subjects with filtering
        
        Args:
            db: Database connection
            curriculum_level: Filter by curriculum level
            category: Filter by category
            status: Filter by status
            
        Returns:
            List of subjects
        """
        
        filter_query = {"status": status}
        
        if curriculum_level:
            filter_query["curriculum_level"] = curriculum_level
        if category:
            filter_query["category"] = category
        
        subjects = await db.subjects.find(filter_query)\
            .sort("subject_name", 1)\
            .to_list(length=None)
        
        for subject in subjects:
            subject["_id"] = str(subject["_id"])
            if subject.get("created_by"):
                subject["created_by"] = str(subject["created_by"])
        
        return subjects
    
    @staticmethod
    async def assign_subject_to_class(
        db: AsyncIOMotorDatabase,
        class_id: str,
        subject_id: str,
        teacher_id: str,
        academic_year: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Assign a subject to a class with a teacher
        
        Args:
            db: Database connection
            class_id: Class ID
            subject_id: Subject ID
            teacher_id: Teacher ID
            academic_year: Academic year
            created_by: User making the assignment
            
        Returns:
            Tuple of (success, message, assignment)
        """
        
        # Validate class exists
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            return False, "Class not found", None
        
        # Validate subject exists
        subject = await db.subjects.find_one({"_id": ObjectId(subject_id)})
        if not subject:
            return False, "Subject not found", None
        
        # Validate teacher exists and is active
        teacher = await db.teachers.find_one({
            "_id": ObjectId(teacher_id),
            "status": "active"
        })
        if not teacher:
            return False, "Teacher not found or inactive", None
        
        # Set academic year
        if not academic_year:
            academic_year = ExamModel._get_current_academic_year()
        
        # Check if teacher is qualified for this subject
        teacher_subjects = teacher.get("subjects", [])
        if teacher_subjects and subject["subject_name"] not in teacher_subjects:
            logger.warning(f"Teacher {teacher['first_name']} {teacher['last_name']} may not be qualified for {subject['subject_name']}")
        
        assignment = {
            "class_id": ObjectId(class_id),
            "class_name": class_doc["class_name"],
            "subject_id": ObjectId(subject_id),
            "subject_name": subject["subject_name"],
            "teacher_id": ObjectId(teacher_id),
            "teacher_name": f"{teacher['first_name']} {teacher['last_name']}",
            "academic_year": academic_year,
            "status": "active",
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            result = await db.class_subjects.insert_one(assignment)
            assignment["_id"] = str(result.inserted_id)
            assignment["class_id"] = str(assignment["class_id"])
            assignment["subject_id"] = str(assignment["subject_id"])
            assignment["teacher_id"] = str(assignment["teacher_id"])
            
            # Update teacher's assigned classes if not already there
            await db.teachers.update_one(
                {"_id": ObjectId(teacher_id)},
                {
                    "$addToSet": {"assigned_classes": ObjectId(class_id)},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            logger.info(f"Subject {subject['subject_name']} assigned to class {class_doc['class_name']}")
            
            return True, f"Subject assigned successfully to {class_doc['class_name']}", assignment
            
        except Exception as e:
            if "duplicate" in str(e).lower():
                return False, "This subject is already assigned to this class for this academic year", None
            logger.error(f"Failed to assign subject: {e}")
            return False, f"Failed to assign subject: {str(e)}", None
    
    @staticmethod
    async def get_class_subjects(
        db: AsyncIOMotorDatabase,
        class_id: str,
        academic_year: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get subjects assigned to a class
        
        Args:
            db: Database connection
            class_id: Class ID
            academic_year: Academic year
            
        Returns:
            List of class subject assignments with teacher info
        """
        
        if not academic_year:
            academic_year = ExamModel._get_current_academic_year()
        
        filter_query = {
            "class_id": ObjectId(class_id),
            "academic_year": academic_year,
            "status": "active"
        }
        
        assignments = await db.class_subjects.find(filter_query)\
            .sort("subject_name", 1)\
            .to_list(length=None)
        
        for assignment in assignments:
            assignment["_id"] = str(assignment["_id"])
            assignment["class_id"] = str(assignment["class_id"])
            assignment["subject_id"] = str(assignment["subject_id"])
            assignment["teacher_id"] = str(assignment["teacher_id"])
        
        return assignments
    
    @staticmethod
    async def get_teacher_subjects(
        db: AsyncIOMotorDatabase,
        teacher_id: str,
        academic_year: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get subjects assigned to a teacher
        
        Args:
            db: Database connection
            teacher_id: Teacher ID
            academic_year: Academic year
            
        Returns:
            List of class subject assignments
        """
        
        if not academic_year:
            academic_year = ExamModel._get_current_academic_year()
        
        pipeline = [
            {
                "$match": {
                    "teacher_id": ObjectId(teacher_id),
                    "academic_year": academic_year,
                    "status": "active"
                }
            },
            {
                "$lookup": {
                    "from": "classes",
                    "localField": "class_id",
                    "foreignField": "_id",
                    "as": "class_info"
                }
            },
            {"$unwind": "$class_info"},
            {
                "$addFields": {
                    "class_name": "$class_info.class_name",
                    "class_level": "$class_info.class_level"
                }
            },
            {"$project": {"class_info": 0}}
        ]
        
        assignments = await db.class_subjects.aggregate(pipeline).to_list(length=None)
        
        for assignment in assignments:
            assignment["_id"] = str(assignment["_id"])
            assignment["class_id"] = str(assignment["class_id"])
            assignment["subject_id"] = str(assignment["subject_id"])
            assignment["teacher_id"] = str(assignment["teacher_id"])
        
        return assignments

    # =========================================================================
    # EXAM MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def create_exam(
        db: AsyncIOMotorDatabase,
        exam_name: str,
        exam_type: str,
        class_id: str,
        subject_id: str,
        exam_date: Union[date, str],
        max_score: float = 100.0,
        pass_mark: Optional[float] = None,
        weight: float = 1.0,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        academic_year: Optional[str] = None,
        term: Optional[str] = None,
        instructions: Optional[str] = None,
        grading_system_id: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create a new exam
        
        Args:
            db: Database connection
            exam_name: Name of the exam
            exam_type: Type of exam
            class_id: Class taking the exam
            subject_id: Subject being examined
            exam_date: Date of examination
            max_score: Maximum possible score
            pass_mark: Minimum passing score (defaults to 50% of max)
            weight: Weight in final grade calculation
            start_time: Exam start time
            end_time: Exam end time
            academic_year: Academic year
            term: Academic term
            instructions: Exam instructions
            grading_system_id: Grading system to use
            created_by: User creating the exam
            
        Returns:
            Tuple of (success, message, exam_document)
        """
        
        # Validate exam type
        if exam_type not in ExamModel.EXAM_TYPES:
            return False, f"Invalid exam type. Must be: {', '.join(ExamModel.EXAM_TYPES)}", None
        
        # Validate class exists
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            return False, "Class not found", None
        
        # Validate subject exists
        subject = await db.subjects.find_one({"_id": ObjectId(subject_id)})
        if not subject:
            return False, "Subject not found", None
        
        # Parse date
        if isinstance(exam_date, str):
            try:
                exam_date = datetime.strptime(exam_date, "%Y-%m-%d").date()
            except ValueError:
                return False, "Invalid exam date format. Use YYYY-MM-DD", None
        
        # Validate max score
        if max_score <= 0:
            return False, "Maximum score must be greater than 0", None
        
        # Set default pass mark
        if not pass_mark:
            pass_mark = max_score * 0.5
        
        if pass_mark > max_score:
            return False, "Pass mark cannot exceed maximum score", None
        
        # Set academic year and term
        if not academic_year:
            academic_year = ExamModel._get_current_academic_year()
        if not term:
            term = ExamModel._get_current_term()
        
        # Validate time format
        if start_time:
            try:
                datetime.strptime(start_time, "%H:%M")
            except ValueError:
                return False, "Invalid start time format. Use HH:MM", None
        
        if end_time:
            try:
                datetime.strptime(end_time, "%H:%M")
            except ValueError:
                return False, "Invalid end time format. Use HH:MM", None
        
        # Build exam document
        exam = {
            "exam_name": exam_name.strip(),
            "exam_type": exam_type,
            "class_id": ObjectId(class_id),
            "class_name": class_doc["class_name"],
            "subject_id": ObjectId(subject_id),
            "subject_name": subject["subject_name"],
            "exam_date": datetime.combine(exam_date, datetime.min.time()),
            "start_time": start_time,
            "end_time": end_time,
            "max_score": max_score,
            "pass_mark": pass_mark,
            "weight": weight,
            "academic_year": academic_year,
            "term": term,
            "status": "scheduled",
            "grading_system_id": ObjectId(grading_system_id) if grading_system_id else None,
            "instructions": instructions,
            "results_entered": 0,
            "total_students": 0,
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            # Check for duplicate exam
            existing = await db.exams.find_one({
                "class_id": ObjectId(class_id),
                "subject_id": ObjectId(subject_id),
                "exam_type": exam_type,
                "term": term,
                "academic_year": academic_year
            })
            
            if existing:
                return False, f"An exam of type '{exam_type}' already exists for this subject in {term}", None
            
            result = await db.exams.insert_one(exam)
            exam["_id"] = str(result.inserted_id)
            exam["class_id"] = str(exam["class_id"])
            exam["subject_id"] = str(exam["subject_id"])
            
            logger.info(f"Exam created: {exam_name} for {class_doc['class_name']} - {subject['subject_name']}")
            
            return True, f"Exam '{exam_name}' created successfully", exam
            
        except Exception as e:
            logger.error(f"Failed to create exam: {e}")
            return False, f"Failed to create exam: {str(e)}", None
    
    @staticmethod
    async def get_exams(
        db: AsyncIOMotorDatabase,
        class_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        exam_type: Optional[str] = None,
        academic_year: Optional[str] = None,
        term: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Get exams with comprehensive filtering
        
        Args:
            db: Database connection
            class_id: Filter by class
            subject_id: Filter by subject
            exam_type: Filter by exam type
            academic_year: Filter by academic year
            term: Filter by term
            status: Filter by status
            limit: Page size
            skip: Offset
            
        Returns:
            Dictionary with exams list and pagination
        """
        
        filter_query = {}
        
        if class_id:
            filter_query["class_id"] = ObjectId(class_id)
        if subject_id:
            filter_query["subject_id"] = ObjectId(subject_id)
        if exam_type:
            filter_query["exam_type"] = exam_type
        if academic_year:
            filter_query["academic_year"] = academic_year
        if term:
            filter_query["term"] = term
        if status:
            filter_query["status"] = status
        
        total = await db.exams.count_documents(filter_query)
        
        exams = await db.exams.find(filter_query)\
            .sort([("exam_date", -1), ("exam_name", 1)])\
            .skip(skip)\
            .limit(limit)\
            .to_list(length=limit)
        
        for exam in exams:
            exam["_id"] = str(exam["_id"])
            exam["class_id"] = str(exam["class_id"])
            exam["subject_id"] = str(exam["subject_id"])
            if exam.get("grading_system_id"):
                exam["grading_system_id"] = str(exam["grading_system_id"])
            if exam.get("created_by"):
                exam["created_by"] = str(exam["created_by"])
        
        return {
            "exams": exams,
            "total": total,
            "limit": limit,
            "skip": skip,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1
        }

    # =========================================================================
    # EXAM RESULTS MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def record_result(
        db: AsyncIOMotorDatabase,
        exam_id: str,
        student_id: str,
        score: float,
        recorded_by: str,
        remarks: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Record exam result for a student
        
        Args:
            db: Database connection
            exam_id: Exam ID
            student_id: Student ID
            score: Score achieved
            recorded_by: Teacher recording the result
            remarks: Teacher remarks
            
        Returns:
            Tuple of (success, message, result_document)
        """
        
        # Validate exam exists
        exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            return False, "Exam not found", None
        
        # Validate student exists and is in the class
        student = await db.students.find_one({
            "_id": ObjectId(student_id),
            "status": "active"
        })
        if not student:
            return False, "Student not found or inactive", None
        
        if str(student.get("current_class_id")) != str(exam["class_id"]):
            return False, "Student is not in the class for this exam", None
        
        # Validate score
        if score < 0:
            return False, "Score cannot be negative", None
        
        if score > exam["max_score"]:
            return False, f"Score cannot exceed maximum score of {exam['max_score']}", None
        
        # Calculate grade
        grade_info = await ExamModel._calculate_grade(db, score, exam)
        
        # Build result document
        result = {
            "exam_id": ObjectId(exam_id),
            "student_id": ObjectId(student_id),
            "student_name": f"{student['first_name']} {student['last_name']}",
            "score": score,
            "grade": grade_info["grade"],
            "remarks": remarks or grade_info["remarks"],
            "gpa_points": grade_info["gpa"],
            "is_passed": score >= exam["pass_mark"],
            "max_score": exam["max_score"],
            "percentage": round((score / exam["max_score"] * 100), 2),
            "recorded_by": ObjectId(recorded_by),
            "verified_by": None,
            "submission_date": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            # Upsert result
            filter_query = {
                "exam_id": ObjectId(exam_id),
                "student_id": ObjectId(student_id)
            }
            
            update_data = {
                "$set": result,
                "$setOnInsert": {"created_at": datetime.utcnow()}
            }
            
            db_result = await db.exam_results.update_one(
                filter_query,
                update_data,
                upsert=True
            )
            
            # Update exam status and count
            total_results = await db.exam_results.count_documents({
                "exam_id": ObjectId(exam_id)
            })
            
            # Get total active students in class
            total_students = await db.students.count_documents({
                "current_class_id": exam["class_id"],
                "status": "active"
            })
            
            await db.exams.update_one(
                {"_id": ObjectId(exam_id)},
                {
                    "$set": {
                        "results_entered": total_results,
                        "total_students": total_students,
                        "status": "completed" if total_results >= total_students else "ongoing",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            result["_id"] = str(db_result.upserted_id) if db_result.upserted_id else None
            result["exam_id"] = str(result["exam_id"])
            result["student_id"] = str(result["student_id"])
            result["recorded_by"] = str(result["recorded_by"])
            
            action = "created" if db_result.upserted_id else "updated"
            message = f"Result {action} successfully - {student['first_name']} {student['last_name']}: {score}/{exam['max_score']} ({grade_info['grade']})"
            
            return True, message, result
            
        except Exception as e:
            logger.error(f"Failed to record result: {e}")
            return False, f"Failed to record result: {str(e)}", None
    
    @staticmethod
    async def bulk_record_results(
        db: AsyncIOMotorDatabase,
        exam_id: str,
        results: List[Dict[str, Any]],
        recorded_by: str
    ) -> Tuple[int, int, List[str]]:
        """
        Bulk record exam results for multiple students
        
        Args:
            db: Database connection
            exam_id: Exam ID
            results: List of {"student_id": "...", "score": 85, "remarks": "..."}
            recorded_by: Teacher recording results
            
        Returns:
            Tuple of (successful_count, failed_count, error_messages)
        """
        
        successful = 0
        failed = 0
        errors = []
        
        for result_data in results:
            student_id = result_data.get("student_id")
            score = result_data.get("score")
            remarks = result_data.get("remarks")
            
            if not student_id or score is None:
                failed += 1
                errors.append(f"Missing student_id or score for entry")
                continue
            
            success, message, _ = await ExamModel.record_result(
                db=db,
                exam_id=exam_id,
                student_id=student_id,
                score=score,
                recorded_by=recorded_by,
                remarks=remarks
            )
            
            if success:
                successful += 1
            else:
                failed += 1
                errors.append(f"Student {student_id}: {message}")
        
        return successful, failed, errors
    
    @staticmethod
    async def get_exam_results(
        db: AsyncIOMotorDatabase,
        exam_id: str,
        sort_by: str = "score",
        sort_order: int = -1
    ) -> Dict[str, Any]:
        """
        Get all results for an exam with statistics
        
        Args:
            db: Database connection
            exam_id: Exam ID
            sort_by: Sort field
            sort_order: Sort direction
            
        Returns:
            Dictionary with results and exam statistics
        """
        
        # Get exam info
        exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            return {"error": "Exam not found"}
        
        # Get all results
        results = await db.exam_results.find(
            {"exam_id": ObjectId(exam_id)}
        ).sort(sort_by, sort_order).to_list(length=None)
        
        # Calculate statistics
        scores = [r["score"] for r in results]
        total_students = len(scores)
        
        statistics = {
            "total_students": total_students,
            "highest_score": max(scores) if scores else 0,
            "lowest_score": min(scores) if scores else 0,
            "average_score": round(sum(scores) / total_students, 2) if scores else 0,
            "pass_rate": round(
                (sum(1 for r in results if r["is_passed"]) / total_students * 100), 2
            ) if total_students else 0,
            "grade_distribution": {}
        }
        
        # Calculate grade distribution
        for result in results:
            grade = result["grade"]
            if grade not in statistics["grade_distribution"]:
                statistics["grade_distribution"][grade] = {
                    "count": 0,
                    "percentage": 0
                }
            statistics["grade_distribution"][grade]["count"] += 1
        
        for grade in statistics["grade_distribution"]:
            statistics["grade_distribution"][grade]["percentage"] = round(
                (statistics["grade_distribution"][grade]["count"] / total_students * 100), 2
            ) if total_students else 0
        
        # Format results
        for result in results:
            result["_id"] = str(result["_id"])
            result["exam_id"] = str(result["exam_id"])
            result["student_id"] = str(result["student_id"])
            result["recorded_by"] = str(result["recorded_by"])
            if result.get("verified_by"):
                result["verified_by"] = str(result["verified_by"])
        
        exam["_id"] = str(exam["_id"])
        exam["class_id"] = str(exam["class_id"])
        exam["subject_id"] = str(exam["subject_id"])
        
        return {
            "exam": exam,
            "results": results,
            "statistics": statistics
        }
    
    @staticmethod
    async def get_student_results(
        db: AsyncIOMotorDatabase,
        student_id: str,
        academic_year: Optional[str] = None,
        term: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get all exam results for a student
        
        Args:
            db: Database connection
            student_id: Student ID
            academic_year: Academic year
            term: Academic term
            
        Returns:
            Dictionary with student's results organized by subject
        """
        
        if not academic_year:
            academic_year = ExamModel._get_current_academic_year()
        
        # Build match for exams
        exam_match = {"academic_year": academic_year}
        if term:
            exam_match["term"] = term
        
        # Get all exams for the academic year/term
        exams = await db.exams.find(exam_match).to_list(length=None)
        exam_ids = [exam["_id"] for exam in exams]
        
        # Get student's results
        results = await db.exam_results.find({
            "student_id": ObjectId(student_id),
            "exam_id": {"$in": exam_ids}
        }).to_list(length=None)
        
        # Create exam lookup
        exam_lookup = {str(exam["_id"]): exam for exam in exams}
        
        # Organize results by subject
        subject_results = {}
        total_score = 0
        total_max = 0
        total_subjects = 0
        
        for result in results:
            exam = exam_lookup.get(str(result["exam_id"]))
            if not exam:
                continue
            
            subject_name = exam["subject_name"]
            
            if subject_name not in subject_results:
                subject_results[subject_name] = {
                    "subject_name": subject_name,
                    "exams": [],
                    "total_score": 0,
                    "total_max": 0,
                    "average_percentage": 0,
                    "grade": ""
                }
            
            result["_id"] = str(result["_id"])
            result["exam_id"] = str(result["exam_id"])
            result["student_id"] = str(result["student_id"])
            result["exam_type"] = exam["exam_type"]
            result["exam_name"] = exam["exam_name"]
            
            subject_results[subject_name]["exams"].append(result)
            subject_results[subject_name]["total_score"] += result["score"]
            subject_results[subject_name]["total_max"] += exam["max_score"]
            
            total_score += result["score"]
            total_max += exam["max_score"]
            total_subjects += 1
        
        # Calculate subject averages and grades
        for subject_name, data in subject_results.items():
            if data["total_max"] > 0:
                data["average_percentage"] = round(
                    (data["total_score"] / data["total_max"] * 100), 2
                )
                data["grade"] = ExamModel._calculate_grade_from_percentage(
                    data["average_percentage"]
                )
        
        # Calculate overall statistics
        overall_percentage = round((total_score / total_max * 100), 2) if total_max > 0 else 0
        overall_grade = ExamModel._calculate_grade_from_percentage(overall_percentage)
        
        # Get student info
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if student:
            student["_id"] = str(student["_id"])
            if student.get("current_class_id"):
                student["current_class_id"] = str(student["current_class_id"])
        
        return {
            "student": student,
            "academic_year": academic_year,
            "term": term,
            "subjects": list(subject_results.values()),
            "overall": {
                "total_score": total_score,
                "total_max": total_max,
                "percentage": overall_percentage,
                "grade": overall_grade,
                "subjects_count": len(subject_results)
            }
        }
    
    @staticmethod
    async def get_class_ranking(
        db: AsyncIOMotorDatabase,
        class_id: str,
        academic_year: Optional[str] = None,
        term: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get class ranking based on exam performance
        
        Args:
            db: Database connection
            class_id: Class ID
            academic_year: Academic year
            term: Academic term
            limit: Number of top students to return
            
        Returns:
            List of students ranked by performance
        """
        
        if not academic_year:
            academic_year = ExamModel._get_current_academic_year()
        
        # Get all exams for the class
        exam_match = {
            "class_id": ObjectId(class_id),
            "academic_year": academic_year
        }
        if term:
            exam_match["term"] = term
        
        exams = await db.exams.find(exam_match).to_list(length=None)
        exam_ids = [exam["_id"] for exam in exams]
        
        if not exam_ids:
            return []
        
        # Aggregate results to get student rankings
        pipeline = [
            {
                "$match": {
                    "exam_id": {"$in": exam_ids}
                }
            },
            {
                "$group": {
                    "_id": "$student_id",
                    "student_name": {"$first": "$student_name"},
                    "total_score": {"$sum": "$score"},
                    "total_max": {"$sum": "$max_score"},
                    "exams_taken": {"$sum": 1},
                    "average_score": {"$avg": "$percentage"}
                }
            },
            {
                "$addFields": {
                    "overall_percentage": {
                        "$round": [
                            {"$multiply": [{"$divide": ["$total_score", "$total_max"]}, 100]},
                            2
                        ]
                    }
                }
            },
            {"$sort": {"overall_percentage": -1}},
            {"$limit": limit}
        ]
        
        rankings = await db.exam_results.aggregate(pipeline).to_list(length=limit)
        
        # Add ranking position
        for i, student in enumerate(rankings):
            student["_id"] = str(student["_id"])
            student["rank"] = i + 1
            student["grade"] = ExamModel._calculate_grade_from_percentage(
                student["overall_percentage"]
            )
        
        return rankings

    # =========================================================================
    # REPORT CARD MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def generate_report_card(
        db: AsyncIOMotorDatabase,
        student_id: str,
        class_id: str,
        academic_year: str,
        term: str,
        generated_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Generate a report card for a student
        
        Args:
            db: Database connection
            student_id: Student ID
            class_id: Class ID
            academic_year: Academic year
            term: Academic term
            generated_by: User generating the report
            
        Returns:
            Tuple of (success, message, report_card)
        """
        
        # Get student info
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if not student:
            return False, "Student not found", None
        
        # Get class info
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            return False, "Class not found", None
        
        # Get student results
        results_data = await ExamModel.get_student_results(
            db, student_id, academic_year, term
        )
        
        # Get attendance summary
        attendance_summary = await ExamModel._get_attendance_summary(
            db, student_id, academic_year, term
        )
        
        # Get class teacher
        class_teacher = await db.teachers.find_one({
            "class_teacher_of": ObjectId(class_id),
            "status": "active"
        })
        
        # Build report card
        report_card = {
            "student_id": ObjectId(student_id),
            "student_name": f"{student['first_name']} {student['last_name']}",
            "class_id": ObjectId(class_id),
            "class_name": class_doc["class_name"],
            "academic_year": academic_year,
            "term": term,
            "subjects": results_data.get("subjects", []),
            "overall_performance": results_data.get("overall", {}),
            "attendance": attendance_summary,
            "class_teacher_name": f"{class_teacher['first_name']} {class_teacher['last_name']}" if class_teacher else "",
            "class_teacher_remarks": "",
            "head_teacher_remarks": "",
            "status": "draft",
            "generated_by": ObjectId(generated_by) if generated_by else None,
            "generated_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            # Upsert report card
            filter_query = {
                "student_id": ObjectId(student_id),
                "academic_year": academic_year,
                "term": term
            }
            
            result = await db.report_cards.update_one(
                filter_query,
                {"$set": report_card},
                upsert=True
            )
            
            report_card["_id"] = str(
                result.upserted_id if result.upserted_id 
                else (await db.report_cards.find_one(filter_query))["_id"]
            )
            report_card["student_id"] = str(report_card["student_id"])
            report_card["class_id"] = str(report_card["class_id"])
            
            action = "created" if result.upserted_id else "updated"
            
            return True, f"Report card {action} successfully", report_card
            
        except Exception as e:
            logger.error(f"Failed to generate report card: {e}")
            return False, f"Failed to generate report card: {str(e)}", None
    
    @staticmethod
    async def get_report_card(
        db: AsyncIOMotorDatabase,
        student_id: str,
        academic_year: str,
        term: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a student's report card
        
        Args:
            db: Database connection
            student_id: Student ID
            academic_year: Academic year
            term: Academic term
            
        Returns:
            Report card document or None
        """
        
        report_card = await db.report_cards.find_one({
            "student_id": ObjectId(student_id),
            "academic_year": academic_year,
            "term": term
        })
        
        if report_card:
            report_card["_id"] = str(report_card["_id"])
            report_card["student_id"] = str(report_card["student_id"])
            report_card["class_id"] = str(report_card["class_id"])
            if report_card.get("generated_by"):
                report_card["generated_by"] = str(report_card["generated_by"])
        
        return report_card
    
    @staticmethod
    async def publish_report_cards(
        db: AsyncIOMotorDatabase,
        class_id: str,
        academic_year: str,
        term: str,
        published_by: Optional[str] = None
    ) -> Tuple[int, int]:
        """
        Publish all report cards for a class
        
        Args:
            db: Database connection
            class_id: Class ID
            academic_year: Academic year
            term: Academic term
            published_by: User publishing the reports
            
        Returns:
            Tuple of (published_count, total_count)
        """
        
        # Get all active students in class
        students = await db.students.find({
            "current_class_id": ObjectId(class_id),
            "status": "active"
        }).to_list(length=None)
        
        published = 0
        
        for student in students:
            # Generate report card if not exists
            await ExamModel.generate_report_card(
                db, str(student["_id"]), class_id, academic_year, term, published_by
            )
            
            # Publish
            result = await db.report_cards.update_one(
                {
                    "student_id": student["_id"],
                    "academic_year": academic_year,
                    "term": term
                },
                {
                    "$set": {
                        "status": "published",
                        "published_at": datetime.utcnow(),
                        "published_by": ObjectId(published_by) if published_by else None,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                published += 1
        
        return published, len(students)

    # =========================================================================
    # GRADING SYSTEM MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def create_grading_system(
        db: AsyncIOMotorDatabase,
        name: str,
        grade_boundaries: List[Dict[str, Any]],
        description: Optional[str] = None,
        is_default: bool = False,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create a custom grading system
        
        Args:
            db: Database connection
            name: Grading system name
            grade_boundaries: List of grade boundaries
            description: System description
            is_default: Set as default grading system
            created_by: User creating the system
            
        Returns:
            Tuple of (success, message, grading_system)
        """
        
        # Validate grade boundaries
        if not grade_boundaries:
            return False, "At least one grade boundary is required", None
        
        validated_boundaries = []
        for boundary in grade_boundaries:
            required_fields = ["grade", "min_score", "max_score"]
            for field in required_fields:
                if field not in boundary:
                    return False, f"Missing required field '{field}' in grade boundary", None
            
            validated_boundaries.append({
                "grade": boundary["grade"].upper(),
                "min_score": boundary["min_score"],
                "max_score": boundary["max_score"],
                "remarks": boundary.get("remarks", ""),
                "gpa": boundary.get("gpa", 0.0)
            })
        
        # If set as default, remove default from others
        if is_default:
            await db.grading_systems.update_many(
                {"is_default": True},
                {"$set": {"is_default": False}}
            )
        
        grading_system = {
            "name": name,
            "description": description,
            "grade_boundaries": validated_boundaries,
            "is_default": is_default,
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        try:
            result = await db.grading_systems.insert_one(grading_system)
            grading_system["_id"] = str(result.inserted_id)
            
            return True, "Grading system created successfully", grading_system
            
        except Exception as e:
            logger.error(f"Failed to create grading system: {e}")
            return False, f"Failed to create grading system: {str(e)}", None
    
    @staticmethod
    async def get_grading_systems(
        db: AsyncIOMotorDatabase,
        include_default: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get available grading systems
        """
        
        filter_query = {}
        if not include_default:
            filter_query["is_default"] = False
        
        systems = await db.grading_systems.find(filter_query).to_list(length=None)
        
        for system in systems:
            system["_id"] = str(system["_id"])
            if system.get("created_by"):
                system["created_by"] = str(system["created_by"])
        
        return systems

    # =========================================================================
    # ACADEMIC ANALYTICS
    # =========================================================================
    
    @staticmethod
    async def get_class_performance(
        db: AsyncIOMotorDatabase,
        class_id: str,
        academic_year: Optional[str] = None,
        term: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive class performance analytics
        
        Args:
            db: Database connection
            class_id: Class ID
            academic_year: Academic year
            term: Academic term
            
        Returns:
            Dictionary with class performance metrics
        """
        
        if not academic_year:
            academic_year = ExamModel._get_current_academic_year()
        
        # Get all exams for the class
        exam_match = {
            "class_id": ObjectId(class_id),
            "academic_year": academic_year
        }
        if term:
            exam_match["term"] = term
        
        exams = await db.exams.find(exam_match).to_list(length=None)
        
        if not exams:
            return {"message": "No exams found for the specified period"}
        
        exam_ids = [exam["_id"] for exam in exams]
        
        # Aggregate performance by subject
        subject_pipeline = [
            {
                "$match": {
                    "exam_id": {"$in": exam_ids}
                }
            },
            {
                "$lookup": {
                    "from": "exams",
                    "localField": "exam_id",
                    "foreignField": "_id",
                    "as": "exam_info"
                }
            },
            {"$unwind": "$exam_info"},
            {
                "$group": {
                    "_id": "$exam_info.subject_name",
                    "average_score": {"$avg": "$percentage"},
                    "highest_score": {"$max": "$score"},
                    "lowest_score": {"$min": "$score"},
                    "total_students": {"$sum": 1},
                    "passed": {
                        "$sum": {"$cond": ["$is_passed", 1, 0]}
                    }
                }
            },
            {
                "$addFields": {
                    "pass_rate": {
                        "$round": [
                            {"$multiply": [{"$divide": ["$passed", "$total_students"]}, 100]},
                            2
                        ]
                    },
                    "average_score": {"$round": ["$average_score", 2]}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        subject_performance = await db.exam_results.aggregate(
            subject_pipeline
        ).to_list(length=None)
        
        # Get overall class statistics
        overall_pipeline = [
            {"$match": {"exam_id": {"$in": exam_ids}}},
            {
                "$group": {
                    "_id": None,
                    "class_average": {"$avg": "$percentage"},
                    "total_results": {"$sum": 1},
                    "total_passed": {"$sum": {"$cond": ["$is_passed", 1, 0]}}
                }
            }
        ]
        
        overall = await db.exam_results.aggregate(overall_pipeline).to_list(length=1)
        
        return {
            "class_id": class_id,
            "academic_year": academic_year,
            "term": term,
            "total_exams": len(exams),
            "subjects": subject_performance,
            "overall": {
                "class_average": round(overall[0]["class_average"], 2) if overall else 0,
                "total_results": overall[0]["total_results"] if overall else 0,
                "pass_rate": round(
                    (overall[0]["total_passed"] / overall[0]["total_results"] * 100), 2
                ) if overall and overall[0]["total_results"] > 0 else 0
            }
        }
    
    @staticmethod
    async def get_subject_performance_trend(
        db: AsyncIOMotorDatabase,
        class_id: str,
        subject_id: str,
        student_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get performance trend for a subject over time
        
        Args:
            db: Database connection
            class_id: Class ID
            subject_id: Subject ID
            student_id: Optional student ID for individual trend
            
        Returns:
            Dictionary with performance trend data
        """
        
        # Get all exams for this class and subject
        exams = await db.exams.find({
            "class_id": ObjectId(class_id),
            "subject_id": ObjectId(subject_id)
        }).sort("exam_date", 1).to_list(length=None)
        
        if not exams:
            return {"message": "No exams found"}
        
        exam_ids = [exam["_id"] for exam in exams]
        
        # Build match for results
        match_stage = {"exam_id": {"$in": exam_ids}}
        if student_id:
            match_stage["student_id"] = ObjectId(student_id)
        
        # Get results trend
        pipeline = [
            {"$match": match_stage},
            {
                "$lookup": {
                    "from": "exams",
                    "localField": "exam_id",
                    "foreignField": "_id",
                    "as": "exam_info"
                }
            },
            {"$unwind": "$exam_info"},
            {
                "$group": {
                    "_id": {
                        "exam_id": "$exam_id",
                        "exam_name": "$exam_info.exam_name",
                        "exam_type": "$exam_info.exam_type",
                        "exam_date": "$exam_info.exam_date",
                        "term": "$exam_info.term"
                    },
                    "average_score": {"$avg": "$percentage"},
                    "highest_score": {"$max": "$score"},
                    "lowest_score": {"$min": "$score"},
                    "total_students": {"$sum": 1}
                }
            },
            {"$sort": {"_id.exam_date": 1}}
        ]
        
        trend = await db.exam_results.aggregate(pipeline).to_list(length=None)
        
        # Format results
        trend_data = []
        for item in trend:
            trend_data.append({
                "exam_name": item["_id"]["exam_name"],
                "exam_type": item["_id"]["exam_type"],
                "term": item["_id"]["term"],
                "average_score": round(item["average_score"], 2),
                "highest_score": item["highest_score"],
                "lowest_score": item["lowest_score"],
                "total_students": item["total_students"]
            })
        
        return {
            "class_id": class_id,
            "subject_id": subject_id,
            "student_id": student_id,
            "trend": trend_data
        }

    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    async def _calculate_grade(
        db: AsyncIOMotorDatabase,
        score: float,
        exam: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate grade based on score and grading system
        
        Args:
            db: Database connection
            score: Student score
            exam: Exam document
            
        Returns:
            Dictionary with grade, remarks, and GPA
        """
        
        percentage = (score / exam["max_score"]) * 100
        
        # Get grading system
        grading_system = None
        if exam.get("grading_system_id"):
            grading_system = await db.grading_systems.find_one({
                "_id": ObjectId(exam["grading_system_id"])
            })
        
        if not grading_system:
            # Use default grading system
            grading_system = ExamModel.DEFAULT_GRADING
        
        # Find matching grade boundary
        for boundary in grading_system["grade_boundaries"]:
            if boundary["min_score"] <= percentage <= boundary["max_score"]:
                return {
                    "grade": boundary["grade"],
                    "remarks": boundary["remarks"],
                    "gpa": boundary["gpa"],
                    "percentage": round(percentage, 2)
                }
        
        # Fallback
        return {
            "grade": "F",
            "remarks": "Fail",
            "gpa": 0.0,
            "percentage": round(percentage, 2)
        }
    
    @staticmethod
    def _calculate_grade_from_percentage(percentage: float) -> str:
        """Calculate grade from percentage using default system"""
        
        for boundary in ExamModel.DEFAULT_GRADING["grade_boundaries"]:
            if boundary["min_score"] <= percentage <= boundary["max_score"]:
                return boundary["grade"]
        
        return "F"
    
    @staticmethod
    async def _get_attendance_summary(
        db: AsyncIOMotorDatabase,
        student_id: str,
        academic_year: str,
        term: str
    ) -> Dict[str, Any]:
        """Get attendance summary for report card"""
        
        pipeline = [
            {
                "$match": {
                    "student_id": ObjectId(student_id),
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
            if status in summary:
                summary[status] = result["count"]
            summary["total"] += result["count"]
        
        if summary["total"] > 0:
            summary["attendance_rate"] = round(
                ((summary["present"] + summary["late"]) / summary["total"] * 100), 2
            )
        else:
            summary["attendance_rate"] = 0
        
        return summary
    
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
    def _get_current_term() -> str:
        """Get current academic term"""
        current_month = datetime.now().month
        
        if 1 <= current_month <= 4:
            return "Term 1"
        elif 5 <= current_month <= 8:
            return "Term 2"
        else:
            return "Term 3"