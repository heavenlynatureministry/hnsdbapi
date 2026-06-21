import api from './axios'

const classesAPI = {
  getAll: async (params = {}) => api.get('/classes', { params }),
  getById: async (id) => api.get(`/classes/${id}`),
  create: async (data) => api.post('/classes', data),
  createAllForYear: async (academicYear) => api.post('/classes/create-all', { academic_year: academicYear }),
  update: async (id, data) => api.put(`/classes/${id}`, data),
  archive: async (id) => api.delete(`/classes/${id}`),
  getStudents: async (classId, includeInactive = false) => api.get(`/classes/${classId}/students`, { params: { include_inactive: includeInactive } }),
  getStudentCount: async (classId) => api.get(`/classes/${classId}/students/count`),
  promoteStudents: async (data) => api.post('/classes/promote/', data),
  getNextClass: async (classId, academicYear = '') => api.get(`/classes/${classId}/next-class`, { params: { academic_year: academicYear } }),
  getPromotionMap: async () => api.get('/classes/promotion-map/'),
  updateSchedule: async (classId, schedule) => api.put(`/classes/${classId}/schedule`, { schedule }),
  getSchedule: async (classId) => api.get(`/classes/${classId}/schedule/`),
  checkScheduleConflict: async (data) => api.post('/classes/check-schedule-conflict/', data),
  createClassroom: async (data) => api.post('/classes/classrooms/', data),
  listClassrooms: async (params = {}) => api.get('/classes/classrooms', { params }),
  getAvailableClassrooms: async (params = {}) => api.get('/classes/classrooms/available', { params }),
  updateClassroom: async (id, data) => api.put(`/classes/classrooms/${id}`, data),
  assignClassroom: async (data) => api.post('/classes/classrooms/assign', data),
  bulkAssignClassrooms: async (assignments) => api.post('/classes/classrooms/bulk-assign', { assignments }),
  assignTeacher: async (data) => api.post('/classes/assign-teacher', data),
  getStatistics: async (classId) => api.get(`/classes/statistics/${classId}`),
  getAllStatistics: async (params = {}) => api.get('/classes/statistics/overview', { params }),
  getLevels: async (params = {}) => api.get('/classes/levels', { params }),
}

export default classesAPI
