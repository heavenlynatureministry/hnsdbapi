"""
MongoDB Models for Heavenly Nature School Management System
"""
from app.models.user import UserModel
from app.models.student import StudentModel
from app.models.teacher import TeacherModel
from app.models.class_model import ClassModel
from app.models.attendance import AttendanceModel
from app.models.exam import ExamModel
from app.models.financial import FinancialModel
from app.models.school import SchoolModel

__all__ = [
    "UserModel",
    "StudentModel",
    "TeacherModel",
    "ClassModel",
    "AttendanceModel",
    "ExamModel",
    "FinancialModel",
    "SchoolModel"
]
