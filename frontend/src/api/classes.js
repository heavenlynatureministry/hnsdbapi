import api from './axios'

/**
 * Classes API Service
 */
const classesAPI = {
  /**
   * Get all classes with filtering
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAll: async (params = {}) => {
    return api.get('/classes', { params })
  },

  /**
   * Get class by ID
   * @param {string} id - Class ID
   * @returns {Promise}
   */
  getById: async (id) => {
    return api.get(`/classes/${id}`)
  },

  /**
   * Create new class
   * @param {Object} data - Class data
   * @returns {Promise}
   */
  create: async (data) => {
    return api.post('/classes', data)
  },

  /**
   * Create all classes for an academic year
   * @param {string} academicYear - Academic year (YYYY/YYYY)
   * @returns {Promise}
   */
  createAllForYear: async (academicYear) => {
    return api.post('/classes/create-all', { academic_year: academicYear })
  },

  /**
   * Update class
   * @param {string} id - Class ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  update: async (id, data) => {
    return api.put(`/classes/${id}`, data)
  },

  /**
   * Archive class
   * @param {string} id - Class ID
   * @returns {Promise}
   */
  archive: async (id) => {
    return api.delete(`/classes/${id}`)
  },

  // =========================================================================
  // CLASS STUDENTS
  // =========================================================================

  /**
   * Get students in class
   * @param {string} classId - Class ID
   * @param {boolean} includeInactive - Include inactive students
   * @returns {Promise}
   */
  getStudents: async (classId, includeInactive = false) => {
    return api.get(`/classes/${classId}/students`, {
      params: { include_inactive: includeInactive },
    })
  },

  /**
   * Get student count in class
   * @param {string} classId - Class ID
   * @returns {Promise}
   */
  getStudentCount: async (classId) => {
    return api.get(`/classes/${classId}/students/count`)
  },

  // =========================================================================
  // PROMOTION
  // =========================================================================

  /**
   * Promote students to next class
   * @param {Object} data - Promotion data
   * @returns {Promise}
   */
  promoteStudents: async (data) => {
    return api.post('/classes/promote', data)
  },

  /**
   * Get next class for promotion
   * @param {string} classId - Current class ID
   * @param {string} academicYear - Target academic year
   * @returns {Promise}
   */
  getNextClass: async (classId, academicYear = '') => {
    return api.get(`/classes/${classId}/next-class`, {
      params: { academic_year: academicYear },
    })
  },

  /**
   * Get promotion map
   * @returns {Promise}
   */
  getPromotionMap: async () => {
    return api.get('/classes/promotion-map')
  },

  // =========================================================================
  // SCHEDULE
  // =========================================================================

  /**
   * Update class schedule
   * @param {string} classId - Class ID
   * @param {Object} schedule - Schedule data
   * @returns {Promise}
   */
  updateSchedule: async (classId, schedule) => {
    return api.put(`/classes/${classId}/schedule`, { schedule })
  },

  /**
   * Get class schedule
   * @param {string} classId - Class ID
   * @returns {Promise}
   */
  getSchedule: async (classId) => {
    return api.get(`/classes/${classId}/schedule`)
  },

  /**
   * Check schedule conflicts
   * @param {Object} data - Schedule to check
   * @returns {Promise}
   */
  checkScheduleConflict: async (data) => {
    return api.post('/classes/check-schedule-conflict', data)
  },

  // =========================================================================
  // CLASSROOMS
  // =========================================================================

  /**
   * Create classroom
   * @param {Object} data - Classroom data
   * @returns {Promise}
   */
  createClassroom: async (data) => {
    return api.post('/classes/classrooms', data)
  },

  /**
   * List classrooms
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  listClassrooms: async (params = {}) => {
    return api.get('/classes/classrooms', { params })
  },

  /**
   * Get available classrooms
   * @param {Object} params - { min_capacity, room_type }
   * @returns {Promise}
   */
  getAvailableClassrooms: async (params = {}) => {
    return api.get('/classes/classrooms/available', { params })
  },

  /**
   * Update classroom
   * @param {string} id - Classroom ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  updateClassroom: async (id, data) => {
    return api.put(`/classes/classrooms/${id}`, data)
  },

  /**
   * Assign classroom to class
   * @param {Object} data - { class_id, classroom_id }
   * @returns {Promise}
   */
  assignClassroom: async (data) => {
    return api.post('/classes/classrooms/assign', data)
  },

  /**
   * Bulk assign classrooms
   * @param {Array} assignments - List of { class_id, classroom_id }
   * @returns {Promise}
   */
  bulkAssignClassrooms: async (assignments) => {
    return api.post('/classes/classrooms/bulk-assign', { assignments })
  },

  // =========================================================================
  // TEACHER ASSIGNMENT
  // =========================================================================

  /**
   * Assign teacher to class
   * @param {Object} data - { teacher_id, class_ids }
   * @returns {Promise}
   */
  assignTeacher: async (data) => {
    return api.post('/classes/assign-teacher', data)
  },

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /**
   * Get class statistics
   * @param {string} classId - Class ID
   * @returns {Promise}
   */
  getStatistics: async (classId) => {
    return api.get(`/classes/statistics/${classId}`)
  },

  /**
   * Get all classes statistics
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getAllStatistics: async (params = {}) => {
    return api.get('/classes/statistics/overview', { params })
  },

  // =========================================================================
  // CLASS LEVELS
  // =========================================================================

  /**
   * Get class levels
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getLevels: async (params = {}) => {
    return api.get('/classes/levels', { params })
  },
}

export default classesAPI