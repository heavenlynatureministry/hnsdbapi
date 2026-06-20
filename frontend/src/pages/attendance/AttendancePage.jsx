import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Badge from '../../components/common/Badge'
import { 
  ClipboardCheck, Users, CheckCircle, XCircle, 
  Clock, AlertTriangle, Calendar, ArrowRight
} from 'lucide-react'

function AttendancePage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceData, setAttendanceData] = useState(null)

  const classes = [
    { value: 'c1', label: 'Baby (Nursery)' }, { value: 'c2', label: 'Middle (Nursery)' },
    { value: 'c3', label: 'Top (Nursery)' }, { value: 'c4', label: 'P1' },
    { value: 'c5', label: 'P2' }, { value: 'c6', label: 'P3' },
    { value: 'c7', label: 'P4' }, { value: 'c8', label: 'P5' },
    { value: 'c9', label: 'P6' }, { value: 'c10', label: 'P7' }, { value: 'c11', label: 'P8' },
  ]

  useEffect(() => {
    updatePageTitle('Attendance Management')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Attendance' }])
    setTimeout(() => setLoading(false), 500)
  }, [])

  const handleLoadAttendance = () => {
    if (!selectedClass) return
    setLoading(true)
    setTimeout(() => {
      setAttendanceData({
        class_name: 'P5',
        date: selectedDate,
        total_students: 22,
        statistics: { present: 18, absent: 3, excused: 1, late: 0, unmarked: 0 },
        attendance_rate: 86.4,
        students: [
          { student_id: '1', student_name: 'Abraham Kuol', status: 'present' },
          { student_id: '2', student_name: 'Achol Deng', status: 'present' },
          { student_id: '3', student_name: 'Bol Malek', status: 'absent' },
          { student_id: '4', student_name: 'Aya Dut', status: 'present' },
          { student_id: '5', student_name: 'Peter Garang', status: 'excused' },
          { student_id: '6', student_name: 'Mary John', status: 'present' },
          { student_id: '7', student_name: 'James Lual', status: 'absent' },
          { student_id: '8', student_name: 'Sarah Nyok', status: 'late' },
        ],
      })
      setLoading(false)
    }, 600)
  }

  const getStatusBadge = (status) => {
    const variants = { present: 'success', absent: 'danger', excused: 'warning', late: 'info', unmarked: 'gray' }
    const labels = { present: 'Present', absent: 'Absent', excused: 'Excused', late: 'Late', unmarked: 'Not Marked' }
    return <Badge variant={variants[status] || 'gray'}>{labels[status] || status}</Badge>
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
              <BarChartIcon size={18} /> Analytics
            </Link>
          </div>
        }
      />

      {/* Class & Date Selector */}
      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <FormSelect label="Select Class" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} options={classes} />
          </div>
          <div className="w-full sm:w-48">
            <label className="form-label">Date</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="form-input" />
          </div>
          <Button onClick={handleLoadAttendance} variant="primary" disabled={!selectedClass} icon={<ClipboardCheck size={18} />}>
            Load Attendance
          </Button>
        </div>
      </Card>

      {/* Attendance Summary */}
      {attendanceData && (
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
          <Card title={`${attendanceData.class_name} - ${new Date(attendanceData.date).toLocaleDateString()}`} 
            actions={
              <Link to={`/attendance/mark/${selectedClass}`} className="btn btn-primary btn-sm">
                <ClipboardCheck size={14} /> Mark Attendance
              </Link>
            }
          >
            <div className="space-y-2">
              {attendanceData.students.map((student) => (
                <div key={student.student_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
          </Card>
        </>
      )}
    </div>
  )
}

// Need to import BarChart3 icon
import { BarChart3 as BarChartIcon } from 'lucide-react'

export default AttendancePage