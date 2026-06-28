import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'
import PrivateRoute from './PrivateRoute'
import RoleRoute, { AdminRoute, TeacherRoute, AccountantRoute } from './RoleRoute'
import MainLayout from '../components/layout/MainLayout'
import AuthLayout from '../components/layout/AuthLayout'

// =========================================================================
// LAZY LOADED PAGES
// =========================================================================

// Auth Pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'))

// Dashboard
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'))

// Students
const StudentsList = lazy(() => import('../pages/students/StudentsList'))
const StudentDetail = lazy(() => import('../pages/students/StudentDetail'))
const StudentForm = lazy(() => import('../pages/students/StudentForm'))
const StudentImport = lazy(() => import('../pages/students/StudentImport'))

// Teachers
const TeachersList = lazy(() => import('../pages/teachers/TeachersList'))
const TeacherDetail = lazy(() => import('../pages/teachers/TeacherDetail'))
const TeacherForm = lazy(() => import('../pages/teachers/TeacherForm'))
const TeacherWorkload = lazy(() => import('../pages/teachers/TeacherWorkload'))

// Classes
const ClassesList = lazy(() => import('../pages/classes/ClassesList'))
const ClassDetail = lazy(() => import('../pages/classes/ClassDetail'))
const ClassForm = lazy(() => import('../pages/classes/ClassForm'))
const ClassSchedule = lazy(() => import('../pages/classes/ClassSchedule'))

// Attendance
const AttendancePage = lazy(() => import('../pages/attendance/AttendancePage'))
const AttendanceMark = lazy(() => import('../pages/attendance/AttendanceMark'))
const AttendanceReport = lazy(() => import('../pages/attendance/AttendanceReport'))
const AttendanceAnalytics = lazy(() => import('../pages/attendance/AttendanceAnalytics'))

// Exams
const ExamsList = lazy(() => import('../pages/exams/ExamsList'))
const ExamDetail = lazy(() => import('../pages/exams/ExamDetail'))
const ExamForm = lazy(() => import('../pages/exams/ExamForm'))
const ResultsEntry = lazy(() => import('../pages/exams/ResultsEntry'))
const ReportCard = lazy(() => import('../pages/exams/ReportCard'))
const ExamAnalytics = lazy(() => import('../pages/exams/ExamAnalytics'))

// Financial
const TransactionsList = lazy(() => import('../pages/financial/TransactionsList'))
const TransactionForm = lazy(() => import('../pages/financial/TransactionForm'))
const FeeStructures = lazy(() => import('../pages/financial/FeeStructures'))
const PaymentsPage = lazy(() => import('../pages/financial/PaymentsPage'))
const BudgetPage = lazy(() => import('../pages/financial/BudgetPage'))
const FinancialReports = lazy(() => import('../pages/financial/FinancialReports'))

// School
const SchoolInfo = lazy(() => import('../pages/school/SchoolInfo'))
const AcademicCalendar = lazy(() => import('../pages/school/AcademicCalendar'))
const EventsPage = lazy(() => import('../pages/school/EventsPage'))
const BoardMembers = lazy(() => import('../pages/school/BoardMembers'))
const SettingsPage = lazy(() => import('../pages/school/SettingsPage'))

// Reports
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'))
const AcademicReport = lazy(() => import('../pages/reports/AcademicReport'))
const AttendanceReportPage = lazy(() => import('../pages/reports/AttendanceReport'))
const FinancialReport = lazy(() => import('../pages/reports/FinancialReport'))
const EnrollmentReport = lazy(() => import('../pages/reports/EnrollmentReport'))
const AnnualReport = lazy(() => import('../pages/reports/AnnualReport'))

// Users (Admin)
const UsersList = lazy(() => import('../pages/users/UsersList'))
const UserForm = lazy(() => import('../pages/users/UserForm'))
const UserProfile = lazy(() => import('../pages/users/UserProfile'))

// =========================================================================
// LOADING COMPONENT
// =========================================================================
function PageLoader() {
  return <LoadingSpinner fullScreen message="Loading page..." />
}

