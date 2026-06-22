import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import teachersAPI from '../../api/teachers'
import PageHeader from '../../components/common/PageHeader'
import SearchBar from '../../components/common/SearchBar'
import Pagination from '../../components/common/Pagination'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Badge from '../../components/common/Badge'
import { 
  Users, UserPlus, Search, Mail, Phone, BookOpen, 
  MoreVertical, Edit, Eye, BarChart3, GraduationCap,
  UserCheck, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

function TeachersList() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [specializationFilter, setSpecializationFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [openDropdown, setOpenDropdown] = useState(null)
  const limit = 20

  useEffect(() => {
    updatePageTitle('Teachers Management')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Teachers', path: '/teachers' },
    ])
  }, [updatePageTitle, updateBreadcrumbs])

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await teachersAPI.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        specialization: specializationFilter || undefined,
        page,
        limit,
      })
      
      if (response?.success) {
        setTeachers(response.data?.teachers || response.data || [])
        setTotal(response.data?.total || 0)
        setTotalPages(response.data?.total_pages || Math.ceil((response.data?.total || 0) / limit))
      } else {
        setTeachers([])
        setTotal(0)
        setTotalPages(0)
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error)
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to fetch teachers')
      }
      setTeachers([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, specializationFilter, page])

  useEffect(() => {
    fetchTeachers()
  }, [fetchTeachers])

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success', inactive: 'danger', on_leave: 'warning',
      suspended: 'danger', resigned: 'gray', retired: 'gray',
    }
    const labels = {
      active: 'Active', inactive: 'Inactive', on_leave: 'On Leave',
      suspended: 'Suspended', resigned: 'Resigned', retired: 'Retired',
    }
    return <Badge variant={variants[status] || 'gray'}>{labels[status] || status}</Badge>
  }

  const specializations = [...new Set(teachers.map(t => t.specialization).filter(Boolean))]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Teachers Management"
        subtitle={`${total} total teachers`}
        actions={
          <Link to="/teachers/new" className="btn btn-primary">
            <UserPlus size={18} />
            Add Teacher
          </Link>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Teachers', value: total, icon: Users, color: 'bg-blue-100 text-blue-600' },
          { label: 'Active', value: teachers.filter(t => t.status === 'active').length, icon: UserCheck, color: 'bg-green-100 text-green-600' },
          { label: 'On Leave', value: teachers.filter(t => t.status === 'on_leave').length, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Subjects', value: [...new Set(teachers.flatMap(t => t.subjects || []))].length, icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
        ].map((stat, index) => (
          <div key={index} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search teachers by name, email, or ID..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="form-input w-full sm:w-40"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
          <select
            value={specializationFilter}
            onChange={(e) => { setSpecializationFilter(e.target.value); setPage(1) }}
            className="form-input w-full sm:w-44"
          >
            <option value="">All Specializations</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Teachers Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : teachers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No teachers found"
          description="No teachers match your search criteria."
          action={
            <Link to="/teachers/new" className="btn btn-primary">
              Add Teacher
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher) => (
            <div key={teacher._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-bold text-lg">
                    {teacher.first_name?.[0]}{teacher.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {teacher.first_name} {teacher.last_name}
                    </h3>
                    <p className="text-xs text-gray-500">{teacher.employee_id}</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === teacher._id ? null : teacher._id)}
                    className="btn btn-ghost btn-sm btn-icon"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openDropdown === teacher._id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-20 py-1">
                        <Link to={`/teachers/${teacher._id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Eye size={14} /> View
                        </Link>
                        <Link to={`/teachers/${teacher._id}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Edit size={14} /> Edit
                        </Link>
                        <Link to={`/teachers/${teacher._id}/workload`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                          <BarChart3 size={14} /> Workload
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <GraduationCap size={14} />
                  <span>{teacher.qualification}</span>
                  <span className="text-gray-300">•</span>
                  <span>{teacher.specialization}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail size={14} />
                  <span className="truncate">{teacher.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={14} />
                  <span>{teacher.phone_number}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <BookOpen size={14} />
                  <span>{teacher.subjects?.length || 0} subjects</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                {getStatusBadge(teacher.status)}
                <span className="text-xs text-gray-400">
                  Since {teacher.hire_date ? new Date(teacher.hire_date).getFullYear() : 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

export default TeachersList
