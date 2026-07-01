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
  getStudentPayments: async (studentId, params = {}) => 
    api.get('/financial/payments', { ...params, student_id: studentId }),
  
  // ✅ Student Balance
  /**
   * Get student fee balance
   * @param {string} studentId - Student ID
   * @param {Object} params - { academic_year, fee_type }
   * @returns {Promise} Balance info with total_fee, total_paid, balance, is_cleared
   */
  getStudentBalance: async (studentId, params = {}) => 
    api.get(`/financial/student-balance/${studentId}`, { params }),
  
  // Receipt
  /**
   * Get receipt data for a payment (includes balance info)
   * @param {string} paymentId - Payment ID
   * @returns {Promise} Receipt data with student, school, payment details, and balance_info
   */
  getReceipt: async (paymentId) => api.get(`/financial/receipt/${paymentId}`),
  
  /**
   * Get receipt data for a transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Promise} Receipt data
   */
  getTransactionReceipt: async (transactionId) => api.get(`/financial/receipt/${transactionId}`),
  
  /**
   * Get the next available receipt number
   * @returns {Promise} Next receipt number for preview
   */
  getNextReceiptNumber: async () => api.get('/financial/next-receipt-number'),
  
  // School Fees
  getFeeStructure: async (params = {}) => api.get('/financial/fees', { params }),
  getFeeStructures: async (params = {}) => api.get('/financial/fees', { params }), // Alias
  createFeeStructure: async (data) => api.post('/financial/fees', data),
  
  /**
   * Update fee structure entry (e.g., change annual fee amount)
   * @param {string} id - Fee structure ID
   * @param {Object} data - { fee_name, amount, fee_type, class_level, description, is_mandatory, status, term }
   */
  updateFeeStructure: async (id, data) => api.put(`/financial/fees/${id}`, data),
  
  /**
   * Delete fee structure entry
   * @param {string} id - Fee structure ID
   */
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
