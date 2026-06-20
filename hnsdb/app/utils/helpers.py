"""
Helper Functions
Utility functions for formatting, generation, parsing, and data manipulation
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple, Union
from bson import ObjectId
import re
import random
import string
import hashlib
import math


# =========================================================================
# DATE & TIME HELPERS
# =========================================================================

def format_date(value: Union[date, datetime, str], fmt: str = "%Y-%m-%d") -> str:
    """
    Format date to string
    
    Args:
        value: Date, datetime, or string
        fmt: Output format
        
    Returns:
        Formatted date string
    """
    if isinstance(value, datetime):
        return value.strftime(fmt)
    elif isinstance(value, date):
        return value.strftime(fmt)
    elif isinstance(value, str):
        try:
            dt = datetime.strptime(value, "%Y-%m-%d")
            return dt.strftime(fmt)
        except ValueError:
            return value
    return ""


def format_datetime(value: Union[datetime, str], fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Format datetime to string
    
    Args:
        value: Datetime or string
        fmt: Output format
        
    Returns:
        Formatted datetime string
    """
    if isinstance(value, datetime):
        return value.strftime(fmt)
    elif isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value)
            return dt.strftime(fmt)
        except (ValueError, TypeError):
            return value
    return ""


def parse_date(value: Union[str, date, datetime]) -> Optional[date]:
    """
    Parse various date formats to date object
    
    Args:
        value: String, date, or datetime
        
    Returns:
        Date object or None
    """
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    
    if isinstance(value, datetime):
        return value.date()
    
    if isinstance(value, str):
        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%Y/%m/%d",
            "%d-%m-%Y",
            "%B %d, %Y",
            "%d %B %Y"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(value.strip(), fmt).date()
            except ValueError:
                continue
    
    return None


def time_ago(dt: datetime) -> str:
    """
    Get human-readable time ago string
    
    Args:
        dt: Datetime to compare
        
    Returns:
        Time ago string
    """
    now = datetime.utcnow()
    diff = now - dt
    
    if diff.days > 365:
        years = diff.days // 365
        return f"{years} year{'s' if years > 1 else ''} ago"
    elif diff.days > 30:
        months = diff.days // 30
        return f"{months} month{'s' if months > 1 else ''} ago"
    elif diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "just now"


def get_term_dates(academic_year: str, term: str) -> Tuple[date, date]:
    """
    Get approximate term start and end dates
    
    Args:
        academic_year: Academic year (YYYY/YYYY)
        term: Term name
        
    Returns:
        Tuple of (start_date, end_date)
    """
    year = int(academic_year.split("/")[0])
    
    if term == "Term 1":
        return date(year, 9, 1), date(year, 12, 15)
    elif term == "Term 2":
        return date(year + 1, 1, 15), date(year + 1, 4, 15)
    elif term == "Term 3":
        return date(year + 1, 5, 1), date(year + 1, 8, 15)
    
    return date.today(), date.today()


# =========================================================================
# CALCULATION HELPERS
# =========================================================================

def calculate_age(dob: Union[date, datetime, str]) -> int:
    """
    Calculate age from date of birth
    
    Args:
        dob: Date of birth
        
    Returns:
        Age in years
    """
    if isinstance(dob, str):
        dob = parse_date(dob)
        if not dob:
            return 0
    
    if isinstance(dob, datetime):
        dob = dob.date()
    
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def calculate_percentage(value: float, total: float, decimals: int = 2) -> float:
    """
    Calculate percentage
    
    Args:
        value: Part value
        total: Total value
        decimals: Decimal places
        
    Returns:
        Percentage
    """
    if total == 0:
        return 0.0
    return round((value / total * 100), decimals)


def calculate_grade(percentage: float) -> Dict[str, Any]:
    """
    Calculate grade from percentage
    
    Args:
        percentage: Score percentage
        
    Returns:
        Dictionary with grade, remarks, and GPA
    """
    if percentage >= 80:
        return {"grade": "A", "remarks": "Excellent", "gpa": 4.0}
    elif percentage >= 70:
        return {"grade": "B", "remarks": "Very Good", "gpa": 3.0}
    elif percentage >= 60:
        return {"grade": "C", "remarks": "Good", "gpa": 2.0}
    elif percentage >= 50:
        return {"grade": "D", "remarks": "Satisfactory", "gpa": 1.0}
    else:
        return {"grade": "F", "remarks": "Fail", "gpa": 0.0}


# =========================================================================
# FORMATTING HELPERS
# =========================================================================

def format_currency(amount: float, currency: str = "SSP", locale: str = "en") -> str:
    """
    Format amount as currency string
    
    Args:
        amount: Amount to format
        currency: Currency code
        locale: Locale code
        
    Returns:
        Formatted currency string
    """
    if locale == "en":
        return f"{currency} {amount:,.2f}"
    return f"{amount:,.2f} {currency}"


