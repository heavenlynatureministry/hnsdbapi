"""
Class Pydantic Schemas
Request/Response validation for class and classroom management
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import model_validator, BaseModel, Field, validator


class ClassBase(BaseModel):
    """Base class fields"""
    class_name: str = Field(..., description="Class name (Baby, Middle, Top, P1-P8)")
    class_level: str = Field(..., description="nursery or primary")
    academic_year: str = Field(..., description="Academic year (YYYY/YYYY)")
    max_capacity: int = Field(default=25, ge=1, le=100, description="Maximum students")
    section: Optional[str] = Field(None, max_length=10, description="Section identifier (A, B, etc.)")
    stream: Optional[str] = Field(None, max_length=50, description="Stream name")
    
    @validator('class_name')
    def validate_class_name(cls, v):
        nursery_classes = ['Baby', 'Middle', 'Top']
        primary_classes = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
        valid_names = nursery_classes + primary_classes
        
        if v not in valid_names:
            raise ValueError(f'Class name must be one of: {", ".join(valid_names)}')
        return v
    
    @validator('class_level')
    def validate_class_level(cls, v):
        valid_levels = ['nursery', 'primary']
        if v not in valid_levels:
            raise ValueError(f'Class level must be one of: {", ".join(valid_levels)}')
        return v
    
    @validator('academic_year')
    def validate_academic_year(cls, v):
        try:
            parts = v.split('/')
            if len(parts) != 2:
                raise ValueError('Invalid format')
            year1, year2 = int(parts[0]), int(parts[1])
            if year2 != year1 + 1:
                raise ValueError('Years must be consecutive')
            if year1 < 2020:
                raise ValueError('Year must be 2020 or later')
        except (ValueError, IndexError):
            raise ValueError('Invalid academic year format. Use YYYY/YYYY')
        return v
    
    @model_validator(mode="after")
    def validate_class_level_match(self):
        """Ensure class name matches the class level"""
        class_name = self.class_name
        class_level = self.class_level
        
        if class_name and class_level:
            nursery_classes = ['Baby', 'Middle', 'Top']
            primary_classes = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
            
            if class_level == 'nursery' and class_name not in nursery_classes:
                raise ValueError(f'{class_name} is not a nursery class')
            
            if class_level == 'primary' and class_name not in primary_classes:
                raise ValueError(f'{class_name} is not a primary class')
        
        return self


class ClassCreate(ClassBase):
    """Schema for creating a new class"""
    class_teacher_id: Optional[str] = Field(None, description="Class teacher ID")
    classroom_id: Optional[str] = Field(None, description="Classroom ID")
    
    @validator('class_teacher_id')
    def validate_teacher_id(cls, v):
        if v and len(v) != 24:
            raise ValueError('Invalid teacher ID format')
        return v
    
    @validator('classroom_id')
    def validate_classroom_id(cls, v):
        if v and len(v) != 24:
            raise ValueError('Invalid classroom ID format')
        return v


class ClassCreateForYear(BaseModel):
    """Schema for creating all classes for an academic year"""
    academic_year: str = Field(..., description="Academic year (YYYY/YYYY)")
    
    @validator('academic_year')
    def validate_academic_year(cls, v):
        try:
            parts = v.split('/')
            if len(parts) != 2:
                raise ValueError('Invalid format')
            year1, year2 = int(parts[0]), int(parts[1])
            if year2 != year1 + 1:
                raise ValueError('Years must be consecutive')
            if year1 < 2020:
                raise ValueError('Year must be 2020 or later')
        except (ValueError, IndexError):
            raise ValueError('Invalid academic year format. Use YYYY/YYYY')
        return v


class ClassUpdate(BaseModel):
    """Schema for updating class information"""
    class_teacher_id: Optional[str] = Field(None, description="New class teacher ID")
    classroom_id: Optional[str] = Field(None, description="New classroom ID")
    max_capacity: Optional[int] = Field(None, ge=1, le=100, description="Maximum students")
    status: Optional[str] = Field(None, description="Class status")
    section: Optional[str] = Field(None, max_length=10)
    stream: Optional[str] = Field(None, max_length=50)
    
    @validator('status')
    def validate_status(cls, v):
        if v:
            valid_statuses = ['active', 'inactive', 'archived', 'merged']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class ClassScheduleUpdate(BaseModel):
    """Schema for updating class schedule/timetable"""
    schedule: Dict[str, List[Dict[str, str]]] = Field(
        ...,
        description="Schedule organized by day with periods"
    )
    
    @validator('schedule')
    def validate_schedule(cls, v):
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        
        for day, periods in v.items():
            if day.lower() not in valid_days:
                raise ValueError(f'Invalid day: {day}. Must be one of: {", ".join(valid_days)}')
            
            if not isinstance(periods, list):
                raise ValueError(f'Schedule for {day} must be a list of periods')
            
            if not periods:
                continue
            
            for i, period in enumerate(periods):
                required_fields = ['subject', 'start_time', 'end_time']
                for field in required_fields:
                    if field not in period:
                        raise ValueError(f'Period {i+1} on {day}: missing required field "{field}"')
                
                for time_field in ['start_time', 'end_time']:
                    if time_field in period:
                        try:
                            datetime.strptime(period[time_field], "%H:%M")
                        except ValueError:
                            raise ValueError(
                                f'Period {i+1} on {day}: invalid {time_field} format. Use HH:MM'
                            )
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "schedule": {
                    "monday": [
                        {"subject": "English", "start_time": "08:00", "end_time": "08:45"},
                        {"subject": "Mathematics", "start_time": "08:45", "end_time": "09:30"}
                    ],
                    "tuesday": [
                        {"subject": "Science", "start_time": "08:00", "end_time": "08:45"}
                    ]
                }
            }
        }


class ClassResponse(BaseModel):
    """Schema for class response"""
    id: str = Field(..., alias="_id")
    class_name: str
    class_level: str
    academic_year: str
    class_teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    classroom_id: Optional[str] = None
    classroom_number: Optional[str] = None
    max_capacity: int
    current_enrollment: int
    status: str
    section: Optional[str] = None
    stream: Optional[str] = None
    occupancy_rate: Optional[float] = None
    available_spots: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True
        from_attributes = True


class ClassDetailResponse(ClassResponse):
    """Schema for detailed class response"""
    schedule: Dict[str, List[Dict[str, str]]] = Field(default_factory=dict)
    graduation_year: Optional[int] = None
    created_by: Optional[str] = None
    
    @validator('schedule', pre=True, always=True)
    def set_default_schedule(cls, v):
        if v is None:
            return {
                "monday": [],
                "tuesday": [],
                "wednesday": [],
                "thursday": [],
                "friday": []
            }
        return v


class ClassListResponse(BaseModel):
    """Schema for paginated class list response"""
    classes: List[ClassResponse]
    total: int
    limit: int
    skip: int
    page: int
    total_pages: int


class ClassPromotionRequest(BaseModel):
    """Schema for promoting students between classes"""
    from_class_id: str = Field(..., description="Source class ID")
    to_class_id: Optional[str] = Field(None, description="Target class ID (auto-detect if not provided)")
    student_ids: Optional[List[str]] = Field(None, description="Specific students to promote")
    promote_all: bool = Field(default=False, description="Promote all eligible students")
    academic_year: Optional[str] = Field(None, description="Target academic year")
    
    @model_validator(mode="after")
    def validate_promotion_options(self):
        student_ids = self.student_ids
        promote_all = self.promote_all
        
        if not student_ids and not promote_all:
            raise ValueError('Either student_ids or promote_all must be specified')
        
        if student_ids and promote_all:
            raise ValueError('Cannot specify both student_ids and promote_all')
        
        return self


class PromotionResult(BaseModel):
    """Schema for promotion operation result"""
    promoted: int = 0
    failed: int = 0
    errors: List[str] = Field(default_factory=list)
    from_class: Optional[ClassResponse] = None
    to_class: Optional[ClassResponse] = None
    message: str = ""


class ClassFilterParams(BaseModel):
    """Filter parameters for class queries"""
    class_level: Optional[str] = Field(None, description="Filter by class level")
    academic_year: Optional[str] = Field(None, description="Filter by academic year")
    status: str = Field(default="active", description="Filter by status")
    search: Optional[str] = Field(None, description="Search by class name")
    teacher_id: Optional[str] = Field(None, description="Filter by class teacher")
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=50, ge=1, le=100)
    sort_by: str = Field(default="class_name")
    sort_order: int = Field(default=1, ge=-1, le=1)
    
    @property
    def skip(self) -> int:
        return (self.page - 1) * self.limit


# =========================================================================
# CLASSROOM SCHEMAS
# =========================================================================

class ClassroomBase(BaseModel):
    """Base classroom fields"""
    room_number: str = Field(..., min_length=1, max_length=20, description="Room identifier")
    room_name: Optional[str] = Field(None, max_length=100, description="Room name")
    room_type: str = Field(default="classroom", description="Type of room")
    building: str = Field(default="Main Building", max_length=100)
    floor: int = Field(default=1, ge=0, le=20)
    capacity: int = Field(default=25, ge=1, le=200)
    facilities: Optional[List[str]] = Field(default_factory=list)
    dimensions: Optional[Dict[str, float]] = Field(None)
    notes: Optional[str] = Field(None, max_length=500)
    
    @validator('room_type')
    def validate_room_type(cls, v):
        valid_types = ['classroom', 'laboratory', 'library', 'office', 'storeroom', 'other']
        if v not in valid_types:
            raise ValueError(f'Room type must be one of: {", ".join(valid_types)}')
        return v
    
    @validator('room_number')
    def validate_room_number(cls, v):
        return v.strip().upper()
    
    @validator('facilities')
    def validate_facilities(cls, v):
        if v:
            valid_facilities = [
                'whiteboard', 'projector', 'computer', 'internet',
                'bookshelf', 'lockers', 'air_conditioning', 'fan',
                'heating', 'sink', 'storage', 'wheelchair_accessible'
            ]
            invalid = [f for f in v if f not in valid_facilities]
            if invalid:
                raise ValueError(f'Invalid facilities: {", ".join(invalid)}')
        return v


class ClassroomCreate(ClassroomBase):
    """Schema for creating a classroom"""
    pass


class ClassroomUpdate(BaseModel):
    """Schema for updating a classroom"""
    room_name: Optional[str] = Field(None, max_length=100)
    room_type: Optional[str] = None
    building: Optional[str] = Field(None, max_length=100)
    floor: Optional[int] = Field(None, ge=0, le=20)
    capacity: Optional[int] = Field(None, ge=1, le=200)
    status: Optional[str] = None
    facilities: Optional[List[str]] = None
    dimensions: Optional[Dict[str, float]] = None
    notes: Optional[str] = Field(None, max_length=500)
    
    @validator('status')
    def validate_status(cls, v):
        if v:
            valid_statuses = ['available', 'occupied', 'under_maintenance', 'reserved']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class ClassroomResponse(BaseModel):
    """Schema for classroom response"""
    id: str = Field(..., alias="_id")
    room_number: str
    room_name: str
    room_type: str
    building: str
    floor: int
    capacity: int
    current_class_id: Optional[str] = None
    status: str
    facilities: List[str] = Field(default_factory=list)
    dimensions: Optional[Dict[str, float]] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True
        from_attributes = True


class ClassroomListResponse(BaseModel):
    """Schema for classroom list response"""
    classrooms: List[ClassroomResponse]
    total: int


# =========================================================================
# CLASS STATISTICS SCHEMAS
# =========================================================================

class ClassDemographics(BaseModel):
    """Schema for class demographics"""
    total_students: int = 0
    by_gender: Dict[str, int] = Field(default_factory=dict)
    by_type: Dict[str, int] = Field(default_factory=dict)
    occupancy_rate: float = 0.0
    available_spots: int = 0


class ClassAttendanceStats(BaseModel):
    """Schema for class attendance statistics"""
    rate: float = 0.0
    breakdown: Dict[str, int] = Field(default_factory=dict)


class SubjectPerformanceItem(BaseModel):
    """Schema for subject performance in class statistics"""
    subject: str
    average_score: float = 0.0
    pass_rate: float = 0.0


class ClassStatisticsResponse(BaseModel):
    """Schema for comprehensive class statistics"""
    class_info: ClassDetailResponse
    demographics: ClassDemographics
    attendance: ClassAttendanceStats
    academic_performance: Dict[str, Any] = Field(
        default_factory=lambda: {"subjects": []}
    )


class AllClassStatisticsResponse(BaseModel):
    """Schema for all classes statistics"""
    academic_year: str
    levels: Dict[str, Any] = Field(default_factory=dict)
    overall: Dict[str, Any] = Field(
        default_factory=lambda: {
            "total_classes": 0,
            "total_enrollment": 0,
            "total_capacity": 0,
            "overall_occupancy": 0.0
        }
    )


class ClassLevelResponse(BaseModel):
    """Schema for class level information"""
    level_name: str
    level_code: str
    class_names: List[str]
    age_range: Dict[str, int]
    duration_years: int
    next_level: Optional[str] = None
    academic_year: str
    status: str


class ClassStudentResponse(BaseModel):
    """Schema for student in class list"""
    id: str = Field(..., alias="_id")
    student_id_number: str
    first_name: str
    last_name: str
    gender: str
    student_type: str
    status: str
    age: Optional[int] = None
    photo_url: Optional[str] = None
    
    class Config:
        populate_by_name = True
        from_attributes = True
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class ClassStudentsListResponse(BaseModel):
    """Schema for class students list"""
    class_id: str
    class_name: str
    students: List[ClassStudentResponse]
    total: int


# =========================================================================
# CLASS ASSIGNMENT SCHEMAS
# =========================================================================

class TeacherClassAssignment(BaseModel):
    """Schema for teacher-class assignment"""
    teacher_id: str = Field(..., description="Teacher ID")
    class_ids: List[str] = Field(..., min_length=1, description="List of class IDs")
    
    @validator('class_ids')
    def validate_class_ids(cls, v):
        if len(v) != len(set(v)):
            raise ValueError('Duplicate class IDs are not allowed')
        return v


class ClassroomAssignment(BaseModel):
    """Schema for classroom assignment"""
    class_id: str = Field(..., description="Class ID")
    classroom_id: str = Field(..., description="Classroom ID")


class BulkClassAssignment(BaseModel):
    """Schema for bulk class assignments"""
    assignments: List[ClassroomAssignment] = Field(..., min_length=1)


# =========================================================================
# CLASS SCHEDULE SCHEMAS
# =========================================================================

class PeriodSchema(BaseModel):
    """Schema for a single class period"""
    subject: str = Field(..., description="Subject name")
    start_time: str = Field(..., description="Start time (HH:MM)")
    end_time: str = Field(..., description="End time (HH:MM)")
    teacher_name: Optional[str] = None
    room: Optional[str] = None
    
    @validator('start_time', 'end_time')
    def validate_time_format(cls, v):
        try:
            datetime.strptime(v, "%H:%M")
        except ValueError:
            raise ValueError('Time must be in HH:MM format')
        return v


class DaySchedule(BaseModel):
    """Schema for a single day's schedule"""
    day: str = Field(..., description="Day of week")
    periods: List[PeriodSchema] = Field(default_factory=list)
    
    @validator('day')
    def validate_day(cls, v):
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        if v.lower() not in valid_days:
            raise ValueError(f'Day must be one of: {", ".join(valid_days)}')
        return v.lower()


class WeeklySchedule(BaseModel):
    """Schema for weekly class schedule"""
    class_id: str = Field(..., description="Class ID")
    schedule: List[DaySchedule] = Field(..., min_length=1, max_length=5)


class ScheduleConflictCheck(BaseModel):
    """Schema for checking schedule conflicts"""
    teacher_id: str = Field(..., description="Teacher ID to check")
    classroom_id: Optional[str] = Field(None, description="Classroom ID to check")
    proposed_schedule: List[DaySchedule] = Field(..., min_length=1)


class ScheduleConflictResponse(BaseModel):
    """Schema for schedule conflict check response"""
    has_conflicts: bool = False
    conflicts: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of conflict details"
    )


# Update forward references
ClassResponse.model_rebuild()
ClassDetailResponse.model_rebuild()
ClassListResponse.model_rebuild()
PromotionResult.model_rebuild()
ClassStatisticsResponse.model_rebuild()
