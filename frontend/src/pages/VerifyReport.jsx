import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Shield, CheckCircle, XCircle, ArrowLeft, Home, Award, FileText, CreditCard } from 'lucide-react'

// Graduating classes:
// N3 = Nursery Certificate
// P8 = Primary Testimonial
// S4 = Secondary Testimonial
const CERTIFICATE_CLASSES = ['N3', 'TOP', 'NURSERY 3']
const TESTIMONIAL_CLASSES = ['P8', 'S4', 'PRIMARY 8', 'SENIOR 4']

function VerifyReport() {
  const { studentId, entryId, type, personId } = useParams()
  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [student, setStudent] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [verificationType, setVerificationType] = useState('report') // 'report', 'certificate', 'testimonial', 'id'

  useEffect(() => {
    determineAndVerify()
  }, [studentId, entryId, type, personId])

  const determineAndVerify = async () => {
    setLoading(true)
    setError('')

    try {
      // Determine verification type based on URL params
      if (entryId) {
        // Testimonial verification: /verify/testimonial/:entryId
        await verifyTestimonial(entryId)
      } else if (type && personId) {
        // ID Card verification: /verify/id/:type/:personId
        await verifyIdCard(type, personId)
      } else if (studentId) {
        // Report card verification: /verify-report/:studentId
        await verifyReportCard(studentId)
      } else {
        setError('Invalid verification link')
        setLoading(false)
      }
    } catch (err) {
      console.error('Verification error:', err)
      setValid(false)
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const verifyReportCard = async (id) => {
    try {
      const response = await fetch(`https://hns-api.onrender.com/verify-report/${id}`)
      const data = await response.json()
      
      if (data?.success && data?.data) {
        setValid(true)
        const className = data.data.student?.class_name || ''
        const upperClass = className.toUpperCase()
        
        // Determine verification type
        if (CERTIFICATE_CLASSES.some(c => upperClass.includes(c))) {
          setVerificationType('certificate')
        } else if (TESTIMONIAL_CLASSES.some(c => upperClass.includes(c))) {
          setVerificationType('testimonial')
        } else {
          setVerificationType('report')
        }
        
        setStudent({
          student_name: data.data.student?.name || 'N/A',
          student_id: data.data.student?.student_id || id,
          class_name: className,
          status: data.data.student?.status || 'active',
          school_name: data.data.school?.name || 'Heavenly Nature Nursery & Primary School',
          verified_at: data.data.verified_at || new Date().toISOString(),
        })
        setResults({
          academic_summary: data.data.academic_summary || {},
          total_exams: data.data.total_exams || 0,
          term: data.data.term || '',
          academic_year: data.data.academic_year || '',
        })
      } else if (response.status === 404) {
        setValid(false)
        setError('Student not found in our system.')
      } else {
        setValid(false)
        setError(data?.message || 'Could not verify.')
      }
    } catch (error) {
      setValid(false)
      setError('Network error. Please check your connection and try again.')
    }
  }

  const verifyTestimonial = async (id) => {
    setVerificationType('testimonial')
    try {
      const response = await fetch(`https://hns-api.onrender.com/api/v1/exams/entries/${id}/verify`)
      const data = await response.json()
      
      if (data?.success && data?.data) {
        setValid(true)
        setStudent({
          student_name: data.data.student_name || 'N/A',
          student_id: data.data.index_number || id,
          class_name: data.data.section || '',
          status: 'active',
          school_name: 'Heavenly Nature Nursery & Primary School',
          verified_at: new Date().toISOString(),
          exam_type: data.data.exam_type || 'Testimonial',
          index_number: data.data.index_number || '',
          centre_number: data.data.centre_number || '',
          result: data.data.result || '',
          percentage: data.data.percentage || 0,
          total_score: data.data.total_score || 0,
          subjects: data.data.subjects || [],
          academic_year: data.data.academic_year || '',
        })
      } else if (response.status === 404) {
        setValid(false)
        setError('Testimonial not found in our system.')
      } else {
        setValid(false)
        setError(data?.message || 'Could not verify testimonial.')
      }
    } catch (error) {
      setValid(false)
      setError('Network error. Please check your connection and try again.')
    }
  }

  const verifyIdCard = async (personType, id) => {
    setVerificationType('id')
    try {
      let endpoint = ''
      switch (personType) {
        case 'student':
          endpoint = `https://hns-api.onrender.com/api/v1/students/${id}`
          break
        case 'teacher':
          endpoint = `https://hns-api.onrender.com/api/v1/teachers/${id}`
          break
        case 'board':
          endpoint = `https://hns-api.onrender.com/api/v1/school/board/${id}`
          break
        default:
          setValid(false)
          setError('Invalid ID card type.')
          return
      }
      
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (data?.success && data?.data) {
        setValid(true)
        const person = data.data
        setStudent({
          student_name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'N/A',
          student_id: person.student_id_number || person.employee_id || person.board_member_id || id,
          class_name: person.class_name || person.position || personType,
          status: person.status || 'active',
          school_name: 'Heavenly Nature Nursery & Primary School',
          verified_at: new Date().toISOString(),
          person_type: personType,
          photo_url: person.photo_url || '',
        })
      } else if (response.status === 404) {
        setValid(false)
        setError(`${personType.charAt(0).toUpperCase() + personType.slice(1)} ID not found.`)
      } else {
        setValid(false)
        setError(data?.message || 'Could not verify ID card.')
      }
    } catch (error) {
      setValid(false)
      setError('Network error. Please check your connection and try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying document...</p>
        </div>
      </div>
    )
  }

  // Dynamic labels based on verification type
  const labels = {
    certificate: {
      title: 'Certificate Verification',
      icon: <Award size={24} />,
      verified: 'Certificate Verified',
      invalid: 'Invalid Certificate',
      validMsg: `This is a valid certificate issued by ${student?.school_name || 'Heavenly Nature Nursery & Primary School'}.`,
      invalidMsg: 'This certificate could not be verified. The ID may be invalid or the record may not exist.',
      award: 'Certificate of Nursery Education',
    },
    testimonial: {
      title: 'Testimonial Verification',
      icon: <Award size={24} />,
      verified: 'Testimonial Verified',
      invalid: 'Invalid Testimonial',
      validMsg: `This is a valid testimonial issued by ${student?.school_name || 'Heavenly Nature Nursery & Primary School'}.`,
      invalidMsg: 'This testimonial could not be verified. The ID may be invalid or the record may not exist.',
      award: student?.exam_type || 'Testimonial',
    },
    id: {
      title: 'ID Card Verification',
      icon: <CreditCard size={24} />,
      verified: 'ID Card Verified',
      invalid: 'Invalid ID Card',
      validMsg: `This is a valid ID card issued by ${student?.school_name || 'Heavenly Nature Nursery & Primary School'}.`,
      invalidMsg: 'This ID card could not be verified. The ID may be invalid or the record may not exist.',
      award: null,
    },
    report: {
      title: 'Report Card Verification',
      icon: <FileText size={24} />,
      verified: 'Report Card Verified',
      invalid: 'Invalid Report Card',
      validMsg: `This is a valid report card issued by ${student?.school_name || 'Heavenly Nature Nursery & Primary School'}.`,
      invalidMsg: 'This report card could not be verified. The student ID may be invalid or the record may not exist.',
      award: null,
    },
  }

  const l = labels[verificationType]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-lg w-full">
        {/* School Header */}
        <div className="text-center mb-6">
          <img 
            src="/letter-head.jpg" 
            alt="School Letterhead" 
            className="max-w-full h-auto mx-auto mb-2"
            style={{ maxHeight: '80px' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
            {l.icon}
            {l.title}
          </h1>
        </div>

        {/* Verification Result */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 ${
          valid ? 'border-green-500' : 'border-red-500'
        } animate-fade-in-up`}>
          <div className="text-center mb-4">
            {valid ? (
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <XCircle size={32} className="text-red-600" />
              </div>
            )}
            
            <h2 className={`text-lg font-bold ${valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {valid ? l.verified : l.invalid}
            </h2>
          </div>

          {valid && student && (
            <div className="space-y-3 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {/* Photo for ID cards */}
              {verificationType === 'id' && student.photo_url && (
                <div className="flex justify-center mb-3">
                  <img 
                    src={student.photo_url} 
                    alt={student.student_name}
                    className="w-24 h-32 object-cover rounded-lg border-2 border-gray-300"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}

              {/* Student Details */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Name:</span>
                <span className="font-medium">{student.student_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {verificationType === 'testimonial' ? 'Index No:' : 
                   verificationType === 'id' ? 'ID Number:' : "Pupil's ID:"}
                </span>
                <span className="font-medium font-mono text-xs">{student.student_id}</span>
              </div>
              
              {/* Testimonial specific fields */}
              {verificationType === 'testimonial' && (
                <>
                  {student.centre_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Centre No:</span>
                      <span className="font-medium font-mono text-xs">{student.centre_number}</span>
                    </div>
                  )}
                  {student.academic_year && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Academic Year:</span>
                      <span className="font-medium">{student.academic_year}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Score:</span>
                    <span className="font-medium">{student.total_score}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Percentage:</span>
                    <span className="font-medium">{student.percentage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Result:</span>
                    <span className={`font-bold ${student.result === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                      {student.result}
                    </span>
                  </div>
                </>
              )}

              {/* ID Card specific fields */}
              {verificationType === 'id' && (
                <>
                  {student.class_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {student.person_type === 'student' ? 'Class:' : 
                         student.person_type === 'teacher' ? 'Department:' : 'Position:'}
                      </span>
                      <span className="font-medium">{student.class_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="font-medium capitalize">{student.person_type}</span>
                  </div>
                </>
              )}

              {/* Report Card specific fields */}
              {verificationType === 'report' && student.class_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Class:</span>
                  <span className="font-medium">{student.class_name}</span>
                </div>
              )}

              {l.award && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Award:</span>
                  <span className="font-medium text-green-600">{l.award}</span>
                </div>
              )}

              {/* Testimonial Subjects */}
              {verificationType === 'testimonial' && student.subjects?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Subject Results</p>
                  <div className="space-y-1">
                    {student.subjects.map((s, i) => (
                      <div key={i} className="flex justify-between text-xs bg-white dark:bg-gray-600 rounded px-3 py-1.5">
                        <span>{s.name}</span>
                        <span className="font-medium">{s.score || 0} ({s.grade || '-'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Academic Results Section for Report Cards */}
              {verificationType === 'report' && results?.academic_summary && Object.keys(results.academic_summary).length > 0 && (
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
              <p>{l.validMsg}</p>
            ) : (
              <p>{error || l.invalidMsg}</p>
            )}
          </div>

          <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
            <Shield size={12} className="text-green-600" />
            <span>Verified at: {student?.verified_at ? new Date(student.verified_at).toLocaleString() : new Date().toLocaleString()}</span>
          </div>
          <p className="text-center text-xs text-gray-400 font-mono mt-1">
            Verification ID: {studentId || entryId || personId}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/" className="btn btn-secondary inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm">
            <Home size={16} /> Home
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-ghost inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm">
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