def sanitize_string(value: str, max_length: int = 500) -> str:
    """
    Sanitize string by removing HTML and extra whitespace
    
    Args:
        value: String to sanitize
        max_length: Maximum length
        
    Returns:
        Sanitized string
    """
    if not value:
        return ""
    
    # Remove HTML tags
    value = re.sub(r'<[^>]+>', '', value)
    
    # Remove extra whitespace
    value = re.sub(r'\s+', ' ', value).strip()
    
    # Truncate if too long
    if len(value) > max_length:
        value = value[:max_length] + "..."
    
    return value


def truncate_string(value: str, length: int = 100, suffix: str = "...") -> str:
    """
    Truncate string to specified length
    
    Args:
        value: String to truncate
        length: Maximum length
        suffix: Suffix to add
        
    Returns:
        Truncated string
    """
    if not value:
        return ""
    
    if len(value) <= length:
        return value
    
    return value[:length - len(suffix)] + suffix


def mask_email(email: str) -> str:
    """
    Mask email for privacy
    
    Args:
        email: Email address
        
    Returns:
        Masked email
    """
    if not email or "@" not in email:
        return email
    
    name, domain = email.split("@")
    
    if len(name) <= 2:
        masked_name = name[0] + "*" * (len(name) - 1)
    else:
        masked_name = name[0] + "*" * (len(name) - 2) + name[-1]
    
    return f"{masked_name}@{domain}"


def mask_phone(phone: str) -> str:
    """
    Mask phone number for privacy
    
    Args:
        phone: Phone number
        
    Returns:
        Masked phone number
    """
    if not phone:
        return phone
    
    # Keep last 4 digits visible
    if len(phone) <= 4:
        return "*" * len(phone)
    
    return "*" * (len(phone) - 4) + phone[-4:]


def slugify(value: str) -> str:
    """
    Convert string to URL-friendly slug
    
    Args:
        value: String to convert
        
    Returns:
        Slug string
    """
    value = value.lower().strip()
    value = re.sub(r'[^\w\s-]', '', value)
    value = re.sub(r'[-\s]+', '-', value)
    return value


def get_initials(first_name: str, last_name: str) -> str:
    """
    Get initials from name
    
    Args:
        first_name: First name
        last_name: Last name
        
    Returns:
        Initials
    """
    first_initial = first_name[0].upper() if first_name else ""
    last_initial = last_name[0].upper() if last_name else ""
    return f"{first_initial}{last_initial}"


def generate_color(seed: str = None) -> str:
    """
    Generate a hex color
    
    Args:
        seed: Optional seed for consistent color
        
    Returns:
        Hex color string
    """
    if seed:
        hash_val = int(hashlib.md5(seed.encode()).hexdigest(), 16)
        random.seed(hash_val)
    
    r = random.randint(50, 200)
    g = random.randint(50, 200)
    b = random.randint(50, 200)
    
    return f"#{r:02x}{g:02x}{b:02x}"


# =========================================================================
# GENERATION HELPERS
# =========================================================================

def generate_reference_number(prefix: str = "REF", length: int = 8) -> str:
    """
    Generate unique reference number
    
    Args:
        prefix: Reference prefix
        length: Numeric part length
        
    Returns:
        Reference number
    """
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.digits, k=length))
    return f"{prefix}-{date_part}-{random_part}"


def generate_student_id(year: int = None) -> str:
    """
    Generate student ID number
    
    Args:
        year: Enrollment year
        
    Returns:
        Student ID
    """
    if not year:
        year = datetime.now().year
    
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"HNS-{year}-{random_part}"


def generate_employee_id() -> str:
    """
    Generate employee ID number
    
    Returns:
        Employee ID
    """
    random_part = ''.join(random.choices(string.digits, k=3))
    return f"HNS-TCH-{random_part}"


def generate_receipt_number() -> str:
    """
    Generate receipt number
    
    Returns:
        Receipt number
    """
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = ''.join(random.choices(string.digits, k=4))
    return f"RCP-{date_part}-{random_part}"


def generate_password(length: int = 12, include_special: bool = True) -> str:
    """
    Generate strong random password
    
    Args:
        length: Password length
        include_special: Include special characters
        
    Returns:
        Random password
    """
    chars = string.ascii_letters + string.digits
    if include_special:
        chars += "!@#$%^&*"
    
    # Ensure at least one of each type
    password = [
        random.choice(string.ascii_lowercase),
        random.choice(string.ascii_uppercase),
        random.choice(string.digits)
    ]
    
    if include_special:
        password.append(random.choice("!@#$%^&*"))
    
    # Fill remaining
    remaining = length - len(password)
    password.extend(random.choice(chars) for _ in range(remaining))
    
    # Shuffle
    random.shuffle(password)
    
    return ''.join(password)


# =========================================================================
# ACADEMIC HELPERS
# =========================================================================

def get_academic_year() -> str:
    """
    Get current academic year
    
    Returns:
        Academic year string (YYYY/YYYY)
    """
    current_year = datetime.now().year
    current_month = datetime.now().month
    
    if current_month >= 9:
        return f"{current_year}/{current_year + 1}"
    else:
        return f"{current_year - 1}/{current_year}"


