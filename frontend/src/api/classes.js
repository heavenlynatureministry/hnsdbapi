import api from './axios'

const classesAPI = {
  // Basic CRUD
  getAll: async (params = {}) => api.get('/classes', { params }),
  getById: async (id) => api.get(`/classes/${id}`),
  create: async (data) => api.post('/classes', data),
  createAllForYear: async (academicYear) => api.post('/classes/create-all', { academic_year: academicYear }),
  update: async (id, data) => api.put(`/classes/${id}`, data),
  
  // Delete operations
  archive: async (id) => api.delete(`/classes/${id}`), // Soft delete (mark as inactive)
  delete: async (id) => api.delete(`/classes/${id}`),  // Same as archive - soft delete
  
  /**
   * Permanently delete a class from the database
   * WARNING: This action cannot be undone
   * Also removes class references from all associated students and teachers
   */
  permanentDelete: async (id) => {
    // Optional: Add confirmation before sending request
    // You can handle this in the UI component instead
    return api.delete(`/classes/${id}/permanent`)
  },
  
  /**
   * Reactivate a soft-deleted (inactive) class
   */
  reactivate: async (id) => api.put(`/classes/${id}/reactivate`),
  
  // Student operations
  getStudents: async (classId, includeInactive = false) => 
    api.get(`/classes/${classId}/students`, { 
      params: { include_inactive: includeInactive } 
    }),
  getStudentCount: async (classId) => api.get(`/classes/${classId}/students/count`),
  promoteStudents: async (data) => api.post('/classes/promote', data),
  getNextClass: async (classId, academicYear = '') => 
    api.get(`/classes/${classId}/next-class`, { 
      params: { academic_year: academicYear } 
    }),
  
  // Schedule operations
  getSchedule: async (classId) => api.get(`/classes/${classId}/schedule`),
  updateSchedule: async (classId, schedule) => 
    api.put(`/classes/${classId}/schedule`, { schedule }),
  checkScheduleConflict: async (data) => 
    api.post('/classes/check-schedule-conflict', data),
  
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
}

export default classesAPI
