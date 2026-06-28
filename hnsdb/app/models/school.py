"""
School Model - School information and configuration management
Handles: School info, academic calendar, terms, events, board members, 
networks, strategic plans, and system settings
"""
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple, Union
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
import logging

logger = logging.getLogger(__name__)


class SchoolModel:
    """
    School model for MongoDB
    Collections: school_info, academic_calendar, school_events, 
                board_members, network_memberships, strategic_plans, 
                system_settings
    
    Supports:
    - School information management
    - Logo and branding management
    - Academic calendar configuration
    - Term and holiday management
    - School events management
    - Board of directors management
    - Network and partnership tracking
    - Strategic planning
    - System-wide settings
    """
    
    # Collection names
    SCHOOL_INFO = "school_info"
    ACADEMIC_CALENDAR = "academic_calendar"
    SCHOOL_EVENTS = "school_events"
    BOARD_MEMBERS = "board_members"
    NETWORK_MEMBERSHIPS = "network_memberships"
    STRATEGIC_PLANS = "strategic_plans"
    SYSTEM_SETTINGS = "system_settings"
    
    # Day types
    DAY_TYPES = ["school_day", "holiday", "half_day", "exam_day", "teacher_workday", "event_day"]
    
    # Event types
    EVENT_TYPES = [
        "academic", "sports", "cultural", "religious", 
        "graduation", "parent_meeting", "staff_meeting",
        "training", "community", "fundraising", "other"
    ]
    
    # Event statuses
    EVENT_STATUSES = ["upcoming", "ongoing", "completed", "cancelled", "postponed"]
    
    # Board member positions
    BOARD_POSITIONS = [
        "chairperson", "vice_chairperson", "secretary", 
        "treasurer", "member", "advisor", "patron"
    ]
    
    # Membership types
    MEMBERSHIP_TYPES = [
        "educational_network", "ngo_partnership", "government_body",
        "religious_organization", "community_group", "donor_organization",
        "accreditation_body", "other"
    ]
    
    @staticmethod
    def get_school_info_schema() -> Dict[str, Any]:
        """Return school info schema"""
        return {
            "school_name": "String - Full school name",
            "motto": "String - School motto/slogan",
            "vision": "String - School vision statement",
            "mission": "String - School mission statement",
            "core_values": "Array - List of core values",
            "logo_url": "String - URL to school logo in R2",
            "logo_thumbnail_url": "String - URL to logo thumbnail",
            "contact_email": "String - Primary contact email",
            "contact_phone": "String - Primary contact phone",
            "alternate_phone": "String - Alternate phone number",
            "website": "String - School website URL",
            "social_media": "Object - Social media links",
            "address": "Object - Physical address details",
            "postal_address": "String - Postal address",
            "founded_year": "Integer - Year school was founded",
            "registration_number": "String - Government registration number",
            "accreditation_status": "String - Accreditation status",
            "school_type": "String - Type of school (nursery, primary, etc.)",
            "school_levels": "Array - Education levels offered",
            "languages": "Array - Languages of instruction",
            "current_academic_year": "String - Current academic year",
            "current_term": "String - Current term",
            "term_dates": "Object - Current term start/end dates",
            "school_hours": "Object - Daily school hours",
            "created_at": "DateTime",
            "updated_at": "DateTime"
        }
    
    @staticmethod
    def get_academic_calendar_schema() -> Dict[str, Any]:
        """Return academic calendar schema"""
        return {
            "academic_year": "String - Academic year (e.g., 2024/2025)",
            "terms": "Array - Term configurations",
            "holidays": "Array - Holiday schedules",
            "important_dates": "Array - Important dates",
            "status": "String - active, completed, planned",
            "created_at": "DateTime",
            "updated_at": "DateTime"
        }
    
    @staticmethod
    def get_event_schema() -> Dict[str, Any]:
        """Return school event schema"""
        return {
            "title": "String - Event title",
            "event_type": "String - Type of event",
            "description": "String - Event description",
            "start_date": "DateTime - Event start",
            "end_date": "DateTime - Event end",
            "location": "String - Event location",
            "organizer": "String - Event organizer",
            "target_audience": "Array - Target audience groups",
            "status": "String - Event status",
            "max_participants": "Integer - Maximum participants",
            "budget": "Decimal - Event budget",
            "attachments": "Array - Event documents",
            "created_at": "DateTime",
            "updated_at": "DateTime"
        }
    
    @staticmethod
    async def create_indexes(db: AsyncIOMotorDatabase):
        """Create all school-related indexes"""
        try:
            await db.school_info.create_index("school_name", name="idx_school_name")
            await db.academic_calendar.create_index("academic_year", unique=True, name="idx_calendar_year")
            await db.academic_calendar.create_index("status", name="idx_calendar_status")
            await db.school_events.create_index("start_date", name="idx_event_start")
            await db.school_events.create_index("end_date", name="idx_event_end")
            await db.school_events.create_index("event_type", name="idx_event_type")
            await db.school_events.create_index("status", name="idx_event_status")
            await db.school_events.create_index([("start_date", 1), ("status", 1)], name="idx_event_date_status")
            await db.school_events.create_index([("title", "text"), ("description", "text")], name="idx_event_search")
            await db.board_members.create_index([("last_name", 1), ("first_name", 1)], name="idx_board_name")
            await db.board_members.create_index("position", name="idx_board_position")
            await db.board_members.create_index("status", name="idx_board_status")
            await db.network_memberships.create_index("organization_name", name="idx_network_name")
            await db.network_memberships.create_index("membership_type", name="idx_network_type")
            await db.network_memberships.create_index("status", name="idx_network_status")
            await db.strategic_plans.create_index([("year_from", 1), ("year_to", 1)], name="idx_plan_years")
            await db.strategic_plans.create_index("status", name="idx_plan_status")
            await db.system_settings.create_index("setting_key", unique=True, name="idx_setting_key")
            await db.system_settings.create_index("setting_group", name="idx_setting_group")
            logger.info("School collection indexes created successfully")
        except Exception as e:
            logger.error(f"Failed to create school indexes: {e}")
            raise

    # =========================================================================
    # SCHOOL INFORMATION MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def get_school_info(db: AsyncIOMotorDatabase) -> Optional[Dict[str, Any]]:
        """Get school information"""
        school = await db.school_info.find_one({})
        if school: school["_id"] = str(school["_id"])
        return school
    
    @staticmethod
    async def update_school_info(
        db: AsyncIOMotorDatabase, update_data: Dict[str, Any], updated_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Update school information"""
        protected = ["_id", "created_at", "registration_number"]
        update_data = {k: v for k, v in update_data.items() if k not in protected}
        if not update_data: return False, "No valid fields to update", None
        
        if "address" in update_data and isinstance(update_data["address"], dict):
            current = await db.school_info.find_one({})
            if current:
                current_address = current.get("address", {})
                current_address.update(update_data["address"])
                update_data["address"] = current_address
        
        if "social_media" in update_data and isinstance(update_data["social_media"], dict):
            current = await db.school_info.find_one({})
            if current:
                current_social = current.get("social_media", {})
                current_social.update(update_data["social_media"])
                update_data["social_media"] = current_social
        
        update_data["updated_at"] = datetime.utcnow()
        
        try:
            result = await db.school_info.find_one_and_update(
                {}, {"$set": update_data}, upsert=True, return_document=ReturnDocument.AFTER
            )
            result["_id"] = str(result["_id"])
            await SchoolModel._log_audit(db, "school_info", str(result["_id"]), "UPDATE", updated_by, update_data)
            return True, "School information updated successfully", result
        except Exception as e:
            logger.error(f"Failed to update school info: {e}")
            return False, f"Failed to update school info: {str(e)}", None
    
    @staticmethod
    async def update_logo(
        db: AsyncIOMotorDatabase, logo_url: str, thumbnail_url: Optional[str] = None,
        updated_by: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Update school logo"""
        update_data = {"logo_url": logo_url, "updated_at": datetime.utcnow()}
        if thumbnail_url: update_data["logo_thumbnail_url"] = thumbnail_url
        result = await db.school_info.update_one({}, {"$set": update_data})
        if result.modified_count > 0 or result.upserted_id: return True, "Logo updated successfully"
        return False, "Failed to update logo"

    # =========================================================================
    # ACADEMIC CALENDAR MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def create_academic_calendar(
        db: AsyncIOMotorDatabase, academic_year: str, terms: List[Dict[str, Any]],
        holidays: Optional[List[Dict[str, Any]]] = None,
        important_dates: Optional[List[Dict[str, Any]]] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Create academic calendar for a year"""
        if not SchoolModel._validate_academic_year(academic_year):
            return False, "Invalid academic year format. Use YYYY/YYYY", None
        if not terms or len(terms) == 0:
            return False, "At least one term is required", None
        
        validated_terms = []
        for i, term in enumerate(terms):
            for date_field in ["start_date", "end_date"]:
                if date_field in term and isinstance(term[date_field], str):
                    try: term[date_field] = datetime.strptime(term[date_field], "%Y-%m-%d")
                    except ValueError: return False, f"Invalid date format for term {i+1} {date_field}", None
            
            validated_term = {
                "term_name": term.get("term_name", f"Term {i+1}"), "term_number": i + 1,
                "start_date": term["start_date"], "end_date": term["end_date"],
                "mid_term_break_start": term.get("mid_term_break_start"),
                "mid_term_break_end": term.get("mid_term_break_end"),
                "exam_period_start": term.get("exam_period_start"),
                "exam_period_end": term.get("exam_period_end"),
                "report_card_date": term.get("report_card_date"),
                "total_school_days": term.get("total_school_days", 0),
                "is_current": i == 0
            }
            validated_terms.append(validated_term)
        
        validated_holidays = []
        if holidays:
            for holiday in holidays:
                for date_field in ["start_date", "end_date"]:
                    if date_field in holiday and isinstance(holiday[date_field], str):
                        try: holiday[date_field] = datetime.strptime(holiday[date_field], "%Y-%m-%d")
                        except ValueError: return False, f"Invalid date format for holiday {date_field}", None
                validated_holidays.append({
                    "name": holiday["name"], "start_date": holiday["start_date"],
                    "end_date": holiday["end_date"], "description": holiday.get("description", ""),
                    "is_recurring": holiday.get("is_recurring", False)
                })
        
        validated_dates = []
        if important_dates:
            for imp_date in important_dates:
                if "date" in imp_date and isinstance(imp_date["date"], str):
                    try: imp_date["date"] = datetime.strptime(imp_date["date"], "%Y-%m-%d")
                    except ValueError: return False, "Invalid date format for important date", None
                validated_dates.append({
                    "name": imp_date["name"], "date": imp_date["date"],
                    "description": imp_date.get("description", ""),
                    "category": imp_date.get("category", "general")
                })
        
        calendar = {
            "academic_year": academic_year, "terms": validated_terms,
            "holidays": validated_holidays, "important_dates": validated_dates,
            "status": "active", "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
        }
        
        try:
            await db.academic_calendar.update_many(
                {"academic_year": academic_year},
                {"$set": {"status": "archived", "updated_at": datetime.utcnow()}}
            )
            result = await db.academic_calendar.insert_one(calendar)
            calendar["_id"] = str(result.inserted_id)
            
            current_term = validated_terms[0]
            await db.school_info.update_one({}, {"$set": {
                "current_academic_year": academic_year,
                "current_term": current_term["term_name"],
                "term_dates": {
                    "term_start": current_term["start_date"], "term_end": current_term["end_date"],
                    "mid_term_start": current_term.get("mid_term_break_start"),
                    "mid_term_end": current_term.get("mid_term_break_end")
                },
                "updated_at": datetime.utcnow()
            }})
            logger.info(f"Academic calendar created for {academic_year}")
            return True, f"Academic calendar created for {academic_year}", calendar
        except Exception as e:
            logger.error(f"Failed to create academic calendar: {e}")
            return False, f"Failed to create calendar: {str(e)}", None
    
    @staticmethod
    async def get_academic_calendar(
        db: AsyncIOMotorDatabase, academic_year: Optional[str] = None, status: str = "active"
    ) -> Optional[Dict[str, Any]]:
        """Get academic calendar for a specific year"""
        if not academic_year: academic_year = SchoolModel._get_current_academic_year()
        calendar = await db.academic_calendar.find_one({"academic_year": academic_year, "status": status})
        if calendar:
            calendar["_id"] = str(calendar["_id"])
            if calendar.get("created_by"): calendar["created_by"] = str(calendar["created_by"])
        return calendar
    
    @staticmethod
    async def get_current_term_info(db: AsyncIOMotorDatabase) -> Optional[Dict[str, Any]]:
        """Get current active term information"""
        calendar = await SchoolModel.get_academic_calendar(db)
        if not calendar: return None
        today = datetime.now()
        for term in calendar.get("terms", []):
            if term["start_date"] <= today <= term["end_date"]:
                return {
                    "academic_year": calendar["academic_year"], "term_name": term["term_name"],
                    "term_number": term["term_number"], "start_date": term["start_date"],
                    "end_date": term["end_date"],
                    "mid_term_break_start": term.get("mid_term_break_start"),
                    "mid_term_break_end": term.get("mid_term_break_end"),
                    "exam_period_start": term.get("exam_period_start"),
                    "exam_period_end": term.get("exam_period_end"),
                    "report_card_date": term.get("report_card_date"),
                    "days_remaining": (term["end_date"] - today).days,
                    "days_elapsed": (today - term["start_date"]).days,
                    "total_days": (term["end_date"] - term["start_date"]).days
                }
        return None
    
    @staticmethod
    async def is_school_day(
        db: AsyncIOMotorDatabase, check_date: Optional[date] = None
    ) -> Tuple[bool, str]:
        """Check if a given date is a school day"""
        if not check_date: check_date = date.today()
        calendar = await SchoolModel.get_academic_calendar(db)
        if not calendar: return False, "No active academic calendar found"
        check_datetime = datetime.combine(check_date, datetime.min.time())
        in_term = False
        for term in calendar.get("terms", []):
            if term["start_date"] <= check_datetime <= term["end_date"]:
                in_term = True; break
        if not in_term: return False, "Date falls outside academic terms"
        if check_date.weekday() >= 5: return False, "Weekend"
        for holiday in calendar.get("holidays", []):
            holiday_start = holiday["start_date"]; holiday_end = holiday["end_date"]
            if isinstance(holiday_start, datetime): holiday_start = holiday_start.date()
            if isinstance(holiday_end, datetime): holiday_end = holiday_end.date()
            if holiday_start <= check_date <= holiday_end: return False, f"Holiday: {holiday['name']}"
        return True, "School day"

    # =========================================================================
    # SCHOOL EVENTS MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def create_event(
        db: AsyncIOMotorDatabase, title: str, event_type: str,
        start_date: Union[date, str], end_date: Union[date, str],
        description: Optional[str] = None, location: Optional[str] = None,
        organizer: Optional[str] = None, target_audience: Optional[List[str]] = None,
        max_participants: Optional[int] = None, budget: Optional[float] = None,
        created_by: Optional[str] = None, attachments: Optional[List[Dict[str, str]]] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Create a school event"""
        if event_type not in SchoolModel.EVENT_TYPES:
            return False, f"Invalid event type. Must be: {', '.join(SchoolModel.EVENT_TYPES)}", None
        if isinstance(start_date, str):
            try: start_date = datetime.strptime(start_date, "%Y-%m-%d")
            except ValueError: return False, "Invalid start date format. Use YYYY-MM-DD", None
        if isinstance(end_date, str):
            try: end_date = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError: return False, "Invalid end date format. Use YYYY-MM-DD", None
        if end_date < start_date: return False, "End date cannot be before start date", None
        
        today = datetime.now()
        if today < start_date: status = "upcoming"
        elif start_date <= today <= end_date: status = "ongoing"
        else: status = "completed"
        
        event = {
            "title": title.strip(), "event_type": event_type, "description": description,
            "start_date": start_date, "end_date": end_date,
            "location": location or "School Premises", "organizer": organizer or "School Administration",
            "target_audience": target_audience or ["all"], "status": status,
            "max_participants": max_participants, "current_participants": 0, "budget": budget,
            "attachments": attachments or [],
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
        }
        try:
            result = await db.school_events.insert_one(event)
            event["_id"] = str(result.inserted_id)
            logger.info(f"School event created: {title}")
            await SchoolModel._log_audit(db, "school_events", str(result.inserted_id), "INSERT", created_by, {"title": title, "event_type": event_type})
            return True, "Event created successfully", event
        except Exception as e:
            logger.error(f"Failed to create event: {e}")
            return False, f"Failed to create event: {str(e)}", None
    
    @staticmethod
    async def update_event(
        db: AsyncIOMotorDatabase, event_id: str, update_data: Dict[str, Any],
        updated_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Update a school event"""
        protected = ["_id", "created_at", "created_by", "current_participants"]
        update_data = {k: v for k, v in update_data.items() if k not in protected}
        if not update_data: return False, "No valid fields to update", None
        
        for date_field in ["start_date", "end_date"]:
            if date_field in update_data and isinstance(update_data[date_field], str):
                try: update_data[date_field] = datetime.strptime(update_data[date_field], "%Y-%m-%d")
                except ValueError: return False, f"Invalid {date_field} format", None
        
        if "start_date" in update_data or "end_date" in update_data:
            event = await db.school_events.find_one({"_id": ObjectId(event_id)})
            if event:
                start = update_data.get("start_date", event["start_date"])
                end = update_data.get("end_date", event["end_date"])
                today = datetime.now()
                if today < start: update_data["status"] = "upcoming"
                elif start <= today <= end: update_data["status"] = "ongoing"
                else: update_data["status"] = "completed"
        
        update_data["updated_at"] = datetime.utcnow()
        try:
            result = await db.school_events.find_one_and_update(
                {"_id": ObjectId(event_id)}, {"$set": update_data}, return_document=ReturnDocument.AFTER
            )
            if not result: return False, "Event not found", None
            result["_id"] = str(result["_id"])
            if result.get("created_by"): result["created_by"] = str(result["created_by"])
            return True, "Event updated successfully", result
        except Exception as e:
            logger.error(f"Failed to update event: {e}")
            return False, f"Failed to update event: {str(e)}", None
    
    @staticmethod
    async def get_events(
        db: AsyncIOMotorDatabase, event_type: Optional[str] = None, status: Optional[str] = None,
        start_date: Optional[date] = None, end_date: Optional[date] = None,
        search: Optional[str] = None, limit: int = 20, skip: int = 0,
        upcoming_only: bool = False
    ) -> Dict[str, Any]:
        """Get school events with filtering"""
        filter_query = {}
        if event_type: filter_query["event_type"] = event_type
        if status: filter_query["status"] = status
        if upcoming_only: filter_query["status"] = {"$in": ["upcoming", "ongoing"]}
        if start_date or end_date:
            date_filter = {}
            if start_date: date_filter["$gte"] = datetime.combine(start_date, datetime.min.time())
            if end_date: date_filter["$lte"] = datetime.combine(end_date, datetime.max.time())
            if date_filter: filter_query["start_date"] = date_filter
        if search:
            filter_query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"location": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.school_events.count_documents(filter_query)
        events = await db.school_events.find(filter_query).sort("start_date", 1).skip(skip).limit(limit).to_list(length=limit)
        for event in events:
            event["_id"] = str(event["_id"])
            if event.get("created_by"): event["created_by"] = str(event["created_by"])
        
        return {
            "events": events, "total": total, "limit": limit, "skip": skip,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1
        }

    # =========================================================================
    # BOARD MEMBERS MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def add_board_member(
        db: AsyncIOMotorDatabase, first_name: str, last_name: str, position: str,
        phone_number: str, email: Optional[str] = None, address: Optional[str] = None,
        valid_from: Optional[Union[date, str]] = None, valid_until: Optional[Union[date, str]] = None,
        photo_url: Optional[str] = None, bio: Optional[str] = None, created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Add a school board member"""
        if position not in SchoolModel.BOARD_POSITIONS:
            return False, f"Invalid position. Must be: {', '.join(SchoolModel.BOARD_POSITIONS)}", None
        if isinstance(valid_from, str):
            try: valid_from = datetime.strptime(valid_from, "%Y-%m-%d")
            except ValueError: return False, "Invalid valid_from date format", None
        if isinstance(valid_until, str):
            try: valid_until = datetime.strptime(valid_until, "%Y-%m-%d")
            except ValueError: return False, "Invalid valid_until date format", None
        if not valid_from: valid_from = datetime.utcnow()
        
        member = {
            "first_name": first_name.strip().title(), "last_name": last_name.strip().title(),
            "position": position, "phone_number": phone_number,
            "email": email.lower().strip() if email else None, "address": address,
            "valid_from": valid_from, "valid_until": valid_until,
            "photo_url": photo_url, "bio": bio, "status": "active",
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
        }
        try:
            result = await db.board_members.insert_one(member)
            member["_id"] = str(result.inserted_id)
            return True, "Board member added successfully", member
        except Exception as e:
            logger.error(f"Failed to add board member: {e}")
            return False, f"Failed to add board member: {str(e)}", None
    
    @staticmethod
    async def get_board_members(db: AsyncIOMotorDatabase, status: str = "active") -> List[Dict[str, Any]]:
        """Get all board members"""
        filter_query = {"status": status} if status else {}
        members = await db.board_members.find(filter_query).sort([("position_order", 1), ("last_name", 1)]).to_list(length=None)
        for member in members:
            member["_id"] = str(member["_id"])
            if member.get("created_by"): member["created_by"] = str(member["created_by"])
        return members

    # =========================================================================
    # NETWORK MEMBERSHIPS MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def add_network_membership(
        db: AsyncIOMotorDatabase, organization_name: str, membership_type: str,
        contact_person: str, contact_email: str, contact_phone: str,
        start_date: Optional[Union[date, str]] = None, end_date: Optional[Union[date, str]] = None,
        benefits: Optional[str] = None, website: Optional[str] = None,
        created_by: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Add a network membership or partnership"""
        if membership_type not in SchoolModel.MEMBERSHIP_TYPES:
            return False, f"Invalid membership type. Must be: {', '.join(SchoolModel.MEMBERSHIP_TYPES)}", None
        if isinstance(start_date, str):
            try: start_date = datetime.strptime(start_date, "%Y-%m-%d")
            except ValueError: return False, "Invalid start date format", None
        if isinstance(end_date, str):
            try: end_date = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError: return False, "Invalid end date format", None
        if not start_date: start_date = datetime.utcnow()
        
        status = "active"
        if end_date and end_date < datetime.utcnow(): status = "expired"
        
        membership = {
            "organization_name": organization_name.strip(), "membership_type": membership_type,
            "contact_person": contact_person, "contact_email": contact_email.lower().strip(),
            "contact_phone": contact_phone, "website": website,
            "start_date": start_date, "end_date": end_date, "benefits": benefits,
            "status": status, "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
        }
        try:
            result = await db.network_memberships.insert_one(membership)
            membership["_id"] = str(result.inserted_id)
            return True, "Network membership added successfully", membership
        except Exception as e:
            logger.error(f"Failed to add network membership: {e}")
            return False, f"Failed to add membership: {str(e)}", None
    
    @staticmethod
    async def get_network_memberships(
        db: AsyncIOMotorDatabase, status: Optional[str] = None, membership_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get network memberships with filtering"""
        filter_query = {}
        if status: filter_query["status"] = status
        if membership_type: filter_query["membership_type"] = membership_type
        memberships = await db.network_memberships.find(filter_query).sort("organization_name", 1).to_list(length=None)
        for membership in memberships:
            membership["_id"] = str(membership["_id"])
            if membership.get("created_by"): membership["created_by"] = str(membership["created_by"])
        return memberships

    # =========================================================================
    # STRATEGIC PLAN MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def create_strategic_plan(
        db: AsyncIOMotorDatabase, year_from: int, year_to: int,
        thematic_areas: List[Dict[str, Any]], created_by: Optional[str] = None,
        description: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Create a strategic plan"""
        if year_from >= year_to: return False, "End year must be greater than start year", None
        if year_from < 2020: return False, "Start year must be 2020 or later", None
        
        validated_areas = []
        total_budget = 0
        for area in thematic_areas:
            if not area.get("name") or not area.get("objectives"):
                return False, "Each thematic area must have a name and objectives", None
            validated_objectives = []
            for obj in area["objectives"]:
                if not obj.get("objective"): return False, "Each objective must have a description", None
                validated_objectives.append({
                    "objective": obj["objective"], "activities": obj.get("activities", []),
                    "indicators": obj.get("indicators", []), "budget": obj.get("budget", 0),
                    "responsible_party": obj.get("responsible_party", ""),
                    "timeline": obj.get("timeline", ""), "status": obj.get("status", "planned"),
                    "progress": obj.get("progress", 0)
                })
                total_budget += obj.get("budget", 0)
            validated_areas.append({"name": area["name"], "objectives": validated_objectives})
        
        plan = {
            "year_from": year_from, "year_to": year_to, "period": f"{year_from}-{year_to}",
            "description": description, "thematic_areas": validated_areas,
            "total_budget": total_budget, "status": "active",
            "created_by": ObjectId(created_by) if created_by else None,
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
        }
        try:
            result = await db.strategic_plans.insert_one(plan)
            plan["_id"] = str(result.inserted_id)
            return True, "Strategic plan created successfully", plan
        except Exception as e:
            logger.error(f"Failed to create strategic plan: {e}")
            return False, f"Failed to create plan: {str(e)}", None
    
    @staticmethod
    async def get_strategic_plans(db: AsyncIOMotorDatabase, status: str = "active") -> List[Dict[str, Any]]:
        """Get strategic plans"""
        plans = await db.strategic_plans.find({"status": status} if status else {}).sort("year_from", -1).to_list(length=None)
        for plan in plans:
            plan["_id"] = str(plan["_id"])
            if plan.get("created_by"): plan["created_by"] = str(plan["created_by"])
            if plan.get("thematic_areas"):
                total_objectives = 0; completed_objectives = 0
                for area in plan["thematic_areas"]:
                    for obj in area.get("objectives", []):
                        total_objectives += 1
                        if obj.get("status") == "completed": completed_objectives += 1
                plan["progress_percentage"] = round((completed_objectives / total_objectives * 100) if total_objectives else 0, 2)
        return plans

    # =========================================================================
    # SYSTEM SETTINGS MANAGEMENT
    # =========================================================================
    
    @staticmethod
    async def get_setting(db: AsyncIOMotorDatabase, setting_key: str) -> Optional[Any]:
        """Get a system setting value"""
        setting = await db.system_settings.find_one({"setting_key": setting_key})
        return setting.get("setting_value") if setting else None
    
    @staticmethod
    async def set_setting(
        db: AsyncIOMotorDatabase, setting_key: str, setting_value: Any,
        setting_group: str = "general", description: Optional[str] = None,
        updated_by: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Set or update a system setting"""
        setting = {
            "setting_key": setting_key, "setting_value": setting_value,
            "setting_group": setting_group, "description": description,
            "updated_by": ObjectId(updated_by) if updated_by else None,
            "updated_at": datetime.utcnow()
        }
        try:
            result = await db.system_settings.update_one({"setting_key": setting_key}, {"$set": setting}, upsert=True)
            return True, f"Setting '{setting_key}' {'updated' if result.modified_count > 0 else 'created'} successfully"
        except Exception as e:
            logger.error(f"Failed to set system setting: {e}")
            return False, f"Failed to update setting: {str(e)}"
    
    @staticmethod
    async def get_all_settings(
        db: AsyncIOMotorDatabase, setting_group: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all system settings, optionally filtered by group"""
        filter_query = {"setting_group": setting_group} if setting_group else {}
        settings = await db.system_settings.find(filter_query).to_list(length=None)
        grouped_settings = {}
        for setting in settings:
            group = setting.get("setting_group", "general")
            if group not in grouped_settings: grouped_settings[group] = {}
            grouped_settings[group][setting["setting_key"]] = setting["setting_value"]
        return grouped_settings

    # =========================================================================
    # DASHBOARD STATISTICS
    # =========================================================================
    
    @staticmethod
    async def get_school_statistics(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
        """Get comprehensive school statistics for dashboard"""
        total_students = await db.students.count_documents({"status": "active"})
        total_teachers = await db.teachers.count_documents({"status": "active"})
        total_classes = await db.classes.count_documents({})
        total_staff = await db.users.count_documents({"status": "active"})
        
        student_types = await db.students.aggregate([
            {"$match": {"status": "active"}}, {"$group": {"_id": "$student_type", "count": {"$sum": 1}}}
        ]).to_list(length=None)
        
        today = datetime.combine(date.today(), datetime.min.time())
        today_attendance = await db.attendance.count_documents({"date": today})
        upcoming_events = await db.school_events.count_documents({"status": {"$in": ["upcoming", "ongoing"]}})
        
        academic_year = SchoolModel._get_current_academic_year()
        financial_summary = await db.financial_records.aggregate([
            {"$match": {"academic_year": academic_year, "approval_status": "approved"}},
            {"$group": {"_id": "$transaction_type", "total": {"$sum": "$amount"}}}
        ]).to_list(length=None)
        
        income = 0; expenses = 0
        for item in financial_summary:
            if item["_id"] == "income": income = item["total"]
            elif item["_id"] == "expense": expenses = item["total"]
        
        return {
            "students": {"total_active": total_students, "by_type": {item["_id"]: item["count"] for item in student_types}},
            "staff": {"total_teachers": total_teachers, "total_staff": total_staff, "total_classes": total_classes},
            "attendance": {"today_marked": today_attendance, "attendance_rate": round((today_attendance / total_students * 100) if total_students else 0, 2)},
            "events": {"upcoming": upcoming_events},
            "financial": {"academic_year": academic_year, "total_income": round(income, 2), "total_expenses": round(expenses, 2), "balance": round(income - expenses, 2)}
        }

    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    @staticmethod
    def _get_current_academic_year() -> str:
        """
        Get current academic year dynamically.
        South Sudan Calendar: Academic year runs February to November.
        January belongs to the PREVIOUS academic year.
        Examples: June 2026 → "2026/2027", January 2027 → "2026/2027"
        """
        now = datetime.now()
        year = now.year
        month = now.month
        start_year = year - 1 if month == 1 else year
        return f"{start_year}/{start_year + 1}"
    
    @staticmethod
    def _get_current_term() -> str:
        """
        Get current academic term dynamically.
        South Sudan: Term 1 (Feb-Apr), Term 2 (May-Jul), Term 3 (Sep-Nov)
        Breaks: August, December, January
        """
        month = datetime.now().month
        if 2 <= month <= 4: return "Term 1"
        elif 5 <= month <= 7: return "Term 2"
        elif 9 <= month <= 11: return "Term 3"
        elif month == 8: return "Term 2 Break"
        else: return "Annual Break"
    
    @staticmethod
    def _validate_academic_year(year_str: str) -> bool:
        """Validate academic year format (YYYY/YYYY)"""
        try:
            parts = year_str.split("/")
            if len(parts) != 2: return False
            year1, year2 = int(parts[0]), int(parts[1])
            return year2 == year1 + 1 and year1 >= 2020
        except (ValueError, IndexError):
            return False
    
    @staticmethod
    async def _log_audit(
        db: AsyncIOMotorDatabase, table_name: str, record_id: str,
        operation: str, changed_by: Optional[str], details: Dict[str, Any]
    ):
        """Log school operations to audit log"""
        try:
            await db.audit_log.insert_one({
                "table_name": table_name, "record_id": record_id,
                "operation": operation,
                "changed_by": ObjectId(changed_by) if changed_by else None,
                "new_values": details, "changed_at": datetime.utcnow(),
                "academic_year": SchoolModel._get_current_academic_year(),
                "term": SchoolModel._get_current_term()
            })
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")
