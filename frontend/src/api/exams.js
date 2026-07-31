import api from './axios'

const examsAPI = {
  // =========================================================================
  // SUBJECTS
  // =========================================================================
  createSubject: async (data) => api.post('/exams/subjects', data),
  listSubjects: async (params = {}) => api.get('/exams/subjects', { params }),
  getSubject: async (id) => api.get(`/exams/subjects/${id}`),
  updateSubject: async (id, data) => api.put(`/exams/subjects/${id}`, data),
  
  // =========================================================================
  // CLASS SUBJECTS
  // =========================================================================
  assignSubjectToClass: async (data) => api.post('/exams/class-subjects', data),
  getClassSubjects: async (classId, params = {}) => api.get(`/exams/class-subjects/class/${classId}`, { params }),
  getTeacherSubjects: async (teacherId, params = {}) => api.get(`/exams/class-subjects/teacher/${teacherId}`, { params }),
  
  // =========================================================================
  // EXAMS CRUD
  // =========================================================================
  create: async (data) => api.post('/exams', data),
  list: async (params = {}) => api.get('/exams', { params }),
  getById: async (id) => api.get(`/exams/${id}`),
  update: async (id, data) => api.put(`/exams/${id}`, data),
  cancel: async (id, reason = '') => api.delete(`/exams/${id}`, { params: { reason } }),
  permanentDelete: async (id) => api.delete(`/exams/${id}/permanent`),
  
  // =========================================================================
  // RESULTS
  // =========================================================================
  recordResult: async (data) => api.post('/exams/results', data),
  bulkRecordResults: async (data) => api.post('/exams/results/bulk', data),
  getResults: async (examId, params = {}) => api.get(`/exams/results/${examId}`, { params }),
  getStudentResults: async (studentId, params = {}) => api.get(`/exams/student/${studentId}`, { params }),
  deleteResults: async (examId) => api.delete(`/exams/results/${examId}`),
  getClassRanking: async (classId, params = {}) => api.get(`/exams/results/class-ranking/${classId}`, { params }),
  
  // =========================================================================
  // GRADING
  // =========================================================================
  createGradingSystem: async (data) => api.post('/exams/grading-systems', data),
  listGradingSystems: async (params = {}) => api.get('/exams/grading-systems', { params }),
  
  // =========================================================================
  // REPORT CARDS
  // =========================================================================
  /**
   * Generate single-term report card
   * @param {Object} data - { student_id, term, academic_year, position, out_of, remarks, conduct }
   */
  generateReportCard: async (data) => api.post('/exams/report-cards/generate', data),
  
  /**
   * Generate annual report card (all 3 terms)
   * @param {Object} data - { student_id, academic_year, position_term_1, position_term_2, position_term_3, etc. }
   */
  generateAnnualReportCard: async (data) => api.post('/exams/report-cards/annual', data),
  
  /**
   * Get report card by student ID
   * @param {string} studentId
   * @param {Object} params - { term, academic_year }
   */
  getReportCard: async (studentId, params = {}) => api.get(`/exams/report-cards/${studentId}`, { params }),
  
  /**
   * Get annual report card by student ID
   * @param {string} studentId
   * @param {Object} params - { academic_year }
   */
  getAnnualReportCard: async (studentId, params = {}) => api.get(`/exams/report-cards/annual/${studentId}`, { params }),
  
  publishReportCards: async (data) => api.post('/exams/report-cards/publish', data),
  updateRemarks: async (reportCardId, data) => api.put(`/exams/report-cards/${reportCardId}/remarks`, data),
  
  // =========================================================================
  // EXAM ENTRIES (Testimonials, PLE, CSE)
  // =========================================================================
  
  /**
   * Get exam entry for a specific student
   * @param {string} studentId - Student ID
   * @returns {Promise} - Exam entry data or null
   */
  getStudentExamEntry: async (studentId) => {
    return api.get(`/exams/entries/student/${studentId}`)
  },

  /**
   * Create or update exam entry (testimonial/PLE/CSE)
   * @param {Object} data - Exam entry data
   * @param {string} data.student_id - Student ID
   * @param {string} data.exam_type - 'PLE', 'CSE', or 'Testimonial'
   * @param {string} data.index_number - 6-9 digit index number
   * @param {string} data.centre_number - 6-9 digit centre number
   * @param {string} data.academic_year - e.g., '2026/2027'
   * @param {Array} data.subjects - Array of { name, score, grade }
   * @param {string} [data.section] - 'Science' or 'Arts' (S4 only)
   * @returns {Promise}
   */
  createExamEntry: async (data) => {
    return api.post('/exams/entries', data)
  },

  /**
   * Update exam entry (same as create - upserts)
   * @param {Object} data - Same as createExamEntry
   * @returns {Promise}
   */
  updateExamEntry: async (data) => {
    return api.post('/exams/entries', data)
  },

  /**
   * Update exam entry status
   * @param {string} studentId - Student ID
   * @param {string} status - 'draft', 'finalized', or 'printed'
   * @returns {Promise}
   */
  updateExamEntryStatus: async (studentId, status) => {
    return api.put(`/exams/entries/${studentId}/status`, { status })
  },

  /**
   * Delete exam entry for a student
   * @param {string} studentId - Student ID
   * @returns {Promise}
   */
  deleteExamEntry: async (studentId) => {
    return api.delete(`/exams/entries/${studentId}`)
  },

  /**
   * List all exam entries with filtering and pagination
   * @param {Object} params - Query parameters
   * @param {string} [params.exam_type] - 'PLE', 'CSE', 'Testimonial'
   * @param {string} [params.academic_year] - e.g., '2026/2027'
   * @param {string} [params.status] - 'draft', 'finalized', 'printed'
   * @param {number} [params.page] - Page number (default: 1)
   * @param {number} [params.limit] - Items per page (default: 50)
   * @returns {Promise} - { entries, total, limit, skip }
   */
  listExamEntries: async (params = {}) => {
    return api.get('/exams/entries/list', { params })
  },

  /**
   * Get students eligible for exam entry (P8 and S4)
   * @param {string} [examType='Testimonial'] - 'PLE', 'CSE', or 'Testimonial'
   * @returns {Promise} - { students, total }
   */
  getEligibleStudents: async (examType = 'Testimonial') => {
    return api.get('/exams/entries/eligible', { params: { exam_type: examType } })
  },

  /**
   * Verify an exam entry publicly (no authentication required)
   * @param {string} entryId - Exam entry ID
   * @returns {Promise} - Public exam entry data
   */
  verifyExamEntry: async (entryId) => {
    return api.get(`/exams/entries/${entryId}/verify`)
  },

  /**
   * Get exam entry by its ID (for verification)
   * @param {string} entryId - Exam entry ID
   * @returns {Promise}
   */
  getExamEntryById: async (entryId) => {
    return api.get(`/exams/entries/${entryId}`)
  },

  // =========================================================================
  // ANALYTICS
  // =========================================================================
  getClassPerformance: async (classId, params = {}) => api.get(`/exams/analytics/class/${classId}`, { params }),
  getSubjectTrend: async (params = {}) => api.get('/exams/analytics/subject-trend', { params }),
  getTopPerformers: async (params = {}) => api.get('/exams/analytics/top-performers', { params }),
  getAcademicYearSummary: async (params = {}) => api.get('/exams/analytics/academic-year-summary', { params }),
  getStudentAnalytics: async (studentId) => api.get(`/exams/analytics/student/${studentId}`),
}

export default examsAPI
