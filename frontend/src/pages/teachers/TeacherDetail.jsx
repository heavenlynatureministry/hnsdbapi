import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import teachersAPI from '../../api/teachers'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { 
  ArrowLeft, Edit, Mail, Phone, MapPin, GraduationCap, 
  BookOpen, Calendar, Briefcase, Users, Star, 
  Clock, Shield, UserX, UserCheck, BarChart3 
} from 'lucide-react'
import toast from 'react-hot-toast'

function TeacherDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [teacher, setTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [showDeactivate, setShowDeactivate] = useState(false)

  useEffect(() => {
    updatePageTitle('Teacher Details')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Teachers', path: '/teachers' },
      { label: 'Teacher Details' },
    ])
    fetchTeacher()
  }, [id])

  const fetchTeacher = async () => {
    try {
      // Simulated data for demo
      const timer = setTimeout(() => {
        setTeacher({
          _id: id,
          employee_id: 'HNS-TCH-001',
          first_name: 'John',
          last_name: 'Doe',
          middle_name: '',
          gender: 'Male',
          date_of_birth: '1980-05-15',
          nationality: 'South Sudanese',
          qualification: 'B.Ed',
          specialization: 'Mathematics',
          subjects: ['Mathematics', 'Science', 'Computer Studies'],
          phone_number: '+211 912 345 678',
          email: 'john.doe@school.com',
          address: 'Juba, South Sudan',
          hire_date: '2015-01-10',
          years_of_experience: 9,
          salary_grade: 'Grade 5',
          status: 'active',
          emergency_contact: { name: 'Jane Doe', relationship: 'Spouse', phone_number: '+211 900 111 222' },
          performance_reviews: [
            { rating: 4.5, reviewer: 'Head Teacher', review_date: '2024-06-15', overall_comments: 'Excellent teacher, very dedicated.' },
            { rating: 4.2, reviewer: 'Head Teacher', review_date: '2023-12-10', overall_comments: 'Good performance, needs to improve on documentation.' },
          ],
          training_history: [
            { training_name: 'Modern Teaching Methods', provider: 'Ministry of Education', start_date: '2023-08-15', end_date: '2023-08-20' },
            { training_name: 'Computer Literacy', provider: 'ICT Center', start_date: '2022-05-10', end_date: '2022-05-14' },
          ],
          classes_info: [
            { class_name: 'P5', class_level: 'primary' },
            { class_name: 'P6', class_level: 'primary' },
          ],
        })
        setLoading(false)
      }, 500)
    } catch (error) {
      toast.error('Failed to load teacher details')
      navigate('/teachers')
    }
  }

  const handleDeactivate = async () => {
    try {
      await teachersAPI.update(id, { status: 'inactive' })
      toast.success('Teacher deactivated')
      setShowDeactivate(false)
      fetchTeacher()
    } catch (error) {
      toast.error('Failed to deactivate teacher')
    }
  }

  const getStatusBadge = (status) => {
    const variants = { active: 'success', inactive: 'danger', on_leave: 'warning' }
    return <Badge variant={variants[status] || 'gray'}>{status?.replace('_', ' ')}</Badge>
  }

  if (loading) return <LoadingSpinner fullScreen />
  if (!teacher) return null

  const tabs = [
    { id: 'info', label: 'Information', icon: Briefcase },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'training', label: 'Training', icon: GraduationCap },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title={`${teacher.first_name} ${teacher.last_name}`}
        subtitle={teacher.employee_id}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/teachers')} className="btn btn-secondary">
              <ArrowLeft size={18} /> Back
            </button>
            <Link to={`/teachers/${id}/edit`} className="btn btn-primary">
              <Edit size={18} /> Edit
            </Link>
          </div>
        }
      />

      {/* Profile Header */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 text-3xl font-bold flex-shrink-0">
            {teacher.first_name?.[0]}{teacher.last_name?.[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {teacher.first_name} {teacher.last_name}
              </h2>
              {getStatusBadge(teacher.status)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <GraduationCap size={16} /> {teacher.qualification}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <BookOpen size={16} /> {teacher.specialization}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} /> Since {new Date(teacher.hire_date).getFullYear()}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={16} /> {teacher.years_of_experience} years exp.
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Link to={`/teachers/${id}/workload`} className="btn btn-secondary btn-sm">
                <BarChart3 size={14} /> View Workload
              </Link>
              {teacher.status === 'active' ? (
                <button onClick={() => setShowDeactivate(true)} className="btn btn-danger btn-sm">
                  <UserX size={14} /> Deactivate
                </button>
              ) : (
                <button onClick={() => teachersAPI.update(id, { status: 'active' }).then(() => { toast.success('Activated'); fetchTeacher() })} className="btn btn-success btn-sm">
                  <UserCheck size={14} /> Activate
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Contact Details">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><Mail size={16} className="text-gray-400" /> {teacher.email}</div>
              <div className="flex items-center gap-2 text-sm"><Phone size={16} className="text-gray-400" /> {teacher.phone_number}</div>
              <div className="flex items-center gap-2 text-sm"><MapPin size={16} className="text-gray-400" /> {teacher.address || 'N/A'}</div>
            </div>
          </Card>
          <Card title="Emergency Contact">
            <div className="space-y-3">
              <p className="text-sm font-medium">{teacher.emergency_contact?.name || 'N/A'}</p>
              <p className="text-sm text-gray-500">{teacher.emergency_contact?.relationship}</p>
              <p className="text-sm text-gray-500">{teacher.emergency_contact?.phone_number}</p>
            </div>
          </Card>
          <Card title="Subjects">
            <div className="flex flex-wrap gap-2">
              {teacher.subjects?.map((s) => (
                <Badge key={s} variant="info">{s}</Badge>
              ))}
            </div>
          </Card>
          <Card title="Classes">
            <div className="flex flex-wrap gap-2">
              {teacher.classes_info?.map((c, i) => (
                <Badge key={i} variant="success">{c.class_name} ({c.class_level})</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {teacher.performance_reviews?.map((review, index) => (
            <Card key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary-600">{review.rating}</span>
                  <span className="text-sm text-gray-500">/ 5.0</span>
                </div>
                <span className="text-sm text-gray-400">{new Date(review.review_date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-500">Reviewer: {review.reviewer}</p>
              <p className="text-sm mt-2">{review.overall_comments}</p>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'training' && (
        <div className="space-y-4">
          {teacher.training_history?.map((training, index) => (
            <Card key={index}>
              <h4 className="font-semibold">{training.training_name}</h4>
              <p className="text-sm text-gray-500">{training.provider}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(training.start_date).toLocaleDateString()} - {new Date(training.end_date).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={showDeactivate}
        onClose={() => setShowDeactivate(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Teacher"
        message={`Are you sure you want to deactivate ${teacher.first_name} ${teacher.last_name}?`}
        confirmText="Deactivate"
        variant="danger"
      />
    </div>
  )
}

export default TeacherDetail