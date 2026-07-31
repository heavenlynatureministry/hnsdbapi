import api from './axios'

const studentsAPI = {
  // =========================================================================
  // CORE CRUD
  // =========================================================================
  getAll: async (params = {}) => api.get('/students', { params }),
  getById: async (id) => api.get(`/students/${id}`),
  getByIdNumber: async (idNumber) => api.get(`/students/id/${idNumber}`),
  create: async (data) => api.post('/students', data),
  update: async (id, data) => api.put(`/students/${id}`, data),
  delete: async (id, reason = '') => api.delete(`/students/${id}`, { params: { reason } }),
  updateStatus: async (id, status, reason = '') => api.patch(`/students/${id}/status`, { status, reason }),
  promote: async (id, newClassId, academicYear = '') => api.post(`/students/${id}/promote`, { new_class_id: newClassId, academic_year: academicYear }),
  bulkPromote: async (data) => api.post('/students/promote', data),
  bulkImport: async (students) => api.post('/students/bulk/import', { students }),
  search: async (params = {}) => api.get('/students/search/advanced', { params }),
  getStatistics: async (params = {}) => api.get('/students/statistics/overview', { params }),
  getByClass: async (params = {}) => api.get('/students/statistics/by-class', { params }),

  // =========================================================================
  // GUARDIANS
  // =========================================================================
  getGuardians: async (studentId) => api.get(`/students/${studentId}/guardians`),
  addGuardian: async (studentId, data) => api.post(`/students/${studentId}/guardians`, data),
  updateGuardians: async (studentId, guardians) => api.put(`/students/${studentId}/guardians`, { guardians }),
  removeGuardian: async (studentId, guardianId) => api.delete(`/students/${studentId}/guardians/${guardianId}`),

  // =========================================================================
  // DOCUMENTS
  // =========================================================================
  addDocument: async (studentId, data) => api.post(`/students/${studentId}/documents`, data),

  // =========================================================================
  // ATTENDANCE
  // =========================================================================
  getAttendanceSummary: async (studentId, params = {}) => api.get(`/students/${studentId}/attendance-summary`, { params }),

  // =========================================================================
  // PHOTO UPLOAD
  // =========================================================================
  /**
   * Upload student photo
   * @param {string} studentId - Student ID
   * @param {File|FormData} file - Image file or FormData containing the file
   * @returns {Promise} - { photo_url: string }
   */
  uploadPhoto: async (studentId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/students/${studentId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * Delete student photo
   * @param {string} studentId - Student ID
   * @returns {Promise}
   */
  deletePhoto: async (studentId) => api.delete(`/students/${studentId}/photo`),

  // =========================================================================
  // EXAM ENTRIES (Testimonials, PLE, CSE)
  // =========================================================================
  /**
   * Get exam entry for a student
   * @param {string} studentId - Student ID
   * @returns {Promise} - Exam entry data or null
   */
  getStudentExamEntry: async (studentId) => {
    // Try students endpoint first, fallback to exams endpoint
    try {
      return await api.get(`/students/${studentId}/exam-entry`)
    } catch (error) {
      // Fallback to exams API
      return api.get(`/exams/entries/student/${studentId}`)
    }
  },

  /**
   * Create or update exam entry for a student
   * @param {string} studentId - Student ID
   * @param {Object} data - Exam entry data
   * @param {string} data.exam_type - 'PLE', 'CSE', or 'Testimonial'
   * @param {string} data.index_number - 6-9 digit index number
   * @param {string} data.centre_number - 6-9 digit centre number
   * @param {string} data.academic_year - e.g., '2026/2027'
   * @param {Array} data.subjects - Array of { name, score, grade }
   * @param {string} [data.section] - 'Science' or 'Arts' (S4 only)
   * @returns {Promise}
   */
  saveExamEntry: async (studentId, data) => {
    // Try students endpoint first, fallback to exams endpoint
    try {
      return await api.post(`/students/${studentId}/exam-entry`, data)
    } catch (error) {
      // Fallback to exams API - include student_id in body
      return api.post('/exams/entries', {
        student_id: studentId,
        ...data,
      })
    }
  },

  /**
   * Update exam entry status
   * @param {string} studentId - Student ID
   * @param {string} status - 'draft', 'finalized', or 'printed'
   * @returns {Promise}
   */
  updateExamEntryStatus: async (studentId, status) => {
    try {
      return await api.put(`/students/${studentId}/exam-entry/status`, { status })
    } catch (error) {
      return api.put(`/exams/entries/${studentId}/status`, { status })
    }
  },

  /**
   * Delete exam entry
   * @param {string} studentId - Student ID
   * @returns {Promise}
   */
  deleteExamEntry: async (studentId) => {
    try {
      return await api.delete(`/students/${studentId}/exam-entry`)
    } catch (error) {
      return api.delete(`/exams/entries/${studentId}`)
    }
  },

  /**
   * List all exam entries with filtering
   * @param {Object} params - Query parameters
   * @param {string} [params.exam_type] - 'PLE', 'CSE', 'Testimonial'
   * @param {string} [params.academic_year] - e.g., '2026/2027'
   * @param {string} [params.status] - 'draft', 'finalized', 'printed'
   * @param {number} [params.page] - Page number
   * @param {number} [params.limit] - Items per page
   * @returns {Promise}
   */
  listExamEntries: async (params = {}) => api.get('/exams/entries/list', { params }),

  /**
   * Get students eligible for exam entry (P8 and S4)
   * @param {string} [examType='Testimonial'] - 'PLE', 'CSE', or 'Testimonial'
   * @returns {Promise} - Array of eligible students
   */
  getEligibleStudents: async (examType = 'Testimonial') => {
    return api.get('/exams/entries/eligible', { params: { exam_type: examType } })
  },

  /**
   * Verify an exam entry publicly (no auth required)
   * @param {string} entryId - Exam entry ID
   * @returns {Promise} - Public exam entry data
   */
  verifyExamEntry: async (entryId) => api.get(`/exams/entries/${entryId}/verify`),

  // =========================================================================
  // REPORT CARDS (convenience methods)
  // =========================================================================
  /**
   * Generate single term report card
   * @param {string} studentId - Student ID
   * @param {string} term - e.g., 'Term 1'
   * @param {string} [academicYear] - e.g., '2026/2027'
   * @returns {Promise}
   */
  getStudentReport: async (studentId, term, academicYear = '') => {
    return api.post('/exams/report-cards/generate', {
      student_id: studentId,
      term,
      academic_year: academicYear || undefined,
    })
  },

  /**
   * Generate annual report card
   * @param {string} studentId - Student ID
   * @param {string} [academicYear] - e.g., '2026/2027'
   * @returns {Promise}
   */
  getStudentAnnualReport: async (studentId, academicYear = '') => {
    return api.post('/exams/report-cards/annual', {
      student_id: studentId,
      academic_year: academicYear || undefined,
    })
  },
}

export default studentsAPI
