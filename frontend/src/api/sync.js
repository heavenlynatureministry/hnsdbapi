import api from './axios';

const syncAPI = {
  // Push local changes to server
  push: async (changes) => api.post('/sync/push', { changes }),
  
  // Pull latest data from server
  pull: async (params = {}) => api.get('/sync/pull', { params }),
  
  // Get sync status
  getStatus: async () => api.get('/sync/status'),
  
  // Resolve conflicts
  resolveConflict: async (conflictId, resolution) => 
    api.post('/sync/conflicts/resolve', { conflict_id: conflictId, resolution }),
  
  // Get pending conflicts
  getConflicts: async (params = {}) => api.get('/sync/conflicts', { params }),
};

export default syncAPI;
