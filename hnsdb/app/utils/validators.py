"""
Validators
Validation functions for data integrity and business rules
"""
from datetime import datetime, date
from typing import Optional, Dict, Any, List, Tuple
import re
from bson import ObjectId


class ValidationError(Exception):
    """Custom validation error"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


# =========================================================================
# BASIC VALIDATORS
# =========================================================================

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Tuple[bool, List[str]]:
    """
    Validate required fields are present and non-empty
    
    Args:
        data: Data dictionary
        required_fields: List of required field names
        
    Returns:
        Tuple of (is_valid, missing_fields)
    """
    missing = []
    for field in required_fields:
        if field not in data or data[field] is None:
            missing.append(field)
        elif isinstance(data[field], str) and not data[field].strip():
            missing.append(field)
    
    return len(missing) == 0, missing


def validate_string_length(value: str, min_length: int = 1, max_length: int = 500, field_name: str = "Value") -> Tuple[bool, str]:
    """
    Validate string length
    
    Args:
        value: String to validate
        min_length: Minimum length
        max_length: Maximum length
        field_name: Field name for error message
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not value:
        return False, f"{field_name} is required"
    
    if len(value) < min_length:
        return False, f"{field_name} must be at least {min_length} characters"
    
    if len(value) > max_length:
        return False, f"{field_name} must not exceed {max_length} characters"
    
    return True, ""


def validate_numeric_range(value: float, min_value: float = None, max_value: float = None, field_name: str = "Value") -> Tuple[bool, str]:
    """
    Validate numeric value range
    
    Args:
        value: Number to validate
        min_value: Minimum allowed
        max_value: Maximum allowed
        field_name: Field name
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if min_value is not None and value < min_value:
        return False, f"{field_name} must be at least {min_value}"
    
    if max_value is not None and value > max_value:
        return False, f"{field_name} must not exceed {max_value}"
    
    return True, ""


def validate_enum_value(value: str, allowed_values: List[str], field_name: str = "Value") -> Tuple[bool, str]:
    """
    Validate value is in allowed list
    
    Args:
        value: Value to check
        allowed_values: List of allowed values
        field_name: Field name
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if value not in allowed_values:
        return False, f"{field_name} must be one of: {', '.join(allowed_values)}"
    
    return True, ""


# =========================================================================
# FORMAT VALIDATORS
# =========================================================================

def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email format
    
    Args:
        email: Email to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not email:
        return False, "Email is required"
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(pattern, email):
        return False, "Invalid email format"
    
    if len(email) > 254:
        return False, "Email is too long"
    
    return True, ""


def validate_phone_number(phone: str) -> Tuple[bool, str]:
    """
    Validate phone number format
    
    Args:
        phone: Phone number to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not phone:
        return False, "Phone number is required"
    
    # Remove common formatting
    clean_phone = re.sub(r'[\s\-\(\)\.]', '', phone)
    
    # Check if starts with + or digit
    if not clean_phone.startswith('+') and not clean_phone[0].isdigit():
        return False, "Invalid phone number format"
    
    # Remove + for length check
    digits_only = clean_phone.replace('+', '')
    
    if not digits_only.isdigit():
        return False, "Phone number must contain only digits"
    
    if len(digits_only) < 7 or len(digits_only) > 15:
        return False, "Phone number must be between 7 and 15 digits"
    
    return True, ""


def validate_password_strength(password: str) -> Tuple[bool, List[str]]:
    """
    Validate password strength
    
    Args:
        password: Password to validate
        
    Returns:
        Tuple of (is_valid, list_of_issues)
    """
    issues = []
    
    if len(password) < 8:
        issues.append("Password must be at least 8 characters long")
    
    if len(password) > 128:
        issues.append("Password must not exceed 128 characters")
    
    if not re.search(r'[A-Z]', password):
        issues.append("Password must contain at least one uppercase letter")
    
    if not re.search(r'[a-z]', password):
        issues.append("Password must contain at least one lowercase letter")
    
    if not re.search(r'\d', password):
        issues.append("Password must contain at least one digit")
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        issues.append("Password must contain at least one special character")
    
    # Check for common patterns
    common_patterns = ['123', 'abc', 'password', 'qwerty', 'admin']
    if any(pattern in password.lower() for pattern in common_patterns):
        issues.append("Password contains common patterns")
    
    return len(issues) == 0, issues


def validate_url(url: str) -> Tuple[bool, str]:
    """
    Validate URL format
    
    Args:
        url: URL to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not url:
        return False, "URL is required"
    
    pattern = r'^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$'
    
    if not re.match(pattern, url):
        return False, "Invalid URL format"
    
    return True, ""


