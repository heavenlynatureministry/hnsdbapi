import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
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

  // Dummy data
  useEffect(() => {
    const timer = setTimeout(() => {
      setStudents([
        { _id: '1', student_id_number: 'HNS-2024-0001', first_name: 'Abraham', last_name: 'Kuol', gender: 'Male', date_of_birth: '2016-03-10', student_type: 'street', enrollment_date: '2020-01-15', current_class_id: 'c1', class_name: 'P3', class_level: 'primary', status: 'active', age: 8 },
        { _id: '2', student_id_number: 'HNS-2024-0002', first_name: 'Achol', last_name: 'Deng', gender: 'Female', date_of_birth: '2017-07-22', student_type: 'abundant', enrollment_date: '2020-01-15', current_class_id: 'c2', class_name: 'P2', class_level: 'primary', status: 'active', age: 7 },
        { _id: '3', student_id_number: 'HNS-2024-0003', first_name: 'Bol', last_name: 'Malek', gender: 'Male', date_of_birth: '2015-11-05', student_type: 'orphan', enrollment_date: '2019-09-01', current_class_id: 'c3', class_name: 'P4', class_level: 'primary', status: 'active', age: 9 },
        { _id: '4', student_id_number: 'HNS-2024-0004', first_name: 'Aya', last_name: 'Dut', gender: 'Female', date_of_birth: '2018-04-12', student_type: 'other', enrollment_date: '2021-02-10', current_class_id: 'c4', class_name: 'Baby', class_level: 'nursery', status: 'active', age: 6 },
        { _id: '5', student_id_number: 'HNS-2024-0005', first_name: 'Peter', last_name: 'Garang', gender: 'Male', date_of_birth: '2014-08-30', student_type: 'street', enrollment_date: '2019-01-20', current_class_id: 'c5', class_name: 'P5', class_level: 'primary', status: 'graduated', age: 10 },
      ])
      setTotal(5)
      setTotalPages(1)
      setLoading(false)
    }, 500)
  }, [search, classFilter, typeFilter, genderFilter, page])

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'danger',
      graduated: 'info',
      transferred: 'warning',
      suspended: 'danger',
    }
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>
  }

  const getTypeBadge = (type) => {
    const variants = {
      street: 'warning',
      abundant: 'success',
      orphan: 'info',
      other: 'gray',
    }
    const labels = { street: 'Street Child', abundant: 'Abundant', orphan: 'Orphan', other: 'Other' }
    return <Badge variant={variants[type] || 'gray'}>{labels[type] || type}</Badge>
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch = !search || 
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id_number?.toLowerCase().includes(search.toLowerCase())
    const matchesClass = !classFilter || s.class_name === classFilter
    const matchesType = !typeFilter || s.student_type === typeFilter
    const matchesGender = !genderFilter || s.gender === genderFilter
    return matchesSearch && matchesClass && matchesType && matchesGender
  })

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
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="form-input w-full sm:w-32">
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="form-input w-full sm:w-36">
            <option value="">All Types</option>
            <option value="street">Street Child</option>
            <option value="abundant">Abundant</option>
            <option value="orphan">Orphan</option>
            <option value="other">Other</option>
          </select>
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="form-input w-full sm:w-28">
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredStudents.length === 0 ? (
        <EmptyState icon={<GraduationCap size={48} />} title="No students found" description="No students match your search criteria." action={<Link to="/students/new" className="btn btn-primary">Add Student</Link>} />
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
                {filteredStudents.map((student) => (
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
                    <td className="text-sm">{student.age} yrs</td>
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