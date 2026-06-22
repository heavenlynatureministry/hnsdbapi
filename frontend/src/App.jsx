import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './context/AuthContext'
import LoadingSpinner from './components/common/LoadingSpinner'
import PrivateRoute from './routes/PrivateRoute'
import RoleRoute from './routes/RoleRoute'
import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))

const StudentsList = lazy(() => import('./pages/students/StudentsList'))
const StudentDetail = lazy(() => import('./pages/students/StudentDetail'))
const StudentForm = lazy(() => import('./pages/students/StudentForm'))

const TeachersList = lazy(() => import('./pages/teachers/TeachersList'))
const TeacherDetail = lazy(() => import('./pages/teachers/TeacherDetail'))
const TeacherForm = lazy(() => import('./pages/teachers/TeacherForm'))

const ClassesList = lazy(() => import('./pages/classes/ClassesList'))
const ClassDetail = lazy(() => import('./pages/classes/ClassDetail'))
const ClassForm = lazy(() => import('./pages/classes/ClassForm'))

const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'))
const AttendanceMark = lazy(() => import('./pages/attendance/AttendanceMark'))
const AttendanceReport = lazy(() => import('./pages/attendance/AttendanceReport'))

const ExamsList = lazy(() => import('./pages/exams/ExamsList'))
const ExamDetail = lazy(() => import('./pages/exams/ExamDetail'))
const ExamForm = lazy(() => import('./pages/exams/ExamForm'))
const ResultsEntry = lazy(() => import('./pages/exams/ResultsEntry'))
const ReportCard = lazy(() => import('./pages/exams/ReportCard'))

const TransactionsList = lazy(() => import('./pages/financial/TransactionsList'))
const FeeStructures = lazy(() => import('./pages/financial/FeeStructures'))
const PaymentsPage = lazy(() => import('./pages/financial/PaymentsPage'))

const SchoolInfo = lazy(() => import('./pages/school/SchoolInfo'))
const AcademicCalendar = lazy(() => import('./pages/school/AcademicCalendar'))
const EventsPage = lazy(() => import('./pages/school/EventsPage'))
const SettingsPage = lazy(() => import('./pages/school/SettingsPage'))

const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'))

const UsersList = lazy(() => import('./pages/users/UsersList'))
const UserProfile = lazy(() => import('./pages/users/UserProfile'))

function App() {
  const { isAuthenticated, loading } = useAuth()

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen message="Loading application..." />
  }

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Public Auth Routes - Only when NOT authenticated */}
        {!isAuthenticated && (
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            {/* Redirect all other paths to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        )}

        {/* Protected Routes - Only when authenticated */}
        {isAuthenticated && (
          <Route element={<PrivateRoute />}>
            <Route element={<MainLayout />}>
              {/* Dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Students */}
              <Route path="/students" element={<StudentsList />} />
              <Route path="/students/new" element={<StudentForm />} />
              <Route path="/students/:id" element={<StudentDetail />} />
              <Route path="/students/:id/edit" element={<StudentForm />} />

              {/* Teachers */}
              <Route path="/teachers" element={<TeachersList />} />
              <Route path="/teachers/new" element={<TeacherForm />} />
              <Route path="/teachers/:id" element={<TeacherDetail />} />
              <Route path="/teachers/:id/edit" element={<TeacherForm />} />

              {/* Classes */}
              <Route path="/classes" element={<ClassesList />} />
              <Route path="/classes/new" element={<ClassForm />} />
              <Route path="/classes/:id" element={<ClassDetail />} />
              <Route path="/classes/:id/edit" element={<ClassForm />} />

              {/* Attendance */}
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/attendance/mark/:classId" element={<AttendanceMark />} />
              <Route path="/attendance/report" element={<AttendanceReport />} />

              {/* Exams */}
              <Route path="/exams" element={<ExamsList />} />
              <Route path="/exams/new" element={<ExamForm />} />
              <Route path="/exams/:id" element={<ExamDetail />} />
              <Route path="/exams/:id/results" element={<ResultsEntry />} />
              <Route path="/exams/report-cards" element={<ReportCard />} />

              {/* Financial */}
              <Route path="/financial" element={<TransactionsList />} />
              <Route path="/financial/fees" element={<FeeStructures />} />
              <Route path="/financial/payments" element={<PaymentsPage />} />

              {/* School */}
              <Route path="/school/info" element={<SchoolInfo />} />
              <Route path="/school/calendar" element={<AcademicCalendar />} />
              <Route path="/school/events" element={<EventsPage />} />
              <Route path="/school/settings" element={<SettingsPage />} />

              {/* Reports */}
              <Route path="/reports" element={<ReportsPage />} />

              {/* Users (Admin only) */}
              <Route element={<RoleRoute roles={['admin']} />}>
                <Route path="/users" element={<UsersList />} />
              </Route>

              {/* Profile */}
              <Route path="/profile" element={<UserProfile />} />

              {/* 404 for authenticated users */}
              <Route path="*" element={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-gray-300">404</h1>
                    <p className="text-xl text-gray-500 mt-4">Page not found</p>
                    <a href="/dashboard" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
                      Go to Dashboard
                    </a>
                  </div>
                </div>
              } />
            </Route>
          </Route>
        )}
      </Routes>
    </Suspense>
  )
}

export default App