// =========================================================================
// ROUTE CONFIGURATION
// =========================================================================
function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ============================================================= */}
        {/* PUBLIC ROUTES */}
        {/* ============================================================= */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>

        {/* ============================================================= */}
        {/* PROTECTED ROUTES */}
        {/* ============================================================= */}
        <Route element={<PrivateRoute />}>
          <Route element={<MainLayout />}>
            {/* Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* --------------------------------------------------------- */}
            {/* STUDENTS */}
            {/* --------------------------------------------------------- */}
            <Route path="/students">
              <Route index element={<StudentsList />} />
              <Route path="new" element={<StudentForm />} />
              <Route path="import" element={<StudentImport />} />
              <Route path=":id" element={<StudentDetail />} />
              <Route path=":id/edit" element={<StudentForm />} />
            </Route>

            {/* --------------------------------------------------------- */}
            {/* TEACHERS */}
            {/* --------------------------------------------------------- */}
            <Route path="/teachers">
              <Route index element={<TeachersList />} />
              <Route path="new" element={<TeacherForm />} />
              <Route path=":id" element={<TeacherDetail />} />
              <Route path=":id/edit" element={<TeacherForm />} />
              <Route path=":id/workload" element={<TeacherWorkload />} />
            </Route>

            {/* --------------------------------------------------------- */}
            {/* CLASSES */}
            {/* --------------------------------------------------------- */}
            <Route path="/classes">
              <Route index element={<ClassesList />} />
              <Route path="new" element={<ClassForm />} />
              <Route path=":id" element={<ClassDetail />} />
              <Route path=":id/edit" element={<ClassForm />} />
              <Route path=":id/schedule" element={<ClassSchedule />} />
            </Route>

            {/* --------------------------------------------------------- */}
            {/* ATTENDANCE */}
            {/* --------------------------------------------------------- */}
            <Route path="/attendance">
              <Route index element={<AttendancePage />} />
              <Route path="mark/:classId" element={<AttendanceMark />} />
              <Route path="report" element={<AttendanceReport />} />
              <Route path="analytics" element={<AttendanceAnalytics />} />
            </Route>

            {/* --------------------------------------------------------- */}
            {/* EXAMS */}
            {/* --------------------------------------------------------- */}
            <Route path="/exams">
              <Route index element={<ExamsList />} />
              <Route path="new" element={<ExamForm />} />
              <Route path=":id" element={<ExamDetail />} />
              <Route path=":id/results" element={<ResultsEntry />} />
              <Route path="report-cards" element={<ReportCard />} />
              <Route path="analytics" element={<ExamAnalytics />} />
            </Route>

            {/* --------------------------------------------------------- */}
            {/* FINANCIAL - Available to admin and accountant */}
            {/* --------------------------------------------------------- */}
            <Route element={<AccountantRoute />}>
              <Route path="/financial">
                <Route index element={<TransactionsList />} />
                <Route path="new" element={<TransactionForm />} />
                <Route path="edit/:id" element={<TransactionForm />} />
                <Route path="fees" element={<FeeStructures />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="budget" element={<BudgetPage />} />
                <Route path="reports" element={<FinancialReports />} />
              </Route>
            </Route>

            {/* --------------------------------------------------------- */}
            {/* SCHOOL (ADMIN ONLY) */}
            {/* --------------------------------------------------------- */}
            <Route element={<AdminRoute />}>
              <Route path="/school">
                <Route path="info" element={<SchoolInfo />} />
                <Route path="calendar" element={<AcademicCalendar />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="board" element={<BoardMembers />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* --------------------------------------------------------- */}
            {/* REPORTS */}
            {/* --------------------------------------------------------- */}
            <Route path="/reports">
              <Route index element={<ReportsPage />} />
              <Route path="academic" element={<AcademicReport />} />
              <Route path="attendance" element={<AttendanceReportPage />} />
              <Route path="financial" element={<FinancialReport />} />
              <Route path="enrollment" element={<EnrollmentReport />} />
              <Route path="annual" element={<AnnualReport />} />
            </Route>

            {/* --------------------------------------------------------- */}
            {/* USERS (ADMIN ONLY) */}
            {/* --------------------------------------------------------- */}
            <Route element={<AdminRoute />}>
              <Route path="/users">
                <Route index element={<UsersList />} />
                <Route path="new" element={<UserForm />} />
                <Route path=":id/edit" element={<UserForm />} />
              </Route>
            </Route>

            {/* --------------------------------------------------------- */}
            {/* PROFILE */}
            {/* --------------------------------------------------------- */}
            <Route path="/profile" element={<UserProfile />} />
          </Route>
        </Route>

        {/* ============================================================= */}
        {/* 404 NOT FOUND */}
        {/* ============================================================= */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
              <div className="text-center animate-fade-in-up">
                <div className="text-8xl font-bold text-gray-200 dark:text-gray-700">404</div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-4">Page Not Found</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
                  The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                <div className="mt-6 space-x-3">
                  <a href="/dashboard" className="btn btn-primary inline-flex">Go to Dashboard</a>
                  <button onClick={() => window.history.back()} className="btn btn-secondary inline-flex">Go Back</button>
                </div>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  )
}

// =========================================================================
// ROUTE METADATA
// =========================================================================
export const routeMetadata = {
  '/dashboard': { title: 'Dashboard', icon: 'LayoutDashboard' },
  '/students': { title: 'Students', icon: 'GraduationCap' },
  '/students/new': { title: 'Add Student', parent: 'Students' },
  '/students/import': { title: 'Import Students', parent: 'Students' },
  '/teachers': { title: 'Teachers', icon: 'Users' },
  '/teachers/new': { title: 'Add Teacher', parent: 'Teachers' },
  '/classes': { title: 'Classes', icon: 'School' },
  '/classes/new': { title: 'Add Class', parent: 'Classes' },
  '/attendance': { title: 'Attendance', icon: 'ClipboardCheck' },
  '/attendance/report': { title: 'Attendance Report', parent: 'Attendance' },
  '/attendance/analytics': { title: 'Attendance Analytics', parent: 'Attendance' },
  '/exams': { title: 'Examinations', icon: 'FileText' },
  '/exams/new': { title: 'Create Exam', parent: 'Exams' },
  '/exams/report-cards': { title: 'Report Cards', parent: 'Exams' },
  '/exams/analytics': { title: 'Exam Analytics', parent: 'Exams' },
  '/financial': { title: 'Financial', icon: 'DollarSign' },
  '/financial/new': { title: 'New Transaction', parent: 'Financial' },
  '/financial/edit/:id': { title: 'Edit Transaction', parent: 'Financial' },
  '/financial/fees': { title: 'Fee Structures', parent: 'Financial' },
  '/financial/payments': { title: 'Payments', parent: 'Financial' },
  '/financial/budget': { title: 'Budget', parent: 'Financial' },
  '/financial/reports': { title: 'Financial Reports', parent: 'Financial' },
  '/school/info': { title: 'School Information', icon: 'Building2' },
  '/school/calendar': { title: 'Academic Calendar', parent: 'School' },
  '/school/events': { title: 'Events', parent: 'School' },
  '/school/board': { title: 'Board Members', parent: 'School' },
  '/school/settings': { title: 'Settings', parent: 'School' },
  '/reports': { title: 'Reports', icon: 'BarChart3' },
  '/reports/academic': { title: 'Academic Report', parent: 'Reports' },
  '/reports/attendance': { title: 'Attendance Report', parent: 'Reports' },
  '/reports/financial': { title: 'Financial Report', parent: 'Reports' },
  '/reports/enrollment': { title: 'Enrollment Report', parent: 'Reports' },
  '/reports/annual': { title: 'Annual Report', parent: 'Reports' },
  '/users': { title: 'Users', icon: 'Shield' },
  '/profile': { title: 'My Profile', icon: 'UserCircle' },
}

export default AppRoutes
