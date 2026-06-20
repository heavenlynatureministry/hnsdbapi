"""Services Package"""
from app.services.auth_service import AuthService, create_initial_admin
from app.services.user_service import UserService
from app.services.student_service import StudentService
from app.services.teacher_service import TeacherService
from app.services.attendance_service import AttendanceService
from app.services.exam_service import ExamService
from app.services.financial_service import FinancialService
from app.services.school_service import SchoolService
from app.services.report_service import ReportService
from app.services.notification_service import NotificationService

__all__ = [
    "AuthService",
    "create_initial_admin",
    "UserService",
    "StudentService",
    "TeacherService",
    "AttendanceService",
    "ExamService",
    "FinancialService",
    "SchoolService",
    "ReportService",
    "NotificationService"
]
