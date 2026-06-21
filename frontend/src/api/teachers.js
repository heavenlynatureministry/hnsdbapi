import api from './axios'

const teachersAPI = {
  getAll: async (params = {}) => api.get('/teachers', { params }),
  getById: async (id) => api.get(`/teachers/${id}`),
  create: async (data) => api.post('/teachers', data),
  update: async (id, data) => api.put(`/teachers/${id}`, data),
  delete: async (id) => api.delete(`/teachers/${id}`),
  assignSubjects: async (id, subjects) => api.post(`/teachers/${id}/subjects`, { subjects }),
  getSubjects: async (id, params = {}) => api.get(`/teachers/${id}/subjects`, { params }),
  assignClasses: async (id, data) => api.post(`/teachers/${id}/classes`, data),
  getWorkload: async (id) => api.get(`/teachers/${id}/workload`),
  addReview: async (id, data) => api.post(`/teachers/${id}/performance-reviews`, data),
  getReviews: async (id) => api.get(`/teachers/${id}/performance-reviews`),
  addTraining: async (id, data) => api.post(`/teachers/${id}/training`, data),
  getTraining: async (id) => api.get(`/teachers/${id}/training`),
  submitLeave: async (id, data) => api.post(`/teachers/${id}/leave`, data),
  getLeaveHistory: async (id, params = {}) => api.get(`/teachers/${id}/leave`, { params }),
  approveLeave: async (leaveId, data) => api.patch(`/teachers/leave/${leaveId}/approve`, data),
  uploadDocument: async (id, data) => api.post(`/teachers/${id}/documents`, data),
  getStatistics: async () => api.get('/teachers/statistics/overview'),
  getQualificationDistribution: async () => api.get('/teachers/statistics/qualifications'),
  findAvailable: async (params = {}) => api.get('/teachers/search/available', { params }),
}

export default teachersAPI