def get_current_term() -> str:
    """
    Get current academic term
    
    Returns:
        Term name
    """
    current_month = datetime.now().month
    
    if 1 <= current_month <= 4:
        return "Term 1"
    elif 5 <= current_month <= 8:
        return "Term 2"
    else:
        return "Term 3"


# =========================================================================
# MONGO HELPERS
# =========================================================================

def parse_mongo_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse MongoDB document for JSON serialization
    
    Args:
        doc: MongoDB document
        
    Returns:
        Parsed document
    """
    if not doc:
        return doc
    
    parsed = {}
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            parsed[key] = str(value)
        elif isinstance(value, datetime):
            parsed[key] = value.isoformat()
        elif isinstance(value, date):
            parsed[key] = value.isoformat()
        elif isinstance(value, list):
            parsed[key] = parse_mongo_list(value)
        elif isinstance(value, dict):
            parsed[key] = parse_mongo_document(value)
        else:
            parsed[key] = value
    
    return parsed


def parse_mongo_list(items: List[Any]) -> List[Any]:
    """
    Parse MongoDB list for JSON serialization
    
    Args:
        items: List of MongoDB documents/values
        
    Returns:
        Parsed list
    """
    if not items:
        return items
    
    parsed = []
    for item in items:
        if isinstance(item, ObjectId):
            parsed.append(str(item))
        elif isinstance(item, datetime):
            parsed.append(item.isoformat())
        elif isinstance(item, date):
            parsed.append(item.isoformat())
        elif isinstance(item, dict):
            parsed.append(parse_mongo_document(item))
        elif isinstance(item, list):
            parsed.append(parse_mongo_list(item))
        else:
            parsed.append(item)
    
    return parsed


def validate_object_id(id_str: str) -> bool:
    """
    Validate MongoDB ObjectId format
    
    Args:
        id_str: String to validate
        
    Returns:
        True if valid ObjectId
    """
    if not id_str:
        return False
    
    try:
        ObjectId(id_str)
        return True
    except Exception:
        return False


def build_filter_query(params: Dict[str, Any], 
                       allowed_fields: List[str],
                       exact_match: List[str] = None) -> Dict[str, Any]:
    """
    Build MongoDB filter query from parameters
    
    Args:
        params: Query parameters
        allowed_fields: Fields allowed for filtering
        exact_match: Fields requiring exact match
        
    Returns:
        MongoDB filter query
    """
    query = {}
    
    for field in allowed_fields:
        if field in params and params[field] is not None:
            value = params[field]
            
            if exact_match and field in exact_match:
                query[field] = value
            elif isinstance(value, str):
                query[field] = {"$regex": value, "$options": "i"}
            else:
                query[field] = value
    
    # Date range
    if "start_date" in params and params["start_date"]:
        if "date" not in query:
            query["date"] = {}
        query["date"]["$gte"] = params["start_date"]
    
    if "end_date" in params and params["end_date"]:
        if "date" not in query:
            query["date"] = {}
        query["date"]["$lte"] = params["end_date"]
    
    return query


def build_sort_query(sort_by: str = "created_at", 
                     sort_order: int = -1) -> List[Tuple[str, int]]:
    """
    Build MongoDB sort query
    
    Args:
        sort_by: Sort field
        sort_order: Sort direction (1 or -1)
        
    Returns:
        Sort query
    """
    return [(sort_by, sort_order)]


# =========================================================================
# PAGINATION HELPERS
# =========================================================================

def paginate_query(page: int = 1, 
                   limit: int = 20,
                   max_limit: int = 100) -> Dict[str, int]:
    """
    Calculate pagination parameters
    
    Args:
        page: Page number
        limit: Items per page
        max_limit: Maximum items per page
        
    Returns:
        Dictionary with skip, limit, page
    """
    page = max(1, page)
    limit = min(max(1, limit), max_limit)
    skip = (page - 1) * limit
    
    return {
        "page": page,
        "limit": limit,
        "skip": skip
    }


# =========================================================================
# VALIDATION HELPERS
# =========================================================================

def is_valid_email(email: str) -> bool:
    """
    Check if email is valid
    
    Args:
        email: Email to validate
        
    Returns:
        True if valid
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email)) if email else False


def is_valid_phone(phone: str) -> bool:
    """
    Check if phone number is valid
    
    Args:
        phone: Phone to validate
        
    Returns:
        True if valid
    """
    pattern = r'^\+?[\d\s\-\(\)]{7,20}$'
    return bool(re.match(pattern, phone)) if phone else False


# =========================================================================
# COLLECTION HELPERS
# =========================================================================

def group_by(items: List[Dict[str, Any]], key: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group list of dictionaries by key
    
    Args:
        items: List of dictionaries
        key: Key to group by
        
    Returns:
        Grouped dictionary
    """
    grouped = {}
    for item in items:
        group_key = item.get(key, "unknown")
        if group_key not in grouped:
            grouped[group_key] = []
        grouped[group_key].append(item)
    
    return grouped


def chunk_list(items: List[Any], chunk_size: int = 100) -> List[List[Any]]:
    """
    Split list into chunks
    
    Args:
        items: List to split
        chunk_size: Chunk size
        
    Returns:
        List of chunks
    """
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]