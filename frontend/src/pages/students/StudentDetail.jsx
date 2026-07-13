import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import studentsAPI from '../../api/students'
import financialAPI from '../../api/financial'
import examsAPI from '../../api/exams'
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
  
  // Separate state for each tab's data
  const [guardians, setGuardians] = useState([])
  const [academicData, setAcademicData] = useState(null)
  const [attendanceData, setAttendanceData] = useState(null)
  const [paymentsData, setPaymentsData] = useState([])
  const [tabLoading, setTabLoading] = useState({})

  useEffect(() => {
    updatePageTitle('Student Details')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Students', path: '/students' },
      { label: 'Student Details' },
    ])
    fetchStudent()
  }, [id])

  const fetchStudent = async () => {
    setLoading(true)
    try {
      const response = await studentsAPI.getById(id)
      if (response?.success && response.data) {
        setStudent(response.data)
      } else {
        toast.error('Failed to load student details')
        navigate('/students')
      }
    } catch (error) {
      console.error('Failed to fetch student:', error)
      toast.error('Failed to load student details')
      navigate('/students')
    } finally {
      setLoading(false)
    }
  }

  // Fetch tab data when tab changes
  useEffect(() => {
    if (!student) return
    
    const fetchTabData = async () => {
      setTabLoading(prev => ({ ...prev, [activeTab]: true }))
      try {
        switch (activeTab) {
          case 'guardians':
            await fetchGuardians()
            break
          case 'academic':
            await fetchAcademic()
            break
          case 'attendance':
            await fetchAttendance()
            break
          case 'payments':
            await fetchPayments()
            break
        }
      } finally {
        setTabLoading(prev => ({ ...prev, [activeTab]: false }))
      }
    }
    
    fetchTabData()
  }, [activeTab, student])

  const fetchGuardians = async () => {
    try {
      const response = await studentsAPI.getGuardians(id)
      if (response?.success) {
        setGuardians(response.data?.guardians || response.data || [])
      } else {
        setGuardians([])
      }
    } catch (error) {
      console.error('Failed to fetch guardians:', error)
      setGuardians([])
    }
  }

  const fetchAcademic = async () => {
    try {
      const response = await examsAPI.getStudentResults(id)
      if (response?.success && response.data) {
        // Group results by subject
        const results = response.data.results || []
        const subjectMap = {}
        results.forEach(r => {
          const subject = r.subject_name || r.exam_name || 'Unknown'
          if (!subjectMap[subject]) {
            subjectMap[subject] = { scores: [], grades: [] }
          }
          subjectMap[subject].scores.push(r.score || 0)
          subjectMap[subject].grades.push(r.grade || 'N/A')
        })
        
        const subjects = Object.entries(subjectMap).map(([name, data]) => {
          const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          const avgPct = avgScore // Assuming score is percentage, adjust if needed
          const grade = data.grades[data.grades.length - 1] || 'N/A'
          return {
            subject_name: name,
            average_percentage: Math.round(avgPct),
            grade: grade
          }
        })
        
        const overallPct = subjects.length > 0 
          ? Math.round(subjects.reduce((s, sub) => s + sub.average_percentage, 0) / subjects.length)
          : 0
        
        setAcademicData({
          overall: { percentage: overallPct, grade: _calculateGrade(overallPct) },
          subjects: subjects
        })
      } else {
        setAcademicData(null)
      }
    } catch (error) {
      console.error('Failed to fetch academic data:', error)
      setAcademicData(null)
    }
  }

  const fetchAttendance = async () => {
    try {
      const response = await studentsAPI.getAttendance(id)
      if (response?.success && response.data) {
        const records = response.data.attendance || response.data.records || response.data || []
        const present = records.filter(r => r.status === 'present' || r.status === 'late').length
        const absent = records.filter(r => r.status === 'absent').length
        const total = records.length
        setAttendanceData({
          present,
          absent,
          total,
          attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0
        })
      } else {
        setAttendanceData(null)
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
      setAttendanceData(null)
    }
  }

  const fetchPayments = async () => {
    try {
      const response = await financialAPI.getPayments({ student_id: id })
      if (response?.success) {
        const payments = response.data?.payments || response.data || []
        setPaymentsData(payments)
      } else {
        setPaymentsData([])
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
      setPaymentsData([])
    }
  }

  const _calculateGrade = (percentage) => {
    if (percentage >= 80) return 'A'
    if (percentage >= 70) return 'B'
    if (percentage >= 60) return 'C'
    if (percentage >= 50) return 'D'
    return 'F'
  }

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
        subtitle={student.student_id_number || student.student_id}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/students')} className="btn btn-secondary">
              <ArrowLeft size={18} /> Back
            </button>
            <Link to={`/students/${id}/edit`} className="btn btn-primary">
              <Edit size={18} /> Edit
            </Link>
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
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <GraduationCap size={16} /> {student.class_name || student.current_class_name || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} /> {student.age || _calculateAge(student.date_of_birth) || 'N/A'} years old
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin size={16} /> {student.place_of_birth || student.address || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} /> Enrolled {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Personal Information">
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Gender:</span> {student.gender || 'N/A'}</p>
              <p><span className="text-gray-500">Date of Birth:</span> {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'}</p>
              <p><span className="text-gray-500">Nationality:</span> {student.nationality || 'N/A'}</p>
              <p><span className="text-gray-500">Address:</span> {student.address || 'N/A'}</p>
              <p><span className="text-gray-500">Place of Birth:</span> {student.place_of_birth || 'N/A'}</p>
            </div>
          </Card>
          <Card title="Enrollment Details">
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Student Type:</span> <Badge variant="info">{student.student_type || 'N/A'}</Badge></p>
              <p><span className="text-gray-500">Class:</span> {student.class_name || student.current_class_name || 'N/A'}</p>
              <p><span className="text-gray-500">Enrolled:</span> {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : 'N/A'}</p>
              <p><span className="text-gray-500">Academic Year:</span> {student.academic_year || 'N/A'}</p>
            </div>
          </Card>
          <Card title="Medical Information">
            <p className="text-sm"><span className="text-gray-500">Medical Notes:</span> {student.medical_notes || 'None'}</p>
            <p className="text-sm mt-2"><span className="text-gray-500">Special Needs:</span> {student.special_needs || 'None'}</p>
          </Card>
          {student.parent_name && (
            <Card title="Parent/Guardian Info">
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Parent Name:</span> {student.parent_name}</p>
                {student.parent_phone && <p><span className="text-gray-500">Phone:</span> {student.parent_phone}</p>}
                {student.parent_email && <p><span className="text-gray-500">Email:</span> {student.parent_email}</p>}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Guardians Tab */}
      {activeTab === 'guardians' && (
        tabLoading.guardians ? <LoadingSpinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guardians.length === 0 ? (
              <p className="text-sm text-gray-500 col-span-2 text-center py-8">No guardians on record.</p>
            ) : (
              guardians.map((g, i) => (
                <Card key={g.guardian_id || g._id || i}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{g.first_name} {g.last_name}</h4>
                    {g.is_primary_contact && <Badge variant="success">Primary</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{g.relationship || 'N/A'}</p>
                  <div className="space-y-1 mt-2">
                    {g.phone_number && <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-gray-400" /> {g.phone_number}</div>}
                    {g.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-gray-400" /> {g.email}</div>}
                    {g.address && <div className="flex items-center gap-2 text-sm"><MapPin size={14} className="text-gray-400" /> {g.address}</div>}
                  </div>
                </Card>
              ))
            )}
          </div>
        )
      )}

      {/* Academic Tab */}
      {activeTab === 'academic' && (
        tabLoading.academic ? <LoadingSpinner /> : (
          <div className="space-y-4">
            {academicData ? (
              <>
                <Card>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary-600">{academicData.overall?.percentage || 0}%</p>
                    <Badge variant={academicData.overall?.grade === 'A' ? 'success' : 'info'}>
                      Grade {academicData.overall?.grade || 'N/A'}
                    </Badge>
                  </div>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(academicData.subjects || []).map((subject, i) => (
                    <Card key={i}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{subject.subject_name}</h4>
                        <Badge variant={subject.grade === 'A' ? 'success' : 'info'}>{subject.grade}</Badge>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                        <div className="h-2 rounded-full bg-primary-600" style={{ width: `${Math.min(subject.average_percentage || 0, 100)}%` }} />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{subject.average_percentage || 0}%</p>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No academic data available.</p>
            )}
          </div>
        )
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        tabLoading.attendance ? <LoadingSpinner /> : (
          <Card>
            {attendanceData ? (
              <>
                <div className="text-center mb-4">
                  <p className="text-4xl font-bold text-primary-600">{attendanceData.attendance_rate || 0}%</p>
                  <p className="text-sm text-gray-500">Attendance Rate</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-2xl font-bold text-green-600">{attendanceData.present || 0}</p><p className="text-xs text-gray-500">Present</p></div>
                  <div><p className="text-2xl font-bold text-red-600">{attendanceData.absent || 0}</p><p className="text-xs text-gray-500">Absent</p></div>
                  <div><p className="text-2xl font-bold text-gray-600">{attendanceData.total || 0}</p><p className="text-xs text-gray-500">Total Days</p></div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No attendance data available.</p>
            )}
          </Card>
        )
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        tabLoading.payments ? <LoadingSpinner /> : (
          <div className="space-y-3">
            {paymentsData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No payment records found.</p>
            ) : (
              <>
                {paymentsData.map((payment, i) => (
                  <Card key={i}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">SSP {(payment.amount_paid || payment.amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Receipt: {payment.receipt_number || 'N/A'}</p>
                        <p className="text-xs text-gray-500 capitalize">Method: {(payment.payment_method || 'N/A').replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</span>
                        <Badge variant={payment.status === 'completed' ? 'success' : 'warning'} className="mt-1">{payment.status}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
                <p className="text-sm text-gray-500 text-center font-bold">
                  Total Paid: SSP {paymentsData.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount_paid || p.amount || 0), 0).toLocaleString()}
                </p>
              </>
            )}
          </div>
        )
      )}
    </div>
  )
}

function _calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

export default StudentDetail
