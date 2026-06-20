import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, Send, CheckCircle } from 'lucide-react'
import authAPI from '../../api/auth'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate email
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    try {
      const response = await authAPI.forgotPassword(email)
      if (response.success) {
        setSent(true)
      }
    } catch (error) {
      setError(error.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Login
        </Link>

        {/* Card */}
        <div className="card animate-fade-in-up">
          {!sent ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 mb-4">
                  <Mail className="text-primary-600 dark:text-primary-400" size={28} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Forgot Password?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Enter your email address and we'll send you a link to reset
                  your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`form-input ${error ? 'error' : ''}`}
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                  />
                  {error && <p className="form-error">{error}</p>}
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
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Send Reset Link
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
                Check Your Email
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                If an account exists for <strong>{email}</strong>, we've sent a
                password reset link. Please check your inbox and spam folder.
              </p>
              <Link
                to="/login"
                className="btn btn-primary mt-6 inline-flex"
              >
                Return to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword