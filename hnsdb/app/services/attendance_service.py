"""
Attendance Service
Handles attendance business logic, tracking, alerts, and analytics
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.models.attendance import AttendanceModel
from app.models.school import SchoolModel

logger = logging.getLogger(__name__)


class AttendanceService:
    """Attendance management service with business logic"""
    
    # Attendance thresholds
    CHRONIC_ABSENCE_THRESHOLD = 75  # Below 75% is chronic
    WARNING_THRESHOLD = 85  # Below 85% gets warning
    PERFECT_ATTENDANCE = 100  # 100% attendance
    
    # Consecutive absence alert thresholds
    CONSECUTIVE_WARNING = 3
    CONSECUTIVE_CRITICAL = 5
    
    # Late arrival threshold (minutes after start time)
    LATE_THRESHOLD_MINUTES = 15
    
    @staticmethod
    async def mark_daily_attendance(
        db: AsyncIOMotorDatabase,
        class_id: str,
        attendance_date: Optional[date] = None,
        recorded_by: Optional[str] = None,
        auto_mark_absent: bool = True
    ) -> Dict[str, Any]:
        """
        Mark daily attendance for an entire class
        
        Args:
            db: Database connection
            class_id: Class ID
            attendance_date: Date (defaults to today)
            recorded_by: Teacher/admin recording
            auto_mark_absent: Auto-mark unmarked students as absent
            
        Returns:
            Attendance marking results
        """
        if not attendance_date:
            attendance_date = date.today()
        
        # Check if it's a school day
        is_school_day, reason = await SchoolModel.is_school_day(db, attendance_date)
        if not is_school_day:
            return {
                "success": False,
                "message": f"Not a school day: {reason}",
                "date": str(attendance_date)
            }
        
        # Get all active students in class
        students = await db.students.find({
            "current_class_id": ObjectId(class_id),
            "status": "active"
        }).to_list(length=None)
        
        if not students:
            return {
                "success": False,
                "message": "No active students found in this class"
            }
        
        # Get existing attendance for today
        existing = await db.attendance.find({
            "class_id": ObjectId(class_id),
            "date": datetime.combine(attendance_date, datetime.min.time())
        }).to_list(length=None)
        
        marked_student_ids = {str(r["student_id"]) for r in existing}
        
        # Auto-mark absent for unmarked students
        auto_marked = 0
        if auto_mark_absent:
            academic_year = AttendanceService._get_current_academic_year()
            term = AttendanceService._get_current_term()
            
            for student in students:
                student_id = str(student["_id"])
                if student_id not in marked_student_ids:
                    await AttendanceModel.mark_attendance(
                        db=db,
                        student_id=student_id,
                        class_id=class_id,
                        attendance_date=attendance_date,
                        status="absent",
                        recorded_by=recorded_by or "system",
                        notes="Auto-marked absent",
                        term=term,
                        academic_year=academic_year
                    )
                    auto_marked += 1
        
        # Count statuses
        all_records = await db.attendance.find({
            "class_id": ObjectId(class_id),
            "date": datetime.combine(attendance_date, datetime.min.time())
        }).to_list(length=None)
        
        status_counts = {"present": 0, "absent": 0, "excused": 0, "late": 0}
        for record in all_records:
            status = record["status"]
            if status in status_counts:
                status_counts[status] += 1
        
        return {
            "success": True,
            "date": str(attendance_date),
            "class_id": class_id,
            "total_students": len(students),
            "previously_marked": len(existing),
            "auto_marked_absent": auto_marked,
            "status_counts": status_counts,
            "attendance_rate": round(
                ((status_counts["present"] + status_counts["late"]) / len(students) * 100), 2
            ) if students else 0
        }
    
    @staticmethod
    async def get_student_attendance_analytics(
        db: AsyncIOMotorDatabase,
        student_id: str,
        academic_year: Optional[str] = None,
        days: int = 90
    ) -> Dict[str, Any]:
        """
        Get detailed attendance analytics for a student
        
        Args:
            db: Database connection
            student_id: Student ID
            academic_year: Academic year
            days: Number of days to analyze
            
        Returns:
            Attendance analytics
        """
        if not academic_year:
            academic_year = AttendanceService._get_current_academic_year()
        
        student = await db.students.find_one({"_id": ObjectId(student_id)})
        if not student:
            return {"error": "Student not found"}
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Get attendance records
        records = await db.attendance.find({
            "student_id": ObjectId(student_id),
            "date": {
                "$gte": datetime.combine(start_date, datetime.min.time()),
                "$lte": datetime.combine(end_date, datetime.max.time())
            }
        }).sort("date", 1).to_list(length=None)
        
        # Calculate statistics
        total_days = len(records)
        status_counts = {"present": 0, "absent": 0, "excused": 0, "late": 0}
        
        daily_status = {}
        for record in records:
            status = record["status"]
            if status in status_counts:
                status_counts[status] += 1
            
            date_str = record["date"].strftime("%Y-%m-%d") if isinstance(record["date"], datetime) else str(record["date"])
            daily_status[date_str] = status
        
        # Attendance rate
        attendance_rate = round(
            ((status_counts["present"] + status_counts["late"]) / total_days * 100), 2
        ) if total_days > 0 else 0
        
        # Consecutive absences
        consecutive = AttendanceService._calculate_consecutive_absences(records)
        
        # Weekly trend
        weekly_trend = AttendanceService._calculate_weekly_trend(records)
        
        # Streaks
        current_streak = AttendanceService._calculate_current_streak(records)
        
        # Risk assessment
        risk_level = "low"
        alerts = []
        
        if attendance_rate < AttendanceService.CHRONIC_ABSENCE_THRESHOLD:
            risk_level = "critical"
            alerts.append(f"Chronic absenteeism: {attendance_rate}% attendance rate")
        elif attendance_rate < AttendanceService.WARNING_THRESHOLD:
            risk_level = "high"
            alerts.append(f"Low attendance: {attendance_rate}% attendance rate")
        
        if consecutive["current"] >= AttendanceService.CONSECUTIVE_CRITICAL:
            risk_level = "critical"
            alerts.append(f"Critical: {consecutive['current']} consecutive absences")
        elif consecutive["current"] >= AttendanceService.CONSECUTIVE_WARNING:
            alerts.append(f"Warning: {consecutive['current']} consecutive absences")
        
        # Monthly breakdown
        monthly = {}
        for record in records:
            month_key = record["date"].strftime("%Y-%m") if isinstance(record["date"], datetime) else str(record["date"])[:7]
            if month_key not in monthly:
                monthly[month_key] = {"total": 0, "present": 0, "absent": 0}
            monthly[month_key]["total"] += 1
            if record["status"] in ["present", "late"]:
                monthly[month_key]["present"] += 1
            else:
                monthly[month_key]["absent"] += 1
        
        for month_key in monthly:
            total = monthly[month_key]["total"]
            monthly[month_key]["rate"] = round(
                (monthly[month_key]["present"] / total * 100), 2
            ) if total > 0 else 0
        
        return {
            "student_id": student_id,
            "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}",
            "period": f"{start_date} to {end_date}",
            "total_days": total_days,
            "status_counts": status_counts,
            "attendance_rate": attendance_rate,
            "consecutive_absences": consecutive,
            "current_streak": current_streak,
            "weekly_trend": weekly_trend,
            "monthly_breakdown": monthly,
            "risk_level": risk_level,
            "alerts": alerts,
            "daily_status": daily_status
        }
    
    @staticmethod
    async def generate_attendance_alerts(
        db: AsyncIOMotorDatabase,
        class_id: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate attendance alerts for all students or a class
        
        Args:
            db: Database connection
            class_id: Optional class filter
            academic_year: Academic year
            
        Returns:
            Attendance alerts
        """
        if not academic_year:
            academic_year = AttendanceService._get_current_academic_year()
        
        filter_query = {"status": "active"}
        if class_id:
            filter_query["current_class_id"] = ObjectId(class_id)
        
        students = await db.students.find(filter_query).to_list(length=None)
        
        alerts = {
            "critical": [],
            "warning": [],
            "info": [],
            "perfect_attendance": []
        }
        
        for student in students:
            analytics = await AttendanceService.get_student_attendance_analytics(
                db, str(student["_id"]), academic_year
            )
            
            student_info = {
                "student_id": str(student["_id"]),
                "student_name": f"{student['first_name']} {student['last_name']}",
                "attendance_rate": analytics.get("attendance_rate", 0),
                "consecutive_absences": analytics.get("consecutive_absences", {}).get("current", 0),
                "alerts": analytics.get("alerts", [])
            }
            
            # Get class name
            if student.get("current_class_id"):
                class_doc = await db.classes.find_one({"_id": student["current_class_id"]})
                if class_doc:
                    student_info["class_name"] = class_doc["class_name"]
            
            risk_level = analytics.get("risk_level", "low")
            
            if risk_level == "critical":
                alerts["critical"].append(student_info)
            elif risk_level == "high":
                alerts["warning"].append(student_info)
            else:
                alerts["info"].append(student_info)
            
            if analytics.get("attendance_rate", 0) == AttendanceService.PERFECT_ATTENDANCE:
                alerts["perfect_attendance"].append(student_info)
        
        return {
            "academic_year": academic_year,
            "total_students_analyzed": len(students),
            "critical_count": len(alerts["critical"]),
            "warning_count": len(alerts["warning"]),
            "perfect_attendance_count": len(alerts["perfect_attendance"]),
            "alerts": alerts
        }
    
    @staticmethod
    async def get_class_attendance_trend(
        db: AsyncIOMotorDatabase,
        class_id: str,
        academic_year: Optional[str] = None,
        weeks: int = 12
    ) -> Dict[str, Any]:
        """
        Get class attendance trend over time
        
        Args:
            db: Database connection
            class_id: Class ID
            academic_year: Academic year
            weeks: Number of weeks to analyze
            
        Returns:
            Attendance trend data
        """
        if not academic_year:
            academic_year = AttendanceService._get_current_academic_year()
        
        class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
        if not class_doc:
            return {"error": "Class not found"}
        
        end_date = date.today()
        start_date = end_date - timedelta(weeks=weeks)
        
        # Get daily attendance
        pipeline = [
            {
                "$match": {
                    "class_id": ObjectId(class_id),
                    "date": {
                        "$gte": datetime.combine(start_date, datetime.min.time()),
                        "$lte": datetime.combine(end_date, datetime.max.time())
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
                        "status": "$status"
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.date": 1}}
        ]
        
        daily_data = await db.attendance.aggregate(pipeline).to_list(length=None)
        
        # Organize by date
        daily_trend = {}
        for item in daily_data:
            date_str = item["_id"]["date"]
            status = item["_id"]["status"]
            
            if date_str not in daily_trend:
                daily_trend[date_str] = {"present": 0, "absent": 0, "excused": 0, "late": 0, "total": 0}
            
            daily_trend[date_str][status] = item["count"]
            daily_trend[date_str]["total"] += item["count"]
        
        # Calculate rates
        for date_str in daily_trend:
            total = daily_trend[date_str]["total"]
            present = daily_trend[date_str]["present"] + daily_trend[date_str]["late"]
            daily_trend[date_str]["rate"] = round((present / total * 100), 2) if total > 0 else 0
        
        # Weekly aggregation
        weekly_trend = {}
        for date_str, data in sorted(daily_trend.items()):
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            week_key = dt.strftime("%Y-W%W")
            
            if week_key not in weekly_trend:
                weekly_trend[week_key] = {"total": 0, "present": 0, "days": 0}
            
            weekly_trend[week_key]["total"] += data["total"]
            weekly_trend[week_key]["present"] += data["present"] + data["late"]
            weekly_trend[week_key]["days"] += 1
        
        for week_key in weekly_trend:
            total = weekly_trend[week_key]["total"]
            present = weekly_trend[week_key]["present"]
            weekly_trend[week_key]["rate"] = round((present / total * 100), 2) if total > 0 else 0
        
        # Overall statistics
        total_records = sum(d["total"] for d in daily_trend.values())
        total_present = sum(d["present"] + d["late"] for d in daily_trend.values())
        overall_rate = round((total_present / total_records * 100), 2) if total_records > 0 else 0
        
        return {
            "class_id": class_id,
            "class_name": class_doc["class_name"],
            "period": f"{start_date} to {end_date}",
            "overall_attendance_rate": overall_rate,
            "total_school_days": len(daily_trend),
            "daily_trend": daily_trend,
            "weekly_trend": weekly_trend,
            "best_day": max(daily_trend.items(), key=lambda x: x[1].get("rate", 0))[0] if daily_trend else None,
            "worst_day": min(daily_trend.items(), key=lambda x: x[1].get("rate", 0))[0] if daily_trend else None
        }
    
    @staticmethod
    async def get_attendance_comparison(
        db: AsyncIOMotorDatabase,
        class_ids: List[str],
        academic_year: Optional[str] = None,
        term: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compare attendance across multiple classes
        
        Args:
            db: Database connection
            class_ids: List of class IDs to compare
            academic_year: Academic year
            term: Academic term
            
        Returns:
            Comparison data
        """
        if not academic_year:
            academic_year = AttendanceService._get_current_academic_year()
        
        comparisons = []
        total_rate = 0
        
        for class_id in class_ids:
            report = await AttendanceModel.get_attendance_report(
                db=db,
                class_id=class_id,
                academic_year=academic_year,
                term=term
            )
            
            class_doc = await db.classes.find_one({"_id": ObjectId(class_id)})
            
            comparisons.append({
                "class_id": class_id,
                "class_name": class_doc["class_name"] if class_doc else "Unknown",
                "class_level": class_doc["class_level"] if class_doc else "Unknown",
                "attendance_rate": report.get("attendance_rate", 0),
                "total_records": report.get("total_records", 0),
                "status_summary": report.get("status_summary", {})
            })
            
            total_rate += report.get("attendance_rate", 0)
        
        # Sort by attendance rate
        comparisons.sort(key=lambda x: x["attendance_rate"], reverse=True)
        
        average_rate = round(total_rate / len(comparisons), 2) if comparisons else 0
        
        return {
            "academic_year": academic_year,
            "term": term,
            "classes_compared": len(comparisons),
            "average_attendance_rate": average_rate,
            "best_performing": comparisons[0] if comparisons else None,
            "worst_performing": comparisons[-1] if comparisons else None,
            "comparisons": comparisons
        }
    
    @staticmethod
    async def detect_attendance_patterns(
        db: AsyncIOMotorDatabase,
        student_id: str,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Detect attendance patterns for a student
        
        Args:
            db: Database connection
            student_id: Student ID
            academic_year: Academic year
            
        Returns:
            Pattern analysis
        """
        if not academic_year:
            academic_year = AttendanceService._get_current_academic_year()
        
        # Get all attendance records for the year
        records = await db.attendance.find({
            "student_id": ObjectId(student_id),
            "academic_year": academic_year
        }).sort("date", 1).to_list(length=None)
        
        if not records:
            return {"student_id": student_id, "message": "No attendance records found"}
        
        patterns = {
            "student_id": student_id,
            "academic_year": academic_year,
            "total_records": len(records),
            "patterns": {}
        }
        
        # Day of week pattern
        day_pattern = {"Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": []}
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        for record in records:
            if isinstance(record["date"], datetime):
                day_name = day_names[record["date"].weekday()]
            else:
                day_name = day_names[record["date"].weekday()]
            
            if day_name in day_pattern:
                day_pattern[day_name].append(record["status"])
        
        day_analysis = {}
        for day, statuses in day_pattern.items():
            if statuses:
                total = len(statuses)
                absent_count = statuses.count("absent")
                day_analysis[day] = {
                    "total_days": total,
                    "absence_count": absent_count,
                    "absence_rate": round((absent_count / total * 100), 2)
                }
        
        patterns["patterns"]["by_day_of_week"] = day_analysis
        
        # Most absent day
        if day_analysis:
            most_absent_day = max(day_analysis.items(), key=lambda x: x[1].get("absence_rate", 0))
            patterns["patterns"]["most_absent_day"] = {
                "day": most_absent_day[0],
                "absence_rate": most_absent_day[1]["absence_rate"]
            }
        
        # Term pattern
        term_pattern = {}
        for record in records:
            term = record.get("term", "Unknown")
            if term not in term_pattern:
                term_pattern[term] = {"total": 0, "absent": 0}
            term_pattern[term]["total"] += 1
            if record["status"] == "absent":
                term_pattern[term]["absent"] += 1
        
        for term in term_pattern:
            total = term_pattern[term]["total"]
            term_pattern[term]["rate"] = round(
                ((total - term_pattern[term]["absent"]) / total * 100), 2
            ) if total > 0 else 0
        
        patterns["patterns"]["by_term"] = term_pattern
        
        # Monthly pattern
        monthly_pattern = {}
        for record in records:
            month_key = record["date"].strftime("%Y-%m") if isinstance(record["date"], datetime) else str(record["date"])[:7]
            if month_key not in monthly_pattern:
                monthly_pattern[month_key] = {"total": 0, "absent": 0}
            monthly_pattern[month_key]["total"] += 1
            if record["status"] == "absent":
                monthly_pattern[month_key]["absent"] += 1
        
        for month_key in monthly_pattern:
            total = monthly_pattern[month_key]["total"]
            monthly_pattern[month_key]["rate"] = round(
                ((total - monthly_pattern[month_key]["absent"]) / total * 100), 2
            ) if total > 0 else 0
        
        patterns["patterns"]["by_month"] = monthly_pattern
        
        # Identify improvement or decline
        sorted_months = sorted(monthly_pattern.items())
        if len(sorted_months) >= 2:
            first_month_rate = sorted_months[0][1]["rate"]
            last_month_rate = sorted_months[-1][1]["rate"]
            change = last_month_rate - first_month_rate
            
            patterns["patterns"]["trend"] = {
                "direction": "improving" if change > 5 else "declining" if change < -5 else "stable",
                "change": round(change, 2),
                "first_month_rate": first_month_rate,
                "last_month_rate": last_month_rate
            }
        
        return patterns
    
    @staticmethod
    async def bulk_update_attendance_status(
        db: AsyncIOMotorDatabase,
        attendance_ids: List[str],
        new_status: str,
        updated_by: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Bulk update attendance status for multiple records
        
        Args:
            db: Database connection
            attendance_ids: List of attendance record IDs
            new_status: New status
            updated_by: User making update
            notes: Optional notes
            
        Returns:
            Update results
        """
        if new_status not in AttendanceModel.VALID_STATUSES:
            return {"success": False, "message": f"Invalid status: {new_status}"}
        
        successful = 0
        failed = 0
        errors = []
        
        for attendance_id in attendance_ids:
            try:
                result = await db.attendance.update_one(
                    {"_id": ObjectId(attendance_id)},
                    {
                        "$set": {
                            "status": new_status,
                            "notes": notes,
                            "updated_by": ObjectId(updated_by) if updated_by else None,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                if result.modified_count > 0:
                    successful += 1
                else:
                    failed += 1
                    errors.append(f"Record {attendance_id}: Not found")
                    
            except Exception as e:
                failed += 1
                errors.append(f"Record {attendance_id}: {str(e)}")
        
        return {
            "success": True,
            "successful": successful,
            "failed": failed,
            "errors": errors,
            "new_status": new_status
        }
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    def _calculate_consecutive_absences(records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate consecutive absence streaks"""
        if not records:
            return {"current": 0, "longest": 0, "longest_dates": []}
        
        current_streak = 0
        longest_streak = 0
        longest_start = None
        longest_end = None
        streak_start = None
        
        for record in records:
            status = record["status"]
            
            if status == "absent":
                if current_streak == 0:
                    streak_start = record["date"]
                current_streak += 1
                
                if current_streak > longest_streak:
                    longest_streak = current_streak
                    longest_start = streak_start
                    longest_end = record["date"]
            else:
                current_streak = 0
                streak_start = None
        
        # Check if current streak is still ongoing
        is_ongoing = False
        if records and records[-1]["status"] == "absent":
            is_ongoing = True
        
        return {
            "current": current_streak,
            "is_ongoing": is_ongoing,
            "longest": longest_streak,
            "longest_start": longest_start.strftime("%Y-%m-%d") if longest_start and isinstance(longest_start, datetime) else str(longest_start) if longest_start else None,
            "longest_end": longest_end.strftime("%Y-%m-%d") if longest_end and isinstance(longest_end, datetime) else str(longest_end) if longest_end else None
        }
    
    @staticmethod
    def _calculate_weekly_trend(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate weekly attendance trend"""
        if not records:
            return []
        
        weekly = {}
        for record in records:
            if isinstance(record["date"], datetime):
                week_start = record["date"] - timedelta(days=record["date"].weekday())
                week_key = week_start.strftime("%Y-%m-%d")
            else:
                week_key = str(record["date"])[:10]
            
            if week_key not in weekly:
                weekly[week_key] = {"total": 0, "present": 0}
            
            weekly[week_key]["total"] += 1
            if record["status"] in ["present", "late"]:
                weekly[week_key]["present"] += 1
        
        trend = []
        for week_key in sorted(weekly.keys()):
            data = weekly[week_key]
            trend.append({
                "week_starting": week_key,
                "total_days": data["total"],
                "present_days": data["present"],
                "attendance_rate": round((data["present"] / data["total"] * 100), 2) if data["total"] > 0 else 0
            })
        
        return trend
    
    @staticmethod
    def _calculate_current_streak(records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate current attendance/presence streak"""
        if not records:
            return {"type": "none", "count": 0}
        
        # Check from most recent
        reversed_records = list(reversed(records))
        
        if not reversed_records:
            return {"type": "none", "count": 0}
        
        current_type = "present" if reversed_records[0]["status"] in ["present", "late"] else "absent"
        count = 0
        
        for record in reversed_records:
            status = "present" if record["status"] in ["present", "late"] else "absent"
            if status == current_type:
                count += 1
            else:
                break
        
        return {
            "type": current_type,
            "count": count,
            "description": f"{count} consecutive {'days present' if current_type == 'present' else 'absences'}"
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