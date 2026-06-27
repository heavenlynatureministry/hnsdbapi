/**
 * School API - Frontend API service
 */
import api from './axios'

const schoolAPI = {
  // School Info
  getInfo: async () => api.get('/school/info'),
  updateInfo: async (data) => api.put('/school/info', data),
  updateLogo: async (logoUrl, thumbnailUrl = '') => api.post('/school/logo', { logo_url: logoUrl, thumbnail_url: thumbnailUrl }),
  
  // Calendar
  createCalendar: async (data) => api.post('/school/calendar', data),
  getCalendar: async (params = {}) => api.get('/school/calendar', { params }),
  getCurrentTerm: async () => api.get('/school/calendar/current-term'),
  checkSchoolDay: async (date = '') => api.get('/school/calendar/check-day', { params: { check_date: date } }),
  transitionYear: async (data) => api.post('/school/calendar/transition-year', data),
  
  // Events
  createEvent: async (data) => api.post('/school/events', data),
  listEvents: async (params = {}) => api.get('/school/events', { params }),
  getEvents: async (params = {}) => api.get('/school/events', { params }),
  getEvent: async (id) => api.get(`/school/events/${id}`),
  updateEvent: async (id, data) => api.put(`/school/events/${id}`, data),
  cancelEvent: async (id, reason = '') => api.delete(`/school/events/${id}`, { params: { reason } }),
  
  // Board Members
  addBoardMember: async (data) => api.post('/school/board', data),
  listBoardMembers: async (params = {}) => api.get('/school/board', { params }),
  getBoardMembers: async (params = {}) => api.get('/school/board', { params }),
  updateBoardMember: async (id, data) => api.put(`/school/board/${id}`, data),
  removeBoardMember: async (id) => api.delete(`/school/board/${id}`),
  
  // Networks
  addNetworkMembership: async (data) => api.post('/school/networks', data),
  listNetworkMemberships: async (params = {}) => api.get('/school/networks', { params }),
  
  // Strategic Plans
  createStrategicPlan: async (data) => api.post('/school/strategic-plans', data),
  listStrategicPlans: async (params = {}) => api.get('/school/strategic-plans', { params }),
  
  // Settings
  getSettings: async (params = {}) => api.get('/school/settings', { params }),
  updateSetting: async (data) => api.put('/school/settings', data),
  getSetting: async (key) => api.get(`/school/settings/${key}`),
  
  // Subjects
  getSubjects: async () => api.get('/school/subjects'),
  
  // Dashboard
  getDashboard: async () => api.get('/school/dashboard'),
  getEnrollmentAnalytics: async () => api.get('/school/dashboard/enrollment-analytics'),
  
  // Other
  initialize: async () => api.post('/school/initialize'),
  generateReport: async (params = {}) => api.post('/school/reports/generate', params),
}

export default schoolAPI
