import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import studentsAPI from '../../api/students'
import classesAPI from '../../api/classes'
import { exportCertificate } from '../../utils/exportCertificate'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import PhotoCapture from '../../components/common/PhotoCapture'
import { ArrowLeft, Printer, Award, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function CertificateForm() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [studentData, setStudentData] = useState(null)
  const [classData, setClassData] = useState(null)
  const [academicYear, setAcademicYear] = useState('2026/2027')
  const [reportData, setReportData] = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    updatePageTitle('Nursery Certificate')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Report Cards', path: '/report' },
      { label: 'Certificate' },
    ])
    if (studentId) fetchData()
  }, [studentId])

  const fetchData = async () => {
    setFetching(true)
    try {
      // Fetch student
      const studentRes = await studentsAPI.getById(studentId)
      if (studentRes?.success && studentRes.data) {
        setStudentData(studentRes.data)
        setPhotoUrl(studentRes.data.photo_url || '')
        
        // Fetch class
        const classId = studentRes.data.class_id || studentRes.data.class
        if (classId) {
          const classRes = await classesAPI.getById(classId)
          if (classRes?.success) setClassData(classRes.data)
        }
        
        // Fetch annual report
        const reportRes = await studentsAPI.getStudentAnnualReport(studentId)
        if (reportRes?.success && reportRes.data) {
          setReportData(reportRes.data)
        }
      } else {
        toast.error('Failed to load student data')
        navigate('/report')
      }
    } catch (error) {
      console.error('Failed to fetch:', error)
      toast.error('Failed to load data')
    } finally {
      setFetching(false)
    }
  }

  const handlePhotoCapture = async (photoData) => {
    if (photoData) {
      setPhotoUrl(photoData)
      try {
        await studentsAPI.uploadPhoto(studentId, photoData)
        toast.success('Photo saved successfully')
      } catch (error) {
        console.error('Failed to save photo:', error)
      }
    }
  }

  const handlePrint = () => {
    if (!reportData) {
      toast.error('No report data available')
      return
    }
    
    exportCertificate({
      ...reportData,
      student: {
        ...reportData.student,
        photo_url: photoUrl,
        ...studentData
      },
      academic_year: academicYear,
    })
  }

  const getPromotedClass = () => {
    const level = (classData?.class_level || classData?.name || '').toLowerCase()
    if (level.includes('baby') || level.includes('nursery 1')) return 'Nursery 2'
    if (level.includes('nursery 2') || level.includes('middle')) return 'Nursery 3'
    if (level.includes('nursery 3') || level.includes('top')) return 'P1'
    return 'P1'
  }

  if (fetching) return <LoadingSpinner fullScreen />

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="Certificate of Nursery Education"
        subtitle={studentData ? `${studentData.first_name} ${studentData.last_name}` : ''}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/report')} className="btn btn-secondary">
              <ArrowLeft size={18} /> Back
            </button>
            <Button onClick={handlePrint} variant="primary" icon={<Printer size={18} />}>
              Preview & Print Certificate
            </Button>
          </div>
        }
      />

      {/* Student Info */}
      <Card title="Student Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Academic Year
              </label>
              <FormSelect
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                options={[
                  { value: '2026/2027', label: '2026/2027' },
                  { value: '2025/2026', label: '2025/2026' },
                ]}
              />
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <CheckCircle size={18} /> Student Details
              </h4>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {studentData?.first_name} {studentData?.last_name}</p>
                <p><strong>Pupil's ID:</strong> <span className="font-mono">{studentData?.student_id}</span></p>
                <p><strong>Class:</strong> {classData?.class_name || 'N/A'}</p>
                <p><strong>Promoted to:</strong> <span className="text-green-600 font-bold">{getPromotedClass()}</span></p>
                <p><strong>Date of Award:</strong> {new Date().toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
              </div>
            </div>
          </div>
          
          <div>
            <PhotoCapture onPhotoCapture={handlePhotoCapture} initialPhoto={photoUrl} />
            <p className="text-xs text-gray-500 mt-2">
              Take or upload a passport photo for the certificate
            </p>
          </div>
        </div>
      </Card>

      {/* Term Results Summary */}
      {reportData && (
        <Card title="Term Results Summary">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['term1', 'term2', 'term3'].map((term, i) => (
              <div key={term} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium mb-2">Term {i + 1}</h4>
                {reportData[term]?.subjects ? (
                  <div className="space-y-1 text-sm">
                    <p><strong>Total:</strong> {reportData[term].total_score || 'N/A'}</p>
                    <p><strong>Percentage:</strong> {reportData[term].percentage || 'N/A'}%</p>
                    <p>
                      <strong>Result:</strong>{' '}
                      <span className={reportData[term].result === 'Pass' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {reportData[term].result || 'N/A'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </div>
            ))}
          </div>

          {/* Annual Summary */}
          {reportData.annual_summary && (
            <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200">
              <h4 className="font-medium text-primary-800 dark:text-primary-200 mb-2">
                Annual Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Average</p>
                  <p className="font-bold">{reportData.annual_summary.average_percentage || 'N/A'}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Grade</p>
                  <p className="font-bold">{reportData.annual_summary.grade || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-bold text-green-600">
                    {reportData.annual_summary.promotion_status || 'Promoted'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Next Class</p>
                  <p className="font-bold">{reportData.annual_summary.next_class || getPromotedClass()}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Certificate Preview Info */}
      <Card title="Certificate Preview">
        <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border-4 border-double border-amber-300 dark:border-amber-700 rounded-lg">
          <div className="text-center">
            <Award size={48} className="mx-auto text-amber-600 mb-3" />
            <h3 className="text-xl font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider">
              Certificate of Nursery Education
            </h3>
            <p className="text-sm text-amber-600 mt-2">{academicYear}</p>
            <div className="mt-4 p-3 bg-white/50 rounded">
              <p className="text-lg font-bold">
                {studentData?.first_name} {studentData?.last_name}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Pupil's ID: {studentData?.student_id}
              </p>
            </div>
            <p className="text-sm mt-4 text-gray-600">
              This certificate will include photo, QR code, all three term results, and signatures
            </p>
          </div>
        </div>
      </Card>

      {/* Print Button */}
      <div className="flex gap-3 justify-end">
        <Button onClick={handlePrint} variant="primary" icon={<Printer size={18} />} size="lg">
          Preview & Print Certificate
        </Button>
        <Button variant="secondary" onClick={() => navigate('/report')} size="lg">
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default CertificateForm
