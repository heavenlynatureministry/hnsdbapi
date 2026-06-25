import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import api from '../../api/axios'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

function UserForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [roles, setRoles] = useState([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'staff',
    phone_number: '',
    status: 'active',
  })

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]

  useEffect(() => {
    updatePageTitle(isEdit ? 'Edit User' : 'Add User')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Users', path: '/users' },
      { label: isEdit ? 'Edit User' : 'Add User' },
    ])
  }, [isEdit, updatePageTitle, updateBreadcrumbs])

  useEffect(() => {
    fetchRoles()
    if (isEdit) {
      fetchUser()
    } else {
      setFetching(false)
    }
  }, [id])

  const fetchRoles = async () => {
    setLoadingRoles(true)
    try {
      // Try to fetch available roles from the API
      const response = await api.get('/auth/roles')
      if (response?.data?.success && Array.isArray(response.data.data)) {
        setRoles(response.data.data.map(role => ({
          value: role.value || role,
          label: role.label || role.charAt(0).toUpperCase() + role.slice(1),
        })))
      } else if (Array.isArray(response?.data)) {
        setRoles(response.data.map(role => ({
          value: role,
          label: role.charAt(0).toUpperCase() + role.slice(1),
        })))
      } else {
        // Fallback roles if API doesn't provide them
        setRoles([
          { value: 'admin', label: 'Admin' },
          { value: 'teacher', label: 'Teacher' },
          { value: 'accountant', label: 'Accountant' },
          { value: 'counselor', label: 'Counselor' },
          { value: 'staff', label: 'Staff' },
        ])
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      // Fallback to default roles
      setRoles([
        { value: 'admin', label: 'Admin' },
        { value: 'teacher', label: 'Teacher' },
        { value: 'accountant', label: 'Accountant' },
        { value: 'counselor', label: 'Counselor' },
        { value: 'staff', label: 'Staff' },
      ])
    } finally {
      setLoadingRoles(false)
    }
  }

  const fetchUser = async () => {
    setFetching(true)
    try {
      // Using direct api call since authAPI doesn't have getUser method
      const response = await api.get(`/auth/users/${id}`)
      const userData = response?.data?.data || response?.data
      if (userData) {
        const user = userData
        setFormData({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          password: '',
          confirm_password: '',
          role: user.role || 'staff',
          phone_number: user.phone_number || '',
          status: user.status || 'active',
        })
      } else {
        toast.error('Failed to fetch user details')
        navigate('/users')
      }
    } catch (error) {
      toast.error('Failed to fetch user')
      navigate('/users')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      }
      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match'
      }
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.role) newErrors.role = 'Role is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload = { ...formData }
      delete payload.confirm_password
      if (isEdit && !payload.password) {
        delete payload.password
      }

      let response
      if (isEdit) {
        response = await api.put(`/auth/users/${id}`, payload)
      } else {
        response = await api.post('/auth/users', payload)
      }

      if (response?.data?.success || response?.success) {
        toast.success(`User ${isEdit ? 'updated' : 'created'} successfully`)
        navigate('/users')
      } else {
        toast.error(response?.data?.message || response?.message || 'Failed to save user')
      }
    } catch (error) {
      if (error.status === 422) {
        const fieldErrors = error.errors || error.data?.errors || []
        const newErrors = {}
        fieldErrors.forEach(err => {
          const field = err.loc?.[err.loc.length - 1] || 'general'
          newErrors[field] = err.msg
        })
        setErrors(newErrors)
        toast.error('Please fix the validation errors')
      } else if (error.status === 409) {
        toast.error('A user with this email already exists')
      } else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to save user')
      }
      console.error('User save error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner fullScreen />

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in-up">
      <PageHeader
        title={isEdit ? 'Edit User' : 'Add New User'}
        actions={
          <button onClick={() => navigate('/users')} className="btn btn-secondary">
            <ArrowLeft size={18} />
            Back
          </button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="First Name *"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={errors.first_name}
              placeholder="Enter first name"
            />
            <FormInput
              label="Last Name *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={errors.last_name}
              placeholder="Enter last name"
            />
          </div>

          <FormInput
            label="Email Address *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="Enter email address"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Password {isEdit && '(leave blank to keep unchanged)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input pr-10 ${errors.password ? 'error' : ''}`}
                  placeholder={isEdit ? 'New password (optional)' : 'Enter password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>
            <div>
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                placeholder="Confirm password"
              />
              {errors.confirm_password && (
                <p className="form-error">{errors.confirm_password}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Role *"
              name="role"
              value={formData.role}
              onChange={handleChange}
              options={roles}
              error={errors.role}
              disabled={loadingRoles}
            />
            <FormInput
              label="Phone Number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="+211 900 000 000"
            />
          </div>

          {isEdit && (
            <FormSelect
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={statusOptions}
            />
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" loading={loading} icon={<Save size={18} />}>
              {isEdit ? 'Update User' : 'Create User'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/users')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default UserForm
