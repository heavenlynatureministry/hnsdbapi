import api from './axios'

const attendanceAPI = {
  mark: async (data) => api.post('/attendance/mark', data),
  bulkMark: async (data) => api.post('/attendance/mark/bulk', data),
  update: async (id, data) => api.put(`/attendance/${id}`, data),
  getByClass: async (classId, params = {}) => api.get(`/attendance/class/${classId}`, { params }),
  getByStudent: async (studentId, params = {}) => api.get(`/attendance/student/${studentId}`, { params }),
  list: async (params = {}) => api.get('/attendance', { params }),
  getToday: async (params = {}) => api.get('/attendance/today', { params }),
  generateReport: async (params = {}) => api.post('/attendance/reports/generate', params),
  getMonthlyReport: async (params = {}) => api.get('/attendance/reports/monthly', { params }),
  getAnalytics: async (params = {}) => api.get('/attendance/analytics/overview', { params }),
  getConsecutiveAbsences: async (params = {}) => api.get('/attendance/analytics/consecutive-absences', { params }),
  compareClasses: async (params = {}) => api.get('/attendance/compare-classes', { params }),
  getHeatmap: async (classId, params = {}) => api.get(`/attendance/heatmap/${classId}`, { params }),
  verifyExcuse: async (data) => api.post('/attendance/verify-excuse', data),
}

export default attendanceAPI
