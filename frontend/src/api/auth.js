import api from './axios'

const authAPI = {
  login: async (credentials) => api.post('/auth/login', credentials),
  getMe: async () => api.get('/auth/me'),
  logout: async () => api.post('/auth/logout'),
  verifyToken: async () => api.get('/auth/verify'),
  changePassword: async (data) => api.post('/auth/change-password', data),
  updateProfile: async (data) => api.put('/auth/me', data),
}

export default authAPI
