"""
User Service
Handles user management business logic
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.models.user import UserModel
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)


class UserService:
    """User management service"""
    
    @staticmethod
    async def create_user_with_validation(
        db: AsyncIOMotorDatabase,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        role: str,
        phone_number: Optional[str] = None,
        created_by: Optional[str] = None,
        permissions: Optional[List[str]] = None,
        send_welcome_email: bool = False
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Create user with additional validations
        
        Args:
            db: Database connection
            email: User email
            password: User password
            first_name: First name
            last_name: Last name
            role: User role
            phone_number: Optional phone
            created_by: Creator ID
            permissions: Custom permissions
            send_welcome_email: Send welcome email
            
        Returns:
            Tuple of (success, message, user_document)
        """
        
        # Additional business validations
        if role == "admin":
            # Count existing admins
            admin_count = await db.users.count_documents({"role": "admin", "status": "active"})
            if admin_count >= 3:
                return False, "Maximum number of admin accounts reached (3)", None
        
        # Create user
        success, message, user = await UserModel.create_user(
            db=db,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            phone_number=phone_number,
            created_by=created_by,
            permissions=permissions
        )
        
        if success and send_welcome_email:
            # In production: send welcome email
            logger.info(f"Welcome email would be sent to: {email}")
        
        return success, message, user
    
    @staticmethod
    async def get_user_profile_complete(
        db: AsyncIOMotorDatabase,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get complete user profile with all related data
        
        Args:
            db: Database connection
            user_id: User ID
            
        Returns:
            Complete user profile
        """
        user = await UserModel.get_user_by_id(db, user_id)
        
        if not user:
            return None
        
        # Add role-specific data
        if user["role"] == "teacher":
            teacher = await db.teachers.find_one({"user_id": user_id})
            if teacher:
                user["teacher_profile"] = {
                    "employee_id": teacher.get("employee_id"),
                    "specialization": teacher.get("specialization"),
                    "subjects": teacher.get("subjects", []),
                    "class_teacher_of": str(teacher.get("class_teacher_of")) if teacher.get("class_teacher_of") else None,
                    "status": teacher.get("status")
                }
        
        elif user["role"] == "admin":
            # Get admin activity summary
            recent_actions = await db.audit_log.count_documents({
                "changed_by": user_id,
                "changed_at": {"$gte": datetime.utcnow() - timedelta(days=30)}
            })
            user["admin_stats"] = {
                "recent_actions_30d": recent_actions
            }
        
        # Get login statistics
        login_history = user.get("login_history", [])
        if login_history:
            successful_logins = sum(1 for l in login_history if l.get("success"))
            failed_logins = sum(1 for l in login_history if not l.get("success"))
            last_login = login_history[-1] if login_history else None
            
            user["login_stats"] = {
                "total_logins": len(login_history),
                "successful_logins": successful_logins,
                "failed_logins": failed_logins,
                "last_login": last_login.get("timestamp") if last_login else None
            }
        
        return user
    
    @staticmethod
    async def bulk_import_users(
        db: AsyncIOMotorDatabase,
        users_data: List[Dict[str, Any]],
        created_by: str,
        default_password: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Bulk import users from list
        
        Args:
            db: Database connection
            users_data: List of user data dictionaries
            created_by: Creator ID
            default_password: Default password if not provided
            
        Returns:
            Import results
        """
        successful = 0
        failed = 0
        errors = []
        created_users = []
        
        for i, user_data in enumerate(users_data):
            try:
                email = user_data.get("email", "").lower().strip()
                password = user_data.get("password") or default_password or "Chang3M3!@#"
                first_name = user_data.get("first_name", "").strip()
                last_name = user_data.get("last_name", "").strip()
                role = user_data.get("role", "staff")
                phone = user_data.get("phone_number")
                
                if not email or not first_name or not last_name:
                    failed += 1
                    errors.append(f"Row {i+1}: Missing required fields")
                    continue
                
                success, message, user = await UserModel.create_user(
                    db=db,
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role=role,
                    phone_number=phone,
                    created_by=created_by
                )
                
                if success:
                    successful += 1
                    created_users.append({
                        "id": user["_id"],
                        "email": email,
                        "name": f"{first_name} {last_name}",
                        "role": role
                    })
                else:
                    failed += 1
                    errors.append(f"Row {i+1}: {message}")
                    
            except Exception as e:
                failed += 1
                errors.append(f"Row {i+1}: {str(e)}")
        
        return {
            "successful": successful,
            "failed": failed,
            "errors": errors,
            "users": created_users
        }
    
    @staticmethod
    async def get_user_activity_summary(
        db: AsyncIOMotorDatabase,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get user activity summary
        
        Args:
            db: Database connection
            user_id: User ID
            days: Number of days to analyze
            
        Returns:
            Activity summary
        """
        since = datetime.utcnow() - timedelta(days=days)
        
        # Actions performed
        actions = await db.audit_log.count_documents({
            "changed_by": user_id,
            "changed_at": {"$gte": since}
        })
        
        # Actions by type
        action_pipeline = [
            {"$match": {"changed_by": user_id, "changed_at": {"$gte": since}}},
            {"$group": {"_id": "$operation", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        action_types = await db.audit_log.aggregate(action_pipeline).to_list(length=None)
        
        # Actions by table
        table_pipeline = [
            {"$match": {"changed_by": user_id, "changed_at": {"$gte": since}}},
            {"$group": {"_id": "$table_name", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        table_actions = await db.audit_log.aggregate(table_pipeline).to_list(length=None)
        
        # Daily activity
        daily_pipeline = [
            {"$match": {"changed_by": user_id, "changed_at": {"$gte": since}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$changed_at"}},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        daily_activity = await db.audit_log.aggregate(daily_pipeline).to_list(length=None)
        
        return {
            "user_id": user_id,
            "period_days": days,
            "total_actions": actions,
            "by_operation": {item["_id"]: item["count"] for item in action_types},
            "by_table": {item["_id"]: item["count"] for item in table_actions},
            "daily_activity": [{"date": item["_id"], "count": item["count"]} for item in daily_activity]
        }