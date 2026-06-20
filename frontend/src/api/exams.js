import api from './axios'

/**
 * Exams API Service
 */
const examsAPI = {
  // =========================================================================
  // SUBJECTS
  // =========================================================================

  /**
   * Create subject
   * @param {Object} data - Subject data
   * @returns {Promise}
   */
  createSubject: async (data) => {
    return api.post('/exams/subjects', data)
  },

  /**
   * List subjects
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  listSubjects: async (params = {}) => {
    return api.get('/exams/subjects', { params })
  },

  /**
   * Get subject details
   * @param {string} id - Subject ID
   * @returns {Promise}
   */
  getSubject: async (id) => {
    return api.get(`/exams/subjects/${id}`)
  },

  /**
   * Update subject
   * @param {string} id - Subject ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  updateSubject: async (id, data) => {
    return api.put(`/exams/subjects/${id}`, data)
  },

  // =========================================================================
  // CLASS-SUBJECT ASSIGNMENT
  // =========================================================================

  /**
   * Assign subject to class
   * @param {Object} data - Assignment data
   * @returns {Promise}
   */
  assignSubjectToClass: async (data) => {
    return api.post('/exams/class-subjects', data)
  },

  /**
   * Get class subjects
   * @param {string} classId - Class ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getClassSubjects: async (classId, params = {}) => {
    return api.get(`/exams/class-subjects/class/${classId}`, { params })
  },

  /**
   * Get teacher's assigned subjects
   * @param {string} teacherId - Teacher ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getTeacherSubjects: async (teacherId, params = {}) => {
    return api.get(`/exams/class-subjects/teacher/${teacherId}`, { params })
  },

  // =========================================================================
  // EXAMS
  // =========================================================================

  /**
   * Create exam
   * @param {Object} data - Exam data
   * @returns {Promise}
   */
  create: async (data) => {
    return api.post('/exams', data)
  },

  /**
   * List exams
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  list: async (params = {}) => {
    return api.get('/exams', { params })
  },

  /**
   * Get exam details
   * @param {string} id - Exam ID
   * @returns {Promise}
   */
  getById: async (id) => {
    return api.get(`/exams/${id}`)
  },

  /**
   * Update exam
   * @param {string} id - Exam ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  update: async (id, data) => {
    return api.put(`/exams/${id}`, data)
  },

  /**
   * Cancel exam
   * @param {string} id - Exam ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise}
   */
  cancel: async (id, reason = '') => {
    return api.delete(`/exams/${id}`, { params: { reason } })
  },

  // =========================================================================
  // EXAM RESULTS
  // =========================================================================

  /**
   * Record single result
   * @param {Object} data - Result data
   * @returns {Promise}
   */
  recordResult: async (data) => {
    return api.post('/exams/results', data)
  },

  /**
   * Bulk record results
   * @param {Object} data - { exam_id, results }
   * @returns {Promise}
   */
  bulkRecordResults: async (data) => {
    return api.post('/exams/results/bulk', data)
  },

  /**
   * Get exam results
   * @param {string} examId - Exam ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getResults: async (examId, params = {}) => {
    return api.get(`/exams/results/${examId}`, { params })
  },

  /**
   * Get student results
   * @param {string} studentId - Student ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getStudentResults: async (studentId, params = {}) => {
    return api.get(`/exams/results/student/${studentId}`, { params })
  },

  /**
   * Get class ranking
   * @param {string} classId - Class ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getClassRanking: async (classId, params = {}) => {
    return api.get(`/exams/results/class-ranking/${classId}`, { params })
  },

  // =========================================================================
  // GRADING SYSTEMS
  // =========================================================================

  /**
   * Create grading system
   * @param {Object} data - Grading system data
   * @returns {Promise}
   */
  createGradingSystem: async (data) => {
    return api.post('/exams/grading-systems', data)
  },

  /**
   * List grading systems
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  listGradingSystems: async (params = {}) => {
    return api.get('/exams/grading-systems', { params })
  },

  // =========================================================================
  // REPORT CARDS
  // =========================================================================

  /**
   * Generate report card
   * @param {Object} data - { student_id, class_id, academic_year, term }
   * @returns {Promise}
   */
  generateReportCard: async (data) => {
    return api.post('/exams/report-cards/generate', data)
  },

  /**
   * Get student report card
   * @param {string} studentId - Student ID
   * @param {Object} params - { academic_year, term }
   * @returns {Promise}
   */
  getReportCard: async (studentId, params = {}) => {
    return api.get(`/exams/report-cards/${studentId}`, { params })
  },

  /**
   * Publish class report cards
   * @param {Object} data - { class_id, academic_year, term }
   * @returns {Promise}
   */
  publishReportCards: async (data) => {
    return api.post('/exams/report-cards/publish', data)
  },

  /**
   * Update report card remarks
   * @param {string} reportCardId - Report card ID
   * @param {Object} data - Remarks data
   * @returns {Promise}
   */
  updateRemarks: async (reportCardId, data) => {
    return api.put(`/exams/report-cards/${reportCardId}/remarks`, data)
  },

  // =========================================================================
  // ANALYTICS
  // =========================================================================

  /**
   * Get class performance analytics
   * @param {string} classId - Class ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getClassPerformance: async (classId, params = {}) => {
    return api.get(`/exams/analytics/class/${classId}`, { params })
  },

  /**
   * Get subject performance trend
   * @param {Object} params - { class_id, subject_id, student_id }
   * @returns {Promise}
   */
  getSubjectTrend: async (params = {}) => {
    return api.get('/exams/analytics/subject-trend', { params })
  },

  /**
   * Get top performers
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getTopPerformers: async (params = {}) => {
    return api.get('/exams/analytics/top-performers', { params })
  },

  /**
   * Get academic year summary
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAcademicYearSummary: async (params = {}) => {
    return api.get('/exams/analytics/academic-year-summary', { params })
  },

  /**
   * Get student performance analytics
   * @param {string} studentId - Student ID
   * @returns {Promise}
   */
  getStudentAnalytics: async (studentId) => {
    return api.get(`/exams/analytics/student/${studentId}`)
  },
}

export default examsAPI