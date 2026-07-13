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

  // Separate state for each tab's data
  const [reviews, setReviews] = useState([])
  const [trainingHistory, setTrainingHistory] = useState([])
  const [tabLoading, setTabLoading] = useState({})

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
    setLoading(true)
    try {
      const response = await teachersAPI.getById(id)
      if (response?.success && response.data) {
        setTeacher(response.data)
      } else {
        toast.error('Failed to load teacher details')
        navigate('/teachers')
      }
    } catch (error) {
      console.error('Failed to fetch teacher:', error)
      toast.error('Failed to load teacher details')
      navigate('/teachers')
    } finally {
      setLoading(false)
    }
  }

  // Fetch tab data when tab changes
  useEffect(() => {
    if (!teacher) return
    
    const fetchTabData = async () => {
      setTabLoading(prev => ({ ...prev, [activeTab]: true }))
      try {
        switch (activeTab) {
          case 'reviews':
            await fetchReviews()
            break
          case 'training':
            await fetchTraining()
            break
        }
      } finally {
        setTabLoading(prev => ({ ...prev, [activeTab]: false }))
      }
    }
    
    fetchTabData()
  }, [activeTab, teacher])

  const fetchReviews = async () => {
    try {
      const response = await teachersAPI.getPerformanceReviews(id)
      if (response?.success) {
        setReviews(response.data?.reviews || response.data || [])
      } else {
        // Fall back to embedded data if API not available
        setReviews(teacher.performance_reviews || [])
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      // Fall back to embedded data
      setReviews(teacher.performance_reviews || [])
    }
  }

  const fetchTraining = async () => {
    try {
      const response = await teachersAPI.getTrainingHistory(id)
      if (response?.success) {
        setTrainingHistory(response.data?.training || response.data || [])
      } else {
        // Fall back to embedded data if API not available
        setTrainingHistory(teacher.training_history || [])
      }
    } catch (error) {
      console.error('Failed to fetch training history:', error)
      // Fall back to embedded data
      setTrainingHistory(teacher.training_history || [])
    }
  }

  const handleDeactivate = async () => {
    try {
      const response = await teachersAPI.update(id, { status: 'inactive' })
      if (response?.success) {
        toast.success('Teacher deactivated')
        setShowDeactivate(false)
        fetchTeacher()
      } else {
        toast.error(response?.message || 'Failed to deactivate teacher')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to deactivate teacher')
    }
  }

  const handleActivate = async () => {
    try {
      const response = await teachersAPI.update(id, { status: 'active' })
      if (response?.success) {
        toast.success('Teacher activated')
        fetchTeacher()
      } else {
        toast.error(response?.message || 'Failed to activate teacher')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to activate teacher')
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
                <GraduationCap size={16} /> {teacher.qualification || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <BookOpen size={16} /> {teacher.specialization || teacher.subjects?.join(', ') || 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} /> Since {teacher.hire_date ? new Date(teacher.hire_date).getFullYear() : 'N/A'}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={16} /> {teacher.years_of_experience || 0} years exp.
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
                <button onClick={handleActivate} className="btn btn-success btn-sm">
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
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Contact Details">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><Mail size={16} className="text-gray-400" /> {teacher.email || 'N/A'}</div>
              <div className="flex items-center gap-2 text-sm"><Phone size={16} className="text-gray-400" /> {teacher.phone_number || teacher.phone || 'N/A'}</div>
              <div className="flex items-center gap-2 text-sm"><MapPin size={16} className="text-gray-400" /> {teacher.address || 'N/A'}</div>
            </div>
          </Card>
          <Card title="Emergency Contact">
            <div className="space-y-3">
              <p className="text-sm font-medium">{teacher.emergency_contact?.name || teacher.emergency_contact_name || 'N/A'}</p>
              <p className="text-sm text-gray-500">{teacher.emergency_contact?.relationship || teacher.emergency_contact_relationship || ''}</p>
              <p className="text-sm text-gray-500">{teacher.emergency_contact?.phone_number || teacher.emergency_contact_phone || ''}</p>
            </div>
          </Card>
          <Card title="Subjects">
            <div className="flex flex-wrap gap-2">
              {(teacher.subjects || []).length === 0 ? (
                <p className="text-sm text-gray-500">No subjects assigned</p>
              ) : (
                teacher.subjects.map((s, i) => <Badge key={i} variant="info">{typeof s === 'string' ? s : s.name || s.subject_name || JSON.stringify(s)}</Badge>)
              )}
            </div>
          </Card>
          <Card title="Classes">
            <div className="flex flex-wrap gap-2">
              {(teacher.classes_info || teacher.classes || []).length === 0 ? (
                <p className="text-sm text-gray-500">No classes assigned</p>
              ) : (
                (teacher.classes_info || teacher.classes || []).map((c, i) => (
                  <Badge key={i} variant="success">
                    {typeof c === 'string' ? c : c.class_name || c.name || `Class ${i + 1}`}
                    {c.class_level ? ` (${c.class_level})` : ''}
                  </Badge>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'reviews' && (
        tabLoading.reviews ? <LoadingSpinner /> : (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No performance reviews yet.</p>
            ) : (
              reviews.map((review, index) => (
                <Card key={review._id || index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-primary-600">{review.rating}</span>
                      <span className="text-sm text-gray-500">/ 5.0</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {review.review_date ? new Date(review.review_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Reviewer: {review.reviewer || review.reviewer_name || 'N/A'}</p>
                  {review.overall_comments && <p className="text-sm mt-2">{review.overall_comments}</p>}
                  {review.comments && <p className="text-sm mt-2">{review.comments}</p>}
                </Card>
              ))
            )}
          </div>
        )
      )}

      {activeTab === 'training' && (
        tabLoading.training ? <LoadingSpinner /> : (
          <div className="space-y-4">
            {trainingHistory.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No training history yet.</p>
            ) : (
              trainingHistory.map((training, index) => (
                <Card key={training._id || index}>
                  <h4 className="font-semibold">{training.training_name || training.name || 'Training'}</h4>
                  <p className="text-sm text-gray-500">{training.provider || training.institution || 'N/A'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {training.start_date ? new Date(training.start_date).toLocaleDateString() : 'N/A'} 
                    {' - '} 
                    {training.end_date ? new Date(training.end_date).toLocaleDateString() : 'N/A'}
                  </p>
                  {training.description && <p className="text-xs text-gray-500 mt-1">{training.description}</p>}
                </Card>
              ))
            )}
          </div>
        )
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
