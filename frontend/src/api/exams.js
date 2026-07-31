/**
 * School API - Frontend API service
 */
import api from './axios'

const schoolAPI = {
  // =========================================================================
  // SCHOOL INFO
  // =========================================================================
  getInfo: async () => api.get('/school/info'),
  updateInfo: async (data) => api.put('/school/info', data),
  updateLogo: async (logoUrl, thumbnailUrl = '') => api.post('/school/logo', { logo_url: logoUrl, thumbnail_url: thumbnailUrl }),
  
  // =========================================================================
  // CALENDAR
  // =========================================================================
  createCalendar: async (data) => api.post('/school/calendar', data),
  getCalendar: async (params = {}) => api.get('/school/calendar', { params }),
  getCurrentTerm: async () => api.get('/school/calendar/current-term'),
  checkSchoolDay: async (date = '') => api.get('/school/calendar/check-day', { params: { check_date: date } }),
  transitionYear: async (data) => api.post('/school/calendar/transition-year', data),
  
  // =========================================================================
  // EVENTS
  // =========================================================================
  createEvent: async (data) => api.post('/school/events', data),
  listEvents: async (params = {}) => api.get('/school/events', { params }),
  getEvents: async (params = {}) => api.get('/school/events', { params }),
  getEvent: async (id) => api.get(`/school/events/${id}`),
  updateEvent: async (id, data) => api.put(`/school/events/${id}`, data),
  cancelEvent: async (id, reason = '') => api.delete(`/school/events/${id}`, { params: { reason } }),
  
  // =========================================================================
  // BOARD MEMBERS
  // =========================================================================
  addBoardMember: async (data) => api.post('/school/board', data),
  listBoardMembers: async (params = {}) => api.get('/school/board', { params }),
  getBoardMembers: async (params = {}) => api.get('/school/board', { params }),
  getBoardMember: async (id) => api.get(`/school/board/${id}`),
  updateBoardMember: async (id, data) => api.put(`/school/board/${id}`, data),
  removeBoardMember: async (id) => api.delete(`/school/board/${id}`),
  permanentDeleteBoardMember: async (id) => api.delete(`/school/board/${id}/permanent`),
  getBoardStatistics: async () => api.get('/school/board/statistics'),

  /**
   * Upload board member photo
   * @param {string} memberId - Board member ID
   * @param {File|FormData} file - Image file
   * @returns {Promise} - { photo_url: string }
   */
  uploadBoardMemberPhoto: async (memberId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/school/board/${memberId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /**
   * Delete board member photo
   * @param {string} memberId - Board member ID
   * @returns {Promise}
   */
  deleteBoardMemberPhoto: async (memberId) => {
    return api.delete(`/school/board/${memberId}/photo`)
  },
  
  // =========================================================================
  // NETWORKS
  // =========================================================================
  addNetworkMembership: async (data) => api.post('/school/networks', data),
  listNetworkMemberships: async (params = {}) => api.get('/school/networks', { params }),
  
  // =========================================================================
  // STRATEGIC PLANS
  // =========================================================================
  createStrategicPlan: async (data) => api.post('/school/strategic-plans', data),
  listStrategicPlans: async (params = {}) => api.get('/school/strategic-plans', { params }),
  
  // =========================================================================
  // SETTINGS
  // =========================================================================
  resetAcademicData: async (data) => api.post('/school/reset-academic', data),
  getSettings: async (params = {}) => api.get('/school/settings', { params }),
  updateSetting: async (data) => api.put('/school/settings', data),
  getSetting: async (key) => api.get(`/school/settings/${key}`),
  
  // =========================================================================
  // SUBJECTS
  // =========================================================================
  getSubjects: async () => api.get('/school/subjects'),
  
  // =========================================================================
  // DASHBOARD
  // =========================================================================
  getDashboard: async () => api.get('/school/dashboard'),
  getEnrollmentAnalytics: async () => api.get('/school/dashboard/enrollment-analytics'),
  
  // =========================================================================
  // OTHER
  // =========================================================================
  initialize: async () => api.post('/school/initialize'),
  generateReport: async (params = {}) => api.post('/school/reports/generate', params),
}

export default schoolAPI
