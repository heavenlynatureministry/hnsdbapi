"""
User Pydantic Schemas
Request/Response validation for user management and authentication
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import PaginatedResponse
from pydantic import BaseModel, EmailStr, Field, validator, root_validator
import re


class UserBase(BaseModel):
    """Base user fields"""
    first_name: str = Field(..., min_length=1, max_length=50, description="First name")
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name")
    email: EmailStr = Field(..., description="Email address")
    phone_number: Optional[str] = Field(None, max_length=20, description="Phone number")
    role: str = Field(..., description="User role")
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')
        # Remove extra spaces and capitalize properly
        return v.strip().title()
    
    @validator('phone_number')
    def validate_phone(cls, v):
        if v:
            # Accept various phone formats
            phone_pattern = r'^\+?[\d\s\-\(\)]{7,20}$'
            if not re.match(phone_pattern, v):
                raise ValueError('Invalid phone number format')
        return v
    
    @validator('role')
    def validate_role(cls, v):
        valid_roles = ['admin', 'teacher', 'accountant', 'counselor', 'staff']
        if v not in valid_roles:
            raise ValueError(f'Role must be one of: {", ".join(valid_roles)}')
        return v


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="Password (min 8 characters)"
    )
    confirm_password: str = Field(..., description="Confirm password")
    permissions: Optional[List[str]] = Field(None, description="Custom permissions")
    
    @validator('password')
    def validate_password_strength(cls, v):
        """Validate password strength"""
        if not v or len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for at least one uppercase letter
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        # Check for at least one digit
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        
        # Check for at least one special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """Ensure passwords match"""
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('permissions')
    def validate_permissions(cls, v):
        if v:
            valid_permissions = [
                'manage_users', 'manage_students', 'manage_teachers',
                'manage_classes', 'manage_attendance', 'manage_exams',
                'manage_financial', 'manage_reports', 'manage_school',
                'view_all', 'edit_all', 'delete_all', 'view_students',
                'view_financial_reports', 'manage_counseling'
            ]
            invalid_perms = [p for p in v if p not in valid_permissions]
            if invalid_perms:
                raise ValueError(f'Invalid permissions: {", ".join(invalid_perms)}')
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone_number: Optional[str] = Field(None, max_length=20)
    role: Optional[str] = None
    status: Optional[str] = None
    permissions: Optional[List[str]] = None
    
    @validator('role')
    def validate_role(cls, v):
        if v:
            valid_roles = ['admin', 'teacher', 'accountant', 'counselor', 'staff']
            if v not in valid_roles:
                raise ValueError(f'Role must be one of: {", ".join(valid_roles)}')
        return v
    
    @validator('status')
    def validate_status(cls, v):
        if v:
            valid_statuses = ['active', 'inactive', 'suspended']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v
    
    @validator('phone_number')
    def validate_phone(cls, v):
        if v:
            phone_pattern = r'^\+?[\d\s\-\(\)]{7,20}$'
            if not re.match(phone_pattern, v):
                raise ValueError('Invalid phone number format')
        return v


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., description="Password")
    remember_me: bool = Field(default=False, description="Remember me (extend session)")


class TokenResponse(BaseModel):
    """Schema for authentication token response"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    user: 'UserProfileResponse' = Field(..., description="User profile")


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request"""
    refresh_token: str = Field(..., description="Refresh token")


class ChangePasswordRequest(BaseModel):
    """Schema for password change"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ..., 
        min_length=8,
        description="New password (min 8 characters, must include uppercase, lowercase, digit, special char)"
    )
    confirm_new_password: str = Field(..., description="Confirm new password")
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('confirm_new_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class ResetPasswordRequest(BaseModel):
    """Schema for password reset request"""
    email: EmailStr = Field(..., description="Email address for password reset")


class UserResponse(BaseModel):
    """Schema for user response (without sensitive data)"""
    id: str = Field(..., alias="_id")
    email: str
    first_name: str
    last_name: str
    role: str
    phone_number: Optional[str] = None
    status: str
    permissions: List[str] = []
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        populate_by_name = True
        from_attributes = True


class UserProfileResponse(BaseModel):
    """Schema for user profile response"""
    id: str = Field(..., alias="_id")
    email: str
    first_name: str
    last_name: str
    role: str
    phone_number: Optional[str] = None
    status: str
    permissions: List[str] = []
    last_login: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        from_attributes = True
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class UserListResponse(BaseModel):
    """Schema for paginated user list response"""
    items: List[UserResponse]


class UserPermissionUpdate(BaseModel):
    """Schema for updating user permissions"""
    permissions: List[str] = Field(..., description="List of permissions")
    
    @validator('permissions')
    def validate_permissions(cls, v):
        valid_permissions = [
            'manage_users', 'manage_students', 'manage_teachers',
            'manage_classes', 'manage_attendance', 'manage_exams',
            'manage_financial', 'manage_reports', 'manage_school',
            'view_all', 'edit_all', 'delete_all', 'view_students',
            'view_financial_reports', 'manage_counseling'
        ]
        invalid_perms = [p for p in v if p not in valid_permissions]
        if invalid_perms:
            raise ValueError(f'Invalid permissions: {", ".join(invalid_perms)}')
        return list(set(v))  # Remove duplicates


class UserStatusUpdate(BaseModel):
    """Schema for updating user status"""
    status: str = Field(..., description="New status")
    reason: Optional[str] = Field(None, description="Reason for status change")
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ['active', 'inactive', 'suspended']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class AuditLogResponse(BaseModel):
    """Schema for audit log entry"""
    id: str = Field(..., alias="_id")
    table_name: str
    record_id: str
    operation: str
    changed_by: Optional[str] = None
    new_values: Optional[Dict[str, Any]] = None
    old_values: Optional[Dict[str, Any]] = None
    changed_at: datetime
    
    class Config:
        populate_by_name = True
        from_attributes = True