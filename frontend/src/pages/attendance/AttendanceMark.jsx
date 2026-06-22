import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import attendanceAPI from '../../api/attendance'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { ArrowLeft, Save, CheckCircle, XCircle, AlertTriangle, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'

function AttendanceMark() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [classInfo, setClassInfo] = useState(null)
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    updatePageTitle('Mark Attendance')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Attendance', path: '/attendance' },
      { label: 'Mark' },
    ])
    fetchAttendanceData()
  }, [classId])

  const fetchAttendanceData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch class info and students
      const response = await attendanceAPI.getByClass(classId, { date: attendanceDate })
      
      if (response?.success) {
        setClassInfo({
          class_name: response.data?.class_name || 'Unknown',
          class_level: response.data?.class_level || '',
          total_students: response.data?.students?.length || 0,
        })
        
        // Map students with their current attendance status
        const studentList = (response.data?.students || []).map(s => ({
          student_id: s.student_id || s._id,
          student_name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          gender: s.gender || '',
          status: s.attendance_status || null,
          notes: s.attendance_notes || '',
        }))
        
        setStudents(studentList)
      } else {
        // If API fails, try getting today's attendance
        const todayResponse = await attendanceAPI.getToday({ class_id: classId })
        if (todayResponse?.success) {
          setClassInfo({
            class_name: todayResponse.data?.class_name || 'Unknown',
            class_level: todayResponse.data?.class_level || '',
            total_students: todayResponse.data?.students?.length || 0,
          })
          
          const studentList = (todayResponse.data?.students || []).map(s => ({
            student_id: s.student_id || s._id,
            student_name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            gender: s.gender || '',
            status: s.attendance_status || null,
            notes: s.attendance_notes || '',
          }))
          
          setStudents(studentList)
        } else {
          setError('Failed to load students')
          toast.error('Failed to load class data')
        }
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error)
      setError('Failed to load attendance data')
      toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const setStatus = (studentId, status) => {
    setStudents(prev =>
      prev.map(s =>
        s.student_id === studentId
          ? { ...s, status: s.status === status ? null : status }
          : s
      )
    )
  }

  const setNote = (studentId, notes) => {
    setStudents(prev =>
      prev.map(s => (s.student_id === studentId ? { ...s, notes } : s))
    )
  }

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })))
  }

  const handleSubmit = async () => {
    const unmarked = students.filter(s => !s.status)
    if (unmarked.length > 0) {
      toast.error(`${unmarked.length} student(s) not marked. Please mark all students.`)
      return
    }

    setSaving(true)
    try {
      const attendanceData = students.map(s => ({
        student_id: s.student_id,
        status: s.status,
        notes: s.notes || '',
      }))

      const payload = {
        class_id: classId,
        date: attendanceDate,
        attendance_data: attendanceData,
      }

      const response = await attendanceAPI.bulkMark(payload)

      if (response?.success || response) {
        const counts = { present: 0, absent: 0, excused: 0, late: 0 }
        students.forEach(s => counts[s.status]++)
        toast.success(
          `Attendance saved! Present: ${counts.present}, Absent: ${counts.absent}, Excused: ${counts.excused}, Late: ${counts.late}`
        )
        navigate('/attendance')
      } else {
        toast.error(response?.message || 'Failed to save attendance')
      }
    } catch (error) {
      if (error.status === 422) {
        toast.error('Invalid attendance data. Please check and try again.')
      } else if (error.status === 409) {
        toast.error('Attendance already marked for this date. Please edit instead.')
      } else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to save attendance')
      }
      console.error('Attendance save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const statusCounts = { present: 0, absent: 0, excused: 0, late: 0, unmarked: 0 }
  students.forEach(s => {
    if (s.status) statusCounts[s.status]++
    else statusCounts.unmarked++
  })

  const statusButtons = [
    { status: 'present', label: 'Present', icon: CheckCircle, color: 'bg-green-500 hover:bg-green-600', activeColor: 'ring-green-500' },
    { status: 'absent', label: 'Absent', icon: XCircle, color: 'bg-red-500 hover:bg-red-600', activeColor: 'ring-red-500' },
    { status: 'excused', label: 'Excused', icon: AlertTriangle, color: 'bg-yellow-500 hover:bg-yellow-600', activeColor: 'ring-yellow-500' },
    { status: 'late', label: 'Late', icon: Clock, color: 'bg-blue-500 hover:bg-blue-600', activeColor: 'ring-blue-500' },
  ]

  if (loading) return <LoadingSpinner fullScreen />

  if (error && students.length === 0) {
    return (
      <EmptyState
        icon={<Users size={48} />}
        title="No Students Found"
        description={error}
        action={
          <Button onClick={fetchAttendanceData} variant="primary">
            Retry
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <PageHeader
        title={`Mark Attendance - ${classInfo?.class_name || 'Class'}`}
        subtitle={`${classInfo?.total_students || students.length} students`}
        actions={
          <button onClick={() => navigate('/attendance')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      {/* Status Summary */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <label className="form-label mb-0">Date:</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="form-input w-auto"
            />
          </div>
          <button onClick={markAllPresent} className="btn btn-secondary btn-sm">
            Mark All Present
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusButtons.map((btn) => (
            <div key={btn.status} className="flex items-center gap-1 text-sm">
              <btn.icon
                size={16}
                className={
                  btn.status === 'present'
                    ? 'text-green-600'
                    : btn.status === 'absent'
                    ? 'text-red-600'
                    : btn.status === 'excused'
                    ? 'text-yellow-600'
                    : 'text-blue-600'
                }
              />
              <span className="capitalize">{btn.status}:</span>
              <span className="font-bold">{statusCounts[btn.status]}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-500">Unmarked:</span>
            <span className="font-bold text-orange-600">{statusCounts.unmarked}</span>
          </div>
        </div>
      </Card>

      {/* Students Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {students.map((student) => (
          <Card
            key={student.student_id}
            className={`transition-all ${
              student.status
                ? 'ring-2 ' + statusButtons.find(b => b.status === student.status)?.activeColor
                : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-bold">
                {student.student_name?.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-sm">{student.student_name}</p>
                <p className="text-xs text-gray-500">{student.gender}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {statusButtons.map((btn) => (
                <button
                  key={btn.status}
                  onClick={() => setStatus(student.student_id, btn.status)}
                  className={`flex-1 p-1.5 rounded text-xs font-medium text-white transition-all ${
                    student.status === btn.status
                      ? btn.color + ' scale-105'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                  }`}
                  title={btn.label}
                >
                  <btn.icon size={14} className="mx-auto" />
                </button>
              ))}
            </div>
            {(student.status === 'absent' || student.status === 'excused') && (
              <input
                type="text"
                value={student.notes}
                onChange={(e) => setNote(student.student_id, e.target.value)}
                className="form-input text-xs mt-2"
                placeholder="Reason (optional)..."
              />
            )}
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          variant="primary"
          size="lg"
          loading={saving}
          icon={<Save size={18} />}
          disabled={statusCounts.unmarked > 0}
        >
          {statusCounts.unmarked > 0
            ? `Save Attendance (${statusCounts.unmarked} unmarked)`
            : 'Save Attendance'}
        </Button>
      </div>
    </div>
  )
}

export default AttendanceMark
