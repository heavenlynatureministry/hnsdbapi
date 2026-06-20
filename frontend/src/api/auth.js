import api from './axios'

/**
 * Authentication API Service - Production
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
   * Logout user
   * @returns {Promise}
   */
  logout: async () => {
    return api.post('/auth/logout')
  },

  /**
   * Verify token validity
   * @returns {Promise}
   */
  verifyToken: async () => {
    return api.get('/auth/verify')
  },
}

export default authAPI
