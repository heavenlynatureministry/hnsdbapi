import api from './axios'

/**
 * Students API Service
 */
const studentsAPI = {
  /**
   * Get all students with filtering
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAll: async (params = {}) => {
    return api.get('/students', { params })
  },

  /**
   * Get student by ID
   * @param {string} id - Student ID
   * @returns {Promise}
   */
  getById: async (id) => {
    return api.get(`/students/${id}`)
  },

  /**
   * Get student by ID number
   * @param {string} idNumber - Student ID number (HNS-YYYY-XXXX)
   * @returns {Promise}
   */
  getByIdNumber: async (idNumber) => {
    return api.get(`/students/id/${idNumber}`)
  },

  /**
   * Create new student
   * @param {Object} data - Student data
   * @returns {Promise}
   */
  create: async (data) => {
    return api.post('/students', data)
  },

  /**
   * Update student
   * @param {string} id - Student ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  update: async (id, data) => {
    return api.put(`/students/${id}`, data)
  },

  /**
   * Delete/deactivate student
   * @param {string} id - Student ID
   * @param {string} reason - Deactivation reason
   * @returns {Promise}
   */
  delete: async (id, reason = '') => {
    return api.delete(`/students/${id}`, { params: { reason } })
  },

  /**
   * Update student status
   * @param {string} id - Student ID
   * @param {string} status - New status
   * @param {string} reason - Status change reason
   * @returns {Promise}
   */
  updateStatus: async (id, status, reason = '') => {
    return api.patch(`/students/${id}/status`, { status, reason })
  },

  /**
   * Promote student to next class
   * @param {string} id - Student ID
   * @param {string} newClassId - Target class ID
   * @param {string} academicYear - Academic year
   * @returns {Promise}
   */
  promote: async (id, newClassId, academicYear = '') => {
    return api.post(`/students/${id}/promote`, {
      new_class_id: newClassId,
      academic_year: academicYear,
    })
  },

  /**
   * Bulk promote students
   * @param {Object} data - Promotion data
   * @returns {Promise}
   */
  bulkPromote: async (data) => {
    return api.post('/students/promote', data)
  },

  /**
   * Bulk import students
   * @param {Array} students - List of student data
   * @returns {Promise}
   */
  bulkImport: async (students) => {
    return api.post('/students/bulk/import', { students })
  },

  /**
   * Advanced search
   * @param {Object} params - Search criteria
   * @returns {Promise}
   */
  search: async (params = {}) => {
    return api.get('/students/search/advanced', { params })
  },

  /**
   * Get student statistics
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getStatistics: async (params = {}) => {
    return api.get('/students/statistics/overview', { params })
  },

  /**
   * Get students by class
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getByClass: async (params = {}) => {
    return api.get('/students/statistics/by-class', { params })
  },

  // =========================================================================
  // GUARDIAN ENDPOINTS
  // =========================================================================

  /**
   * Get student guardians
   * @param {string} studentId - Student ID
   * @returns {Promise}
   */
  getGuardians: async (studentId) => {
    return api.get(`/students/${studentId}/guardians`)
  },

  /**
   * Add guardian to student
   * @param {string} studentId - Student ID
   * @param {Object} data - Guardian data
   * @returns {Promise}
   */
  addGuardian: async (studentId, data) => {
    return api.post(`/students/${studentId}/guardians`, data)
  },

  /**
   * Update all guardians
   * @param {string} studentId - Student ID
   * @param {Array} guardians - List of guardian data
   * @returns {Promise}
   */
  updateGuardians: async (studentId, guardians) => {
    return api.put(`/students/${studentId}/guardians`, { guardians })
  },

  /**
   * Remove guardian
   * @param {string} studentId - Student ID
   * @param {string} guardianId - Guardian ID
   * @returns {Promise}
   */
  removeGuardian: async (studentId, guardianId) => {
    return api.delete(`/students/${studentId}/guardians/${guardianId}`)
  },

  // =========================================================================
  // DOCUMENT ENDPOINTS
  // =========================================================================

  /**
   * Add student document
   * @param {string} studentId - Student ID
   * @param {Object} data - Document data
   * @returns {Promise}
   */
  addDocument: async (studentId, data) => {
    return api.post(`/students/${studentId}/documents`, data)
  },

  // =========================================================================
  // ATTENDANCE SUMMARY
  // =========================================================================

  /**
   * Get student attendance summary
   * @param {string} studentId - Student ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAttendanceSummary: async (studentId, params = {}) => {
    return api.get(`/students/${studentId}/attendance-summary`, { params })
  },
}

export default studentsAPI