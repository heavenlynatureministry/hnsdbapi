import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import attendanceAPI from '../../api/attendance'
import classesAPI from '../../api/classes'
import api from '../../api/axios'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Badge from '../../components/common/Badge'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { 
  ClipboardCheck, Users, CheckCircle, XCircle, 
  Clock, AlertTriangle, BarChart3, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'

const CLASS_PLACEHOLDER = [{ value: '', label: '-- Select Class --' }]

function AttendancePage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceData, setAttendanceData] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [classOptions, setClassOptions] = useState(CLASS_PLACEHOLDER)

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    updatePageTitle('Attendance Management')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Attendance' }])
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const response = await classesAPI.getAll({ status: 'active' })
      let classesArray = response?.data || response || []
      if (!Array.isArray(classesArray)) {
        classesArray = classesArray?.classes || classesArray?.data || []
      }

      if (classesArray.length > 0) {
        const options = classesArray.map(cls => ({
          value: cls._id || cls.id || '',
          label: cls.class_name || cls.name || 
                 `${cls.class_level || ''} ${cls.class_name || ''}`.trim() ||
                 'Unknown Class',
        })).filter(opt => opt.value && opt.label)
        setClassOptions([...CLASS_PLACEHOLDER, ...options])
      } else {
        setClassOptions(CLASS_PLACEHOLDER)
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      setClassOptions(CLASS_PLACEHOLDER)
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleLoadAttendance = async () => {
    if (!selectedClass) {
      toast.error('Please select a class')
      return
    }
    
    setLoading(true)
    setAttendanceData(null)
    
    try {
      const response = await attendanceAPI.getByClass(selectedClass, { date: selectedDate })
      
      if (response?.success && response.data) {
        setAttendanceData({
          class_name: response.data.class_name || 'Unknown',
          date: selectedDate,
          total_students: response.data.students?.length || 0,
          statistics: response.data.statistics || {
            present: 0, absent: 0, excused: 0, late: 0, unmarked: 0,
          },
          attendance_rate: response.data.attendance_rate || 0,
          students: (response.data.students || []).map(s => ({
            student_id: s.student_id || s._id,
            student_name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            status: s.status || 'unmarked',
          })),
        })
      } else {
        toast.error('No attendance data found for this class')
        setAttendanceData(null)
      }
    } catch (error) {
      console.error('Failed to load attendance:', error)
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to load attendance')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAttendance = async () => {
    if (!selectedClass || !selectedDate) return
    setDeleting(true)
    try {
      await api.delete(`/attendance/class/${selectedClass}/date/${selectedDate}`)
      toast.success('Attendance records deleted for this date')
      setShowDeleteDialog(false)
      setAttendanceData(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete attendance')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = { present: 'success', absent: 'danger', excused: 'warning', late: 'info', unmarked: 'gray' }
    const labels = { present: 'Present', absent: 'Absent', excused: 'Excused', late: 'Late', unmarked: 'Not Marked' }
    const safeStatus = typeof status === 'string' ? status : ''
    return <Badge variant={variants[safeStatus] || 'gray'}>{labels[safeStatus] || status || 'N/A'}</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Attendance Management"
        subtitle="Mark and track daily student attendance"
        actions={
          <div className="flex gap-2">
            <Link to="/attendance/report" className="btn btn-secondary">
              <ClipboardCheck size={18} /> View Reports
            </Link>
            <Link to="/attendance/analytics" className="btn btn-secondary">
              <BarChart3 size={18} /> Analytics
            </Link>
          </div>
        }
      />

      {/* Class & Date Selector */}
      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <FormSelect
              label="Select Class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              options={classOptions}
              disabled={loadingClasses}
              placeholder={loadingClasses ? 'Loading classes...' : '-- Select Class --'}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="form-label">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
            />
          </div>
          <Button
            onClick={handleLoadAttendance}
            variant="primary"
            disabled={!selectedClass}
            loading={loading}
            icon={ClipboardCheck}
          >
            Load Attendance
          </Button>
          {attendanceData && (
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="danger"
              loading={deleting}
              icon={Trash2}
            >
              Delete Records
            </Button>
          )}
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {/* Attendance Summary */}
      {attendanceData && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Present', value: attendanceData.statistics.present, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
              { label: 'Absent', value: attendanceData.statistics.absent, icon: XCircle, color: 'bg-red-100 text-red-600' },
              { label: 'Excused', value: attendanceData.statistics.excused, icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600' },
              { label: 'Late', value: attendanceData.statistics.late, icon: Clock, color: 'bg-blue-100 text-blue-600' },
              { label: 'Rate', value: `${attendanceData.attendance_rate}%`, icon: ClipboardCheck, color: 'bg-purple-100 text-purple-600' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Students List */}
          <Card
            title={`${attendanceData.class_name} - ${new Date(attendanceData.date).toLocaleDateString()}`}
            actions={
              <Link to={`/attendance/mark/${selectedClass}`} className="btn btn-primary btn-sm">
                <ClipboardCheck size={14} /> Mark Attendance
              </Link>
            }
          >
            {attendanceData.students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Students"
                description="No students found in this class."
              />
            ) : (
              <div className="space-y-2">
                {attendanceData.students.map((student) => (
                  <div
                    key={student.student_id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-medium text-sm">
                        {student.student_name?.charAt(0)}
                      </div>
                      <span className="font-medium text-sm">{student.student_name}</span>
                    </div>
                    {getStatusBadge(student.status)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {!loading && !attendanceData && (
        <EmptyState
          icon={ClipboardCheck}
          title="Select a Class"
          description="Choose a class and date to view attendance records."
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAttendance}
        title="Delete Attendance Records"
        message={`Are you sure you want to delete ALL attendance records for this class on ${new Date(selectedDate).toLocaleDateString()}? This action cannot be undone.`}
        confirmText="Delete All Records"
        variant="danger"
      />
    </div>
  )
}

export default AttendancePage
