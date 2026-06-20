import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, LogIn, School } from 'lucide-react'
import toast from 'react-hot-toast'

function LoginPage() {
  const { login, loading } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember_me: false,
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const result = await login({
        email: formData.email.trim(),
        password: formData.password,
        remember_me: formData.remember_me,
      })
      
      // If login returns error, show it
      if (result && !result.success) {
        toast.error(result.message || 'Login failed')
      }
    } catch (error) {
      // Only show if not already shown by AuthContext
      if (error.message && error.message !== 'Invalid email or password') {
        toast.error('Connection error. Server may be waking up. Please wait 30 seconds and try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-600 text-white shadow-lg mb-4">
            <School size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Heavenly Nature School</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Management System</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mt-2">Nurturing Right Leaders</p>
        </div>

        <div className="card animate-fade-in-up-delay-1">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Welcome Back</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email"
                autoComplete="email"
                autoFocus
                disabled={isSubmitting}
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="form-label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input pr-10 ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password}</p>}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember_me"
                name="remember_me"
                checked={formData.remember_me}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                disabled={isSubmitting}
              />
              <label htmlFor="remember_me" className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</label>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full py-3 text-base">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} /> Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
          &copy; {new Date().getFullYear()} Heavenly Nature Nursery & Primary School. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