def validate_object_id_format(id_str: str) -> Tuple[bool, str]:
    """
    Validate MongoDB ObjectId format
    
    Args:
        id_str: String to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not id_str:
        return False, "ID is required"
    
    try:
        ObjectId(id_str)
        return True, ""
    except Exception:
        return False, "Invalid ID format (must be 24-character hex string)"


# =========================================================================
# DATE VALIDATORS
# =========================================================================

def validate_date_range(start_date: date, end_date: date) -> Tuple[bool, str]:
    """
    Validate date range
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not start_date or not end_date:
        return False, "Both start and end dates are required"
    
    if start_date > end_date:
        return False, "Start date must be before end date"
    
    return True, ""


def validate_academic_year(year_str: str) -> Tuple[bool, str]:
    """
    Validate academic year format
    
    Args:
        year_str: Academic year string (YYYY/YYYY)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not year_str:
        return False, "Academic year is required"
    
    try:
        parts = year_str.split('/')
        
        if len(parts) != 2:
            return False, "Academic year must be in format YYYY/YYYY"
        
        year1 = int(parts[0])
        year2 = int(parts[1])
        
        if year2 != year1 + 1:
            return False, "Years must be consecutive"
        
        if year1 < 2020 or year1 > 2100:
            return False, "Year must be between 2020 and 2100"
        
        return True, ""
        
    except (ValueError, IndexError):
        return False, "Invalid academic year format"


# =========================================================================
# SCHOOL-SPECIFIC VALIDATORS
# =========================================================================

def validate_class_name(class_name: str, class_level: str = None) -> Tuple[bool, str]:
    """
    Validate class name
    
    Args:
        class_name: Class name to validate
        class_level: Optional class level for context
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    nursery_classes = ['Baby', 'Middle', 'Top']
    primary_classes = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
    all_classes = nursery_classes + primary_classes
    
    if class_name not in all_classes:
        return False, f"Class name must be one of: {', '.join(all_classes)}"
    
    if class_level:
        if class_level == 'nursery' and class_name not in nursery_classes:
            return False, f"{class_name} is not a nursery class"
        if class_level == 'primary' and class_name not in primary_classes:
            return False, f"{class_name} is not a primary class"
    
    return True, ""


def validate_student_type(student_type: str) -> Tuple[bool, str]:
    """
    Validate student type
    
    Args:
        student_type: Student type to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    valid_types = ['street', 'abundant', 'orphan', 'other']
    
    if student_type not in valid_types:
        return False, f"Student type must be one of: {', '.join(valid_types)}"
    
    return True, ""


def validate_teacher_qualification(qualification: str) -> Tuple[bool, str]:
    """
    Validate teacher qualification
    
    Args:
        qualification: Qualification to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    valid_quals = [
        'Certificate', 'Diploma', 'B.Ed', 'B.Sc', 'B.A',
        'M.Ed', 'M.Sc', 'M.A', 'PhD', 'PGDE', 'Other'
    ]
    
    if qualification not in valid_quals:
        return False, f"Qualification must be one of: {', '.join(valid_quals)}"
    
    return True, ""


def validate_attendance_status(status: str) -> Tuple[bool, str]:
    """
    Validate attendance status
    
    Args:
        status: Status to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    valid_statuses = ['present', 'absent', 'excused', 'late']
    
    if status not in valid_statuses:
        return False, f"Status must be one of: {', '.join(valid_statuses)}"
    
    return True, ""


def validate_exam_type(exam_type: str) -> Tuple[bool, str]:
    """
    Validate exam type
    
    Args:
        exam_type: Exam type to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    valid_types = [
        'mid_term', 'end_term', 'final', 'mock',
        'quiz', 'assignment', 'project', 'oral', 'practical'
    ]
    
    if exam_type not in valid_types:
        return False, f"Exam type must be one of: {', '.join(valid_types)}"
    
    return True, ""


def validate_transaction_type(trans_type: str) -> Tuple[bool, str]:
    """
    Validate transaction type
    
    Args:
        trans_type: Transaction type to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if trans_type not in ['income', 'expense']:
        return False, "Transaction type must be 'income' or 'expense'"
    
    return True, ""


def validate_grade(grade: str) -> Tuple[bool, str]:
    """
    Validate grade value
    
    Args:
        grade: Grade to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    valid_grades = ['A', 'B', 'C', 'D', 'F']
    
    if grade.upper() not in valid_grades:
        return False, f"Grade must be one of: {', '.join(valid_grades)}"
    
    return True, ""


def validate_score(score: float, max_score: float = 100) -> Tuple[bool, str]:
    """
    Validate exam score
    
    Args:
        score: Score to validate
        max_score: Maximum possible score
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if score is None:
        return False, "Score is required"
    
    if score < 0:
        return False, "Score cannot be negative"
    
    if score > max_score:
        return False, f"Score cannot exceed maximum score of {max_score}"
    
    return True, ""