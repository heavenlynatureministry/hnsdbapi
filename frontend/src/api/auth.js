import api from './axios'

/**
 * Authentication API Service
 */
const authAPI = {
  /**
   * Login user
   * @param {Object} credentials - { email, password, remember_me }
   * @returns {Promise} Login response with tokens
   */
  login: async (credentials) => {
    return api.post('/auth/login', credentials)
  },

  /**
   * Get current user profile
   * @returns {Promise} Current user data
   */
  getMe: async () => {
    return api.get('/auth/me')
  },

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise} New tokens
   */
  refreshToken: async (refreshToken) => {
    return api.post('/auth/refresh', { refresh_token: refreshToken })
  },

  /**
   * Logout user
   * @returns {Promise}
   */
  logout: async () => {
    return api.post('/auth/logout')
  },

  /**
   * Change password
   * @param {Object} data - { current_password, new_password, confirm_new_password }
   * @returns {Promise}
   */
  changePassword: async (data) => {
    return api.post('/auth/change-password', data)
  },

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise}
   */
  forgotPassword: async (email) => {
    return api.post('/auth/forgot-password', { email })
  },

  /**
   * Reset password with token
   * @param {Object} data - { token, new_password, confirm_password }
   * @returns {Promise}
   */
  resetPassword: async (data) => {
    return api.post('/auth/reset-password', data)
  },

  /**
   * Register new user (Admin only)
   * @param {Object} userData - User data
   * @returns {Promise}
   */
  register: async (userData) => {
    return api.post('/auth/register', userData)
  },

  /**
   * Verify token validity
   * @returns {Promise}
   */
  verifyToken: async () => {
    return api.get('/auth/verify')
  },

  /**
   * Get available permissions list
   * @returns {Promise}
   */
  getPermissions: async () => {
    return api.get('/auth/permissions')
  },

  /**
   * Update current user profile
   * @param {Object} data - { first_name, last_name, phone_number }
   * @returns {Promise}
   */
  updateProfile: async (data) => {
    return api.put('/auth/me', data)
  },

  /**
   * Deactivate user account (Admin only)
   * @param {string} userId - User ID
   * @returns {Promise}
   */
  deactivateUser: async (userId) => {
    return api.post(`/auth/deactivate/${userId}`)
  },

  /**
   * Activate user account (Admin only)
   * @param {string} userId - User ID
   * @returns {Promise}
   */
  activateUser: async (userId) => {
    return api.post(`/auth/activate/${userId}`)
  },
}

export default authAPI