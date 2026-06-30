import api from './axios'

const examsAPI = {
  // Subjects
  createSubject: async (data) => api.post('/exams/subjects', data),
  listSubjects: async (params = {}) => api.get('/exams/subjects', { params }),
  getSubject: async (id) => api.get(`/exams/subjects/${id}`),
  updateSubject: async (id, data) => api.put(`/exams/subjects/${id}`, data),
  
  // Class Subjects
  assignSubjectToClass: async (data) => api.post('/exams/class-subjects', data),
  getClassSubjects: async (classId, params = {}) => api.get(`/exams/class-subjects/class/${classId}`, { params }),
  getTeacherSubjects: async (teacherId, params = {}) => api.get(`/exams/class-subjects/teacher/${teacherId}`, { params }),
  
  // Exams
  create: async (data) => api.post('/exams', data),
  list: async (params = {}) => api.get('/exams', { params }),
  getById: async (id) => api.get(`/exams/${id}`),
  update: async (id, data) => api.put(`/exams/${id}`, data),
  cancel: async (id, reason = '') => api.delete(`/exams/${id}`, { params: { reason } }),
  permanentDelete: async (id) => api.delete(`/exams/${id}/permanent`),
  
  // Results
  recordResult: async (data) => api.post('/exams/results', data),
  bulkRecordResults: async (data) => api.post('/exams/results/bulk', data),
  getResults: async (examId, params = {}) => api.get(`/exams/results/${examId}`, { params }),
  getStudentResults: async (studentId, params = {}) => api.get(`/exams/student/${studentId}`, { params }),
  deleteResults: async (examId) => api.delete(`/exams/results/${examId}`),
  getClassRanking: async (classId, params = {}) => api.get(`/exams/results/class-ranking/${classId}`, { params }),
  
  // Grading
  createGradingSystem: async (data) => api.post('/exams/grading-systems', data),
  listGradingSystems: async (params = {}) => api.get('/exams/grading-systems', { params }),
  
  // Report Cards
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
  
  // Analytics
  getClassPerformance: async (classId, params = {}) => api.get(`/exams/analytics/class/${classId}`, { params }),
  getSubjectTrend: async (params = {}) => api.get('/exams/analytics/subject-trend', { params }),
  getTopPerformers: async (params = {}) => api.get('/exams/analytics/top-performers', { params }),
  getAcademicYearSummary: async (params = {}) => api.get('/exams/analytics/academic-year-summary', { params }),
  getStudentAnalytics: async (studentId) => api.get(`/exams/analytics/student/${studentId}`),
}

export default examsAPI
