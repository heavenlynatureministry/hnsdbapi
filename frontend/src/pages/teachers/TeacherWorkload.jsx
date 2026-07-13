import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import teachersAPI from '../../api/teachers'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { 
  ArrowLeft, Users, BookOpen, Clock, BarChart3, 
  AlertTriangle, CheckCircle, School 
} from 'lucide-react'
import toast from 'react-hot-toast'

function TeacherWorkload() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [loading, setLoading] = useState(true)
  const [workload, setWorkload] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    updatePageTitle('Teacher Workload')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Teachers', path: '/teachers' },
      { label: 'Workload' },
    ])
    fetchWorkload()
  }, [id])

  const fetchWorkload = async () => {
    setLoading(true)
    setError(null)
    try {
      // Try the workload endpoint first
      const response = await teachersAPI.getWorkload(id)
      if (response?.success && response.data) {
        setWorkload(response.data)
      } else if (response?.data) {
        setWorkload(response.data)
      } else {
        // Fallback: try getting teacher details and build workload from it
        await fetchWorkloadFromTeacher()
      }
    } catch (error) {
      console.error('Failed to fetch workload, trying fallback:', error)
      // Fallback: build workload from teacher details
      await fetchWorkloadFromTeacher()
    } finally {
      setLoading(false)
    }
  }

  // Fallback: Build workload data from teacher details if workload API not available
  const fetchWorkloadFromTeacher = async () => {
    try {
      const response = await teachersAPI.getById(id)
      if (response?.success && response.data) {
        const teacher = response.data
        
        // Build workload object from teacher data
        const classes = teacher.classes_info || teacher.classes || []
        const subjects = teacher.subjects || []
        const periodsPerWeek = teacher.periods_per_week || (classes.length * 5) // estimate
        
        const builtWorkload = {
          teacher_name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
          total_classes: classes.length,
          max_classes: teacher.max_classes || 5,
          total_subjects: Array.isArray(subjects) ? subjects.length : 0,
          max_subjects: teacher.max_subjects || 5,
          total_periods_per_week: periodsPerWeek,
          max_periods: teacher.max_periods || 30,
          workload_level: periodsPerWeek > 25 ? 'high' : periodsPerWeek > 15 ? 'medium' : 'low',
          warnings: periodsPerWeek > 30 ? ['Exceeds maximum periods per week'] : [],
          class_teacher_of: teacher.class_teacher_of || '',
          classes_detail: classes.map((c, i) => ({
            class_id: c.class_id || c._id || i,
            class_name: typeof c === 'string' ? c : (c.class_name || c.name || `Class ${i + 1}`),
            class_level: typeof c === 'object' ? (c.class_level || c.level || '') : '',
            students_count: c.students_count || c.student_count || 0,
            periods_per_week: c.periods_per_week || 5,
          })),
          subjects_detail: Array.isArray(subjects) 
            ? subjects.map(s => typeof s === 'string' ? { name: s } : s)
            : [],
        }
        
        setWorkload(builtWorkload)
        toast.success('Workload loaded from teacher details')
      } else {
        setError('Could not load workload data')
        toast.error('Failed to load workload data')
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
      setError('Failed to load workload data')
      toast.error('Failed to load workload data')
    }
  }

  if (loading) return <LoadingSpinner fullScreen />
  
  if (error || !workload) {
    return (
      <div className="space-y-6 max-w-3xl animate-fade-in-up">
        <PageHeader
          title="Teacher Workload"
          actions={
            <button onClick={() => navigate('/teachers')} className="btn btn-secondary">
              <ArrowLeft size={18} /> Back
            </button>
          }
        />
        <Card>
          <div className="text-center py-8">
            <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-500">{error || 'No workload data available.'}</p>
            <button onClick={() => navigate('/teachers')} className="btn btn-primary mt-4">
              Back to Teachers
            </button>
          </div>
        </Card>
      </div>
    )
  }

  const totalStudents = (workload.classes_detail || []).reduce((s, c) => s + (c.students_count || 0), 0)
  const maxPeriods = workload.max_periods || 30
  const totalPeriods = workload.total_periods_per_week || 0
  const utilizationPercentage = maxPeriods > 0
    ? Math.round((totalPeriods / maxPeriods) * 100)
    : 0

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <PageHeader
        title={`Workload: ${workload.teacher_name || 'Teacher'}`}
        actions={
          <button onClick={() => navigate('/teachers')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Classes', value: `${workload.total_classes || 0} / ${workload.max_classes || 5}`, icon: School, color: 'bg-blue-100 text-blue-600' },
          { label: 'Subjects', value: `${workload.total_subjects || 0} / ${workload.max_subjects || 5}`, icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
          { label: 'Periods/Week', value: `${totalPeriods} / ${maxPeriods}`, icon: Clock, color: 'bg-green-100 text-green-600' },
          { label: 'Total Students', value: totalStudents, icon: Users, color: 'bg-orange-100 text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Utilization Bar */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Workload Utilization</h3>
          <Badge variant={utilizationPercentage > 80 ? 'danger' : utilizationPercentage > 60 ? 'warning' : 'success'}>
            {(workload.workload_level || 'medium').toUpperCase()}
          </Badge>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              utilizationPercentage > 80 ? 'bg-red-500' : utilizationPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">{utilizationPercentage}% of maximum workload</p>
      </Card>

      {/* Status */}
      <Card>
        <div className="flex items-start gap-3">
          {(workload.warnings || []).length > 0 ? (
            <AlertTriangle size={24} className="text-red-500 flex-shrink-0 mt-1" />
          ) : (
            <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-1" />
          )}
          <div>
            <h3 className="font-semibold">
              {(workload.warnings || []).length > 0 ? 'Warnings' : 'Workload is within limits'}
            </h3>
            {(workload.warnings || []).length > 0 ? (
              <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                {workload.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 mt-1">All workload metrics are within acceptable limits.</p>
            )}
          </div>
        </div>
      </Card>

      {/* Class Details */}
      <Card title="Class Assignments">
        {(workload.classes_detail || []).length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No class assignments.</p>
        ) : (
          <div className="space-y-3">
            {workload.classes_detail.map((cls, index) => (
              <div key={cls.class_id || index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">
                    {cls.class_name || 'Class'} 
                    {cls.class_level ? ` (${cls.class_level})` : ''}
                  </p>
                  <p className="text-sm text-gray-500">
                    {cls.students_count || 0} students • {cls.periods_per_week || 0} periods/week
                  </p>
                </div>
                {workload.class_teacher_of === cls.class_name && (
                  <Badge variant="info">Class Teacher</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Subjects Detail (if available) */}
      {(workload.subjects_detail || []).length > 0 && (
        <Card title="Subjects">
          <div className="flex flex-wrap gap-2">
            {workload.subjects_detail.map((s, i) => (
              <Badge key={i} variant="info">
                {typeof s === 'string' ? s : (s.name || s.subject_name || `Subject ${i + 1}`)}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default TeacherWorkload
