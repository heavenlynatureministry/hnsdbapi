import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Shield, CheckCircle, XCircle, ArrowLeft, Home } from 'lucide-react'

function VerifyReport() {
  const { studentId } = useParams()
  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [student, setStudent] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (studentId) {
      verifyStudent(studentId)
    }
  }, [studentId])

  const verifyStudent = async (id) => {
    setLoading(true)
    setError('')
    try {
      // ✅ Use the PUBLIC verification endpoint at root level (no /api/v1 prefix)
      const response = await fetch(`https://hns-api.onrender.com/verify-report/${id}`)
      const data = await response.json()
      
      if (data?.success && data?.data) {
        setValid(true)
        setStudent({
          student_name: data.data.student?.name || 'N/A',
          class_name: data.data.student?.class_name || 'N/A',
          academic_summary: data.data.academic_summary || {},
          total_exams: data.data.total_exams || 0,
          school_name: data.data.school?.name || '',
          verified_at: data.data.verified_at || new Date().toISOString(),
        })
      } else if (response.status === 404) {
        setValid(false)
        setError('Student not found in our system.')
      } else {
        setValid(false)
        setError(data?.message || 'Could not verify report card.')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setValid(false)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying report card...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full">
        {/* School Header */}
        <div className="text-center mb-6">
          <img 
            src="/letter-head.jpg" 
            alt="School Letterhead" 
            className="max-w-full h-auto mx-auto mb-4"
            style={{ maxHeight: '80px' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Heavenly Nature Nursery & Primary School
          </h1>
          <p className="text-sm text-gray-500">Report Card Verification</p>
        </div>

        {/* Verification Result */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 ${
          valid ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className="text-center mb-4">
            {valid ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle size={32} className="text-red-600" />
              </div>
            )}
            
            <h2 className={`text-lg font-bold ${valid ? 'text-green-700' : 'text-red-700'}`}>
              {valid ? '✅ Report Card Verified' : '❌ Invalid Report Card'}
            </h2>
          </div>

          {valid && student && (
            <div className="space-y-3 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Student Name:</span>
                <span className="font-medium">{student.student_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Student ID:</span>
                <span className="font-medium font-mono">{studentId}</span>
              </div>
              {student.class_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Class:</span>
                  <span className="font-medium">{student.class_name}</span>
                </div>
              )}
              {student.total_exams > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Exams Taken:</span>
                  <span className="font-medium">{student.total_exams}</span>
                </div>
              )}
              {student.academic_summary && Object.keys(student.academic_summary).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Term Summary:</p>
                  {Object.entries(student.academic_summary).map(([term, data]) => (
                    <div key={term} className="flex justify-between text-xs text-gray-500">
                      <span>{term}:</span>
                      <span>{data.subjects} subjects | {data.passed} passed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            {valid ? (
              <p>This is a valid report card issued by {student?.school_name || 'Heavenly Nature Nursery & Primary School'}.</p>
            ) : (
              <p>{error || 'This report card could not be verified. The student ID may be invalid or the record may not exist.'}</p>
            )}
          </div>

          <div className="text-center text-xs text-gray-400">
            <p>Verified at: {student?.verified_at ? new Date(student.verified_at).toLocaleString() : new Date().toLocaleString()}</p>
            <p>Verification ID: {studentId}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/" className="btn btn-secondary inline-flex items-center gap-2 px-4 py-2">
            <Home size={16} /> Dashboard
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-ghost inline-flex items-center gap-2 px-4 py-2">
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Heavenly Nature Nursery & Primary School. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default VerifyReport
