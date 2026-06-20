import api from './axios'

/**
 * Financial API Service
 */
const financialAPI = {
  // =========================================================================
  // TRANSACTIONS
  // =========================================================================

  /**
   * Create transaction
   * @param {Object} data - Transaction data
   * @returns {Promise}
   */
  createTransaction: async (data) => {
    return api.post('/financial/transactions', data)
  },

  /**
   * List transactions
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  listTransactions: async (params = {}) => {
    return api.get('/financial/transactions', { params })
  },

  /**
   * Get transaction details
   * @param {string} id - Transaction ID
   * @returns {Promise}
   */
  getTransaction: async (id) => {
    return api.get(`/financial/transactions/${id}`)
  },

  /**
   * Update transaction
   * @param {string} id - Transaction ID
   * @param {Object} data - Updated data
   * @returns {Promise}
   */
  updateTransaction: async (id, data) => {
    return api.put(`/financial/transactions/${id}`, data)
  },

  /**
   * Delete transaction
   * @param {string} id - Transaction ID
   * @returns {Promise}
   */
  deleteTransaction: async (id) => {
    return api.delete(`/financial/transactions/${id}`)
  },

  /**
   * Approve/reject transaction
   * @param {Object} data - { transaction_id, is_approved, rejection_reason }
   * @returns {Promise}
   */
  approveTransaction: async (data) => {
    return api.post('/financial/transactions/approve', data)
  },

  /**
   * Get pending approvals count
   * @returns {Promise}
   */
  getPendingCount: async () => {
    return api.get('/financial/transactions/pending/count')
  },

  // =========================================================================
  // FINANCIAL SUMMARY
  // =========================================================================

  /**
   * Get financial summary
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getSummary: async (params = {}) => {
    return api.get('/financial/summary', { params })
  },

  /**
   * Get monthly breakdown
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getMonthlyBreakdown: async (params = {}) => {
    return api.get('/financial/summary/monthly', { params })
  },

  // =========================================================================
  // FEE STRUCTURES
  // =========================================================================

  /**
   * Create fee structure
   * @param {Object} data - Fee structure data
   * @returns {Promise}
   */
  createFeeStructure: async (data) => {
    return api.post('/financial/fee-structures', data)
  },

  /**
   * List fee structures
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  listFeeStructures: async (params = {}) => {
    return api.get('/financial/fee-structures', { params })
  },

  /**
   * Get fee structure details
   * @param {string} id - Fee structure ID
   * @returns {Promise}
   */
  getFeeStructure: async (id) => {
    return api.get(`/financial/fee-structures/${id}`)
  },

  // =========================================================================
  // PAYMENTS
  // =========================================================================

  /**
   * Record payment
   * @param {Object} data - Payment data
   * @returns {Promise}
   */
  recordPayment: async (data) => {
    return api.post('/financial/payments', data)
  },

  /**
   * Get student payment history
   * @param {string} studentId - Student ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getStudentPayments: async (studentId, params = {}) => {
    return api.get(`/financial/payments/student/${studentId}`, { params })
  },

  /**
   * Get payment summary
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getPaymentSummary: async (params = {}) => {
    return api.get('/financial/payments/summary', { params })
  },

  /**
   * Verify payment
   * @param {Object} data - { payment_id, is_verified, verification_notes }
   * @returns {Promise}
   */
  verifyPayment: async (data) => {
    return api.post('/financial/payments/verify', data)
  },

  /**
   * Get payment by receipt number
   * @param {string} receiptNumber - Receipt number
   * @returns {Promise}
   */
  getPaymentByReceipt: async (receiptNumber) => {
    return api.get(`/financial/payments/receipt/${receiptNumber}`)
  },

  // =========================================================================
  // BUDGETS
  // =========================================================================

  /**
   * Create/update budget
   * @param {Object} data - Budget data
   * @returns {Promise}
   */
  createBudget: async (data) => {
    return api.post('/financial/budgets', data)
  },

  /**
   * Get budget summary
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getBudgetSummary: async (params = {}) => {
    return api.get('/financial/budgets', { params })
  },

  // =========================================================================
  // REPORTS & ANALYTICS
  // =========================================================================

  /**
   * Get fee collection report
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getFeeCollectionReport: async (params = {}) => {
    return api.get('/financial/reports/fee-collection', { params })
  },

  /**
   * Get financial dashboard
   * @returns {Promise}
   */
  getDashboard: async () => {
    return api.get('/financial/dashboard')
  },

  /**
   * Get financial alerts
   * @returns {Promise}
   */
  getAlerts: async () => {
    return api.get('/financial/alerts')
  },

  /**
   * Get revenue analysis
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getRevenueAnalysis: async (params = {}) => {
    return api.get('/financial/analytics/revenue', { params })
  },

  /**
   * Get expenditure analysis
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getExpenditureAnalysis: async (params = {}) => {
    return api.get('/financial/analytics/expenditure', { params })
  },

  /**
   * Get cash flow projection
   * @param {Object} params - { months }
   * @returns {Promise}
   */
  getCashFlow: async (params = {}) => {
    return api.get('/financial/cash-flow', { params })
  },
}

export default financialAPI