import api from './axios'

const financialAPI = {
  // Transactions
  createTransaction: async (data) => api.post('/financial', data),
  listTransactions: async (params = {}) => api.get('/financial', { params }),
  getTransaction: async (id) => api.get(`/financial/${id}`),
  updateTransaction: async (id, data) => api.put(`/financial/${id}`, data),
  deleteTransaction: async (id) => api.delete(`/financial/${id}`),

  // Summary & Dashboard
  getSummary: async (params = {}) => api.get('/financial/summary', { params }),
  getDashboard: async () => api.get('/financial/dashboard'),

  // Payments
  recordPayment: async (data) => api.post('/financial/payments', data),
  listPayments: async (params = {}) => api.get('/financial/payments', { params }),
  getPayments: async (params = {}) => api.get('/financial/payments', { params }),
  getPaymentById: async (id) => api.get(`/financial/payments/${id}`),
  getStudentPayments: async (studentId, params = {}) => api.get('/financial/payments', { ...params, student_id: studentId }),
  
  // School Fees
  getFeeStructure: async (params = {}) => api.get('/financial/fees', { params }),
  createFeeStructure: async (data) => api.post('/financial/fees', data),
  updateFeeStructure: async (id, data) => api.put(`/financial/fees/${id}`, data),
  deleteFeeStructure: async (id) => api.delete(`/financial/fees/${id}`),
}

export default financialAPI
