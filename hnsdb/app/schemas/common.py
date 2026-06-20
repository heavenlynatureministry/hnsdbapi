"""Common Schemas"""
from typing import Optional, List, Any, Generic, TypeVar
from datetime import datetime, date
from pydantic import BaseModel, Field, validator

T = TypeVar('T')

class SuccessResponse(BaseModel):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[List[str]] = None

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    
    @property
    def skip(self) -> int:
        return (self.page - 1) * self.limit

class PaginatedResponse(BaseModel):
    """Base paginated response"""
    items: List[Any] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    limit: int = 20
    total_pages: int = 0

class FilterParams(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None
    sort_by: str = Field(default="created_at")
    sort_order: int = Field(default=-1, ge=-1, le=1)

class SortParams(BaseModel):
    sort_by: str = Field(default="created_at")
    sort_order: int = Field(default=-1, ge=-1, le=1)

class DateRangeParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class AcademicPeriodParams(BaseModel):
    academic_year: Optional[str] = None
    term: Optional[str] = None
