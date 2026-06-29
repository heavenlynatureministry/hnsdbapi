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
  
  // Results
  recordResult: async (data) => api.post('/exams/results', data),
  bulkRecordResults: async (data) => api.post('/exams/results/bulk', data),
  getResults: async (examId, params = {}) => api.get(`/exams/results/${examId}`, { params }),
  getStudentResults: async (studentId, params = {}) => api.get(`/exams/results/student/${studentId}`, { params }),
  getClassRanking: async (classId, params = {}) => api.get(`/exams/results/class-ranking/${classId}`, { params }),
  
  // Grading
  createGradingSystem: async (data) => api.post('/exams/grading-systems', data),
  listGradingSystems: async (params = {}) => api.get('/exams/grading-systems', { params }),
  
  // Report Cards
  generateReportCard: async (data) => api.post('/exams/report-cards/generate', data),
  getReportCard: async (studentId, params = {}) => api.get(`/exams/report-cards/${studentId}`, { params }),
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
