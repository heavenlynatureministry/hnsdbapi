"""
Report Service
Handles report generation, aggregation, and data processing for all report types
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import io
import csv
import json

from app.models.attendance import AttendanceModel
from app.models.exam import ExamModel
from app.models.financial import FinancialModel
from app.models.school import SchoolModel
from app.models.class_model import ClassModel

logger = logging.getLogger(__name__)


class ReportService:
    """Report generation and data processing service"""
    
    # Report types
    REPORT_TYPES = [
        "academic_performance",
        "attendance_summary",
        "financial_summary",
        "enrollment_summary",
        "staff_summary",
        "class_performance",
        "student_report_card",
        "fee_collection",
        "budget_variance",
        "annual_report",
        "custom"
    ]
    
    # Export formats
    EXPORT_FORMATS = ["pdf", "csv", "excel", "json"]
    
    @staticmethod
    async def generate_academic_report(
        db: AsyncIOMotorDatabase,
        class_id: Optional[str] = None,
        academic_year: Optional[str] = None,
        term: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive academic performance report
        
        Args:
            db: Database connection
            class_id: Optional class filter
            academic_year: Academic year
            term: Academic term
            
        Returns:
            Academic report data
        """
        if not academic_year:
            academic_year = ReportService._get_current_academic_year()
        
        report = {
            "report_type": "academic_performance",
            "academic_year": academic_year,
            "term": term,
            "generated_at": datetime.utcnow(),
            "data": {}
        }
        
        if class_id:
            # Single class report
            class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
            if class_info:
                report["data"]["class"] = {
                    "id": str(class_info["_id"]),
                    "name": class_info["class_name"],
                    "level": class_info["class_level"]
                }
            
            performance = await ExamModel.get_class_performance(
                db, class_id, academic_year, term
            )
            report["data"]["performance"] = performance
            
            # Get top and bottom performers
            rankings = await ExamModel.get_class_ranking(
                db, class_id, academic_year, term, limit=5
            )
            report["data"]["top_performers"] = rankings
            
            # Subject-wise breakdown
            subject_details = []
            subjects = await ExamModel.get_class_subjects(db, class_id, academic_year)
            
            for subject in subjects:
                exam_results = await db.exams.find({
                    "class_id": ObjectId(class_id),
                    "subject_id": ObjectId(subject["subject_id"]),
                    "academic_year": academic_year,
                    "term": term
                }).to_list(length=None)
                
                exam_ids = [e["_id"] for e in exam_results]
                
                if exam_ids:
                    results = await db.exam_results.find({
                        "exam_id": {"$in": exam_ids}
                    }).to_list(length=None)
                    
                    scores = [r["score"] for r in results]
                    avg_score = round(sum(scores) / len(scores), 2) if scores else 0
                    pass_count = sum(1 for r in results if r.get("is_passed"))
                    pass_rate = round((pass_count / len(results) * 100), 2) if results else 0
                    
                    subject_details.append({
                        "subject_name": subject["subject_name"],
                        "teacher_name": subject.get("teacher_name", ""),
                        "exams_count": len(exam_results),
                        "average_score": avg_score,
                        "highest_score": max(scores) if scores else 0,
                        "lowest_score": min(scores) if scores else 0,
                        "pass_rate": pass_rate
                    })
            
            report["data"]["subject_details"] = subject_details
        
        else:
            # All classes report
            classes = await db.classes.find({
                "academic_year": academic_year,
                "status": "active"
            }).to_list(length=None)
            
            class_summaries = []
            total_pass_rate = 0
            
            for class_doc in classes:
                performance = await ExamModel.get_class_performance(
                    db, str(class_doc["_id"]), academic_year, term
                )
                
                class_summaries.append({
                    "class_id": str(class_doc["_id"]),
                    "class_name": class_doc["class_name"],
                    "class_level": class_doc["class_level"],
                    "pass_rate": performance.get("overall", {}).get("pass_rate", 0),
                    "class_average": performance.get("overall", {}).get("class_average", 0),
                    "subjects_count": len(performance.get("subjects", []))
                })
                
                total_pass_rate += performance.get("overall", {}).get("pass_rate", 0)
            
            # Sort by pass rate
            class_summaries.sort(key=lambda x: x["pass_rate"], reverse=True)
            
            report["data"]["class_summaries"] = class_summaries
            report["data"]["overall_pass_rate"] = round(
                total_pass_rate / len(class_summaries), 2
            ) if class_summaries else 0
        
        return report
    
    @staticmethod
    async def generate_attendance_report(
        db: AsyncIOMotorDatabase,
        class_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        academic_year: Optional[str] = None,
        term: Optional[str] = None,
        include_students: bool = True
    ) -> Dict[str, Any]:
        """
        Generate comprehensive attendance report
        
        Args:
            db: Database connection
            class_id: Optional class filter
            start_date: Start date
            end_date: End date
            academic_year: Academic year
            term: Academic term
            include_students: Include per-student details
            
        Returns:
            Attendance report data
        """
        if not academic_year:
            academic_year = ReportService._get_current_academic_year()
        
        report = {
            "report_type": "attendance_summary",
            "academic_year": academic_year,
            "term": term,
            "period": {
                "start": str(start_date) if start_date else None,
                "end": str(end_date) if end_date else None
            },
            "generated_at": datetime.utcnow(),
            "data": {}
        }
        
        if class_id:
            # Single class attendance
            class_info = await db.classes.find_one({"_id": ObjectId(class_id)})
            
            attendance_report = await AttendanceModel.get_attendance_report(
                db=db,
                class_id=class_id,
                start_date=start_date,
                end_date=end_date,
                term=term,
                academic_year=academic_year
            )
            
            report["data"] = {
                "class": {
                    "id": class_id,
                    "name": class_info["class_name"] if class_info else "Unknown"
                },
                "summary": attendance_report
            }
            
            # Per-student details
            if include_students:
                students = await db.students.find({
                    "current_class_id": ObjectId(class_id),
                    "status": "active"
                }).to_list(length=None)
                
                student_details = []
                for student in students:
                    student_attendance = await AttendanceModel.get_student_attendance(
                        db=db,
                        student_id=str(student["_id"]),
                        start_date=start_date,
                        end_date=end_date,
                        term=term,
                        academic_year=academic_year
                    )
                    
                    student_details.append({
                        "student_id": str(student["_id"]),
                        "student_name": f"{student['first_name']} {student['last_name']}",
                        "attendance_rate": student_attendance.get("summary", {}).get("attendance_rate", 0),
                        "total_days": student_attendance.get("summary", {}).get("total", 0),
                        "present_days": student_attendance.get("summary", {}).get("present", 0),
                        "absent_days": student_attendance.get("summary", {}).get("absent", 0)
                    })
                
                # Sort by attendance rate (lowest first)
                student_details.sort(key=lambda x: x["attendance_rate"])
                
                report["data"]["student_details"] = student_details
                report["data"]["chronic_absentees"] = [
                    s for s in student_details if s["attendance_rate"] < 75
                ]
                report["data"]["perfect_attendance"] = [
                    s for s in student_details if s["attendance_rate"] == 100
                ]
        
        else:
            # All classes attendance
            classes = await db.classes.find({
                "academic_year": academic_year,
                "status": "active"
            }).to_list(length=None)
            
            class_summaries = []
            total_rate = 0
            
            for class_doc in classes:
                attendance_report = await AttendanceModel.get_attendance_report(
                    db=db,
                    class_id=str(class_doc["_id"]),
                    term=term,
                    academic_year=academic_year
                )
                
                class_summaries.append({
                    "class_id": str(class_doc["_id"]),
                    "class_name": class_doc["class_name"],
                    "class_level": class_doc["class_level"],
                    "attendance_rate": attendance_report.get("attendance_rate", 0),
                    "total_records": attendance_report.get("total_records", 0)
                })
                
                total_rate += attendance_report.get("attendance_rate", 0)
            
            class_summaries.sort(key=lambda x: x["attendance_rate"])
            
            report["data"]["class_summaries"] = class_summaries
            report["data"]["overall_attendance_rate"] = round(
                total_rate / len(class_summaries), 2
            ) if class_summaries else 0
            report["data"]["best_class"] = class_summaries[-1] if class_summaries else None
            report["data"]["worst_class"] = class_summaries[0] if class_summaries else None
        
        return report
    
    @staticmethod
    async def generate_financial_report(
        db: AsyncIOMotorDatabase,
        report_type: str = "summary",
        academic_year: Optional[str] = None,
        term: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate financial reports
        
        Args:
            db: Database connection
            report_type: summary, income_statement, expense_report, fee_collection, budget_variance
            academic_year: Academic year
            term: Academic term
            start_date: Start date
            end_date: End date
            category: Category filter
            
        Returns:
            Financial report data
        """
        if not academic_year:
            academic_year = ReportService._get_current_academic_year()
        
        report = {
            "report_type": f"financial_{report_type}",
            "academic_year": academic_year,
            "term": term,
            "generated_at": datetime.utcnow(),
            "data": {}
        }
        
        if report_type == "summary":
            # Overall financial summary
            summary = await FinancialModel.get_financial_summary(
                db=db,
                academic_year=academic_year,
                term=term,
                start_date=start_date,
                end_date=end_date
            )
            report["data"] = summary
        
        elif report_type == "income_statement":
            # Detailed income statement
            transactions = await db.financial_records.find({
                "academic_year": academic_year,
                "term": term,
                "approval_status": "approved"
            }).sort("transaction_date", 1).to_list(length=None)
            
            income = [t for t in transactions if t["transaction_type"] == "income"]
            expenses = [t for t in transactions if t["transaction_type"] == "expense"]
            
            # Group by category
            income_by_category = {}
            for t in income:
                cat = t["category"]
                if cat not in income_by_category:
                    income_by_category[cat] = {"total": 0, "count": 0, "transactions": []}
                income_by_category[cat]["total"] += t["amount"]
                income_by_category[cat]["count"] += 1
            
            expenses_by_category = {}
            for t in expenses:
                cat = t["category"]
                if cat not in expenses_by_category:
                    expenses_by_category[cat] = {"total": 0, "count": 0, "transactions": []}
                expenses_by_category[cat]["total"] += t["amount"]
                expenses_by_category[cat]["count"] += 1
            
            report["data"] = {
                "total_income": round(sum(t["amount"] for t in income), 2),
                "total_expenses": round(sum(t["amount"] for t in expenses), 2),
                "net_income": round(
                    sum(t["amount"] for t in income) - sum(t["amount"] for t in expenses), 2
                ),
                "income_by_category": income_by_category,
                "expenses_by_category": expenses_by_category,
                "transaction_count": len(transactions)
            }
        
        elif report_type == "fee_collection":
            # Fee collection report
            fee_structures = await db.fee_structures.find({
                "academic_year": academic_year,
                "status": "active"
            }).to_list(length=None)
            
            collection_data = []
            total_expected = 0
            total_collected = 0
            
            for fs in fee_structures:
                student_count = await db.students.count_documents({
                    "current_class_id": fs["class_id"],
                    "status": "active"
                })
                
                expected = fs["total_amount"] * student_count
                
                payments = await db.payments.find({
                    "fee_structure_id": fs["_id"],
                    "academic_year": academic_year
                }).to_list(length=None)
                
                collected = sum(p["amount_paid"] for p in payments)
                
                collection_data.append({
                    "fee_structure": fs["name"],
                    "class": fs.get("class_name", ""),
                    "students": student_count,
                    "expected": round(expected, 2),
                    "collected": round(collected, 2),
                    "outstanding": round(expected - collected, 2),
                    "collection_rate": round((collected / expected * 100), 2) if expected > 0 else 0
                })
                
                total_expected += expected
                total_collected += collected
            
            report["data"] = {
                "total_expected": round(total_expected, 2),
                "total_collected": round(total_collected, 2),
                "total_outstanding": round(total_expected - total_collected, 2),
                "overall_collection_rate": round(
                    (total_collected / total_expected * 100), 2
                ) if total_expected > 0 else 0,
                "by_fee_structure": collection_data
            }
        
        elif report_type == "budget_variance":
            # Budget variance report
            budget_summary = await FinancialModel.get_budget_summary(
                db=db,
                academic_year=academic_year
            )
            
            # Add variance analysis
            for cat in budget_summary.get("categories", []):
                variance = cat["allocated"] - cat["spent"]
                cat["variance"] = round(variance, 2)
                cat["variance_percentage"] = round(
                    (variance / cat["allocated"] * 100), 2
                ) if cat["allocated"] > 0 else 0
                cat["status"] = (
                    "over_budget" if variance < 0 
                    else "under_budget" if variance > 0 
                    else "on_budget"
                )
            
            report["data"] = budget_summary
        
        return report
    
    @staticmethod
    async def generate_enrollment_report(
        db: AsyncIOMotorDatabase,
        academic_year: Optional[str] = None,
        include_trends: bool = True
    ) -> Dict[str, Any]:
        """
        Generate enrollment report
        
        Args:
            db: Database connection
            academic_year: Academic year
            include_trends: Include multi-year trends
            
        Returns:
            Enrollment report data
        """
        if not academic_year:
            academic_year = ReportService._get_current_academic_year()
        
        report = {
            "report_type": "enrollment_summary",
            "academic_year": academic_year,
            "generated_at": datetime.utcnow(),
            "data": {}
        }
        
        # Current enrollment
        total_active = await db.students.count_documents({"status": "active"})
        total_graduated = await db.students.count_documents({"status": "graduated"})
        new_enrollments = await db.students.count_documents({
            "enrollment_date": {
                "$gte": datetime(int(academic_year.split("/")[0]), 9, 1)
            }
        })
        
        # By class
        class_pipeline = [
            {"$match": {"status": "active"}},
            {
                "$lookup": {
                    "from": "classes",
                    "localField": "current_class_id",
                    "foreignField": "_id",
                    "as": "class_info"
                }
            },
            {"$unwind": {"path": "$class_info", "preserveNullAndEmptyArrays": True}},
            {
                "$group": {
                    "_id": {
                        "class_name": "$class_info.class_name",
                        "class_level": "$class_info.class_level"
                    },
                    "count": {"$sum": 1},
                    "male": {"$sum": {"$cond": [{"$eq": ["$gender", "Male"]}, 1, 0]}},
                    "female": {"$sum": {"$cond": [{"$eq": ["$gender", "Female"]}, 1, 0]}}
                }
            },
            {"$sort": {"_id.class_name": 1}}
        ]
        
        by_class = await db.students.aggregate(class_pipeline).to_list(length=None)
        
        # By type
        type_pipeline = [
            {"$match": {"status": "active"}},
            {"$group": {"_id": "$student_type", "count": {"$sum": 1}}}
        ]
        by_type = await db.students.aggregate(type_pipeline).to_list(length=None)
        
        report["data"] = {
            "total_active": total_active,
            "total_graduated": total_graduated,
            "new_enrollments": new_enrollments,
            "by_class": [
                {
                    "class_name": item["_id"]["class_name"] or "Unassigned",
                    "class_level": item["_id"]["class_level"] or "Unknown",
                    "total": item["count"],
                    "male": item["male"],
                    "female": item["female"]
                }
                for item in by_class
            ],
            "by_type": {item["_id"]: item["count"] for item in by_type}
        }
        
        # Multi-year trends
        if include_trends:
            current_year = datetime.now().year
            trends = []
            
            for year in range(current_year - 4, current_year + 1):
                enrolled = await db.students.count_documents({
                    "enrollment_date": {
                        "$gte": datetime(year, 1, 1),
                        "$lt": datetime(year + 1, 1, 1)
                    }
                })
                
                active_at_year_end = await db.students.count_documents({
                    "status": "active",
                    "enrollment_date": {"$lte": datetime(year, 12, 31)}
                })
                
                trends.append({
                    "year": year,
                    "new_enrollments": enrolled,
                    "active_students": active_at_year_end
                })
            
            report["data"]["trends"] = trends
            
            # Calculate growth rates
            for i in range(1, len(trends)):
                if trends[i-1]["active_students"] > 0:
                    trends[i]["growth_rate"] = round(
                        ((trends[i]["active_students"] - trends[i-1]["active_students"]) /
                         trends[i-1]["active_students"] * 100), 2
                    )
        
        return report
    
    @staticmethod
    async def generate_annual_school_report(
        db: AsyncIOMotorDatabase,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive annual school report
        
        Args:
            db: Database connection
            academic_year: Academic year
            
        Returns:
            Annual report data
        """
        if not academic_year:
            academic_year = ReportService._get_current_academic_year()
        
        report = {
            "report_type": "annual_report",
            "academic_year": academic_year,
            "generated_at": datetime.utcnow(),
            "school_info": await SchoolModel.get_school_info(db),
            "sections": {}
        }
        
        # Section 1: Enrollment
        enrollment = await ReportService.generate_enrollment_report(
            db, academic_year, include_trends=True
        )
        report["sections"]["enrollment"] = enrollment["data"]
        
        # Section 2: Academic Performance
        academic = await ReportService.generate_academic_report(
            db, academic_year=academic_year
        )
        report["sections"]["academic"] = academic["data"]
        
        # Section 3: Attendance
        attendance = await ReportService.generate_attendance_report(
            db, academic_year=academic_year, include_students=False
        )
        report["sections"]["attendance"] = attendance["data"]
        
        # Section 4: Financial
        financial = await ReportService.generate_financial_report(
            db, report_type="summary", academic_year=academic_year
        )
        report["sections"]["financial"] = financial["data"]
        
        # Section 5: Staff
        total_teachers = await db.teachers.count_documents({"status": "active"})
        total_staff = await db.users.count_documents({
            "role": {"$in": ["admin", "accountant", "counselor", "staff"]},
            "status": "active"
        })
        
        teacher_qualifications = await db.teachers.aggregate([
            {"$match": {"status": "active"}},
            {"$group": {"_id": "$qualification", "count": {"$sum": 1}}}
        ]).to_list(length=None)
        
        report["sections"]["staff"] = {
            "total_teachers": total_teachers,
            "total_other_staff": total_staff,
            "total_all_staff": total_teachers + total_staff,
            "teacher_qualifications": {
                item["_id"]: item["count"] for item in teacher_qualifications
            }
        }
        
        # Section 6: Key Achievements & Recommendations
        report["sections"]["highlights"] = {
            "achievements": [
                f"Successfully completed academic year {academic_year}",
                f"Enrolled {enrollment['data'].get('total_active', 0)} students",
                f"Maintained {attendance['data'].get('overall_attendance_rate', 0)}% attendance rate"
            ],
            "challenges": [],
            "recommendations": [
                "Continue to improve academic performance",
                "Enhance teacher professional development programs",
                "Strengthen parent-teacher communication",
                "Upgrade school facilities and resources"
            ]
        }
        
        return report
    
    @staticmethod
    async def export_report_to_csv(
        report_data: Dict[str, Any],
        report_type: str
    ) -> Tuple[io.StringIO, str]:
        """
        Export report data to CSV format
        
        Args:
            report_data: Report data dictionary
            report_type: Type of report
            
        Returns:
            Tuple of (StringIO buffer, filename)
        """
        output = io.StringIO()
        writer = csv.writer(output)
        filename = f"{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        if report_type == "students":
            writer.writerow(["ID", "Name", "Gender", "Type", "Class", "Status"])
            for student in report_data.get("data", {}).get("students", []):
                writer.writerow([
                    student.get("student_id_number", ""),
                    f"{student.get('first_name', '')} {student.get('last_name', '')}",
                    student.get("gender", ""),
                    student.get("student_type", ""),
                    student.get("class_name", ""),
                    student.get("status", "")
                ])
        
        elif report_type == "attendance":
            writer.writerow(["Student", "Class", "Total Days", "Present", "Absent", "Rate (%)"])
            for student in report_data.get("data", {}).get("student_details", []):
                writer.writerow([
                    student.get("student_name", ""),
                    student.get("class_name", ""),
                    student.get("total_days", 0),
                    student.get("present_days", 0),
                    student.get("absent_days", 0),
                    student.get("attendance_rate", 0)
                ])
        
        elif report_type == "exam_results":
            writer.writerow(["Student", "Subject", "Score", "Grade", "Pass/Fail"])
            for result in report_data.get("data", {}).get("results", []):
                writer.writerow([
                    result.get("student_name", ""),
                    result.get("subject_name", ""),
                    result.get("score", 0),
                    result.get("grade", ""),
                    "Pass" if result.get("is_passed") else "Fail"
                ])
        
        elif report_type == "financial":
            writer.writerow(["Category", "Income", "Expenses", "Net"])
            data = report_data.get("data", {})
            income_cats = data.get("income", {}).get("categories", [])
            expense_cats = data.get("expense", {}).get("categories", [])
            
            all_cats = set()
            for cat in income_cats:
                all_cats.add(cat["category"])
            for cat in expense_cats:
                all_cats.add(cat["category"])
            
            for cat in sorted(all_cats):
                income = next((c["total"] for c in income_cats if c["category"] == cat), 0)
                expense = next((c["total"] for c in expense_cats if c["category"] == cat), 0)
                writer.writerow([cat, income, expense, income - expense])
        
        elif report_type == "fee_collection":
            writer.writerow(["Fee Structure", "Class", "Expected", "Collected", "Outstanding", "Rate (%)"])
            for item in report_data.get("data", {}).get("by_fee_structure", []):
                writer.writerow([
                    item.get("fee_structure", ""),
                    item.get("class", ""),
                    item.get("expected", 0),
                    item.get("collected", 0),
                    item.get("outstanding", 0),
                    item.get("collection_rate", 0)
                ])
        
        else:
            # Generic export - convert all data to rows
            writer.writerow(["Key", "Value"])
            data = report_data.get("data", report_data)
            if isinstance(data, dict):
                for key, value in data.items():
                    if not isinstance(value, (list, dict)):
                        writer.writerow([key, value])
        
        output.seek(0)
        return output, filename
    
    @staticmethod
    async def export_report_to_json(
        report_data: Dict[str, Any]
    ) -> Tuple[str, str]:
        """
        Export report data to JSON format
        
        Args:
            report_data: Report data dictionary
            
        Returns:
            Tuple of (JSON string, filename)
        """
        filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Convert ObjectId and datetime to string
        def json_serializer(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            if isinstance(obj, ObjectId):
                return str(obj)
            raise TypeError(f"Type {type(obj)} not serializable")
        
        json_str = json.dumps(report_data, default=json_serializer, indent=2)
        
        return json_str, filename
    
    @staticmethod
    async def schedule_report(
        db: AsyncIOMotorDatabase,
        report_type: str,
        schedule_type: str,
        schedule_time: str,
        parameters: Dict[str, Any],
        recipients: List[str],
        created_by: str
    ) -> Dict[str, Any]:
        """
        Schedule a report for automatic generation
        
        Args:
            db: Database connection
            report_type: Type of report
            schedule_type: daily, weekly, monthly, termly
            schedule_time: Time to generate (HH:MM)
            parameters: Report parameters
            recipients: Email recipients
            created_by: User scheduling report
            
        Returns:
            Scheduled report details
        """
        schedule = {
            "report_type": report_type,
            "schedule_type": schedule_type,
            "schedule_time": schedule_time,
            "parameters": parameters,
            "recipients": recipients,
            "status": "active",
            "created_by": ObjectId(created_by),
            "last_generated": None,
            "next_generation": ReportService._calculate_next_run(schedule_type, schedule_time),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.scheduled_reports.insert_one(schedule)
        schedule["_id"] = str(result.inserted_id)
        
        logger.info(f"Scheduled report created: {report_type} ({schedule_type})")
        
        return schedule
    
    @staticmethod
    async def get_scheduled_reports(
        db: AsyncIOMotorDatabase,
        status: str = "active"
    ) -> List[Dict[str, Any]]:
        """
        Get scheduled reports
        
        Args:
            db: Database connection
            status: Filter by status
            
        Returns:
            List of scheduled reports
        """
        reports = await db.scheduled_reports.find(
            {"status": status}
        ).to_list(length=None)
        
        for report in reports:
            report["_id"] = str(report["_id"])
        
        return reports
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
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
    def _calculate_next_run(schedule_type: str, schedule_time: str) -> datetime:
        """
        Calculate next run time for scheduled report
        
        Args:
            schedule_type: daily, weekly, monthly, termly
            schedule_time: Time string (HH:MM)
            
        Returns:
            Next run datetime
        """
        now = datetime.now()
        hour, minute = map(int, schedule_time.split(":"))
        today_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        if schedule_type == "daily":
            if today_run <= now:
                return today_run + timedelta(days=1)
            return today_run
        
        elif schedule_type == "weekly":
            # Run every Monday
            days_until_monday = (7 - now.weekday()) % 7
            if days_until_monday == 0 and today_run <= now:
                days_until_monday = 7
            next_monday = now.replace(hour=hour, minute=minute, second=0, microsecond=0) + timedelta(days=days_until_monday)
            return next_monday
        
        elif schedule_type == "monthly":
            # Run on the 1st of next month
            if now.month == 12:
                next_month = now.replace(year=now.year + 1, month=1, day=1, hour=hour, minute=minute, second=0, microsecond=0)
            else:
                next_month = now.replace(month=now.month + 1, day=1, hour=hour, minute=minute, second=0, microsecond=0)
            return next_month
        
        elif schedule_type == "termly":
            # Rough calculation - every 3 months
            if today_run <= now:
                return today_run + timedelta(days=90)
            return today_run
        
        return today_run + timedelta(days=1)