import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { 
  ArrowLeft, Edit, Users, GraduationCap, DoorOpen, 
  Calendar, BookOpen, UserCheck, ClipboardCheck, BarChart3 
} from 'lucide-react'
import toast from 'react-hot-toast'

function ClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [classData, setClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    updatePageTitle('Class Details')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Classes', path: '/classes' }, { label: 'Details' }])
    
    setTimeout(() => {
      setClassData({
        _id: id, class_name: 'P5', class_level: 'primary', academic_year: '2024/2025',
        max_capacity: 25, current_enrollment: 22, status: 'active',
        teacher_name: 'John Doe', teacher_id: 't1',
        classroom_number: 'Room 8', classroom_id: 'r8',
        schedule: {
          monday: [{ subject: 'English', start_time: '08:00', end_time: '08:45' }, { subject: 'Mathematics', start_time: '08:45', end_time: '09:30' }],
          tuesday: [{ subject: 'Science', start_time: '08:00', end_time: '08:45' }, { subject: 'Social Studies', start_time: '08:45', end_time: '09:30' }],
          wednesday: [{ subject: 'English', start_time: '08:00', end_time: '08:45' }, { subject: 'Mathematics', start_time: '08:45', end_time: '09:30' }],
          thursday: [{ subject: 'Science', start_time: '08:00', end_time: '08:45' }, { subject: 'Religious Education', start_time: '08:45', end_time: '09:30' }],
          friday: [{ subject: 'Physical Education', start_time: '08:00', end_time: '08:45' }, { subject: 'Creative Arts', start_time: '08:45', end_time: '09:30' }],
        },
        students: [
          { _id: 's1', first_name: 'Abraham', last_name: 'Kuol', gender: 'Male', age: 10, status: 'active' },
          { _id: 's2', first_name: 'Achol', last_name: 'Deng', gender: 'Female', age: 9, status: 'active' },
          { _id: 's3', first_name: 'Bol', last_name: 'Malek', gender: 'Male', age: 10, status: 'active' },
          { _id: 's4', first_name: 'Aya', last_name: 'Dut', gender: 'Female', age: 9, status: 'active' },
          { _id: 's5', first_name: 'Peter', last_name: 'Garang', gender: 'Male', age: 11, status: 'active' },
        ],
        subjects: [
          { subject_name: 'English', teacher_name: 'Mary Smith' },
          { subject_name: 'Mathematics', teacher_name: 'John Doe' },
          { subject_name: 'Science', teacher_name: 'James Johnson' },
          { subject_name: 'Social Studies', teacher_name: 'Rebecca Williams' },
        ],
        attendance_rate: 88,
      })
      setLoading(false)
    }, 500)
  }, [id])

  if (loading) return <LoadingSpinner fullScreen />
  if (!classData) return null

  const occupancyRate = ((classData.current_enrollment / classData.max_capacity) * 100).toFixed(0)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

  const tabs = [
    { id: 'info', label: 'Information', icon: BookOpen },
    { id: 'students', label: `Students (${classData.students.length})`, icon: Users },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'subjects', label: 'Subjects', icon: GraduationCap },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title={`${classData.class_name} - ${classData.class_level}`}
        subtitle={`${classData.academic_year} • ${classData.current_enrollment} students`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/classes')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>
            <Link to={`/classes/${id}/edit`} className="btn btn-primary"><Edit size={18} /> Edit</Link>
          </div>
        }
      />

      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Students', value: `${classData.current_enrollment}/${classData.max_capacity}`, icon: Users, color: 'bg-blue-100 text-blue-600' },
          { label: 'Teacher', value: classData.teacher_name || 'N/A', icon: UserCheck, color: 'bg-green-100 text-green-600', isText: true },
          { label: 'Classroom', value: classData.classroom_number || 'N/A', icon: DoorOpen, color: 'bg-purple-100 text-purple-600', isText: true },
          { label: 'Attendance', value: `${classData.attendance_rate}%`, icon: ClipboardCheck, color: 'bg-orange-100 text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className={`stat-card-value ${stat.isText ? 'text-base' : ''}`}>{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Occupancy */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Class Occupancy</span>
          <span className="text-sm font-bold">{occupancyRate}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div className={`h-3 rounded-full ${occupancyRate >= 90 ? 'bg-red-500' : occupancyRate >= 75 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(occupancyRate, 100)}%` }} />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="space-y-2">
          {classData.students.map((student) => (
            <Link key={student._id} to={`/students/${student._id}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-medium text-sm">
                  {student.first_name?.[0]}{student.last_name?.[0]}
                </div>
                <span className="font-medium text-sm">{student.first_name} {student.last_name}</span>
              </div>
              <span className="text-xs text-gray-500">{student.gender} • {student.age} yrs</span>
            </Link>
          ))}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {days.map((day) => (
            <Card key={day} title={day.charAt(0).toUpperCase() + day.slice(1)} className="text-center">
              {classData.schedule[day]?.length > 0 ? (
                <div className="space-y-2">
                  {classData.schedule[day].map((period, i) => (
                    <div key={i} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium text-xs">{period.subject}</p>
                      <p className="text-xs text-gray-500">{period.start_time} - {period.end_time}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 py-4">No classes</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {classData.subjects.map((subject, i) => (
            <Card key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="font-medium text-sm">{subject.subject_name}</p>
                  <p className="text-xs text-gray-500">{subject.teacher_name}</p>
                </div>
              </div>
              <Badge variant="info">Active</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ClassDetail