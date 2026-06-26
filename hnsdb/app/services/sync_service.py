"""
Sync Service - Handles data synchronization logic
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from bson import ObjectId
from app.core.database import get_database

class SyncService:
    def __init__(self):
        self.db = get_database()
        self.conflicts_collection = self.db.get_collection("sync_conflicts")
        self.sync_log_collection = self.db.get_collection("sync_log")
    
    async def process_push(self, changes: List[Dict], user_id: str) -> Dict:
        """Process incoming changes from client"""
        processed = 0
        conflicts = []
        errors = []
        
        for change in changes:
            try:
                entity_type = change.get("entityType")
                action = change.get("action")
                data = change.get("data")
                client_timestamp = change.get("clientTimestamp")
                
                if not all([entity_type, action, data]):
                    errors.append({"change": change, "error": "Missing required fields"})
                    continue
                
                collection = self._get_collection(entity_type)
                if not collection:
                    errors.append({"change": change, "error": f"Unknown entity type: {entity_type}"})
                    continue
                
                # Check for conflicts
                has_conflict = await self._check_conflict(
                    collection, entity_type, data, action, client_timestamp
                )
                
                if has_conflict:
                    conflicts.append({
                        "entityType": entity_type,
                        "action": action,
                        "clientData": data,
                        "serverData": has_conflict,
                        "clientTimestamp": client_timestamp,
                        "serverTimestamp": has_conflict.get("updated_at")
                    })
                    continue
                
                # Apply the change
                await self._apply_change(collection, action, data)
                processed += 1
                
                # Log the sync
                await self._log_sync(user_id, entity_type, action, data.get("_id") or data.get("id"))
                
            except Exception as e:
                errors.append({"change": change, "error": str(e)})
        
        return {
            "processed": processed,
            "conflicts": conflicts,
            "errors": errors
        }
    
    async def get_changes(self, user_id: str, entity_type: Optional[str] = None,
                         since: Optional[datetime] = None) -> List[Dict]:
        """Get data changes for sync"""
        results = []
        
        if not since:
            since = datetime.utcnow() - timedelta(days=30)  # Default to last 30 days
        
        entity_types = [entity_type] if entity_type else [
            "students", "teachers", "attendance", "financial", "classes"
        ]
        
        for entity in entity_types:
            collection = self._get_collection(entity)
            if not collection:
                continue
            
            # Get documents modified since the timestamp
            cursor = collection.find({
                "updated_at": {"$gte": since.isoformat()}
            })
            
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])  # Convert ObjectId to string
                doc["entityType"] = entity
                results.append(doc)
        
        return results
    
    async def get_sync_status(self, user_id: str) -> Dict:
        """Get current sync status"""
        # Count pending changes
        pending_changes = await self.sync_log_collection.count_documents({
            "user_id": user_id,
            "status": "pending"
        })
        
        # Count unresolved conflicts
        unresolved_conflicts = await self.conflicts_collection.count_documents({
            "user_id": user_id,
            "status": "pending"
        })
        
        # Get last sync time
        last_sync = await self.sync_log_collection.find_one(
            {"user_id": user_id, "status": "completed"},
            sort=[("timestamp", -1)]
        )
        
        return {
            "pendingChanges": pending_changes,
            "unresolvedConflicts": unresolved_conflicts,
            "lastSyncTime": last_sync["timestamp"] if last_sync else None,
            "isOnline": True  # Server is always online
        }
    
    async def get_conflicts(self, user_id: str, status: str = "pending") -> List[Dict]:
        """Get list of conflicts"""
        query = {"user_id": user_id}
        if status != "all":
            query["status"] = status
        
        cursor = self.conflicts_collection.find(query)
        conflicts = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            conflicts.append(doc)
        
        return conflicts
    
    async def resolve_conflict(self, conflict_id: str, resolution: str, user_id: str) -> Dict:
        """Resolve a sync conflict"""
        conflict = await self.conflicts_collection.find_one({"_id": ObjectId(conflict_id)})
        
        if not conflict:
            raise ValueError(f"Conflict not found: {conflict_id}")
        
        entity_type = conflict.get("entity_type")
        action = conflict.get("action")
        client_data = conflict.get("client_data")
        server_data = conflict.get("server_data")
        
        collection = self._get_collection(entity_type)
        
        if resolution == "keep_client":
            # Apply client changes
            await self._apply_change(collection, action, client_data)
        elif resolution == "keep_server":
            # Keep server version (no action needed)
            pass
        else:
            # Merge (basic strategy: keep server data, add client fields)
            merged = {**server_data, **client_data}
            await collection.update_one(
                {"_id": ObjectId(server_data["_id"])},
                {"$set": {**merged, "updated_at": datetime.utcnow().isoformat()}}
            )
        
        # Update conflict status
        await self.conflicts_collection.update_one(
            {"_id": ObjectId(conflict_id)},
            {"$set": {
                "status": "resolved",
                "resolution": resolution,
                "resolved_at": datetime.utcnow().isoformat(),
                "resolved_by": user_id
            }}
        )
        
        return {"conflict_id": conflict_id, "status": "resolved", "resolution": resolution}
    
    async def _check_conflict(self, collection, entity_type: str, data: Dict,
                             action: str, client_timestamp: str) -> Optional[Dict]:
        """Check if there's a conflict between client and server data"""
        doc_id = data.get("_id") or data.get("id")
        if not doc_id:
            return None
        
        try:
            server_doc = await collection.find_one({"_id": ObjectId(doc_id)})
        except:
            return None
        
        if not server_doc:
            return None
        
        # Check if server was updated after client's last known state
        server_updated = server_doc.get("updated_at")
        if server_updated and client_timestamp:
            if server_updated > client_timestamp:
                # Create conflict record
                await self.conflicts_collection.insert_one({
                    "entity_type": entity_type,
                    "action": action,
                    "document_id": doc_id,
                    "client_data": data,
                    "server_data": {
                        **server_doc,
                        "_id": str(server_doc["_id"])
                    },
                    "client_timestamp": client_timestamp,
                    "server_timestamp": server_updated,
                    "status": "pending",
                    "created_at": datetime.utcnow().isoformat()
                })
                return {
                    **server_doc,
                    "_id": str(server_doc["_id"])
                }
        
        return None
    
    async def _apply_change(self, collection, action: str, data: Dict):
        """Apply a change to the database"""
        doc_id = data.get("_id") or data.get("id")
        data.pop("_id", None)
        data["updated_at"] = datetime.utcnow().isoformat()
        
        if action == "create":
            data["created_at"] = data.get("created_at", datetime.utcnow().isoformat())
            await collection.insert_one(data)
        elif action == "update":
            if doc_id:
                await collection.update_one(
                    {"_id": ObjectId(doc_id)},
                    {"$set": data},
                    upsert=True
                )
        elif action == "delete":
            if doc_id:
                await collection.delete_one({"_id": ObjectId(doc_id)})
    
    async def _log_sync(self, user_id: str, entity_type: str, action: str, doc_id: Optional[str]):
        """Log sync activity"""
        await self.sync_log_collection.insert_one({
            "user_id": user_id,
            "entity_type": entity_type,
            "action": action,
            "document_id": doc_id,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def _get_collection(self, entity_type: str):
        """Get database collection for entity type"""
        collections_map = {
            "students": self.db.get_collection("students"),
            "teachers": self.db.get_collection("teachers"),
            "attendance": self.db.get_collection("attendance"),
            "financial": self.db.get_collection("financial_transactions"),
            "classes": self.db.get_collection("classes"),
            "users": self.db.get_collection("users"),
        }
        return collections_map.get(entity_type)
