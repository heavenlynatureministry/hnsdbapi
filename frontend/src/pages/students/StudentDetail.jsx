import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import studentsAPI from '../../api/students'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { 
  ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, 
  Users, Heart, Activity, BookOpen, GraduationCap,
  ClipboardCheck, DollarSign
} from 'lucide-react'
import toast from 'react-hot-toast'

function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    updatePageTitle('Student Details')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Students', path: '/students' }, { label: 'Student Details' }])
    
    const timer = setTimeout(() => {
      setStudent({
        _id: id, student_id_number: 'HNS-2024-0001',
        first_name: 'Abraham', last_name: 'Kuol', middle_name: '',
        gender: 'Male', date_of_birth: '2016-03-10', age: 8,
        place_of_birth: 'Juba', nationality: 'South Sudanese',
        student_type: 'street', enrollment_date: '2020-01-15',
        current_class_id: 'c6', class_name: 'P3', class_level: 'primary',
        status: 'active', address: 'Juba, South Sudan',
        medical_notes: 'None', special_needs: '',
        guardians: [
          { guardian_id: 'g1', first_name: 'Michael', last_name: 'Kuol', relationship: 'Father', phone_number: '+211 912 987 654', email: 'michael@example.com', is_primary_contact: true },
          { guardian_id: 'g2', first_name: 'Sarah', last_name: 'Kuol', relationship: 'Mother', phone_number: '+211 912 111 222', email: '', is_primary_contact: false },
        ],
        attendance: { attendance_rate: 92, present: 45, absent: 4, total: 49 },
        academic_performance: {
          overall: { percentage: 78, grade: 'B' },
          subjects: [
            { subject_name: 'English', average_percentage: 82, grade: 'A' },
            { subject_name: 'Mathematics', average_percentage: 75, grade: 'B' },
            { subject_name: 'Science', average_percentage: 70, grade: 'B' },
            { subject_name: 'Social Studies', average_percentage: 85, grade: 'A' },
          ],
        },
        recent_payments: [
          { amount_paid: 5000, payment_date: '2024-01-15', receipt_number: 'RCP-001' },
          { amount_paid: 5000, payment_date: '2024-02-15', receipt_number: 'RCP-002' },
        ],
      })
      setLoading(false)
    }, 500)
  }, [id])

  const getStatusBadge = (status) => {
    const variants = { active: 'success', inactive: 'danger', graduated: 'info', transferred: 'warning' }
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>
  }

  if (loading) return <LoadingSpinner fullScreen />
  if (!student) return null

  const tabs = [
    { id: 'info', label: 'Information', icon: BookOpen },
    { id: 'guardians', label: 'Guardians', icon: Users },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'payments', label: 'Payments', icon: DollarSign },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title={`${student.first_name} ${student.last_name}`}
        subtitle={student.student_id_number}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/students')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>
            <Link to={`/students/${id}/edit`} className="btn btn-primary"><Edit size={18} /> Edit</Link>
          </div>
        }
      />

      {/* Profile Header */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 text-3xl font-bold flex-shrink-0">
            {student.first_name?.[0]}{student.last_name?.[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">{student.first_name} {student.last_name}</h2>
              {getStatusBadge(student.status)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500"><GraduationCap size={16} /> {student.class_name} ({student.class_level})</div>
              <div className="flex items-center gap-2 text-sm text-gray-500"><Calendar size={16} /> {student.age} years old</div>
              <div className="flex items-center gap-2 text-sm text-gray-500"><MapPin size={16} /> {student.place_of_birth || 'N/A'}</div>
              <div className="flex items-center gap-2 text-sm text-gray-500"><Calendar size={16} /> Enrolled {new Date(student.enrollment_date).toLocaleDateString()}</div>
            </div>
          </div>
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

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Personal Information">
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Gender:</span> {student.gender}</p>
              <p><span className="text-gray-500">Date of Birth:</span> {new Date(student.date_of_birth).toLocaleDateString()}</p>
              <p><span className="text-gray-500">Nationality:</span> {student.nationality}</p>
              <p><span className="text-gray-500">Address:</span> {student.address || 'N/A'}</p>
            </div>
          </Card>
          <Card title="Enrollment Details">
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Student Type:</span> <Badge variant="info">{student.student_type}</Badge></p>
              <p><span className="text-gray-500">Class:</span> {student.class_name}</p>
              <p><span className="text-gray-500">Enrolled:</span> {new Date(student.enrollment_date).toLocaleDateString()}</p>
            </div>
          </Card>
          <Card title="Medical Information">
            <p className="text-sm"><span className="text-gray-500">Medical Notes:</span> {student.medical_notes || 'None'}</p>
            <p className="text-sm mt-2"><span className="text-gray-500">Special Needs:</span> {student.special_needs || 'None'}</p>
          </Card>
        </div>
      )}

      {/* Guardians Tab */}
      {activeTab === 'guardians' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {student.guardians?.map((g) => (
            <Card key={g.guardian_id}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{g.first_name} {g.last_name}</h4>
                {g.is_primary_contact && <Badge variant="success">Primary</Badge>}
              </div>
              <p className="text-sm text-gray-500">{g.relationship}</p>
              <div className="space-y-1 mt-2">
                <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-gray-400" /> {g.phone_number}</div>
                {g.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-gray-400" /> {g.email}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Academic Tab */}
      {activeTab === 'academic' && (
        <div className="space-y-4">
          <Card>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary-600">{student.academic_performance?.overall?.percentage}%</p>
              <Badge variant={student.academic_performance?.overall?.grade === 'A' ? 'success' : 'info'}>
                Grade {student.academic_performance?.overall?.grade}
              </Badge>
            </div>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {student.academic_performance?.subjects?.map((subject, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{subject.subject_name}</h4>
                  <Badge variant={subject.grade === 'A' ? 'success' : 'info'}>{subject.grade}</Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div className="h-2 rounded-full bg-primary-600" style={{ width: `${subject.average_percentage}%` }} />
                </div>
                <p className="text-sm text-gray-500 mt-1">{subject.average_percentage}%</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <Card>
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-primary-600">{student.attendance?.attendance_rate}%</p>
            <p className="text-sm text-gray-500">Attendance Rate</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-bold text-green-600">{student.attendance?.present}</p><p className="text-xs text-gray-500">Present</p></div>
            <div><p className="text-2xl font-bold text-red-600">{student.attendance?.absent}</p><p className="text-xs text-gray-500">Absent</p></div>
            <div><p className="text-2xl font-bold text-gray-600">{student.attendance?.total}</p><p className="text-xs text-gray-500">Total Days</p></div>
          </div>
        </Card>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-3">
          {student.recent_payments?.map((payment, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SSP {payment.amount_paid?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Receipt: {payment.receipt_number}</p>
                </div>
                <span className="text-sm text-gray-500">{new Date(payment.payment_date).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
          <p className="text-sm text-gray-500 text-center">
            Total Paid: SSP {student.recent_payments?.reduce((s, p) => s + (p.amount_paid || 0), 0).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}

export default StudentDetail