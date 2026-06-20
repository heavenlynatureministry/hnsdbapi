/**
 * Application Constants
 * Centralized constants for the entire application
 */

// =========================================================================
// APP INFO
// =========================================================================
export const APP_NAME = 'Heavenly Nature School'
export const APP_SHORT = 'HNS'
export const APP_VERSION = '2.0.0'
export const APP_MOTTO = 'Nurturing Right Leaders'

// =========================================================================
// API
// =========================================================================
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
export const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000

// =========================================================================
// ROLES
// =========================================================================
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  ACCOUNTANT: 'accountant',
  COUNSELOR: 'counselor',
  STAFF: 'staff',
}

export const ROLE_LABELS = {
  admin: 'Administrator',
  teacher: 'Teacher',
  accountant: 'Accountant',
  counselor: 'Counselor',
  staff: 'Staff',
}

export const ROLE_COLORS = {
  admin: 'danger',
  teacher: 'info',
  accountant: 'warning',
  counselor: 'success',
  staff: 'gray',
}

// =========================================================================
// PERMISSIONS
// =========================================================================
export const PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_STUDENTS: 'manage_students',
  MANAGE_TEACHERS: 'manage_teachers',
  MANAGE_CLASSES: 'manage_classes',
  MANAGE_ATTENDANCE: 'manage_attendance',
  MANAGE_EXAMS: 'manage_exams',
  MANAGE_FINANCIAL: 'manage_financial',
  MANAGE_REPORTS: 'manage_reports',
  MANAGE_SCHOOL: 'manage_school',
  VIEW_ALL: 'view_all',
  EDIT_ALL: 'edit_all',
}

// =========================================================================
// STUDENT TYPES
// =========================================================================
export const STUDENT_TYPES = [
  { value: 'street', label: 'Street Child' },
  { value: 'abundant', label: 'Abundant Family' },
  { value: 'orphan', label: 'Orphan' },
  { value: 'other', label: 'Other' },
]

export const STUDENT_TYPE_LABELS = {
  street: 'Street Child',
  abundant: 'Abundant Family',
  orphan: 'Orphan',
  other: 'Other',
}

// =========================================================================
// CLASSES
// =========================================================================
export const NURSERY_CLASSES = ['Baby', 'Middle', 'Top']
export const PRIMARY_CLASSES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
export const ALL_CLASSES = [...NURSERY_CLASSES, ...PRIMARY_CLASSES]

export const CLASS_LEVELS = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'primary', label: 'Primary' },
]

// =========================================================================
// GENDERS
// =========================================================================
export const GENDERS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]

// =========================================================================
// ATTENDANCE STATUSES
// =========================================================================
export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present', color: 'success', icon: 'CheckCircle' },
  { value: 'absent', label: 'Absent', color: 'danger', icon: 'XCircle' },
  { value: 'excused', label: 'Excused', color: 'warning', icon: 'AlertTriangle' },
  { value: 'late', label: 'Late', color: 'info', icon: 'Clock' },
]

// =========================================================================
// EXAM TYPES
// =========================================================================
export const EXAM_TYPES = [
  { value: 'mid_term', label: 'Mid Term' },
  { value: 'end_term', label: 'End Term' },
  { value: 'final', label: 'Final' },
  { value: 'mock', label: 'Mock' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'project', label: 'Project' },
  { value: 'oral', label: 'Oral' },
  { value: 'practical', label: 'Practical' },
]

// =========================================================================
// GRADES
// =========================================================================
export const GRADES = {
  A: { min: 80, max: 100, label: 'Excellent', color: 'success', gpa: 4.0 },
  B: { min: 70, max: 79, label: 'Very Good', color: 'info', gpa: 3.0 },
  C: { min: 60, max: 69, label: 'Good', color: 'warning', gpa: 2.0 },
  D: { min: 50, max: 59, label: 'Satisfactory', color: 'warning', gpa: 1.0 },
  F: { min: 0, max: 49, label: 'Fail', color: 'danger', gpa: 0.0 },
}

// =========================================================================
// SUBJECTS
// =========================================================================
export const SUBJECTS = [
  'English Language', 'Mathematics', 'Science', 'Social Studies',
  'Religious Education', 'Creative Arts', 'Physical Education',
  'Local Language', 'French', 'Arabic', 'Computer Studies',
  'Music', 'Drama', 'Agriculture', 'Home Economics',
]

// =========================================================================
// QUALIFICATIONS
// =========================================================================
export const QUALIFICATIONS = [
  'Certificate', 'Diploma', 'B.Ed', 'B.Sc', 'B.A',
  'M.Ed', 'M.Sc', 'M.A', 'PhD', 'PGDE', 'Other',
]

// =========================================================================
// TRANSACTION CATEGORIES
// =========================================================================
export const INCOME_CATEGORIES = [
  { value: 'tuition_fees', label: 'Tuition Fees' },
  { value: 'registration_fees', label: 'Registration Fees' },
  { value: 'examination_fees', label: 'Examination Fees' },
  { value: 'transportation_fees', label: 'Transportation Fees' },
  { value: 'uniform_fees', label: 'Uniform Fees' },
  { value: 'donations', label: 'Donations' },
  { value: 'grants', label: 'Grants' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'other_income', label: 'Other Income' },
]

export const EXPENSE_CATEGORIES = [
  { value: 'salaries', label: 'Salaries & Wages' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'supplies', label: 'School Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'textbooks', label: 'Textbooks' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'food_program', label: 'Food Program' },
  { value: 'medical', label: 'Medical' },
  { value: 'training', label: 'Training & Development' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other_expenses', label: 'Other Expenses' },
]

// =========================================================================
// PAYMENT METHODS
// =========================================================================
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'scholarship', label: 'Scholarship' },
]

// =========================================================================
// EVENT TYPES
// =========================================================================
export const EVENT_TYPES = [
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'religious', label: 'Religious' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'parent_meeting', label: 'Parent Meeting' },
  { value: 'staff_meeting', label: 'Staff Meeting' },
  { value: 'training', label: 'Training' },
  { value: 'community', label: 'Community' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'other', label: 'Other' },
]

// =========================================================================
// LEAVE TYPES
// =========================================================================
export const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'study', label: 'Study Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other' },
]

// =========================================================================
// STATUS TYPES
// =========================================================================
export const TEACHER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'retired', label: 'Retired' },
]

export const STUDENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'suspended', label: 'Suspended' },
]

export const USER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

// =========================================================================
// ACADEMIC TERMS
// =========================================================================
export const TERMS = [
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
]

// =========================================================================
// DAYS OF WEEK
// =========================================================================
export const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

export const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
}

// =========================================================================
// TIME SLOTS
// =========================================================================
export const TIME_SLOTS = [
  '08:00', '08:45', '09:30', '10:15', '11:00', '11:45',
  '12:30', '13:15', '14:00', '14:45', '15:30', '16:15',
]

// =========================================================================
// PAGINATION
// =========================================================================
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// =========================================================================
// FILE UPLOAD
// =========================================================================
export const MAX_UPLOAD_SIZE_MB = 5
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'image/jpeg', 'image/png']

// =========================================================================
// THEME
// =========================================================================
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
}

// =========================================================================
// STORAGE KEYS
// =========================================================================
export const STORAGE_KEYS = {
  TOKEN: 'hns_access_token',
  REFRESH_TOKEN: 'hns_refresh_token',
  USER: 'hns_user',
  THEME: 'hns_theme',
  SETTINGS: 'hns_settings',
}