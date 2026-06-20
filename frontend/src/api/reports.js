import api from './axios'

/**
 * Reports API Service
 */
const reportsAPI = {
  // =========================================================================
  // ACADEMIC REPORTS
  // =========================================================================

  /**
   * Get class performance report
   * @param {string} classId - Class ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getClassPerformance: async (classId, params = {}) => {
    return api.get(`/reports/academic/class-performance/${classId}`, { params })
  },

  /**
   * Get student performance report
   * @param {string} studentId - Student ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getStudentPerformance: async (studentId, params = {}) => {
    return api.get(`/reports/academic/student-performance/${studentId}`, { params })
  },

  /**
   * Get class ranking report
   * @param {string} classId - Class ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getClassRanking: async (classId, params = {}) => {
    return api.get(`/reports/academic/class-ranking/${classId}`, { params })
  },

  /**
   * Get subject trend report
   * @param {string} classId - Class ID
   * @param {string} subjectId - Subject ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getSubjectTrend: async (classId, subjectId, params = {}) => {
    return api.get(`/reports/academic/subject-trend/${classId}/${subjectId}`, { params })
  },

  /**
   * Generate report card
   * @param {string} studentId - Student ID
   * @param {Object} params - { academic_year, term }
   * @returns {Promise}
   */
  getReportCard: async (studentId, params = {}) => {
    return api.get(`/reports/academic/report-card/${studentId}`, { params })
  },

  /**
   * Get grade distribution
   * @param {string} examId - Exam ID
   * @returns {Promise}
   */
  getGradeDistribution: async (examId) => {
    return api.get(`/reports/academic/grade-distribution/${examId}`)
  },

  // =========================================================================
  // ATTENDANCE REPORTS
  // =========================================================================

  /**
   * Get attendance overview report
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAttendanceOverview: async (params = {}) => {
    return api.get('/reports/attendance/overview', { params })
  },

  /**
   * Get attendance by class report
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAttendanceByClass: async (params = {}) => {
    return api.get('/reports/attendance/by-class', { params })
  },

  /**
   * Get chronic absentees report
   * @param {Object} params - { threshold, academic_year, term }
   * @returns {Promise}
   */
  getChronicAbsentees: async (params = {}) => {
    return api.get('/reports/attendance/chronic-absentees', { params })
  },

  /**
   * Get perfect attendance report
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getPerfectAttendance: async (params = {}) => {
    return api.get('/reports/attendance/perfect-attendance', { params })
  },

  // =========================================================================
  // FINANCIAL REPORTS
  // =========================================================================

  /**
   * Get income statement
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getIncomeStatement: async (params = {}) => {
    return api.get('/reports/financial/income-statement', { params })
  },

  /**
   * Get budget variance report
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getBudgetVariance: async (params = {}) => {
    return api.get('/reports/financial/budget-variance', { params })
  },

  /**
   * Get fee collection report
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getFeeCollection: async (params = {}) => {
    return api.get('/reports/financial/fee-collection', { params })
  },

  // =========================================================================
  // ENROLLMENT REPORTS
  // =========================================================================

  /**
   * Get enrollment summary
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getEnrollmentSummary: async (params = {}) => {
    return api.get('/reports/enrollment/summary', { params })
  },

  /**
   * Get enrollment trends
   * @param {Object} params - { years }
   * @returns {Promise}
   */
  getEnrollmentTrends: async (params = {}) => {
    return api.get('/reports/enrollment/trends', { params })
  },

  // =========================================================================
  // STAFF REPORTS
  // =========================================================================

  /**
   * Get staff summary report
   * @returns {Promise}
   */
  getStaffSummary: async () => {
    return api.get('/reports/staff/summary')
  },

  // =========================================================================
  // COMPREHENSIVE REPORTS
  // =========================================================================

  /**
   * Get annual comprehensive report
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAnnualReport: async (params = {}) => {
    return api.get('/reports/comprehensive/annual', { params })
  },

  // =========================================================================
  // EXPORT
  // =========================================================================

  /**
   * Export report as CSV
   * @param {string} reportType - Report type
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  exportCSV: async (reportType, params = {}) => {
    return api.get(`/reports/export/csv/${reportType}`, {
      params,
      responseType: 'blob',
    })
  },

  /**
   * Export report as JSON
   * @param {string} reportType - Report type
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  exportJSON: async (reportType, params = {}) => {
    return api.get(`/reports/export/json/${reportType}`, { params })
  },

  // =========================================================================
  // REPORT HISTORY
  // =========================================================================

  /**
   * Get report generation history
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getHistory: async (params = {}) => {
    return api.get('/reports/history', { params })
  },
}

export default reportsAPI