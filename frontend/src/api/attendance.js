import api from './axios'

/**
 * Attendance API Service
 */
const attendanceAPI = {
  /**
   * Mark single student attendance
   * @param {Object} data - Attendance data
   * @returns {Promise}
   */
  mark: async (data) => {
    return api.post('/attendance/mark', data)
  },

  /**
   * Bulk mark attendance
   * @param {Object} data - { class_id, date, attendance_data }
   * @returns {Promise}
   */
  bulkMark: async (data) => {
    return api.post('/attendance/mark/bulk', data)
  },

  /**
   * Update attendance record
   * @param {string} id - Attendance ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  update: async (id, data) => {
    return api.put(`/attendance/${id}`, data)
  },

  /**
   * Get class attendance for a date
   * @param {string} classId - Class ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getByClass: async (classId, params = {}) => {
    return api.get(`/attendance/class/${classId}`, { params })
  },

  /**
   * Get student attendance history
   * @param {string} studentId - Student ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getByStudent: async (studentId, params = {}) => {
    return api.get(`/attendance/student/${studentId}`, { params })
  },

  /**
   * List attendance records with filters
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  list: async (params = {}) => {
    return api.get('/attendance/list', { params })
  },

  /**
   * Get today's attendance summary
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getToday: async (params = {}) => {
    return api.get('/attendance/today', { params })
  },

  // =========================================================================
  // REPORTS
  // =========================================================================

  /**
   * Generate attendance report
   * @param {Object} params - Report parameters
   * @returns {Promise}
   */
  generateReport: async (params = {}) => {
    return api.post('/attendance/reports/generate', params)
  },

  /**
   * Get monthly attendance summary
   * @param {Object} params - { year, month, class_id }
   * @returns {Promise}
   */
  getMonthlyReport: async (params = {}) => {
    return api.get('/attendance/reports/monthly', { params })
  },

  // =========================================================================
  // ANALYTICS
  // =========================================================================

  /**
   * Get attendance analytics
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAnalytics: async (params = {}) => {
    return api.get('/attendance/analytics/overview', { params })
  },

  /**
   * Get consecutive absence alerts
   * @param {Object} params - { threshold, class_id }
   * @returns {Promise}
   */
  getConsecutiveAbsences: async (params = {}) => {
    return api.get('/attendance/analytics/consecutive-absences', { params })
  },

  /**
   * Compare attendance across classes
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  compareClasses: async (params = {}) => {
    return api.get('/attendance/compare-classes', { params })
  },

  /**
   * Get attendance heatmap data
   * @param {string} classId - Class ID
   * @param {Object} params - { start_date, end_date }
   * @returns {Promise}
   */
  getHeatmap: async (classId, params = {}) => {
    return api.get(`/attendance/heatmap/${classId}`, { params })
  },

  // =========================================================================
  // VERIFICATION
  // =========================================================================

  /**
   * Verify excused absence
   * @param {Object} data - { attendance_id, is_verified, verification_notes }
   * @returns {Promise}
   */
  verifyExcuse: async (data) => {
    return api.post('/attendance/verify-excuse', data)
  },
}

export default attendanceAPI