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
    """
    
    EXAMS = "exams"
    EXAM_RESULTS = "exam_results"
    SUBJECTS = "subjects"
    CLASS_SUBJECTS = "class_subjects"
    REPORT_CARDS = "report_cards"
    GRADING_SYSTEMS = "grading_systems"
    
    EXAM_TYPES = ["mid_term", "end_term", "final", "mock", "quiz", "assignment", "project", "oral", "practical"]
    CURRICULUM_LEVELS = ["nursery", "primary"]
    
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
    
    SUBJECT_CATEGORIES = ["languages", "mathematics", "sciences", "social_studies", "religious_education", "creative_arts", "physical_education", "vocational", "local_language"]
    REPORT_CARD_STATUSES = ["draft", "published", "archived"]
    
    @staticmethod
    def get_exam_schema() -> Dict[str, Any]:
        return {"exam_name": "String", "exam_type": "String", "class_id": "ObjectId", "subject_id": "ObjectId", "exam_date": "Date", "start_time": "String", "end_time": "String", "max_score": "Float", "pass_mark": "Float", "weight": "Float", "academic_year": "String", "term": "String", "status": "String", "grading_system_id": "ObjectId", "instructions": "String", "created_by": "ObjectId", "created_at": "DateTime", "updated_at": "DateTime"}
    
    @staticmethod
    def get_result_schema() -> Dict[str, Any]:
        return {"exam_id": "ObjectId", "student_id": "ObjectId", "score": "Float", "grade": "String", "remarks": "String", "gpa_points": "Float", "is_passed": "Boolean", "recorded_by": "ObjectId", "verified_by": "ObjectId", "submission_date": "DateTime", "created_at": "DateTime", "updated_at": "DateTime"}
    
    @staticmethod
    async def create_indexes(db: AsyncIOMotorDatabase):
        try:
            await db.exams.create_index([("class_id", 1), ("subject_id", 1), ("term", 1), ("academic_year", 1)], name="idx_exam_class_subject_term")
            await db.exams.create_index("exam_date", name="idx_exam_date")
            await db.exams.create_index("exam_type", name="idx_exam_type")
            await db.exams.create_index("status", name="idx_exam_status")
            await db.exams.create_index("academic_year", name="idx_exam_year")
            await db.exam_results.create_index([("exam_id", 1), ("student_id", 1)], unique=True, name="idx_result_exam_student")
            await db.exam_results.create_index("student_id", name="idx_result_student")
            await db.exam_results.create_index("grade", name="idx_result_grade")
            await db.exam_results.create_index([("student_id", 1), ("exam_id", 1), ("score", -1)], name="idx_result_student_exam_score")
            await db.subjects.create_index([("subject_name", 1), ("curriculum_level", 1)], unique=True, name="idx_subject_name_level")
            await db.subjects.create_index("category", name="idx_subject_category")
            await db.class_subjects.create_index([("class_id", 1), ("subject_id", 1), ("academic_year", 1)], unique=True, name="idx_class_subject_year")
            await db.class_subjects.create_index("teacher_id", name="idx_class_subject_teacher")
            await db.report_cards.create_index([("student_id", 1), ("academic_year", 1), ("term", 1)], unique=True, name="idx_report_card_student")
            await db.report_cards.create_index("class_id", name="idx_report_card_class")
            await db.report_cards.create_index("status", name="idx_report_card_status")
            await db.grading_systems.create_index("name", unique=True, name="idx_grading_name")
            await db.grading_systems.create_index("is_default", name="idx_grading_default")
            logger.info("Exam collection indexes created successfully")
        except Exception as e:
            logger.error(f"Failed to create exam indexes: {e}")
            raise

    @staticmethod
    async def create_subject(db: AsyncIOMotorDatabase, subject_name: str, curriculum_level: str, category: Optional[str] = None, description: Optional[str] = None, subject_code: Optional[str] = None, created_by: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        if curriculum_level not in ExamModel.CURRICULUM_LEVELS: return False, f"Invalid curriculum level", None
        if category and category not in ExamModel.SUBJECT_CATEGORIES: return False, f"Invalid category", None
        if not subject_code: subject_code = subject_name[:3].upper() + "-" + curriculum_level[:3].upper()
        subject = {"subject_name": subject_name.strip(), "subject_code": subject_code.upper(), "curriculum_level": curriculum_level, "category": category, "description": description, "status": "active", "created_by": ObjectId(created_by) if created_by else None, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        try:
            result = await db.subjects.insert_one(subject)
            subject["_id"] = str(result.inserted_id)
            return True, f"Subject '{subject_name}' created successfully", subject
        except Exception as e:
            if "duplicate" in str(e).lower(): return False, f"Subject '{subject_name}' already exists", None
            return False, f"Failed to create subject: {str(e)}", None

    @staticmethod
    async def get_subjects(db: AsyncIOMotorDatabase, curriculum_level: Optional[str] = None, category: Optional[str] = None, status: str = "active") -> List[Dict[str, Any]]:
        filter_query = {"status": status}
        if curriculum_level: filter_query["curriculum_level"] = curriculum_level
        if category: filter_query["category"] = category
        subjects = await db.subjects.find(filter_query).sort("subject_name", 1).to_list(length=None)
        for subject in subjects:
            subject["_id"] = str(subject["_id"])
            if subject.get("created_by"): subject["created_by"] = str(subject["created_by"])
        return subjects

    @staticmethod
    async def assign_subject_to_class(db: AsyncIOMotorDatabase, class_id: str, subject_id: str, teacher_id: str, academic_year: Optional[str] = None, created_by: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc: return False, "Class not found", None
        subject = await db.subjects.find_one({"_id": ObjectId(subject_id)})
        if not subject: return False, "Subject not found", None
        teacher = await db.teachers.find_one({"_id": ObjectId(teacher_id), "status": "active"})
        if not teacher: return False, "Teacher not found or inactive", None
        if not academic_year: academic_year = ExamModel._get_current_academic_year()
        assignment = {"class_id": ObjectId(class_id), "class_name": class_doc["class_name"], "subject_id": ObjectId(subject_id), "subject_name": subject["subject_name"], "teacher_id": ObjectId(teacher_id), "teacher_name": f"{teacher['first_name']} {teacher['last_name']}", "academic_year": academic_year, "status": "active", "created_by": ObjectId(created_by) if created_by else None, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        try:
            result = await db.class_subjects.insert_one(assignment)
            assignment["_id"] = str(result.inserted_id)
            assignment["class_id"] = str(assignment["class_id"]); assignment["subject_id"] = str(assignment["subject_id"]); assignment["teacher_id"] = str(assignment["teacher_id"])
            await db.teachers.update_one({"_id": ObjectId(teacher_id)}, {"$addToSet": {"assigned_classes": ObjectId(class_id)}, "$set": {"updated_at": datetime.utcnow()}})
            return True, f"Subject assigned successfully", assignment
        except Exception as e:
            if "duplicate" in str(e).lower(): return False, "Subject already assigned to this class", None
            return False, f"Failed to assign subject: {str(e)}", None

    @staticmethod
    async def get_class_subjects(db: AsyncIOMotorDatabase, class_id: str, academic_year: Optional[str] = None) -> List[Dict[str, Any]]:
        if not academic_year: academic_year = ExamModel._get_current_academic_year()
        assignments = await db.class_subjects.find({"class_id": ObjectId(class_id), "academic_year": academic_year, "status": "active"}).sort("subject_name", 1).to_list(length=None)
        for a in assignments:
            a["_id"] = str(a["_id"]); a["class_id"] = str(a["class_id"]); a["subject_id"] = str(a["subject_id"]); a["teacher_id"] = str(a["teacher_id"])
        return assignments

    @staticmethod
    async def create_exam(db: AsyncIOMotorDatabase, exam_name: str, exam_type: str, class_id: str, subject_id: str, exam_date: Union[date, str], max_score: float = 100.0, pass_mark: Optional[float] = None, weight: float = 1.0, start_time: Optional[str] = None, end_time: Optional[str] = None, academic_year: Optional[str] = None, term: Optional[str] = None, instructions: Optional[str] = None, grading_system_id: Optional[str] = None, created_by: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        if exam_type not in ExamModel.EXAM_TYPES: return False, f"Invalid exam type", None
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc: return False, "Class not found", None
        subject = await db.subjects.find_one({"_id": ObjectId(subject_id)})
        if not subject: return False, "Subject not found", None
        if isinstance(exam_date, str):
            try: exam_date = datetime.strptime(exam_date, "%Y-%m-%d").date()
            except ValueError: return False, "Invalid exam date format", None
        if max_score <= 0: return False, "Maximum score must be greater than 0", None
        if not pass_mark: pass_mark = max_score * 0.5
        if pass_mark > max_score: return False, "Pass mark cannot exceed maximum score", None
        if not academic_year: academic_year = ExamModel._get_current_academic_year()
        if not term: term = ExamModel._get_current_term()
        exam = {"exam_name": exam_name.strip(), "exam_type": exam_type, "class_id": ObjectId(class_id), "class_name": class_doc["class_name"], "subject_id": ObjectId(subject_id), "subject_name": subject["subject_name"], "exam_date": datetime.combine(exam_date, datetime.min.time()), "start_time": start_time, "end_time": end_time, "max_score": max_score, "pass_mark": pass_mark, "weight": weight, "academic_year": academic_year, "term": term, "status": "scheduled", "grading_system_id": ObjectId(grading_system_id) if grading_system_id else None, "instructions": instructions, "results_entered": 0, "total_students": 0, "created_by": ObjectId(created_by) if created_by else None, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        try:
            existing = await db.exams.find_one({"class_id": ObjectId(class_id), "subject_id": ObjectId(subject_id), "exam_type": exam_type, "term": term, "academic_year": academic_year})
            if existing: return False, f"An exam already exists for this subject in {term}", None
            result = await db.exams.insert_one(exam)
            exam["_id"] = str(result.inserted_id); exam["class_id"] = str(exam["class_id"]); exam["subject_id"] = str(exam["subject_id"])
            return True, f"Exam created successfully", exam
        except Exception as e:
            return False, f"Failed to create exam: {str(e)}", None

    @staticmethod
    async def get_exams(db: AsyncIOMotorDatabase, class_id: Optional[str] = None, subject_id: Optional[str] = None, exam_type: Optional[str] = None, academic_year: Optional[str] = None, term: Optional[str] = None, status: Optional[str] = None, limit: int = 50, skip: int = 0) -> Dict[str, Any]:
        filter_query = {}
        if class_id: filter_query["class_id"] = ObjectId(class_id)
        if subject_id: filter_query["subject_id"] = ObjectId(subject_id)
        if exam_type: filter_query["exam_type"] = exam_type
        if academic_year: filter_query["academic_year"] = academic_year
        if term: filter_query["term"] = term
        if status: filter_query["status"] = status
        total = await db.exams.count_documents(filter_query)
        exams = await db.exams.find(filter_query).sort([("exam_date", -1), ("exam_name", 1)]).skip(skip).limit(limit).to_list(length=limit)
        for exam in exams:
            exam["_id"] = str(exam["_id"]); exam["class_id"] = str(exam["class_id"]); exam["subject_id"] = str(exam["subject_id"])
            if exam.get("grading_system_id"): exam["grading_system_id"] = str(exam["grading_system_id"])
            if exam.get("created_by"): exam["created_by"] = str(exam["created_by"])
        return {"exams": exams, "total": total, "limit": limit, "skip": skip, "page": (skip // limit) + 1 if limit > 0 else 1, "total_pages": (total + limit - 1) // limit if limit > 0 else 1}

    @staticmethod
    async def record_result(db: AsyncIOMotorDatabase, exam_id: str, student_id: str, score: float, recorded_by: str, remarks: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
        if not exam: return False, "Exam not found", None
        student = await db.students.find_one({"_id": ObjectId(student_id), "status": "active"})
        if not student: return False, "Student not found or inactive", None
        if str(student.get("current_class_id")) != str(exam["class_id"]): return False, "Student is not in the class for this exam", None
        if score < 0: return False, "Score cannot be negative", None
        if score > exam["max_score"]: return False, f"Score cannot exceed {exam['max_score']}", None
        grade_info = await ExamModel._calculate_grade(db, score, exam)
        result = {"exam_id": ObjectId(exam_id), "student_id": ObjectId(student_id), "student_name": f"{student['first_name']} {student['last_name']}", "score": score, "grade": grade_info["grade"], "remarks": remarks or grade_info["remarks"], "gpa_points": grade_info["gpa"], "is_passed": score >= exam["pass_mark"], "max_score": exam["max_score"], "percentage": round((score / exam["max_score"] * 100), 2), "recorded_by": ObjectId(recorded_by), "verified_by": None, "submission_date": datetime.utcnow(), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        try:
            filter_query = {"exam_id": ObjectId(exam_id), "student_id": ObjectId(student_id)}
            db_result = await db.exam_results.update_one(filter_query, {"$set": result, "$setOnInsert": {"created_at": datetime.utcnow()}}, upsert=True)
            total_results = await db.exam_results.count_documents({"exam_id": ObjectId(exam_id)})
            total_students = await db.students.count_documents({"current_class_id": exam["class_id"], "status": "active"})
            await db.exams.update_one({"_id": ObjectId(exam_id)}, {"$set": {"results_entered": total_results, "total_students": total_students, "status": "completed" if total_results >= total_students else "ongoing", "updated_at": datetime.utcnow()}})
            result["_id"] = str(db_result.upserted_id) if db_result.upserted_id else None
            result["exam_id"] = str(result["exam_id"]); result["student_id"] = str(result["student_id"]); result["recorded_by"] = str(result["recorded_by"])
            return True, f"Result {'created' if db_result.upserted_id else 'updated'} - {student['first_name']}: {score}/{exam['max_score']} ({grade_info['grade']})", result
        except Exception as e:
            return False, f"Failed to record result: {str(e)}", None

    @staticmethod
    async def bulk_record_results(db: AsyncIOMotorDatabase, exam_id: str, results: List[Dict[str, Any]], recorded_by: str) -> Tuple[int, int, List[str]]:
        successful, failed, errors = 0, 0, []
        for r in results:
            success, message, _ = await ExamModel.record_result(db=db, exam_id=exam_id, student_id=r.get("student_id"), score=r.get("score"), recorded_by=recorded_by, remarks=r.get("remarks"))
            if success: successful += 1
            else: failed += 1; errors.append(message)
        return successful, failed, errors

    @staticmethod
    async def get_exam_results(db: AsyncIOMotorDatabase, exam_id: str, sort_by: str = "score", sort_order: int = -1) -> Dict[str, Any]:
        exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
        if not exam: return {"error": "Exam not found"}
        results = await db.exam_results.find({"exam_id": ObjectId(exam_id)}).sort(sort_by, sort_order).to_list(length=None)
        scores = [r["score"] for r in results]; total_students = len(scores)
        statistics = {"total_students": total_students, "highest_score": max(scores) if scores else 0, "lowest_score": min(scores) if scores else 0, "average_score": round(sum(scores) / total_students, 2) if scores else 0, "pass_rate": round((sum(1 for r in results if r["is_passed"]) / total_students * 100), 2) if total_students else 0, "grade_distribution": {}}
        for result in results:
            grade = result["grade"]
            if grade not in statistics["grade_distribution"]: statistics["grade_distribution"][grade] = {"count": 0, "percentage": 0}
            statistics["grade_distribution"][grade]["count"] += 1
        for grade in statistics["grade_distribution"]:
            statistics["grade_distribution"][grade]["percentage"] = round((statistics["grade_distribution"][grade]["count"] / total_students * 100), 2) if total_students else 0
        for result in results:
            result["_id"] = str(result["_id"]); result["exam_id"] = str(result["exam_id"]); result["student_id"] = str(result["student_id"]); result["recorded_by"] = str(result["recorded_by"])
            if result.get("verified_by"): result["verified_by"] = str(result["verified_by"])
        exam["_id"] = str(exam["_id"]); exam["class_id"] = str(exam["class_id"]); exam["subject_id"] = str(exam["subject_id"])
        return {"exam": exam, "results": results, "statistics": statistics}

    @staticmethod
    async def get_student_results(db: AsyncIOMotorDatabase, student_id: str, academic_year: Optional[str] = None, term: Optional[str] = None) -> Dict[str, Any]:
        if not academic_year: academic_year = ExamModel._get_current_academic_year()
        exams = await db.exams.find({"academic_year": academic_year, **({"term": term} if term else {})}).to_list(length=None)
        exam_ids = [e["_id"] for e in exams]; exam_lookup = {str(e["_id"]): e for e in exams}
        results = await db.exam_results.find({"student_id": ObjectId(student_id), "exam_id": {"$in": exam_ids}}).to_list(length=None)
        subject_results = {}; total_score = 0; total_max = 0
        for result in results:
            exam = exam_lookup.get(str(result["exam_id"]))
            if not exam: continue
            subject_name = exam["subject_name"]
            if subject_name not in subject_results: subject_results[subject_name] = {"subject_name": subject_name, "exams": [], "total_score": 0, "total_max": 0, "average_percentage": 0, "grade": ""}
            result["_id"] = str(result["_id"]); result["exam_id"] = str(result["exam_id"]); result["student_id"] = str(result["student_id"]); result["exam_type"] = exam["exam_type"]; result["exam_name"] = exam["exam_name"]
            subject_results[subject_name]["exams"].append(result)
            subject_results[subject_name]["total_score"] += result["score"]; subject_results[subject_name]["total_max"] += exam["max_score"]
            total_score += result["score"]; total_max += exam["max_score"]
        for data in subject_results.values():
            if data["total_max"] > 0:
                data["average_percentage"] = round((data["total_score"] / data["total_max"] * 100), 2)
                data["grade"] = ExamModel._calculate_grade_from_percentage(data["average_percentage"])
        overall_percentage = round((total_score / total_max * 100), 2) if total_max > 0 else 0
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if student:
            student["_id"] = str(student["_id"])
            if student.get("current_class_id"): student["current_class_id"] = str(student["current_class_id"])
        return {"student": student, "academic_year": academic_year, "term": term, "subjects": list(subject_results.values()), "overall": {"total_score": total_score, "total_max": total_max, "percentage": overall_percentage, "grade": ExamModel._calculate_grade_from_percentage(overall_percentage), "subjects_count": len(subject_results)}}

    @staticmethod
    async def generate_report_card(db: AsyncIOMotorDatabase, student_id: str, class_id: str, academic_year: str, term: str, generated_by: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if not student: return False, "Student not found", None
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc: return False, "Class not found", None
        results_data = await ExamModel.get_student_results(db, student_id, academic_year, term)
        attendance_summary = await ExamModel._get_attendance_summary(db, student_id, academic_year, term)
        class_teacher = await db.teachers.find_one({"class_teacher_of": ObjectId(class_id), "status": "active"})
        report_card = {"student_id": ObjectId(student_id), "student_name": f"{student['first_name']} {student['last_name']}", "class_id": ObjectId(class_id), "class_name": class_doc["class_name"], "academic_year": academic_year, "term": term, "subjects": results_data.get("subjects", []), "overall_performance": results_data.get("overall", {}), "attendance": attendance_summary, "class_teacher_name": f"{class_teacher['first_name']} {class_teacher['last_name']}" if class_teacher else "", "class_teacher_remarks": "", "head_teacher_remarks": "", "status": "draft", "generated_by": ObjectId(generated_by) if generated_by else None, "generated_at": datetime.utcnow(), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        try:
            filter_query = {"student_id": ObjectId(student_id), "academic_year": academic_year, "term": term}
            result = await db.report_cards.update_one(filter_query, {"$set": report_card}, upsert=True)
            report_card["_id"] = str(result.upserted_id if result.upserted_id else (await db.report_cards.find_one(filter_query))["_id"])
            report_card["student_id"] = str(report_card["student_id"]); report_card["class_id"] = str(report_card["class_id"])
            return True, f"Report card {'created' if result.upserted_id else 'updated'}", report_card
        except Exception as e:
            return False, f"Failed to generate report card: {str(e)}", None

    @staticmethod
    async def _calculate_grade(db: AsyncIOMotorDatabase, score: float, exam: Dict[str, Any]) -> Dict[str, Any]:
        percentage = (score / exam["max_score"]) * 100
        grading_system = ExamModel.DEFAULT_GRADING
        if exam.get("grading_system_id"):
            gs = await db.grading_systems.find_one({"_id": ObjectId(exam["grading_system_id"])})
            if gs: grading_system = gs
        for boundary in grading_system["grade_boundaries"]:
            if boundary["min_score"] <= percentage <= boundary["max_score"]:
                return {"grade": boundary["grade"], "remarks": boundary["remarks"], "gpa": boundary["gpa"], "percentage": round(percentage, 2)}
        return {"grade": "F", "remarks": "Fail", "gpa": 0.0, "percentage": round(percentage, 2)}

    @staticmethod
    def _calculate_grade_from_percentage(percentage: float) -> str:
        for boundary in ExamModel.DEFAULT_GRADING["grade_boundaries"]:
            if boundary["min_score"] <= percentage <= boundary["max_score"]: return boundary["grade"]
        return "F"

    @staticmethod
    async def _get_attendance_summary(db: AsyncIOMotorDatabase, student_id: str, academic_year: str, term: str) -> Dict[str, Any]:
        results = await db.attendance.aggregate([{"$match": {"student_id": ObjectId(student_id), "academic_year": academic_year, "term": term}}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]).to_list(length=None)
        summary = {"present": 0, "absent": 0, "excused": 0, "late": 0, "total": 0}
        for r in results:
            if r["_id"] in summary: summary[r["_id"]] = r["count"]
            summary["total"] += r["count"]
        summary["attendance_rate"] = round(((summary["present"] + summary["late"]) / summary["total"] * 100), 2) if summary["total"] > 0 else 0
        return summary

    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    def _get_current_academic_year() -> str:
        """
        Get current academic year dynamically.
        South Sudan Calendar: Academic year runs February to November.
        January belongs to the PREVIOUS academic year.
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
        """
        month = datetime.now().month
        if 2 <= month <= 4: return "Term 1"
        elif 5 <= month <= 7: return "Term 2"
        elif 9 <= month <= 11: return "Term 3"
        elif month == 8: return "Term 2 Break"
        else: return "Annual Break"
