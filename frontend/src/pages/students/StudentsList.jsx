import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import studentsAPI from '../../api/students'
import PageHeader from '../../components/common/PageHeader'
import SearchBar from '../../components/common/SearchBar'
import Pagination from '../../components/common/Pagination'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Badge from '../../components/common/Badge'
import { 
  GraduationCap, UserPlus, Upload, Search, 
  MoreVertical, Eye, Edit, UserCheck, ArrowUpRight,
  Users, School, BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'

function StudentsList() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [openDropdown, setOpenDropdown] = useState(null)
  const limit = 20

  useEffect(() => {
    updatePageTitle('Students Management')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Students', path: '/students' },
    ])
  }, [updatePageTitle, updateBreadcrumbs])

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const response = await studentsAPI.getAll({
        search: search || undefined,
        class_name: classFilter || undefined,
        student_type: typeFilter || undefined,
        gender: genderFilter || undefined,
        page,
        limit,
      })
      
      if (response?.success) {
        setStudents(response.data?.students || response.data || [])
        setTotal(response.data?.total || 0)
        setTotalPages(response.data?.total_pages || Math.ceil((response.data?.total || 0) / limit))
      } else {
        setStudents([])
        setTotal(0)
        setTotalPages(0)
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to fetch students')
      }
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [search, classFilter, typeFilter, genderFilter, page])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success', inactive: 'danger', graduated: 'info',
      transferred: 'warning', suspended: 'danger',
    }
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>
  }

  const getTypeBadge = (type) => {
    const variants = { street: 'warning', abundant: 'success', orphan: 'info', other: 'gray' }
    const labels = { street: 'Street Child', abundant: 'Abundant', orphan: 'Orphan', other: 'Other' }
    return <Badge variant={variants[type] || 'gray'}>{labels[type] || type}</Badge>
  }

  const classes = [...new Set(students.map(s => s.class_name).filter(Boolean))]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Students Management"
        subtitle={`${total} total students`}
        actions={
          <div className="flex gap-2">
            <Link to="/students/import" className="btn btn-secondary">
              <Upload size={18} /> Import
            </Link>
            <Link to="/students/new" className="btn btn-primary">
              <UserPlus size={18} /> Add Student
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: total, icon: Users, color: 'bg-blue-100 text-blue-600' },
          { label: 'Active', value: students.filter(s => s.status === 'active').length, icon: UserCheck, color: 'bg-green-100 text-green-600' },
          { label: 'Classes', value: classes.length, icon: School, color: 'bg-purple-100 text-purple-600' },
          { label: 'Graduated', value: students.filter(s => s.status === 'graduated').length, icon: GraduationCap, color: 'bg-yellow-100 text-yellow-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by name or ID..." />
          </div>
          <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1) }} className="form-input w-full sm:w-32">
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} className="form-input w-full sm:w-36">
            <option value="">All Types</option>
            <option value="street">Street Child</option>
            <option value="abundant">Abundant</option>
            <option value="orphan">Orphan</option>
            <option value="other">Other</option>
          </select>
          <select value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setPage(1) }} className="form-input w-full sm:w-28">
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={48} />}
          title="No students found"
          description="No students match your search criteria."
          action={<Link to="/students/new" className="btn btn-primary">Add Student</Link>}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID Number</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Class</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-medium text-sm">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>
                        <Link to={`/students/${student._id}`} className="font-medium text-primary-600 hover:text-primary-700">
                          {student.first_name} {student.last_name}
                        </Link>
                      </div>
                    </td>
                    <td className="text-sm font-mono">{student.student_id_number}</td>
                    <td className="text-sm">{student.gender}</td>
                    <td className="text-sm">{student.age || 'N/A'} yrs</td>
                    <td className="text-sm">{student.class_name || 'N/A'}</td>
                    <td>{getTypeBadge(student.student_type)}</td>
                    <td>{getStatusBadge(student.status)}</td>
                    <td className="text-right">
                      <div className="relative">
                        <button onClick={() => setOpenDropdown(openDropdown === student._id ? null : student._id)} className="btn btn-ghost btn-sm btn-icon">
                          <MoreVertical size={16} />
                        </button>
                        {openDropdown === student._id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-20 py-1">
                              <Link to={`/students/${student._id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Eye size={14} /> View
                              </Link>
                              <Link to={`/students/${student._id}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Edit size={14} /> Edit
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="border-t px-4 py-3">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StudentsList
