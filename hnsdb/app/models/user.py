"""
User Model - Staff and system user management
Supports: Admin, Teacher, Accountant, Counselor roles
"""
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError
import logging

from app.core.security import get_password_hash

logger = logging.getLogger(__name__)


class UserModel:
    """User model for MongoDB"""
    
    collection_name = "users"
    
    # Valid user roles
    VALID_ROLES = ["admin", "teacher", "accountant", "counselor", "staff"]
    
    # Role permissions mapping
    ROLE_PERMISSIONS = {
        "admin": [
            "manage_users", "manage_students", "manage_teachers",
            "manage_classes", "manage_attendance", "manage_exams",
            "manage_financial", "manage_reports", "manage_school",
            "view_all", "edit_all", "delete_all"
        ],
        "teacher": [
            "view_students", "manage_attendance", "manage_exams",
            "view_reports", "view_classes"
        ],
        "accountant": [
            "manage_financial", "view_financial_reports",
            "view_students_financial"
        ],
        "counselor": [
            "view_students", "manage_counseling", "view_reports"
        ],
        "staff": [
            "view_students", "view_attendance", "view_reports"
        ]
    }
    
    @staticmethod
    def get_schema() -> Dict[str, Any]:
        """Return user schema"""
        return {
            "email": "user@example.com",
            "password_hash": "hashed_password",
            "first_name": "John",
            "last_name": "Doe",
            "role": "admin",
            "phone_number": "+211 900 000 000",
            "status": "active",
            "permissions": [],
            "last_login": None,
            "login_attempts": 0,
            "password_changed_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": None
        }
    
    @staticmethod
    async def create_user(
        db: AsyncIOMotorDatabase,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        role: str,
        phone_number: Optional[str] = None,
        created_by: Optional[str] = None,
        permissions: Optional[List[str]] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Create a new user"""
        
        # Validate role
        if role not in UserModel.VALID_ROLES:
            return False, f"Invalid role. Must be one of: {', '.join(UserModel.VALID_ROLES)}", None
        
        # Validate email format
        email = email.lower().strip()
        if not "@" in email or not "." in email:
            return False, "Invalid email format", None
        
        # Check if email already exists
        existing_user = await db.users.find_one({"email": email})
        if existing_user:
            return False, "Email already registered", None
        
        # Get default permissions for role if not specified
        if permissions is None:
            permissions = UserModel.ROLE_PERMISSIONS.get(role, [])
        
        # Create user document
        user_doc = {
            "email": email,
            "password_hash": get_password_hash(password),
            "first_name": first_name,
            "last_name": last_name,
            "role": role,
            "phone_number": phone_number,
            "status": "active",
            "permissions": permissions,
            "login_attempts": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        if created_by:
            user_doc["created_by"] = ObjectId(created_by)
        
        try:
            result = await db.users.insert_one(user_doc)
            user_doc["_id"] = str(result.inserted_id)
            
            logger.info(f"User created: {email} with role {role}")
            return True, "User created successfully", user_doc
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            return False, f"Failed to create user: {str(e)}", None
    
    @staticmethod
    async def update_user(
        db: AsyncIOMotorDatabase,
        user_id: str,
        update_data: Dict[str, Any]
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """Update user information"""
        
        # Remove fields that shouldn't be updated directly
        forbidden_fields = ["_id", "password_hash", "created_at", "created_by"]
        update_data = {k: v for k, v in update_data.items() if k not in forbidden_fields}
        
        if not update_data:
            return False, "No valid fields to update", None
        
        # Validate role if being updated
        if "role" in update_data and update_data["role"] not in UserModel.VALID_ROLES:
            return False, f"Invalid role", None
        
        # If role is being updated, update permissions accordingly
        if "role" in update_data:
            update_data["permissions"] = UserModel.ROLE_PERMISSIONS.get(
                update_data["role"], []
            )
        
        update_data["updated_at"] = datetime.utcnow()
        
        try:
            result = await db.users.find_one_and_update(
                {"_id": ObjectId(user_id)},
                {"$set": update_data},
                return_document=True
            )
            
            if not result:
                return False, "User not found", None
            
            result["_id"] = str(result["_id"])
            return True, "User updated successfully", result
            
        except Exception as e:
            logger.error(f"Failed to update user: {e}")
            return False, f"Failed to update user: {str(e)}", None
    
    @staticmethod
    async def get_user_by_id(
        db: AsyncIOMotorDatabase,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
            # Remove sensitive data
            user.pop("password_hash", None)
        return user
    
    @staticmethod
    async def get_users(
        db: AsyncIOMotorDatabase,
        role: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 20,
        skip: int = 0
    ) -> Dict[str, Any]:
        """Get users with filtering and pagination"""
        
        filter_query = {}
        
        if role:
            filter_query["role"] = role
        if status:
            filter_query["status"] = status
        if search:
            filter_query["$or"] = [
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.users.count_documents(filter_query)
        
        cursor = db.users.find(
            filter_query,
            {"password_hash": 0}  # Exclude password hash
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        users = []
        async for user in cursor:
            user["_id"] = str(user["_id"])
            users.append(user)
        
        return {
            "users": users,
            "total": total,
            "limit": limit,
            "skip": skip,
            "page": (skip // limit) + 1 if limit > 0 else 1
        }
    
    @staticmethod
    async def deactivate_user(
        db: AsyncIOMotorDatabase,
        user_id: str
    ) -> Tuple[bool, str]:
        """Deactivate a user"""
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "status": "inactive",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            return True, "User deactivated successfully"
        return False, "User not found"
    
    @staticmethod
    async def activate_user(
        db: AsyncIOMotorDatabase,
        user_id: str
    ) -> Tuple[bool, str]:
        """Activate a user"""
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "status": "active",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            return True, "User activated successfully"
        return False, "User not found"
    
    @staticmethod
    async def delete_user(
        db: AsyncIOMotorDatabase,
        user_id: str
    ) -> Tuple[bool, str]:
        """Soft delete a user (mark as deleted)"""
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "status": "deleted",
                    "deleted_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            return True, "User deleted successfully"
        return False, "User not found"