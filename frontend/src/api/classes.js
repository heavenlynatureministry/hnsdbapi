import api from './axios'

const classesAPI = {
  // Basic CRUD
  getAll: async (params = {}) => api.get('/classes', { params }),
  getById: async (id) => api.get(`/classes/${id}`),
  create: async (data) => api.post('/classes', data),
  createAllForYear: async (academicYear) => api.post('/classes/create-all', { academic_year: academicYear }),
  update: async (id, data) => api.put(`/classes/${id}`, data),
  
  // Delete operations
  archive: async (id) => api.delete(`/classes/${id}`),
  delete: async (id) => api.delete(`/classes/${id}`),
  permanentDelete: async (id) => api.delete(`/classes/${id}/permanent`),
  reactivate: async (id) => api.put(`/classes/${id}/reactivate`),
  
  // Student operations
  getStudents: async (classId, includeInactive = false) => 
    api.get(`/classes/${classId}/students`, { params: { include_inactive: includeInactive } }),
  getStudentCount: async (classId) => api.get(`/classes/${classId}/students/count`),
  promoteStudents: async (data) => api.post('/classes/promote', data),
  getNextClass: async (classId, academicYear = '') => 
    api.get(`/classes/${classId}/next-class`, { params: { academic_year: academicYear } }),
  
  // Schedule operations
  getSchedule: async (classId) => api.get(`/classes/${classId}/schedule`),
  getClassSchedule: async (classId) => api.get(`/classes/${classId}/schedule`),
  updateSchedule: async (classId, schedule) => 
    api.put(`/classes/${classId}/schedule`, { schedule }),
  checkScheduleConflict: async (data) => 
    api.post('/classes/check-schedule-conflict', data),
  
  // ✅ Timetable operations
  getSectionTimetable: async (level, params = {}) => api.get(`/classes/timetable/${level}`, { params }),
  updateClassTimetable: async (classId, data) => api.put(`/classes/timetable/${classId}`, data),
  
  // Classroom operations
  createClassroom: async (data) => api.post('/classes/classrooms', data),
  listClassrooms: async (params = {}) => api.get('/classes/classrooms', { params }),
  getAvailableClassrooms: async (params = {}) => 
    api.get('/classes/classrooms/available', { params }),
  updateClassroom: async (id, data) => api.put(`/classes/classrooms/${id}`, data),
  assignClassroom: async (data) => api.post('/classes/classrooms/assign', data),
  bulkAssignClassrooms: async (assignments) => 
    api.post('/classes/classrooms/bulk-assign', { assignments }),
  
  // Teacher assignment
  assignTeacher: async (data) => api.post('/classes/assign-teacher', data),
  
  // Statistics and utilities
  getStatistics: async (classId) => api.get(`/classes/statistics/${classId}`),
  getAllStatistics: async (params = {}) => 
    api.get('/classes/statistics/overview', { params }),
  getLevels: async (params = {}) => api.get('/classes/levels', { params }),
  getPromotionMap: async () => api.get('/classes/promotion-map'),

  // =========================================================================
  // TESTIMONIAL & CERTIFICATE (convenience methods - delegates to exams API)
  // =========================================================================
  
  /**
   * Get exam entry for a student in this class
   * @param {string} studentId - Student ID
   * @returns {Promise} - Exam entry data
   */
  getStudentExamEntry: async (studentId) => {
    return api.get(`/exams/entries/student/${studentId}`)
  },

  /**
   * Save exam entry (testimonial) for a student
   * @param {string} studentId - Student ID
   * @param {Object} data - Exam entry data
   * @returns {Promise}
   */
  saveExamEntry: async (studentId, data) => {
    return api.post('/exams/entries', {
      student_id: studentId,
      ...data,
    })
  },

  /**
   * Get students eligible for testimonial (P8/S4) in a specific class
   * @param {string} [examType='Testimonial'] - 'PLE', 'CSE', or 'Testimonial'
   * @returns {Promise} - Array of eligible students
   */
  getEligibleStudents: async (examType = 'Testimonial') => {
    return api.get('/exams/entries/eligible', { params: { exam_type: examType } })
  },

  /**
   * Generate annual report / certificate for a student
   * @param {string} studentId - Student ID
   * @param {string} [academicYear] - Academic year
   * @returns {Promise}
   */
  generateAnnualReport: async (studentId, academicYear = '') => {
    return api.post('/exams/report-cards/annual', {
      student_id: studentId,
      academic_year: academicYear || undefined,
    })
  },

  /**
   * Generate single term report for a student
   * @param {string} studentId - Student ID
   * @param {string} term - Term name
   * @param {string} [academicYear] - Academic year
   * @returns {Promise}
   */
  generateTermReport: async (studentId, term, academicYear = '') => {
    return api.post('/exams/report-cards/generate', {
      student_id: studentId,
      term,
      academic_year: academicYear || undefined,
    })
  },

  /**
   * List all exam entries with filtering
   * @param {Object} params - Filter params
   * @returns {Promise}
   */
  listExamEntries: async (params = {}) => {
    return api.get('/exams/entries/list', { params })
  },

  /**
   * Update exam entry status
   * @param {string} studentId - Student ID
   * @param {string} status - 'draft', 'finalized', 'printed'
   * @returns {Promise}
   */
  updateExamEntryStatus: async (studentId, status) => {
    return api.put(`/exams/entries/${studentId}/status`, { status })
  },

  /**
   * Verify an exam entry publicly
   * @param {string} entryId - Exam entry ID
   * @returns {Promise}
   */
  verifyExamEntry: async (entryId) => {
    return api.get(`/exams/entries/${entryId}/verify`)
  },
}

export default classesAPI
