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
  updatePayment: async (id, data) => api.put(`/financial/payments/${id}`, data),
  deletePayment: async (id) => api.delete(`/financial/payments/${id}`),
  getStudentPayments: async (studentId, params = {}) => api.get('/financial/payments', { ...params, student_id: studentId }),
  
  // School Fees
  getFeeStructure: async (params = {}) => api.get('/financial/fees', { params }),
  getFeeStructures: async (params = {}) => api.get('/financial/fees', { params }), // Alias
  createFeeStructure: async (data) => api.post('/financial/fees', data),
  updateFeeStructure: async (id, data) => api.put(`/financial/fees/${id}`, data),
  deleteFeeStructure: async (id) => api.delete(`/financial/fees/${id}`),

  // Budget
  getBudgetSummary: async (params = {}) => api.get('/financial/budgets', { params }),
  getBudgets: async (params = {}) => api.get('/financial/budgets', { params }),
  createBudget: async (data) => api.post('/financial/budgets', data),
  updateBudget: async (id, data) => api.put(`/financial/budgets/${id}`, data),
  deleteBudget: async (id) => api.delete(`/financial/budgets/${id}`),

  // Reports
  getFinancialReport: async (params = {}) => api.get('/financial/reports', { params }),
  generateReport: async (data) => api.post('/financial/reports/generate', data),
}

export default financialAPI
