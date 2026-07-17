import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Shield, CheckCircle, XCircle, ArrowLeft, Home, 
  User, BookOpen, Award, Calendar, Clock, AlertCircle,
  Download, Printer, Eye
} from 'lucide-react'

function VerifyReport() {
  const { studentId } = useParams()
  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [error, setError] = useState('')
  const [showFullReport, setShowFullReport] = useState(false)

  useEffect(() => {
    if (studentId) {
      verifyStudent(studentId)
    }
  }, [studentId])

  const verifyStudent = async (id) => {
    setLoading(true)
    setError('')
    setValid(false)
    setReportData(null)
    
    try {
      // ✅ Use the PUBLIC verification endpoint (no auth required)
      const API_URL = import.meta.env.VITE_API_URL || 'https://hns-api.onrender.com'
      const response = await fetch(`${API_URL}/verify-report/${id}`)
      const data = await response.json()
      
      if (response.status === 404) {
        setValid(false)
        setError(data?.detail?.message || 'Student not found in our system.')
        return
      }
      
      if (!response.ok) {
        setValid(false)
        setError(data?.detail || data?.message || 'Could not verify report card.')
        return
      }
      
      if (data?.success && data?.data) {
        setValid(true)
        setReportData({
          student: data.data.student || {},
          results: data.data.results || {},
          term: data.data.term || 'Term 1',
          academic_year: data.data.academic_year || '',
          attendance: data.data.attendance || {},
          school: data.data.school || {},
          verified_at: data.data.verified_at || new Date().toISOString(),
          verification_id: data.data.verification_id || id,
        })
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

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Simple download as JSON or you can generate PDF
    const dataStr = JSON.stringify(reportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `report-card-${studentId}.json`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying report card...</p>
          <p className="text-sm text-gray-400 mt-1">Please wait while we validate your document</p>
        </div>
      </div>
    )
  }

  // Invalid State
  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          {/* School Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Heavenly Nature Nursery & Primary School
            </h1>
            <p className="text-sm text-gray-500">Report Card Verification</p>
          </div>

          {/* Error Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-red-500">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle size={32} className="text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-red-700 dark:text-red-400">
                ❌ Invalid Report Card
              </h2>
            </div>

            <div className="text-center text-sm text-gray-600 dark:text-gray-300 mb-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
              <AlertCircle size={20} className="inline-block mr-2 text-red-500" />
              <span>{error || 'Student not found in our system.'}</span>
            </div>

            <div className="text-center text-xs text-gray-400">
              <p>Verified at: {new Date().toLocaleString()}</p>
              <p>Verification ID: {studentId}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center mt-6">
            <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Home size={16} /> Dashboard
            </Link>
            <button 
              onClick={() => window.history.back()} 
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
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

  // Valid State - Full Report Display
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Print Styles */}
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .shadow-lg { box-shadow: none !important; }
            .border-2 { border-width: 1px !important; }
            body { background: white !important; }
            .bg-gray-50 { background: white !important; }
            .dark\\:bg-gray-800 { background: white !important; }
            .dark\\:bg-gray-900 { background: white !important; }
            .dark\\:text-white { color: black !important; }
            .dark\\:text-gray-300 { color: #333 !important; }
          }
          .print-only { display: none; }
        `}</style>

        {/* School Header */}
        <div className="text-center mb-6">
          <img 
            src="/letter-head.jpg" 
            alt="School Letterhead" 
            className="max-w-full h-auto mx-auto mb-4"
            style={{ maxHeight: '80px' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {reportData?.school?.name || 'Heavenly Nature Nursery & Primary School'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Report Card Verification • {reportData?.academic_year || '2026'}
          </p>
        </div>

        {/* Verification Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full text-sm font-medium">
            <CheckCircle size={18} />
            Verified & Authentic
          </div>
        </div>

        {/* Main Report Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-green-500 overflow-hidden">
          {/* Student Info Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Student Name</label>
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  {reportData?.student?.name || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Student ID</label>
                <p className="font-mono font-medium text-gray-900 dark:text-white">
                  {reportData?.verification_id || studentId}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Class</label>
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen size={16} className="text-gray-400" />
                  {reportData?.student?.class_name || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Subject Results */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award size={18} className="text-blue-600" />
              Academic Results
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">Subject</th>
                    <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">Score</th>
                    <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">Max</th>
                    <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">%</th>
                    <th className="text-center py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData?.results?.subjects?.length > 0 ? (
                    reportData.results.subjects.map((subject, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 px-3 text-gray-800 dark:text-gray-200">{subject.name}</td>
                        <td className="text-right py-2 px-3 text-gray-800 dark:text-gray-200">{subject.score?.toFixed?.(1) || subject.score || 0}</td>
                        <td className="text-right py-2 px-3 text-gray-800 dark:text-gray-200">{subject.max_score || 100}</td>
                        <td className="text-right py-2 px-3 font-medium">
                          <span className={`${
                            subject.percentage >= 70 ? 'text-green-600 dark:text-green-400' :
                            subject.percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {subject.percentage || 0}%
                          </span>
                        </td>
                        <td className="text-center py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            subject.grade === 'A' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            subject.grade === 'B' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            subject.grade === 'C' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                            subject.grade === 'D' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {subject.grade || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No subject results available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Score</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {reportData?.results?.total_score?.toFixed?.(1) || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Overall Percentage</p>
              <p className={`text-lg font-bold ${
                (reportData?.results?.percentage || 0) >= 70 ? 'text-green-600 dark:text-green-400' :
                (reportData?.results?.percentage || 0) >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {reportData?.results?.percentage || 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Grade</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {reportData?.results?.grade || 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Position</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {reportData?.results?.position || 'N/A'} / {reportData?.results?.out_of || 'N/A'}
              </p>
            </div>
          </div>

          {/* Remarks & Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remarks</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{reportData?.results?.remarks || 'No remarks'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Attendance</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {reportData?.attendance?.present_days || 0} / {reportData?.attendance?.total_days || 0} days present
                {reportData?.attendance?.attendance_rate && (
                  <span className={`ml-2 text-xs font-medium ${
                    (reportData?.attendance?.attendance_rate || 0) >= 80 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    ({reportData.attendance.attendance_rate}%)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 text-center">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <p><Clock size={12} className="inline mr-1" /> Verified: {reportData?.verified_at ? new Date(reportData.verified_at).toLocaleString() : new Date().toLocaleString()}</p>
              <p><Shield size={12} className="inline mr-1" /> ID: {reportData?.verification_id || studentId}</p>
              <p><Calendar size={12} className="inline mr-1" /> Term: {reportData?.term || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center mt-6 no-print">
          <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Home size={16} /> Dashboard
          </Link>
          <button 
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Printer size={16} /> Print
          </button>
          <button 
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Download size={16} /> Download JSON
          </button>
          <button 
            onClick={() => window.history.back()} 
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6 no-print">
          © {new Date().getFullYear()} Heavenly Nature Nursery & Primary School. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default VerifyReport
