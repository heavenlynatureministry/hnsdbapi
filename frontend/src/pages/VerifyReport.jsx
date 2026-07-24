import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Shield, CheckCircle, XCircle, ArrowLeft, Home } from 'lucide-react'

function VerifyReport() {
  const { studentId } = useParams()
  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [student, setStudent] = useState(null)
  const [results, setResults] = useState(null)
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
          student_id: data.data.student?.student_id || id,
          class_name: data.data.student?.class_name || 'N/A',
          status: data.data.student?.status || 'active',
          school_name: data.data.school?.name || 'Heavenly Nature Nursery & Primary School',
          verified_at: data.data.verified_at || new Date().toISOString(),
        })
        setResults({
          academic_summary: data.data.academic_summary || {},
          total_exams: data.data.total_exams || 0,
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

  const getGradeBadge = (grade) => {
    const colors = {
      A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700',
      C: 'bg-yellow-100 text-yellow-700', D: 'bg-orange-100 text-orange-700',
      F: 'bg-red-100 text-red-700'
    }
    return colors[grade] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-lg w-full">
        {/* School Header - Logo only, no subtitle */}
        <div className="text-center mb-6">
          <img 
            src="/letter-head.jpg" 
            alt="School Letterhead" 
            className="max-w-full h-auto mx-auto mb-2"
            style={{ maxHeight: '80px' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Certificate Verification
          </h1>
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
              {valid ? '✅ Certificate Verified' : '❌ Invalid Certificate'}
            </h2>
          </div>

          {valid && student && (
            <div className="space-y-3 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {/* Student Details */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Name:</span>
                <span className="font-medium">{student.student_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pupil's ID:</span>
                <span className="font-medium font-mono">{student.student_id}</span>
              </div>
              {student.class_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Class:</span>
                  <span className="font-medium">{student.class_name}</span>
                </div>
              )}

              {/* Results Section */}
              {results?.academic_summary && Object.keys(results.academic_summary).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Academic Results</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-600">
                          <th className="p-2 text-left border-b">Term</th>
                          <th className="p-2 text-center border-b">Subjects</th>
                          <th className="p-2 text-center border-b">Passed</th>
                          <th className="p-2 text-center border-b">Failed</th>
                          <th className="p-2 text-center border-b">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.academic_summary).map(([term, data]) => (
                          <tr key={term} className="border-b border-gray-200 dark:border-gray-600">
                            <td className="p-2 font-medium">{term}</td>
                            <td className="p-2 text-center">{data.subjects || 0}</td>
                            <td className="p-2 text-center text-green-600 font-medium">{data.passed || 0}</td>
                            <td className="p-2 text-center text-red-600 font-medium">{data.failed || 0}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                (data.failed || 0) === 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {(data.failed || 0) === 0 ? 'Pass' : 'Partial'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {results.total_exams > 0 && (
                    <p className="text-xs text-gray-400 mt-2">Total Exams: {results.total_exams}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            {valid ? (
              <p>This is a valid certificate issued by {student?.school_name || 'Heavenly Nature Nursery & Primary School'}.</p>
            ) : (
              <p>{error || 'This certificate could not be verified. The ID may be invalid or the record may not exist.'}</p>
            )}
          </div>

          <div className="text-center text-xs text-gray-400">
            <p>Verified at: {student?.verified_at ? new Date(student.verified_at).toLocaleString() : new Date().toLocaleString()}</p>
            <p className="font-mono">Verification ID: {studentId}</p>
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
