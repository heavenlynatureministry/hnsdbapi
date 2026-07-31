import api from './axios'

const teachersAPI = {
  // =========================================================================
  // CORE CRUD
  // =========================================================================
  getAll: async (params = {}) => api.get('/teachers', { params }),
  getById: async (id) => api.get(`/teachers/${id}`),
  create: async (data) => api.post('/teachers', data),
  update: async (id, data) => api.put(`/teachers/${id}`, data),
  delete: async (id) => api.delete(`/teachers/${id}`),

  // =========================================================================
  // PHOTO UPLOAD
  // =========================================================================
  /**
   * Upload teacher photo
   * @param {string} teacherId - Teacher ID
   * @param {File|FormData} file - Image file or FormData containing the file
   * @returns {Promise} - { photo_url: string }
   */
  uploadPhoto: async (teacherId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/teachers/${teacherId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * Delete teacher photo
   * @param {string} teacherId - Teacher ID
   * @returns {Promise}
   */
  deletePhoto: async (teacherId) => api.delete(`/teachers/${teacherId}/photo`),

  // =========================================================================
  // SUBJECTS
  // =========================================================================
  assignSubjects: async (id, subjects) => api.post(`/teachers/${id}/subjects`, { subjects }),
  getSubjects: async (id, params = {}) => api.get(`/teachers/${id}/subjects`, { params }),

  // =========================================================================
  // CLASSES
  // =========================================================================
  assignClasses: async (id, data) => api.post(`/teachers/${id}/classes`, data),

  // =========================================================================
  // WORKLOAD
  // =========================================================================
  getWorkload: async (id) => api.get(`/teachers/${id}/workload`),

  // =========================================================================
  // PERFORMANCE REVIEWS
  // =========================================================================
  addReview: async (id, data) => api.post(`/teachers/${id}/performance-reviews`, data),
  getReviews: async (id) => api.get(`/teachers/${id}/performance-reviews`),

  // =========================================================================
  // TRAINING
  // =========================================================================
  addTraining: async (id, data) => api.post(`/teachers/${id}/training`, data),
  getTraining: async (id) => api.get(`/teachers/${id}/training`),

  // =========================================================================
  // LEAVE MANAGEMENT
  // =========================================================================
  submitLeave: async (id, data) => api.post(`/teachers/${id}/leave`, data),
  getLeaveHistory: async (id, params = {}) => api.get(`/teachers/${id}/leave`, { params }),
  approveLeave: async (leaveId, data) => api.patch(`/teachers/leave/${leaveId}/approve`, data),

  // =========================================================================
  // DOCUMENTS
  // =========================================================================
  uploadDocument: async (id, data) => api.post(`/teachers/${id}/documents`, data),

  // =========================================================================
  // STATISTICS
  // =========================================================================
  getStatistics: async () => api.get('/teachers/statistics/overview'),
  getQualificationDistribution: async () => api.get('/teachers/statistics/qualifications'),
  findAvailable: async (params = {}) => api.get('/teachers/search/available', { params }),
}

export default teachersAPI
