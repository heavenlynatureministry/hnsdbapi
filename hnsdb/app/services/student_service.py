"""
Student Service
Handles student management business logic, enrollment, promotions, and analytics
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.models.student import StudentModel

logger = logging.getLogger(__name__)


class StudentService:
    """Student management service with business logic"""
    
    # Minimum age for enrollment
    MIN_ENROLLMENT_AGE = 3
    # Maximum students per class (default)
    DEFAULT_MAX_CLASS_SIZE = 25
    # Promotion threshold (minimum attendance %)
    PROMOTION_ATTENDANCE_THRESHOLD = 75
    # Promotion threshold (minimum pass rate %)
    PROMOTION_PASS_THRESHOLD = 50
    
    @staticmethod
    async def enroll_student_with_guardians(
        db: AsyncIOMotorDatabase,
        first_name: str,
        last_name: str,
        date_of_birth: date,
        gender: str,
        student_type: str,
        guardians: List[Dict[str, Any]],
        current_class_id: Optional[str] = None,
        middle_name: Optional[str] = None,
        medical_notes: Optional[str] = None,
        special_needs: Optional[str] = None,
        address: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Enroll student with guardians in one operation
        
        Args:
            db: Database connection
            first_name: Student first name
            last_name: Student last name
            date_of_birth: Date of birth
            gender: Gender
            student_type: Type of student
            guardians: List of guardian data
            current_class_id: Optional class assignment
            middle_name: Optional middle name
            medical_notes: Medical conditions
            special_needs: Special educational needs
            address: Home address
            created_by: Admin creating record
            
        Returns:
            Tuple of (success, message, student_document)
        """
        
        # Validate age
        age = StudentService._calculate_age(date_of_birth)
        if age < StudentService.MIN_ENROLLMENT_AGE:
            return False, f"Student must be at least {StudentService.MIN_ENROLLMENT_AGE} years old (current age: {age})", None
        
        # Check class capacity if assigning to class
        if current_class_id:
            class_doc = await db.classes.find_one({"_id": ObjectId(current_class_id)})
            if class_doc:
                if class_doc.get("current_enrollment", 0) >= class_doc.get("max_capacity", StudentService.DEFAULT_MAX_CLASS_SIZE):
                    return False, "Target class is at maximum capacity", None
                
                # Validate age matches class level
                valid_level = StudentService._get_age_appropriate_level(age)
                if valid_level and valid_level != class_doc.get("class_level"):
                    logger.warning(f"Student age ({age}) may not match class level ({class_doc.get('class_level')})")
        
        # Create student
        success, message, student = await StudentModel.create_student(
            db=db,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            gender=gender,
            student_type=student_type,
            current_class_id=current_class_id,
            middle_name=middle_name,
            medical_notes=medical_notes,
            special_needs=special_needs,
            address=address,
            created_by=created_by
        )
        
        if not success:
            return False, message, None
        
        # Add guardians
        if guardians:
            for guardian in guardians:
                await StudentModel.add_guardian(
                    db=db,
                    student_id=student["_id"],
                    first_name=guardian.get("first_name", ""),
                    last_name=guardian.get("last_name", ""),
                    relationship=guardian.get("relationship", ""),
                    phone_number=guardian.get("phone_number", ""),
                    email=guardian.get("email"),
                    address=guardian.get("address"),
                    occupation=guardian.get("occupation"),
                    is_primary=guardian.get("is_primary_contact", False)
                )
        
        # Log enrollment
        logger.info(f"Student enrolled: {student.get('student_id_number')} - {first_name} {last_name}")
        
        return True, f"Student enrolled successfully (ID: {student.get('student_id_number')})", student
    
    @staticmethod
    async def get_student_full_profile(
        db: AsyncIOMotorDatabase,
        student_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get complete student profile with all related data
        
        Args:
            db: Database connection
            student_id: Student ID
            
        Returns:
            Complete student profile
        """
        student = await StudentModel.get_student(db, student_id)
        
        if not student:
            return None
        
        # Get attendance summary
        attendance = await StudentService._get_attendance_summary(db, student_id)
        student["attendance"] = attendance
        
        # Get academic performance
        from app.models.exam import ExamModel
        academic_year = StudentService._get_current_academic_year()
        term = StudentService._get_current_term()
        
        results = await ExamModel.get_student_results(db, student_id, academic_year, term)
        student["academic_performance"] = results
        
        # Get payment history
        payments = await db.payments.find({
            "student_id": ObjectId(student_id)
        }).sort("payment_date", -1).limit(10).to_list(length=10)
        
        for payment in payments:
            payment["_id"] = str(payment["_id"])
            payment["student_id"] = str(payment["student_id"])
            payment["fee_structure_id"] = str(payment["fee_structure_id"])
        
        student["recent_payments"] = payments
        
        # Calculate fee balance
        total_paid = sum(p.get("amount_paid", 0) for p in payments)
        student["total_fees_paid"] = round(total_paid, 2)
        
        # Get counseling sessions if applicable
        counseling = await db.counseling_sessions.find({
            "student_id": ObjectId(student_id)
        }).sort("session_date", -1).limit(5).to_list(length=5)
        
        for session in counseling:
            session["_id"] = str(session["_id"])
            session["student_id"] = str(session["student_id"])
        
        student["counseling_sessions"] = counseling
        
        # Calculate age
        if student.get("date_of_birth"):
            dob = student["date_of_birth"]
            if isinstance(dob, datetime):
                dob = dob.date()
            student["age"] = StudentService._calculate_age(dob)
        
        return student
    
    @staticmethod
    async def check_promotion_eligibility(
        db: AsyncIOMotorDatabase,
        student_id: str
    ) -> Dict[str, Any]:
        """
        Check if student is eligible for promotion
        
        Args:
            db: Database connection
            student_id: Student ID
            
        Returns:
            Eligibility assessment
        """
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        
        if not student:
            return {"eligible": False, "reason": "Student not found"}
        
        if student.get("status") != "active":
            return {"eligible": False, "reason": f"Student status is {student.get('status')}"}
        
        academic_year = StudentService._get_current_academic_year()
        term = StudentService._get_current_term()
        
        # Check attendance
        attendance = await StudentService._get_attendance_summary(db, student_id)
        attendance_rate = attendance.get("attendance_rate", 0)
        
        # Check academic performance
        from app.models.exam import ExamModel
        results = await ExamModel.get_student_results(db, student_id, academic_year, term)
        overall_percentage = results.get("overall", {}).get("percentage", 0)
        
        # Determine eligibility
        criteria = {
            "attendance_rate": {
                "value": attendance_rate,
                "threshold": StudentService.PROMOTION_ATTENDANCE_THRESHOLD,
                "met": attendance_rate >= StudentService.PROMOTION_ATTENDANCE_THRESHOLD
            },
            "academic_performance": {
                "value": overall_percentage,
                "threshold": StudentService.PROMOTION_PASS_THRESHOLD,
                "met": overall_percentage >= StudentService.PROMOTION_PASS_THRESHOLD
            }
        }
        
        all_met = all(c["met"] for c in criteria.values())
        
        recommendations = []
        if not criteria["attendance_rate"]["met"]:
            recommendations.append(f"Improve attendance (currently {attendance_rate}%, need {StudentService.PROMOTION_ATTENDANCE_THRESHOLD}%)")
        
        if not criteria["academic_performance"]["met"]:
            recommendations.append(f"Improve academic performance (currently {overall_percentage}%, need {StudentService.PROMOTION_PASS_THRESHOLD}%)")
        
        return {
            "student_id": student_id,
            "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}",
            "current_class_id": str(student.get("current_class_id")) if student.get("current_class_id") else None,
            "eligible": all_met,
            "criteria": criteria,
            "recommendations": recommendations if not all_met else ["Ready for promotion"],
            "conditional_promotion": not all_met and attendance_rate >= 60 and overall_percentage >= 40
        }
    
    @staticmethod
    async def bulk_promote_eligible_students(
        db: AsyncIOMotorDatabase,
        from_class_id: str,
        promoted_by: str,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Promote all eligible students from a class
        
        Args:
            db: Database connection
            from_class_id: Source class ID
            promoted_by: User performing promotion
            dry_run: If True, only check eligibility without promoting
            
        Returns:
            Promotion results
        """
        from app.models.class_model import ClassModel
        
        # Get all active students in class
        students = await db.students.find({
            "current_class_id": ObjectId(from_class_id),
            "status": "active"
        }).to_list(length=None)
        
        eligible = []
        not_eligible = []
        
        for student in students:
            eligibility = await StudentService.check_promotion_eligibility(
                db, str(student["_id"])
            )
            
            if eligibility["eligible"]:
                eligible.append({
                    "student_id": str(student["_id"]),
                    "student_name": f"{student['first_name']} {student['last_name']}",
                    "attendance": eligibility["criteria"]["attendance_rate"]["value"],
                    "performance": eligibility["criteria"]["academic_performance"]["value"]
                })
            else:
                not_eligible.append({
                    "student_id": str(student["_id"]),
                    "student_name": f"{student['first_name']} {student['last_name']}",
                    "reasons": eligibility.get("recommendations", [])
                })
        
        if dry_run:
            return {
                "dry_run": True,
                "total_students": len(students),
                "eligible_count": len(eligible),
                "not_eligible_count": len(not_eligible),
                "eligible": eligible,
                "not_eligible": not_eligible
            }
        
        # Promote eligible students
        if eligible:
            eligible_ids = [e["student_id"] for e in eligible]
            promoted, failed, errors = await ClassModel.promote_students(
                db=db,
                from_class_id=from_class_id,
                student_ids=eligible_ids,
                promoted_by=promoted_by
            )
        else:
            promoted, failed, errors = 0, 0, []
        
        return {
            "dry_run": False,
            "total_students": len(students),
            "promoted": promoted,
            "failed": failed,
            "errors": errors,
            "eligible_not_promoted": len(eligible) - promoted,
            "not_eligible": not_eligible
        }
    
    @staticmethod
    async def get_student_analytics(
        db: AsyncIOMotorDatabase,
        student_id: str
    ) -> Dict[str, Any]:
        """
        Get comprehensive student analytics
        
        Args:
            db: Database connection
            student_id: Student ID
            
        Returns:
            Analytics data
        """
        student = await StudentModel.get_student(db, student_id)
        
        if not student:
            return {}
        
        academic_year = StudentService._get_current_academic_year()
        
        # Attendance trend
        attendance_trend = await StudentService._get_attendance_trend(db, student_id, academic_year)
        
        # Academic trend
        academic_trend = await StudentService._get_academic_trend(db, student_id, academic_year)
        
        # Fee payment history
        fee_history = await StudentService._get_fee_payment_history(db, student_id)
        
        # Identify strengths and weaknesses
        strengths = []
        weaknesses = []
        
        if academic_trend:
            subjects = academic_trend.get("subjects", {})
            for subject, data in subjects.items():
                if data.get("average", 0) >= 70:
                    strengths.append(subject)
                elif data.get("average", 0) < 50:
                    weaknesses.append(subject)
        
        # Generate recommendations
        recommendations = []
        
        if attendance_trend.get("overall_rate", 0) < 80:
            recommendations.append("Improve class attendance to at least 80%")
        
        for weakness in weaknesses:
            recommendations.append(f"Focus on improving performance in {weakness}")
        
        if fee_history.get("has_outstanding", False):
            recommendations.append("Clear outstanding fee balance")
        
        return {
            "student_id": student_id,
            "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}",
            "class": student.get("class_name", "Unknown"),
            "attendance": attendance_trend,
            "academic_performance": academic_trend,
            "fee_status": fee_history,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "recommendations": recommendations,
            "risk_level": StudentService._calculate_risk_level(
                attendance_trend.get("overall_rate", 0),
                academic_trend.get("overall_percentage", 0)
            )
        }
    
    @staticmethod
    async def get_class_analytics(
        db: AsyncIOMotorDatabase,
        class_id: str
    ) -> Dict[str, Any]:
        """
        Get comprehensive class analytics
        
        Args:
            db: Database connection
            class_id: Class ID
            
        Returns:
            Class analytics
        """
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        
        if not class_doc:
            return {}
        
        students = await db.students.find({
            "current_class_id": ObjectId(class_id),
            "status": "active"
        }).to_list(length=None)
        
        # Collect analytics for each student
        student_analytics = []
        total_attendance = 0
        total_performance = 0
        
        for student in students:
            analytics = await StudentService.get_student_analytics(db, str(student["_id"]))
            student_analytics.append({
                "student_id": str(student["_id"]),
                "name": f"{student['first_name']} {student['last_name']}",
                "attendance_rate": analytics.get("attendance", {}).get("overall_rate", 0),
                "performance": analytics.get("academic_performance", {}).get("overall_percentage", 0),
                "risk_level": analytics.get("risk_level", "unknown")
            })
            total_attendance += analytics.get("attendance", {}).get("overall_rate", 0)
            total_performance += analytics.get("academic_performance", {}).get("overall_percentage", 0)
        
        count = len(students)
        
        # Risk distribution
        risk_distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for sa in student_analytics:
            risk = sa.get("risk_level", "low")
            if risk in risk_distribution:
                risk_distribution[risk] += 1
        
        return {
            "class_id": class_id,
            "class_name": class_doc["class_name"],
            "class_level": class_doc["class_level"],
            "total_students": count,
            "average_attendance": round(total_attendance / count, 2) if count > 0 else 0,
            "average_performance": round(total_performance / count, 2) if count > 0 else 0,
            "risk_distribution": risk_distribution,
            "at_risk_students": [sa for sa in student_analytics if sa["risk_level"] in ["high", "critical"]],
            "top_performers": sorted(student_analytics, key=lambda x: x["performance"], reverse=True)[:5]
        }
    
    @staticmethod
    async def search_students_advanced(
        db: AsyncIOMotorDatabase,
        criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Advanced student search with multiple criteria
        
        Args:
            db: Database connection
            criteria: Search criteria dictionary
            
        Returns:
            List of matching students
        """
        filter_query = {}
        
        # Name search
        if criteria.get("name"):
            name = criteria["name"]
            filter_query["$or"] = [
                {"first_name": {"$regex": name, "$options": "i"}},
                {"last_name": {"$regex": name, "$options": "i"}},
                {"middle_name": {"$regex": name, "$options": "i"}}
            ]
        
        # ID search
        if criteria.get("student_id_number"):
            filter_query["student_id_number"] = {"$regex": criteria["student_id_number"], "$options": "i"}
        
        # Class filter
        if criteria.get("class_id"):
            filter_query["current_class_id"] = ObjectId(criteria["class_id"])
        
        # Type filter
        if criteria.get("student_type"):
            filter_query["student_type"] = criteria["student_type"]
        
        # Status filter
        if criteria.get("status"):
            filter_query["status"] = criteria["status"]
        else:
            filter_query["status"] = "active"
        
        # Gender filter
        if criteria.get("gender"):
            filter_query["gender"] = criteria["gender"]
        
        # Age range
        if criteria.get("min_age") or criteria.get("max_age"):
            today = date.today()
            dob_filter = {}
            
            if criteria.get("max_age"):
                max_dob = date(today.year - criteria["max_age"] - 1, today.month, today.day)
                dob_filter["$gte"] = datetime.combine(max_dob, datetime.min.time())
            
            if criteria.get("min_age"):
                min_dob = date(today.year - criteria["min_age"], today.month, today.day)
                dob_filter["$lte"] = datetime.combine(min_dob, datetime.max.time())
            
            if dob_filter:
                filter_query["date_of_birth"] = dob_filter
        
        # Enrollment date range
        if criteria.get("enrolled_after") or criteria.get("enrolled_before"):
            enrollment_filter = {}
            
            if criteria.get("enrolled_after"):
                enrollment_filter["$gte"] = datetime.combine(criteria["enrolled_after"], datetime.min.time())
            
            if criteria.get("enrolled_before"):
                enrollment_filter["$lte"] = datetime.combine(criteria["enrolled_before"], datetime.max.time())
            
            if enrollment_filter:
                filter_query["enrollment_date"] = enrollment_filter
        
        # Medical conditions
        if criteria.get("medical_condition"):
            filter_query["medical_notes"] = {"$regex": criteria["medical_condition"], "$options": "i"}
        
        # Special needs
        if criteria.get("special_needs"):
            filter_query["special_needs"] = {"$regex": criteria["special_needs"], "$options": "i"}
        
        # Guardian search
        if criteria.get("guardian_name") or criteria.get("guardian_phone"):
            guardian_filter = {}
            if criteria.get("guardian_name"):
                guardian_filter["guardians"] = {
                    "$elemMatch": {
                        "$or": [
                            {"first_name": {"$regex": criteria["guardian_name"], "$options": "i"}},
                            {"last_name": {"$regex": criteria["guardian_name"], "$options": "i"}}
                        ]
                    }
                }
            if criteria.get("guardian_phone"):
                guardian_filter["guardians.phone_number"] = {"$regex": criteria["guardian_phone"], "$options": "i"}
            
            filter_query.update(guardian_filter)
        
        limit = criteria.get("limit", 50)
        skip = criteria.get("skip", 0)
        
        students = await db.students.find(filter_query)\
            .sort("last_name", 1)\
            .skip(skip)\
            .limit(limit)\
            .to_list(length=limit)
        
        total = await db.students.count_documents(filter_query)
        
        # Format results
        results = []
        for student in students:
            student["_id"] = str(student["_id"])
            if student.get("current_class_id"):
                student["current_class_id"] = str(student["current_class_id"])
                class_doc = await db.classes.find_one({"_id": ObjectId(student["current_class_id"])})
                if class_doc:
                    student["class_name"] = class_doc["class_name"]
            
            if student.get("date_of_birth"):
                dob = student["date_of_birth"]
                if isinstance(dob, datetime):
                    dob = dob.date()
                student["age"] = StudentService._calculate_age(dob)
            
            results.append(student)
        
        return {
            "students": results,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    def _calculate_age(dob: date) -> int:
        """Calculate age from date of birth"""
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    
    @staticmethod
    def _get_age_appropriate_level(age: int) -> Optional[str]:
        """Get appropriate class level for age"""
        if 3 <= age <= 5:
            return "nursery"
        elif 6 <= age <= 14:
            return "primary"
        return None
    
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
    
    @staticmethod
    async def _get_attendance_summary(
        db: AsyncIOMotorDatabase,
        student_id: str
    ) -> Dict[str, Any]:
        """Get attendance summary for student"""
        pipeline = [
            {"$match": {"student_id": ObjectId(student_id)}},
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
        
        return summary
    
    @staticmethod
    async def _get_attendance_trend(
        db: AsyncIOMotorDatabase,
        student_id: str,
        academic_year: str
    ) -> Dict[str, Any]:
        """Get attendance trend"""
        pipeline = [
            {"$match": {
                "student_id": ObjectId(student_id),
                "academic_year": academic_year
            }},
            {
                "$group": {
                    "_id": "$term",
                    "total": {"$sum": 1},
                    "present": {
                        "$sum": {"$cond": [{"$in": ["$status", ["present", "late"]]}, 1, 0]}
                    }
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        results = await db.attendance.aggregate(pipeline).to_list(length=None)
        
        terms = {}
        overall_total = 0
        overall_present = 0
        
        for result in results:
            rate = round((result["present"] / result["total"] * 100), 2) if result["total"] > 0 else 0
            terms[result["_id"] or "Unknown"] = {
                "total_days": result["total"],
                "present_days": result["present"],
                "rate": rate
            }
            overall_total += result["total"]
            overall_present += result["present"]
        
        overall_rate = round((overall_present / overall_total * 100), 2) if overall_total > 0 else 0
        
        return {
            "by_term": terms,
            "overall_total": overall_total,
            "overall_present": overall_present,
            "overall_rate": overall_rate
        }
    
    @staticmethod
    async def _get_academic_trend(
        db: AsyncIOMotorDatabase,
        student_id: str,
        academic_year: str
    ) -> Dict[str, Any]:
        """Get academic performance trend"""
        from app.models.exam import ExamModel
        
        results = await ExamModel.get_student_results(db, student_id, academic_year)
        
        # Extract subject trends
        subjects = {}
        for subject in results.get("subjects", []):
            subjects[subject["subject_name"]] = {
                "average": subject.get("average_percentage", 0),
                "grade": subject.get("grade", ""),
                "exams_count": len(subject.get("exams", []))
            }
        
        return {
            "subjects": subjects,
            "overall_percentage": results.get("overall", {}).get("percentage", 0),
            "overall_grade": results.get("overall", {}).get("grade", "")
        }
    
    @staticmethod
    async def _get_fee_payment_history(
        db: AsyncIOMotorDatabase,
        student_id: str
    ) -> Dict[str, Any]:
        """Get fee payment history"""
        payments = await db.payments.find({
            "student_id": ObjectId(student_id)
        }).sort("payment_date", -1).to_list(length=None)
        
        total_paid = sum(p.get("amount_paid", 0) for p in payments)
        
        # Check outstanding fees
        academic_year = StudentService._get_current_academic_year()
        fee_structures = await db.fee_structures.find({
            "academic_year": academic_year,
            "status": "active"
        }).to_list(length=None)
        
        total_expected = sum(fs.get("total_amount", 0) for fs in fee_structures)
        outstanding = max(0, total_expected - total_paid)
        
        return {
            "total_paid": round(total_paid, 2),
            "total_expected": round(total_expected, 2),
            "outstanding": round(outstanding, 2),
            "has_outstanding": outstanding > 0,
            "payment_count": len(payments),
            "last_payment": payments[0] if payments else None
        }
    
    @staticmethod
    def _calculate_risk_level(attendance_rate: float, performance: float) -> str:
        """Calculate student risk level"""
        if attendance_rate < 50 or performance < 30:
            return "critical"
        elif attendance_rate < 65 or performance < 45:
            return "high"
        elif attendance_rate < 75 or performance < 60:
            return "medium"
        else:
            return "low"