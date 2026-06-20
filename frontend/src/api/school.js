import api from './axios'

/**
 * School API Service
 */
const schoolAPI = {
  // =========================================================================
  // SCHOOL INFO
  // =========================================================================

  /**
   * Get school information
   * @returns {Promise}
   */
  getInfo: async () => {
    return api.get('/school/info')
  },

  /**
   * Update school information
   * @param {Object} data - Updated info
   * @returns {Promise}
   */
  updateInfo: async (data) => {
    return api.put('/school/info', data)
  },

  /**
   * Update school logo
   * @param {string} logoUrl - Logo URL
   * @param {string} thumbnailUrl - Thumbnail URL
   * @returns {Promise}
   */
  updateLogo: async (logoUrl, thumbnailUrl = '') => {
    return api.post('/school/logo', { logo_url: logoUrl, thumbnail_url: thumbnailUrl })
  },

  // =========================================================================
  // ACADEMIC CALENDAR
  // =========================================================================

  /**
   * Create academic calendar
   * @param {Object} data - Calendar data
   * @returns {Promise}
   */
  createCalendar: async (data) => {
    return api.post('/school/calendar', data)
  },

  /**
   * Get academic calendar
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getCalendar: async (params = {}) => {
    return api.get('/school/calendar', { params })
  },

  /**
   * Get current term info
   * @returns {Promise}
   */
  getCurrentTerm: async () => {
    return api.get('/school/calendar/current-term')
  },

  /**
   * Check if date is a school day
   * @param {string} date - Date to check
   * @returns {Promise}
   */
  checkSchoolDay: async (date = '') => {
    return api.get('/school/calendar/check-day', { params: { check_date: date } })
  },

  /**
   * Transition to new academic year
   * @param {Object} data - Transition data
   * @returns {Promise}
   */
  transitionYear: async (data) => {
    return api.post('/school/calendar/transition-year', data)
  },

  // =========================================================================
  // EVENTS
  // =========================================================================

  /**
   * Create school event
   * @param {Object} data - Event data
   * @returns {Promise}
   */
  createEvent: async (data) => {
    return api.post('/school/events', data)
  },

  /**
   * List school events
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  listEvents: async (params = {}) => {
    return api.get('/school/events', { params })
  },

  /**
   * Get event details
   * @param {string} id - Event ID
   * @returns {Promise}
   */
  getEvent: async (id) => {
    return api.get(`/school/events/${id}`)
  },

  /**
   * Update event
   * @param {string} id - Event ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  updateEvent: async (id, data) => {
    return api.put(`/school/events/${id}`, data)
  },

  /**
   * Cancel event
   * @param {string} id - Event ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise}
   */
  cancelEvent: async (id, reason = '') => {
    return api.delete(`/school/events/${id}`, { params: { reason } })
  },

  // =========================================================================
  // BOARD MEMBERS
  // =========================================================================

  /**
   * Add board member
   * @param {Object} data - Member data
   * @returns {Promise}
   */
  addBoardMember: async (data) => {
    return api.post('/school/board', data)
  },

  /**
   * List board members
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  listBoardMembers: async (params = {}) => {
    return api.get('/school/board', { params })
  },

  /**
   * Update board member
   * @param {string} id - Member ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  updateBoardMember: async (id, data) => {
    return api.put(`/school/board/${id}`, data)
  },

  /**
   * Remove board member
   * @param {string} id - Member ID
   * @returns {Promise}
   */
  removeBoardMember: async (id) => {
    return api.delete(`/school/board/${id}`)
  },

  // =========================================================================
  // NETWORK MEMBERSHIPS
  // =========================================================================

  /**
   * Add network membership
   * @param {Object} data - Membership data
   * @returns {Promise}
   */
  addNetworkMembership: async (data) => {
    return api.post('/school/networks', data)
  },

  /**
   * List network memberships
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  listNetworkMemberships: async (params = {}) => {
    return api.get('/school/networks', { params })
  },

  // =========================================================================
  // STRATEGIC PLANS
  // =========================================================================

  /**
   * Create strategic plan
   * @param {Object} data - Plan data
   * @returns {Promise}
   */
  createStrategicPlan: async (data) => {
    return api.post('/school/strategic-plans', data)
  },

  /**
   * List strategic plans
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  listStrategicPlans: async (params = {}) => {
    return api.get('/school/strategic-plans', { params })
  },

  // =========================================================================
  // SETTINGS
  // =========================================================================

  /**
   * Get all system settings
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getSettings: async (params = {}) => {
    return api.get('/school/settings', { params })
  },

  /**
   * Update system setting
   * @param {Object} data - Setting data
   * @returns {Promise}
   */
  updateSetting: async (data) => {
    return api.put('/school/settings', data)
  },

  /**
   * Get specific setting
   * @param {string} key - Setting key
   * @returns {Promise}
   */
  getSetting: async (key) => {
    return api.get(`/school/settings/${key}`)
  },

  // =========================================================================
  // DASHBOARD
  // =========================================================================

  /**
   * Get dashboard statistics
   * @returns {Promise}
   */
  getDashboard: async () => {
    return api.get('/school/dashboard')
  },

  /**
   * Get enrollment analytics
   * @returns {Promise}
   */
  getEnrollmentAnalytics: async () => {
    return api.get('/school/dashboard/enrollment-analytics')
  },

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  /**
   * Initialize school data
   * @returns {Promise}
   */
  initialize: async () => {
    return api.post('/school/initialize')
  },

  // =========================================================================
  // REPORTS
  // =========================================================================

  /**
   * Generate school report
   * @param {Object} params - Report parameters
   * @returns {Promise}
   */
  generateReport: async (params = {}) => {
    return api.post('/school/reports/generate', params)
  },
}

export default schoolAPI