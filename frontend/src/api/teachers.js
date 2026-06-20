import api from './axios'

/**
 * Teachers API Service
 */
const teachersAPI = {
  /**
   * Get all teachers with filtering
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAll: async (params = {}) => {
    return api.get('/teachers', { params })
  },

  /**
   * Get teacher by ID
   * @param {string} id - Teacher ID
   * @returns {Promise}
   */
  getById: async (id) => {
    return api.get(`/teachers/${id}`)
  },

  /**
   * Create new teacher
   * @param {Object} data - Teacher data
   * @returns {Promise}
   */
  create: async (data) => {
    return api.post('/teachers', data)
  },

  /**
   * Update teacher
   * @param {string} id - Teacher ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  update: async (id, data) => {
    return api.put(`/teachers/${id}`, data)
  },

  /**
   * Delete/deactivate teacher
   * @param {string} id - Teacher ID
   * @returns {Promise}
   */
  delete: async (id) => {
    return api.delete(`/teachers/${id}`)
  },

  /**
   * Assign subjects to teacher
   * @param {string} id - Teacher ID
   * @param {Array} subjects - Subject names
   * @returns {Promise}
   */
  assignSubjects: async (id, subjects) => {
    return api.post(`/teachers/${id}/subjects`, { subjects })
  },

  /**
   * Get teacher subjects and classes
   * @param {string} id - Teacher ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getSubjects: async (id, params = {}) => {
    return api.get(`/teachers/${id}/subjects`, { params })
  },

  /**
   * Assign teacher to classes
   * @param {string} id - Teacher ID
   * @param {Object} data - { class_ids, is_class_teacher }
   * @returns {Promise}
   */
  assignClasses: async (id, data) => {
    return api.post(`/teachers/${id}/classes`, data)
  },

  /**
   * Get teacher workload
   * @param {string} id - Teacher ID
   * @returns {Promise}
   */
  getWorkload: async (id) => {
    return api.get(`/teachers/${id}/workload`)
  },

  // =========================================================================
  // PERFORMANCE REVIEWS
  // =========================================================================

  /**
   * Add performance review
   * @param {string} id - Teacher ID
   * @param {Object} data - Review data
   * @returns {Promise}
   */
  addReview: async (id, data) => {
    return api.post(`/teachers/${id}/performance-reviews`, data)
  },

  /**
   * Get performance reviews
   * @param {string} id - Teacher ID
   * @returns {Promise}
   */
  getReviews: async (id) => {
    return api.get(`/teachers/${id}/performance-reviews`)
  },

  // =========================================================================
  // TRAINING
  // =========================================================================

  /**
   * Add training record
   * @param {string} id - Teacher ID
   * @param {Object} data - Training data
   * @returns {Promise}
   */
  addTraining: async (id, data) => {
    return api.post(`/teachers/${id}/training`, data)
  },

  /**
   * Get training history
   * @param {string} id - Teacher ID
   * @returns {Promise}
   */
  getTraining: async (id) => {
    return api.get(`/teachers/${id}/training`)
  },

  // =========================================================================
  // LEAVE MANAGEMENT
  // =========================================================================

  /**
   * Submit leave request
   * @param {string} id - Teacher ID
   * @param {Object} data - Leave data
   * @returns {Promise}
   */
  submitLeave: async (id, data) => {
    return api.post(`/teachers/${id}/leave`, data)
  },

  /**
   * Get leave history
   * @param {string} id - Teacher ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getLeaveHistory: async (id, params = {}) => {
    return api.get(`/teachers/${id}/leave`, { params })
  },

  /**
   * Approve/reject leave (Admin only)
   * @param {string} leaveId - Leave ID
   * @param {Object} data - { is_approved, comments }
   * @returns {Promise}
   */
  approveLeave: async (leaveId, data) => {
    return api.patch(`/teachers/leave/${leaveId}/approve`, data)
  },

  // =========================================================================
  // DOCUMENTS
  // =========================================================================

  /**
   * Upload teacher document
   * @param {string} id - Teacher ID
   * @param {Object} data - Document data
   * @returns {Promise}
   */
  uploadDocument: async (id, data) => {
    return api.post(`/teachers/${id}/documents`, data)
  },

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /**
   * Get teacher statistics
   * @returns {Promise}
   */
  getStatistics: async () => {
    return api.get('/teachers/statistics/overview')
  },

  /**
   * Get qualification distribution
   * @returns {Promise}
   */
  getQualificationDistribution: async () => {
    return api.get('/teachers/statistics/qualifications')
  },

  /**
   * Find available teachers
   * @param {Object} params - Search parameters
   * @returns {Promise}
   */
  findAvailable: async (params = {}) => {
    return api.get('/teachers/search/available', { params })
  },
}

export default teachersAPI