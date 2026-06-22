import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { 
  School, Plus, Users, GraduationCap, 
  MoreVertical, Eye, Edit, Calendar, DoorOpen 
} from 'lucide-react'
import toast from 'react-hot-toast'

function ClassesList() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('')
  const [openDropdown, setOpenDropdown] = useState(null)

  useEffect(() => {
    updatePageTitle('Classes Management')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Classes' }])
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const response = await classesAPI.getAll()
      if (response?.success) {
        setClasses(response.data?.classes || response.data || [])
      } else {
        setClasses([])
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      toast.error('Failed to load classes')
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClasses = levelFilter
    ? classes.filter(c => c.class_level === levelFilter)
    : classes

  const totalStudents = classes.reduce((s, c) => s + (c.current_enrollment || 0), 0)
  const totalCapacity = classes.reduce((s, c) => s + (c.max_capacity || 0), 0)
  const occupancyRate = totalCapacity > 0 ? ((totalStudents / totalCapacity) * 100).toFixed(1) : 0

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Classes Management"
        subtitle={`${classes.length} classes • ${totalStudents} students enrolled`}
        actions={
          <Link to="/classes/new" className="btn btn-primary">
            <Plus size={18} /> Add Class
          </Link>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Classes', value: classes.length, icon: School, color: 'bg-blue-100 text-blue-600' },
          { label: 'Total Students', value: totalStudents, icon: Users, color: 'bg-green-100 text-green-600' },
          { label: 'Total Capacity', value: totalCapacity, icon: DoorOpen, color: 'bg-purple-100 text-purple-600' },
          { label: 'Occupancy Rate', value: `${occupancyRate}%`, icon: GraduationCap, color: 'bg-orange-100 text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Level Filter */}
      <div className="flex gap-2">
        {['', 'nursery', 'primary'].map((level) => (
          <button
            key={level}
            onClick={() => setLevelFilter(level)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              levelFilter === level
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {level || 'All'}{' '}
            {level && `(${classes.filter(c => c.class_level === level).length})`}
          </button>
        ))}
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          icon={<School size={48} />}
          title="No classes found"
          description="No classes match your filter."
          action={<Link to="/classes/new" className="btn btn-primary">Add Class</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const occRate = cls.max_capacity > 0
              ? ((cls.current_enrollment / cls.max_capacity) * 100).toFixed(0)
              : 0
            return (
              <Card key={cls._id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-bold text-lg">
                      {cls.class_name}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{cls.class_name}</h3>
                      <Badge variant={cls.class_level === 'nursery' ? 'info' : 'warning'}>
                        {cls.class_level}
                      </Badge>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === cls._id ? null : cls._id)}
                      className="btn btn-ghost btn-sm btn-icon"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openDropdown === cls._id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-20 py-1">
                          <Link to={`/classes/${cls._id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Eye size={14} /> View Details
                          </Link>
                          <Link to={`/classes/${cls._id}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Edit size={14} /> Edit
                          </Link>
                          <Link to={`/classes/${cls._id}/schedule`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Calendar size={14} /> Schedule
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Users size={14} /> {cls.current_enrollment || 0} / {cls.max_capacity || 0} students
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <GraduationCap size={14} /> {cls.teacher_name || 'No teacher assigned'}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <DoorOpen size={14} /> {cls.classroom_number || 'No room'}
                  </div>
                </div>

                {/* Occupancy Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Occupancy</span>
                    <span className="font-medium">{occRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        occRate >= 90 ? 'bg-red-500' : occRate >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(occRate, 100)}%` }}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ClassesList
