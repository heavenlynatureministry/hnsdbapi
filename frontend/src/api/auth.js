import api from './axios'

const authAPI = {
  // Authentication
  login: async (credentials) => api.post('/auth/login', credentials),
  logout: async () => api.post('/auth/logout'),
  verifyToken: async () => api.get('/auth/verify'),
  forgotPassword: async (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: async (data) => api.post('/auth/reset-password', data),
  changePassword: async (data) => api.post('/auth/change-password', data),
  
  // Profile
  getMe: async () => api.get('/auth/me'),
  updateProfile: async (data) => api.put('/auth/me', data),
  
  // User Management (Admin)
  getUsers: async (params = {}) => api.get('/users', { params }),
  getUser: async (id) => api.get(`/users/${id}`),
  createUser: async (data) => api.post('/users', data),
  updateUser: async (id, data) => api.put(`/users/${id}`, data),
  deactivateUser: async (id) => api.patch(`/users/${id}/status`, { status: 'inactive' }),
  activateUser: async (id) => api.patch(`/users/${id}/status`, { status: 'active' }),
}

export default authAPI
