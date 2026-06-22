import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import authAPI from '../../api/auth'
import PageHeader from '../../components/common/PageHeader'
import SearchBar from '../../components/common/SearchBar'
import Pagination from '../../components/common/Pagination'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'

function UsersList() {
  const { user: currentUser, hasPermission } = useAuth()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 20

  // Delete confirmation
  const [deleteUser, setDeleteUser] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Status change confirmation
  const [statusUser, setStatusUser] = useState(null)
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null)

  useEffect(() => {
    updatePageTitle('Users Management')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Users', path: '/users' },
    ])
  }, [updatePageTitle, updateBreadcrumbs])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authAPI.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit,
      })
      
      if (response?.success) {
        setUsers(response.data?.users || response.data || [])
        setTotal(response.data?.total || 0)
        setTotalPages(response.data?.total_pages || Math.ceil((response.data?.total || 0) / limit))
      } else {
        setUsers([])
        setTotal(0)
        setTotalPages(0)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to fetch users')
      }
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDelete = async () => {
    if (!deleteUser) return
    try {
      const response = await authAPI.deactivateUser(deleteUser._id)
      if (response?.success) {
        toast.success('User deactivated successfully')
      } else {
        toast.success('User deactivated successfully')
      }
      setShowDeleteDialog(false)
      setDeleteUser(null)
      fetchUsers()
    } catch (error) {
      toast.error(error.message || 'Failed to deactivate user')
    }
  }

  const handleStatusChange = async () => {
    if (!statusUser) return
    const newStatus = statusUser.status === 'active' ? 'inactive' : 'active'
    try {
      let response
      if (newStatus === 'active') {
        response = await authAPI.activateUser(statusUser._id)
      } else {
        response = await authAPI.deactivateUser(statusUser._id)
      }
      
      if (response?.success) {
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`)
      } else {
        toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`)
      }
      setShowStatusDialog(false)
      setStatusUser(null)
      fetchUsers()
    } catch (error) {
      toast.error(error.message || 'Failed to update user status')
    }
  }

  const getRoleBadge = (role) => {
    const variants = {
      admin: 'danger',
      teacher: 'info',
      accountant: 'warning',
      counselor: 'success',
      staff: 'gray',
    }
    return <Badge variant={variants[role] || 'gray'}>{role}</Badge>
  }

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      inactive: 'danger',
      suspended: 'warning',
    }
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Users Management"
        subtitle={`${total} total users`}
        actions={
          <Link to="/users/new" className="btn btn-primary">
            <UserPlus size={18} />
            Add User
          </Link>
        }
      />

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search users by name or email..."
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="form-input w-full sm:w-40"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="accountant">Accountant</option>
            <option value="counselor">Counselor</option>
            <option value="staff">Staff</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="form-input w-full sm:w-40"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No users found"
          description="No users match your search criteria."
          action={
            <Link to="/users/new" className="btn btn-primary">
              Add User
            </Link>
          }
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-medium text-sm">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.first_name} {user.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail size={14} className="text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone size={14} className="text-gray-400" />
                        {user.phone_number || 'N/A'}
                      </div>
                    </td>
                    <td>{getStatusBadge(user.status)}</td>
                    <td className="text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="text-right">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenDropdown(openDropdown === user._id ? null : user._id)
                          }
                          className="btn btn-ghost btn-sm btn-icon"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openDropdown === user._id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenDropdown(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1">
                              <Link
                                to={`/users/${user._id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setOpenDropdown(null)}
                              >
                                <Edit size={14} />
                                Edit User
                              </Link>
                              <button
                                onClick={() => {
                                  setStatusUser(user)
                                  setShowStatusDialog(true)
                                  setOpenDropdown(null)
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <UserX size={14} />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck size={14} />
                                    Activate
                                  </>
                                )}
                              </button>
                              {user._id !== currentUser?._id && (
                                <button
                                  onClick={() => {
                                    setDeleteUser(user)
                                    setShowDeleteDialog(true)
                                    setOpenDropdown(null)
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              )}
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
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeleteUser(null)
        }}
        onConfirm={handleDelete}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${deleteUser?.first_name} ${deleteUser?.last_name}? This will prevent them from accessing the system.`}
        confirmText="Deactivate"
        variant="danger"
      />

      {/* Status Change Confirmation */}
      <ConfirmDialog
        open={showStatusDialog}
        onClose={() => {
          setShowStatusDialog(false)
          setStatusUser(null)
        }}
        onConfirm={handleStatusChange}
        title={`${statusUser?.status === 'active' ? 'Deactivate' : 'Activate'} User`}
        message={`Are you sure you want to ${statusUser?.status === 'active' ? 'deactivate' : 'activate'} ${statusUser?.first_name} ${statusUser?.last_name}?`}
        confirmText={statusUser?.status === 'active' ? 'Deactivate' : 'Activate'}
        variant={statusUser?.status === 'active' ? 'danger' : 'success'}
      />
    </div>
  )
}

export default UsersList
