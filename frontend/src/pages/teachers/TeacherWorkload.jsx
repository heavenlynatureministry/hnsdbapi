import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { 
  ArrowLeft, Users, BookOpen, Clock, BarChart3, 
  AlertTriangle, CheckCircle, School 
} from 'lucide-react'

function TeacherWorkload() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [loading, setLoading] = useState(true)
  const [workload, setWorkload] = useState(null)

  useEffect(() => {
    updatePageTitle('Teacher Workload')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Teachers', path: '/teachers' },
      { label: 'Workload' },
    ])

    // Simulated data
    const timer = setTimeout(() => {
      setWorkload({
        teacher_id: id,
        teacher_name: 'John Doe',
        total_classes: 3,
        total_subjects: 3,
        total_periods_per_week: 24,
        max_periods: 40,
        max_classes: 5,
        max_subjects: 5,
        is_class_teacher: true,
        class_teacher_of: 'P6',
        workload_level: 'medium',
        warnings: [],
        classes_detail: [
          { class_id: '1', class_name: 'P5', class_level: 'primary', students_count: 23, periods_per_week: 8 },
          { class_id: '2', class_name: 'P6', class_level: 'primary', students_count: 22, periods_per_week: 10 },
          { class_id: '3', class_name: 'P7', class_level: 'primary', students_count: 20, periods_per_week: 6 },
        ],
      })
      setLoading(false)
    }, 500)
  }, [id])

  if (loading) return <LoadingSpinner fullScreen />
  if (!workload) return null

  const utilizationPercentage = Math.round((workload.total_periods_per_week / workload.max_periods) * 100)

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <PageHeader
        title={`Workload: ${workload.teacher_name}`}
        actions={
          <button onClick={() => navigate('/teachers')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Classes', value: `${workload.total_classes} / ${workload.max_classes}`, icon: School, color: 'bg-blue-100 text-blue-600' },
          { label: 'Subjects', value: `${workload.total_subjects} / ${workload.max_subjects}`, icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
          { label: 'Periods/Week', value: `${workload.total_periods_per_week} / ${workload.max_periods}`, icon: Clock, color: 'bg-green-100 text-green-600' },
          { label: 'Total Students', value: workload.classes_detail.reduce((s, c) => s + c.students_count, 0), icon: Users, color: 'bg-orange-100 text-orange-600' },
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
            {workload.workload_level?.toUpperCase()}
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
          {workload.warnings?.length > 0 ? (
            <AlertTriangle size={24} className="text-red-500 flex-shrink-0 mt-1" />
          ) : (
            <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-1" />
          )}
          <div>
            <h3 className="font-semibold">
              {workload.warnings?.length > 0 ? 'Warnings' : 'Workload is within limits'}
            </h3>
            {workload.warnings?.length > 0 ? (
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
        <div className="space-y-3">
          {workload.classes_detail?.map((cls) => (
            <div key={cls.class_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">{cls.class_name} ({cls.class_level})</p>
                <p className="text-sm text-gray-500">{cls.students_count} students • {cls.periods_per_week} periods/week</p>
              </div>
              {workload.class_teacher_of === cls.class_name && (
                <Badge variant="info">Class Teacher</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default TeacherWorkload