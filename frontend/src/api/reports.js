import api from './axios'

const reportsAPI = {
  // Overview
  getOverview: async () => api.get('/reports/'),

  // Enrollment
  getEnrollmentSummary: async (params = {}) => api.get('/reports/enrollment/summary/', { params }),

  // Staff
  getStaffSummary: async () => api.get('/reports/staff/summary/'),

  // Attendance
  getAttendanceOverview: async (params = {}) => api.get('/reports/attendance/overview/', { params }),

  // Financial
  getFinancialSummary: async (params = {}) => api.get('/reports/financial/summary/', { params }),

  // Annual
  getAnnualReport: async (params = {}) => api.get('/reports/comprehensive/annual/', { params }),
}

export default reportsAPI
