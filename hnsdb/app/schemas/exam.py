"""Exam Schemas"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, validator

class SubjectCreate(BaseModel):
    subject_name: str
    curriculum_level: str = "primary"
    category: Optional[str] = None
    description: Optional[str] = None
    subject_code: Optional[str] = None

class SubjectResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    subject_name: str = ""
    subject_code: Optional[str] = None
    curriculum_level: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"
    
    class Config:
        populate_by_name = True

class ClassSubjectAssign(BaseModel):
    class_id: str
    subject_id: str
    teacher_id: str
    academic_year: Optional[str] = None

class ExamCreate(BaseModel):
    exam_name: str
    exam_type: str = "mid_term"
    class_id: str
    subject_id: str
    exam_date: date
    max_score: float = 100.0
    pass_mark: Optional[float] = None
    weight: float = 1.0
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    academic_year: Optional[str] = None
    term: Optional[str] = None
    instructions: Optional[str] = None
    grading_system_id: Optional[str] = None

class ExamUpdate(BaseModel):
    exam_name: Optional[str] = None
    exam_date: Optional[date] = None
    max_score: Optional[float] = None
    status: Optional[str] = None

class ExamResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    exam_name: str = ""
    exam_type: Optional[str] = None
    class_id: Optional[str] = None
    subject_id: Optional[str] = None
    exam_date: Optional[date] = None
    max_score: float = 100.0
    pass_mark: float = 50.0
    academic_year: Optional[str] = None
    term: Optional[str] = None
    status: str = "scheduled"
    
    class Config:
        populate_by_name = True

class ExamResultCreate(BaseModel):
    exam_id: str
    student_id: str
    score: float
    remarks: Optional[str] = None

class ExamResultBulkCreate(BaseModel):
    exam_id: str
    results: List[Dict[str, Any]]

class ExamResultResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    exam_id: Optional[str] = None
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    score: float = 0.0
    grade: str = ""
    is_passed: bool = False
    percentage: float = 0.0
    
    class Config:
        populate_by_name = True

class GradingSystemCreate(BaseModel):
    name: str
    grade_boundaries: List[Dict[str, Any]]
    description: Optional[str] = None
    is_default: bool = False

class GradingSystemResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    name: str = ""
    grade_boundaries: List[Dict[str, Any]] = []
    is_default: bool = False
    
    class Config:
        populate_by_name = True

class ReportCardResponse(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    academic_year: Optional[str] = None
    term: Optional[str] = None
    subjects: List[Dict[str, Any]] = []
    overall_performance: Dict[str, Any] = {}
    attendance: Dict[str, Any] = {}
    status: str = "draft"
    
    class Config:
        populate_by_name = True

class ReportCardPublishRequest(BaseModel):
    class_id: str
    academic_year: str
    term: str

class ReportCardRemarksUpdate(BaseModel):
    report_card_id: str
    class_teacher_remarks: Optional[str] = None
    head_teacher_remarks: Optional[str] = None

class ClassPerformanceResponse(BaseModel):
    class_id: Optional[str] = None
    academic_year: Optional[str] = None
    term: Optional[str] = None
    total_exams: int = 0
    subjects: List[Dict[str, Any]] = []
    overall: Dict[str, Any] = {}
