"""
Exam Service
Handles examination business logic, grading, result processing, and academic analytics
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.models.exam import ExamModel

logger = logging.getLogger(__name__)


class ExamService:
    """Examination management service with business logic"""
    
    # Default pass mark percentage
    DEFAULT_PASS_MARK = 50
    # Minimum score
    MIN_SCORE = 0
    # Maximum score default
    MAX_SCORE_DEFAULT = 100
    # Grade boundaries
    GRADE_BOUNDARIES = {
        "A": {"min": 80, "max": 100, "remarks": "Excellent", "gpa": 4.0},
        "B": {"min": 70, "max": 79, "remarks": "Very Good", "gpa": 3.0},
        "C": {"min": 60, "max": 69, "remarks": "Good", "gpa": 2.0},
        "D": {"min": 50, "max": 59, "remarks": "Satisfactory", "gpa": 1.0},
        "F": {"min": 0, "max": 49, "remarks": "Fail", "gpa": 0.0}
    }
    
    @staticmethod
    async def create_exam_with_validation(
        db: AsyncIOMotorDatabase,
        exam_name: str,
        exam_type: str,
        class_id: str,
        subject_id: str,
        exam_date: date,
        max_score: float = 100.0,
        term: Optional[str] = None,
        academic_year: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create exam with additional validations
        
        Args:
            db: Database connection
            exam_name: Exam name
            exam_type: Type of exam
            class_id: Class ID
            subject_id: Subject ID
            exam_date: Exam date
            max_score: Maximum score
            term: Academic term
            academic_year: Academic year
            created_by: Creator ID
            
        Returns:
            Tuple of (success, message, exam_document)
        """
        
        # Validate subject is assigned to class
        if not academic_year:
            academic_year = ExamService._get_current_academic_year()
        
        assignment = await db.class_subjects.find_one({
            "class_id": ObjectId(class_id),
            "subject_id": ObjectId(subject_id),
            "academic_year": academic_year,
            "status": "active"
        })
        
        if not assignment:
            return False, "Subject is not assigned to this class for the academic year", None
        
        # Validate exam date is within term
        if term:
            calendar = await db.academic_calendar.find_one({
                "academic_year": academic_year,
                "status": "active"
            })
            
            if calendar:
                term_config = next(
                    (t for t in calendar.get("terms", []) if t["term_name"] == term),
                    None
                )
                
                if term_config:
                    term_start = term_config["start_date"]
                    term_end = term_config["end_date"]
                    
                    if isinstance(term_start, datetime):
                        term_start = term_start.date()
                    if isinstance(term_end, datetime):
                        term_end = term_end.date()
                    
                    if exam_date < term_start or exam_date > term_end:
                        return False, f"Exam date must be within {term} ({term_start} to {term_end})", None
        
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
        
        # Create exam
        success, message, exam = await ExamModel.create_exam(
            db=db,
            exam_name=exam_name,
            exam_type=exam_type,
            class_id=class_id,
            subject_id=subject_id,
            exam_date=exam_date,
            max_score=max_score,
            pass_mark=max_score * (ExamService.DEFAULT_PASS_MARK / 100),
            academic_year=academic_year,
            term=term,
            created_by=created_by
        )
        
        return success, message, exam
    
    @staticmethod
    async def process_exam_results(
        db: AsyncIOMotorDatabase,
        exam_id: str,
        results: List[Dict[str, Any]],
        recorded_by: str,
        verify_grades: bool = True
    ) -> Dict[str, Any]:
        """
        Process and validate exam results
        
        Args:
            db: Database connection
            exam_id: Exam ID
            results: List of {student_id, score, remarks}
            recorded_by: Teacher recording results
            verify_grades: Verify grade calculations
            
        Returns:
            Processing results
        """
        
        # Get exam info
        exam = await db.exams.find_one({"_id": ObjectId(exam_id)})
        if not exam:
            return {"success": False, "message": "Exam not found"}
        
        max_score = exam["max_score"]
        pass_mark = exam["pass_mark"]
        
        successful = 0
        failed = 0
        errors = []
        processed_results = []
        
        # Get class students for validation
        class_students = await db.students.find({
            "current_class_id": exam["class_id"],
            "status": "active"
        }).to_list(length=None)
        
        valid_student_ids = {str(s["_id"]) for s in class_students}
        
        for result_data in results:
            student_id = result_data.get("student_id")
            score = result_data.get("score")
            remarks = result_data.get("remarks", "")
            
            # Validate student
            if student_id not in valid_student_ids:
                failed += 1
                errors.append(f"Student {student_id}: Not in this class or inactive")
                continue
            
            # Validate score
            if score is None or score < ExamService.MIN_SCORE:
                failed += 1
                errors.append(f"Student {student_id}: Invalid score")
                continue
            
            if score > max_score:
                failed += 1
                errors.append(f"Student {student_id}: Score exceeds maximum ({max_score})")
                continue
            
            # Calculate grade
            percentage = (score / max_score) * 100
            grade_info = ExamService._calculate_grade(percentage)
            
            # Record result
            success, message, result = await ExamModel.record_result(
                db=db,
                exam_id=exam_id,
                student_id=student_id,
                score=score,
                recorded_by=recorded_by,
                remarks=remarks
            )
            
            if success:
                successful += 1
                processed_results.append({
                    "student_id": student_id,
                    "score": score,
                    "grade": grade_info["grade"],
                    "percentage": round(percentage, 2),
                    "is_passed": score >= pass_mark
                })
            else:
                failed += 1
                errors.append(f"Student {student_id}: {message}")
        
        # Update exam status
        total_results = await db.exam_results.count_documents({"exam_id": ObjectId(exam_id)})
        total_students = len(class_students)
        
        new_status = "completed" if total_results >= total_students else "ongoing"
        await db.exams.update_one(
            {"_id": ObjectId(exam_id)},
            {
                "$set": {
                    "results_entered": total_results,
                    "total_students": total_students,
                    "status": new_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Calculate statistics
        if processed_results:
            scores = [r["score"] for r in processed_results]
            avg_score = round(sum(scores) / len(scores), 2)
            highest = max(scores)
            lowest = min(scores)
            passed = sum(1 for r in processed_results if r["is_passed"])
            pass_rate = round((passed / len(processed_results) * 100), 2)
        else:
            avg_score = highest = lowest = pass_rate = 0
        
        return {
            "success": True,
            "successful": successful,
            "failed": failed,
            "errors": errors,
            "statistics": {
                "total_processed": len(processed_results),
                "average_score": avg_score,
                "highest_score": highest,
                "lowest_score": lowest,
                "pass_rate": pass_rate,
                "grade_distribution": ExamService._calculate_grade_distribution(processed_results)
            }
        }
    
    @staticmethod
    async def generate_report_card(
        db: AsyncIOMotorDatabase,
        student_id: str,
        class_id: str,
        academic_year: str,
        term: str,
        include_teacher_remarks: bool = True,
        generated_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Generate comprehensive report card
        
        Args:
            db: Database connection
            student_id: Student ID
            class_id: Class ID
            academic_year: Academic year
            term: Academic term
            include_teacher_remarks: Include teacher remarks
            generated_by: User generating report
            
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
        
        # Get exam results
        results_data = await ExamModel.get_student_results(
            db, student_id, academic_year, term
        )
        
        # Get attendance summary
        attendance = await ExamService._get_attendance_for_report(
            db, student_id, academic_year, term
        )
        
        # Calculate overall grade
        overall = results_data.get("overall", {})
        overall_percentage = overall.get("percentage", 0)
        overall_grade = ExamService._calculate_grade(overall_percentage)
        
        # Get subject details
        subjects_detail = []
        for subject in results_data.get("subjects", []):
            subject_exams = subject.get("exams", [])
            
            # Get highest and lowest exam scores
            exam_scores = [e["score"] for e in subject_exams]
            
            subjects_detail.append({
                "subject_name": subject["subject_name"],
                "exams": subject_exams,
                "total_score": subject.get("total_score", 0),
                "total_max": subject.get("total_max", 0),
                "average_percentage": subject.get("average_percentage", 0),
                "grade": subject.get("grade", ""),
                "highest_score": max(exam_scores) if exam_scores else 0,
                "lowest_score": min(exam_scores) if exam_scores else 0,
                "exams_count": len(subject_exams)
            })
        
        # Get class teacher
        class_teacher = None
        if class_doc.get("class_teacher_id"):
            teacher = await db.teachers.find_one({"_id": class_doc["class_teacher_id"]})
            if teacher:
                class_teacher = f"{teacher['first_name']} {teacher['last_name']}"
        
        # Generate teacher remarks based on performance
        class_teacher_remarks = ""
        head_teacher_remarks = ""
        
        if include_teacher_remarks:
            if overall_percentage >= 80:
                class_teacher_remarks = "Excellent performance! Keep up the great work."
                head_teacher_remarks = "Outstanding achievement. You make the school proud."
            elif overall_percentage >= 70:
                class_teacher_remarks = "Very good performance. Continue to work hard."
                head_teacher_remarks = "Good performance. Strive for excellence."
            elif overall_percentage >= 60:
                class_teacher_remarks = "Good performance. There is room for improvement."
                head_teacher_remarks = "Satisfactory. Put in more effort next term."
            elif overall_percentage >= 50:
                class_teacher_remarks = "Average performance. Need to put in more effort."
                head_teacher_remarks = "Work harder. Attend all classes and complete assignments."
            else:
                class_teacher_remarks = "Below average. Requires significant improvement."
                head_teacher_remarks = "Serious intervention needed. Parents should be consulted."
        
        # Build report card
        report_card = {
            "student": {
                "id": student_id,
                "name": f"{student['first_name']} {student['last_name']}",
                "student_id_number": student.get("student_id_number"),
                "gender": student.get("gender"),
                "age": ExamService._calculate_age(student.get("date_of_birth"))
            },
            "class": {
                "id": class_id,
                "name": class_doc["class_name"],
                "level": class_doc["class_level"],
                "academic_year": academic_year,
                "term": term
            },
            "subjects": subjects_detail,
            "overall": {
                "total_score": overall.get("total_score", 0),
                "total_max": overall.get("total_max", 0),
                "percentage": overall_percentage,
                "grade": overall_grade["grade"],
                "remarks": overall_grade["remarks"],
                "gpa": overall_grade["gpa"],
                "rank": None  # Would need class ranking calculation
            },
            "attendance": attendance,
            "teacher_remarks": {
                "class_teacher": class_teacher,
                "class_teacher_remarks": class_teacher_remarks,
                "head_teacher_remarks": head_teacher_remarks
            },
            "generated_at": datetime.utcnow(),
            "generated_by": generated_by
        }
        
        # Save report card
        success, message, saved_card = await ExamModel.generate_report_card(
            db=db,
            student_id=student_id,
            class_id=class_id,
            academic_year=academic_year,
            term=term,
            generated_by=generated_by
        )
        
        if success:
            report_card["report_card_id"] = saved_card.get("_id")
        
        return True, "Report card generated successfully", report_card
    
    @staticmethod
    async def generate_class_report_cards(
        db: AsyncIOMotorDatabase,
        class_id: str,
        academic_year: str,
        term: str,
        generated_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate report cards for entire class
        
        Args:
            db: Database connection
            class_id: Class ID
            academic_year: Academic year
            term: Academic term
            generated_by: User generating reports
            
        Returns:
            Generation results
        """
        
        students = await db.students.find({
            "current_class_id": ObjectId(class_id),
            "status": "active"
        }).to_list(length=None)
        
        generated = 0
        failed = 0
        errors = []
        
        for student in students:
            success, message, report_card = await ExamService.generate_report_card(
                db=db,
                student_id=str(student["_id"]),
                class_id=class_id,
                academic_year=academic_year,
                term=term,
                include_teacher_remarks=True,
                generated_by=generated_by
            )
            
            if success:
                generated += 1
            else:
                failed += 1
                errors.append(f"{student['first_name']} {student['last_name']}: {message}")
        
        # Publish report cards
        published, total = await ExamModel.publish_report_cards(
            db=db,
            class_id=class_id,
            academic_year=academic_year,
            term=term,
            published_by=generated_by
        )
        
        return {
            "total_students": len(students),
            "generated": generated,
            "failed": failed,
            "published": published,
            "errors": errors
        }
    
    @staticmethod
    async def get_academic_analytics(
        db: AsyncIOMotorDatabase,
        class_id: Optional[str] = None,
        academic_year: Optional[str] = None,
        term: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive academic analytics
        
        Args:
            db: Database connection
            class_id: Optional class filter
            academic_year: Academic year
            term: Academic term
            
        Returns:
            Academic analytics
        """
        if not academic_year:
            academic_year = ExamService._get_current_academic_year()
        
        analytics = {
            "academic_year": academic_year,
            "term": term,
            "generated_at": datetime.utcnow()
        }
        
        if class_id:
            # Class-level analytics
            performance = await ExamModel.get_class_performance(
                db, class_id, academic_year, term
            )
            
            rankings = await ExamModel.get_class_ranking(
                db, class_id, academic_year, term, limit=10
            )
            
            class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
            
            analytics["class"] = {
                "id": class_id,
                "name": class_info["class_name"] if class_info else "Unknown",
                "level": class_info["class_level"] if class_info else "Unknown"
            }
            analytics["performance"] = performance
            analytics["top_students"] = rankings
            
            # Grade distribution
            all_grades = []
            for subject in performance.get("subjects", []):
                all_grades.extend(subject.get("grades", []))
            
            analytics["grade_distribution"] = ExamService._calculate_grade_distribution(
                [{"grade": g} for g in all_grades]
            )
        
        else:
            # School-wide analytics
            classes = await db.classes.find({
                "academic_year": academic_year,
                "status": "active"
            }).to_list(length=None)
            
            class_summaries = []
            total_pass_rate = 0
            total_students = 0
            
            for class_doc in classes:
                performance = await ExamModel.get_class_performance(
                    db, str(class_doc["_id"]), academic_year, term
                )
                
                overall = performance.get("overall", {})
                
                class_summaries.append({
                    "class_id": str(class_doc["_id"]),
                    "class_name": class_doc["class_name"],
                    "class_level": class_doc["class_level"],
                    "class_average": overall.get("class_average", 0),
                    "pass_rate": overall.get("pass_rate", 0),
                    "total_results": overall.get("total_results", 0)
                })
                
                total_pass_rate += overall.get("pass_rate", 0)
                total_students += overall.get("total_results", 0)
            
            class_summaries.sort(key=lambda x: x["pass_rate"], reverse=True)
            
            analytics["class_summaries"] = class_summaries
            analytics["overall"] = {
                "average_pass_rate": round(
                    total_pass_rate / len(class_summaries), 2
                ) if class_summaries else 0,
                "total_classes": len(class_summaries),
                "total_students_assessed": total_students
            }
            
            # Best and worst performing classes
            if class_summaries:
                analytics["best_performing"] = class_summaries[0]
                analytics["worst_performing"] = class_summaries[-1]
        
        return analytics
    
    @staticmethod
    async def compare_student_performance(
        db: AsyncIOMotorDatabase,
        student_id: str,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compare student performance across terms
        
        Args:
            db: Database connection
            student_id: Student ID
            academic_year: Academic year
            
        Returns:
            Performance comparison
        """
        if not academic_year:
            academic_year = ExamService._get_current_academic_year()
        
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if not student:
            return {}
        
        comparison = {
            "student_id": student_id,
            "student_name": f"{student['first_name']} {student['last_name']}",
            "academic_year": academic_year,
            "terms": {}
        }
        
        for term_name in ["Term 1", "Term 2", "Term 3"]:
            results = await ExamModel.get_student_results(
                db, student_id, academic_year, term_name
            )
            
            comparison["terms"][term_name] = {
                "overall_percentage": results.get("overall", {}).get("percentage", 0),
                "overall_grade": results.get("overall", {}).get("grade", ""),
                "subjects_count": results.get("overall", {}).get("subjects_count", 0),
                "subjects": results.get("subjects", [])
            }
        
        # Calculate improvement
        terms_data = list(comparison["terms"].values())
        if len(terms_data) >= 2:
            first_term = terms_data[0]["overall_percentage"]
            last_term = terms_data[-1]["overall_percentage"]
            comparison["improvement"] = {
                "from": first_term,
                "to": last_term,
                "change": round(last_term - first_term, 2),
                "trend": "improving" if last_term > first_term else "declining" if last_term < first_term else "stable"
            }
        
        # Subject-wise improvement
        subject_trends = {}
        for term_name, term_data in comparison["terms"].items():
            for subject in term_data.get("subjects", []):
                subject_name = subject["subject_name"]
                if subject_name not in subject_trends:
                    subject_trends[subject_name] = {}
                subject_trends[subject_name][term_name] = subject.get("average_percentage", 0)
        
        comparison["subject_trends"] = subject_trends
        
        return comparison
    
    @staticmethod
    async def identify_at_risk_students(
        db: AsyncIOMotorDatabase,
        class_id: Optional[str] = None,
        academic_year: Optional[str] = None,
        term: Optional[str] = None,
        threshold: float = 50.0
    ) -> List[Dict[str, Any]]:
        """
        Identify students at risk academically
        
        Args:
            db: Database connection
            class_id: Optional class filter
            academic_year: Academic year
            term: Academic term
            threshold: Percentage threshold for risk
            
        Returns:
            List of at-risk students
        """
        if not academic_year:
            academic_year = ExamService._get_current_academic_year()
        
        filter_query = {"status": "active"}
        if class_id:
            filter_query["current_class_id"] = ObjectId(class_id)
        
        students = await db.students.find(filter_query).to_list(length=None)
        
        at_risk = []
        
        for student in students:
            results = await ExamModel.get_student_results(
                db, str(student["_id"]), academic_year, term
            )
            
            overall = results.get("overall", {}).get("percentage", 0)
            
            if overall < threshold:
                # Get attendance
                attendance = await ExamService._get_attendance_for_report(
                    db, str(student["_id"]), academic_year, term
                )
                
                # Identify weak subjects
                weak_subjects = []
                for subject in results.get("subjects", []):
                    if subject.get("average_percentage", 0) < threshold:
                        weak_subjects.append({
                            "subject": subject["subject_name"],
                            "percentage": subject["average_percentage"],
                            "grade": subject.get("grade", "")
                        })
                
                risk_level = "high" if overall < 40 else "medium" if overall < threshold else "low"
                
                at_risk.append({
                    "student_id": str(student["_id"]),
                    "student_name": f"{student['first_name']} {student['last_name']}",
                    "overall_percentage": overall,
                    "attendance_rate": attendance.get("attendance_rate", 0),
                    "weak_subjects": weak_subjects,
                    "risk_level": risk_level,
                    "recommendations": [
                        f"Extra tutoring in: {', '.join(s['subject'] for s in weak_subjects)}",
                        "Regular attendance monitoring",
                        "Parent-teacher conference recommended",
                        "Individual learning plan needed"
                    ] if risk_level == "high" else [
                        f"Focus on improving: {', '.join(s['subject'] for s in weak_subjects)}",
                        "Regular study schedule"
                    ]
                })
        
        # Sort by risk (lowest percentage first)
        at_risk.sort(key=lambda x: x["overall_percentage"])
        
        return at_risk
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    def _calculate_grade(percentage: float) -> Dict[str, Any]:
        """Calculate grade from percentage"""
        for grade, boundary in ExamService.GRADE_BOUNDARIES.items():
            if boundary["min"] <= percentage <= boundary["max"]:
                return {
                    "grade": grade,
                    "remarks": boundary["remarks"],
                    "gpa": boundary["gpa"]
                }
        
        return {"grade": "F", "remarks": "Fail", "gpa": 0.0}
    
    @staticmethod
    def _calculate_grade_distribution(results: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Calculate grade distribution from results"""
        distribution = {grade: {"count": 0, "percentage": 0.0} for grade in ExamService.GRADE_BOUNDARIES}
        total = len(results)
        
        if total == 0:
            return distribution
        
        for result in results:
            grade = result.get("grade", "F")
            if grade in distribution:
                distribution[grade]["count"] += 1
        
        for grade in distribution:
            distribution[grade]["percentage"] = round(
                (distribution[grade]["count"] / total * 100), 2
            )
        
        return distribution
    
    @staticmethod
    async def _get_attendance_for_report(
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
        
        summary = {"present": 0, "absent": 0, "excused": 0, "late": 0, "total": 0}
        
        for result in results:
            if result["_id"] in summary:
                summary[result["_id"]] = result["count"]
            summary["total"] += result["count"]
        
        if summary["total"] > 0:
            summary["attendance_rate"] = round(
                ((summary["present"] + summary["late"]) / summary["total"] * 100), 2
            )
        else:
            summary["attendance_rate"] = 0
        
        # Calculate times school opened
        calendar = await db.academic_calendar.find_one({
            "academic_year": academic_year,
            "status": "active"
        })
        
        school_days = 0
        if calendar:
            term_config = next(
                (t for t in calendar.get("terms", []) if t["term_name"] == term),
                None
            )
            if term_config:
                term_start = term_config["start_date"]
                term_end = term_config["end_date"]
                if isinstance(term_start, datetime):
                    term_start = term_start.date()
                if isinstance(term_end, datetime):
                    term_end = term_end.date()
                school_days = term_config.get("total_school_days", 
                    (term_end - term_start).days if term_start and term_end else 0
                )
        
        summary["school_days"] = school_days
        
        return summary
    
    @staticmethod
    def _calculate_age(dob: Any) -> Optional[int]:
        """Calculate age from date of birth"""
        if not dob:
            return None
        
        if isinstance(dob, datetime):
            dob = dob.date()
        
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    
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
        """Get current term"""
        current_month = datetime.now().month
        if 1 <= current_month <= 4:
            return "Term 1"
        elif 5 <= current_month <= 8:
            return "Term 2"
        else:
            return "Term 3"