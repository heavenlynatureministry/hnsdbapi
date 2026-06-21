import api from './axios'

const studentsAPI = {
  getAll: async (params = {}) => api.get('/students', { params }),
  getById: async (id) => api.get(`/students/${id}`),
  getByIdNumber: async (idNumber) => api.get(`/students/id/${idNumber}`),
  create: async (data) => api.post('/students', data),
  update: async (id, data) => api.put(`/students/${id}`, data),
  delete: async (id, reason = '') => api.delete(`/students/${id}`, { params: { reason } }),
  updateStatus: async (id, status, reason = '') => api.patch(`/students/${id}/status`, { status, reason }),
  promote: async (id, newClassId, academicYear = '') => api.post(`/students/${id}/promote`, { new_class_id: newClassId, academic_year: academicYear }),
  bulkPromote: async (data) => api.post('/students/promote', data),
  bulkImport: async (students) => api.post('/students/bulk/import', { students }),
  search: async (params = {}) => api.get('/students/search/advanced', { params }),
  getStatistics: async (params = {}) => api.get('/students/statistics/overview', { params }),
  getByClass: async (params = {}) => api.get('/students/statistics/by-class', { params }),
  getGuardians: async (studentId) => api.get(`/students/${studentId}/guardians`),
  addGuardian: async (studentId, data) => api.post(`/students/${studentId}/guardians`, data),
  updateGuardians: async (studentId, guardians) => api.put(`/students/${studentId}/guardians`, { guardians }),
  removeGuardian: async (studentId, guardianId) => api.delete(`/students/${studentId}/guardians/${guardianId}`),
  addDocument: async (studentId, data) => api.post(`/students/${studentId}/documents`, data),
  getAttendanceSummary: async (studentId, params = {}) => api.get(`/students/${studentId}/attendance-summary`, { params }),
}

export default studentsAPI
