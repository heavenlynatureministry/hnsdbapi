import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import authAPI from '../../api/auth'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, Eye, EyeOff, Shield } from 'lucide-react'
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

  // Updated roles with all available options
  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'counselor', label: 'Counselor' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'staff', label: 'General Staff' },
    { value: 'librarian', label: 'Librarian' },
  ]

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]

  // Role descriptions for better UX
  const roleDescriptions = {
    admin: 'Full system access and management',
    teacher: 'Class, attendance, and exam management',
    accountant: 'Financial management and reports',
    counselor: 'Student counseling and guidance',
    secretary: 'Student enrollment and records',
    staff: 'Basic view access',
    librarian: 'Library and book management',
  }

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

  useEffect(() => {
    updatePageTitle(isEdit ? 'Edit User' : 'Add User')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Users', path: '/users' },
      { label: isEdit ? 'Edit User' : 'Add User' },
    ])
  }, [isEdit, updatePageTitle, updateBreadcrumbs])

  useEffect(() => {
    if (isEdit && id) {
      fetchUser()
    } else {
      setFetching(false)
    }
  }, [id, isEdit])

  const fetchUser = async () => {
    setFetching(true)
    try {
      // Try to get user by ID from the users endpoint
      const response = await authAPI.getUser(id)
      console.log('User response:', response)
      
      let userData = null
      
      // Handle different response formats
      if (response?.data?.data) {
        userData = response.data.data
      } else if (response?.data) {
        userData = response.data
      } else if (response?.success && response?.data) {
        userData = response.data
      }
      
      if (userData) {
        setFormData({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          password: '',
          confirm_password: '',
          role: userData.role || 'staff',
          phone_number: userData.phone_number || '',
          status: userData.status || 'active',
        })
      } else {
        toast.error('User not found')
        navigate('/users')
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      
      if (error.status === 404) {
        toast.error('User not found')
      } else {
        toast.error('Failed to fetch user details')
      }
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

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!isEdit) {
      // Creating new user - password is required
      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }
      
      if (formData.password && formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match'
      }
    } else {
      // Editing user - password is optional
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }
      
      if (formData.password && formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match'
      }
    }

    if (!formData.role) {
      newErrors.role = 'Role is required'
    }

    // Phone number validation (optional but validate format if provided)
    if (formData.phone_number && !/^[\+]?[\d\s\-\(\)]{7,15}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      // Build payload
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        phone_number: formData.phone_number.trim(),
      }

      // Only include password if provided
      if (formData.password) {
        payload.password = formData.password
      }

      // Only include status for edit
      if (isEdit) {
        payload.status = formData.status
      }

      console.log('Saving user payload:', { ...payload, password: payload.password ? '***' : undefined })

      let response
      if (isEdit) {
        response = await authAPI.updateUser(id, payload)
      } else {
        response = await authAPI.createUser(payload)
      }

      console.log('Save response:', response)

      // Handle different response formats
      const success = response?.success || response?.data?.success
      const message = response?.message || response?.data?.message

      if (success) {
        toast.success(message || `User ${isEdit ? 'updated' : 'created'} successfully`)
        navigate('/users')
      } else {
        toast.error(message || 'Failed to save user')
      }
    } catch (error) {
      console.error('User save error:', error)
      
      // Handle validation errors (422)
      if (error.status === 422 || error.response?.status === 422) {
        const fieldErrors = error.errors || error.data?.errors || error.response?.data?.errors || []
        const newErrors = {}
        
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach(err => {
            const field = err.loc?.[err.loc.length - 1] || err.field || 'general'
            newErrors[field] = err.msg || err.message
          })
        }
        
        setErrors(newErrors)
        toast.error('Please fix the validation errors')
      } 
      // Handle duplicate email (409)
      else if (error.status === 409 || error.response?.status === 409) {
        setErrors(prev => ({ ...prev, email: 'A user with this email already exists' }))
        toast.error('A user with this email already exists')
      } 
      // Handle bad request (400)
      else if (error.status === 400 || error.response?.status === 400) {
        const detail = error.response?.data?.detail || error.message || 'Invalid data'
        toast.error(detail)
      }
      // Handle server down (0)
      else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } 
      // Generic error
      else {
        const errorMsg = error.response?.data?.detail || error.message || 'Failed to save user'
        toast.error(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner />

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in-up">
      <PageHeader
        title={isEdit ? 'Edit User' : 'Add New User'}
        subtitle={isEdit ? `Editing ${formData.first_name} ${formData.last_name}` : 'Create a new user account'}
        actions={
          <button onClick={() => navigate('/users')} className="btn btn-secondary">
            <ArrowLeft size={18} />
            Back to Users
          </button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Fields */}
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

          {/* Email */}
          <FormInput
            label="Email Address *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="user@school.edu"
            helperText="This will be used for login"
          />

          {/* Password Fields */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {isEdit ? 'Change Password (optional)' : 'Password *'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  {isEdit ? 'New Password' : 'Password'} {!isEdit && '*'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`form-input pr-10 ${errors.password ? 'error' : ''}`}
                    placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password (min 6 characters)'}
                    autoComplete={isEdit ? 'new-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password}</p>}
                {!isEdit && (
                  <p className="form-helper">Minimum 6 characters</p>
                )}
              </div>
              <div>
                <label className="form-label">
                  Confirm Password {!isEdit && '*'}
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
                {errors.confirm_password && (
                  <p className="form-error">{errors.confirm_password}</p>
                )}
              </div>
            </div>
          </div>

          {/* Role and Phone */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Role & Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormSelect
                  label="Role *"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  options={roles}
                  error={errors.role}
                />
                {/* Show role description */}
                {formData.role && roleDescriptions[formData.role] && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Shield size={12} />
                    {roleDescriptions[formData.role]}
                  </p>
                )}
              </div>
              <FormInput
                label="Phone Number"
                name="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={handleChange}
                error={errors.phone_number}
                placeholder="+211 900 000 000"
                helperText="Optional contact number"
              />
            </div>
          </div>

          {/* Status (Edit only) */}
          {isEdit && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Account Status
              </h3>
              <FormSelect
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                options={statusOptions}
                helperText="Inactive accounts cannot login"
              />
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              type="submit" 
              variant="primary" 
              loading={loading} 
              icon={<Save size={18} />}
              disabled={loading}
            >
              {loading 
                ? (isEdit ? 'Updating...' : 'Creating...') 
                : (isEdit ? 'Update User' : 'Create User')
              }
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => navigate('/users')}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default UserForm
