import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import authAPI from '../../api/auth'

function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Password strength indicators
  const getPasswordStrength = (password) => {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
    return score
  }

  const strengthScore = getPasswordStrength(formData.new_password)
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const strengthColors = [
    '',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-emerald-500',
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.new_password) {
      newErrors.new_password = 'New password is required'
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters'
    } else if (strengthScore < 3) {
      newErrors.new_password = 'Password is too weak. Include uppercase, lowercase, number, and special character.'
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password'
    } else if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await authAPI.resetPassword({
        token,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password,
      })

      if (response.success) {
        setSuccess(true)
        toast.success('Password reset successfully!')
        setTimeout(() => navigate('/login'), 3000)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to reset password')
      setErrors({ general: error.message || 'Failed to reset password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Login
        </Link>

        <div className="card animate-fade-in-up">
          {!success ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 mb-4">
                  <Lock className="text-primary-600 dark:text-primary-400" size={28} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Reset Password
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Please enter your new password below.
                </p>
              </div>

              {errors.general && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg mb-4">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label htmlFor="new_password" className="form-label">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="new_password"
                      name="new_password"
                      value={formData.new_password}
                      onChange={handleChange}
                      className={`form-input pr-10 ${errors.new_password ? 'error' : ''}`}
                      placeholder="Enter new password"
                      autoFocus
                      disabled={loading}
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
                  {errors.new_password && (
                    <p className="form-error">{errors.new_password}</p>
                  )}

                  {/* Password Strength */}
                  {formData.new_password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full ${
                              level <= strengthScore
                                ? strengthColors[strengthScore]
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Strength: {strengthLabels[strengthScore]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirm_password" className="form-label">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                    placeholder="Confirm new password"
                    disabled={loading}
                  />
                  {errors.confirm_password && (
                    <p className="form-error">{errors.confirm_password}</p>
                  )}
                  {formData.new_password &&
                    formData.confirm_password &&
                    formData.new_password === formData.confirm_password && (
                      <p className="text-xs text-green-600 mt-1">
                        Passwords match ✓
                      </p>
                    )}
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password Requirements:
                  </p>
                  <ul className="space-y-1">
                    {[
                      {
                        label: 'At least 8 characters',
                        met: formData.new_password.length >= 8,
                      },
                      {
                        label: 'One uppercase letter',
                        met: /[A-Z]/.test(formData.new_password),
                      },
                      {
                        label: 'One lowercase letter',
                        met: /[a-z]/.test(formData.new_password),
                      },
                      {
                        label: 'One number',
                        met: /\d/.test(formData.new_password),
                      },
                      {
                        label: 'One special character',
                        met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.new_password),
                      },
                    ].map((req, index) => (
                      <li
                        key={index}
                        className={`text-xs flex items-center gap-1 ${
                          req.met
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {req.met ? '✓' : '○'} {req.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full py-3"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <CheckCircle className="text-green-600 dark:text-green-400" size={28} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Password Reset Successful!
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Your password has been successfully reset. You will be
                redirected to the login page shortly.
              </p>
              <Link to="/login" className="btn btn-primary mt-6 inline-flex">
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword