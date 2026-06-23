import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import reportsAPI from '../../api/reports'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

function AnnualReport() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Annual School Report')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Reports', path: '/reports' },
      { label: 'Annual Report' },
    ])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)
    setGenerated(false)
    
    try {
      const response = await reportsAPI.getAnnualReport()
      
      if (response?.success && response.data) {
        setReportData(response.data)
        setGenerated(true)
      } else if (response?.data) {
        setReportData(response.data)
        setGenerated(true)
      } else {
        toast.error('Failed to generate report. No data available.')
      }
    } catch (error) {
      console.error('Failed to generate annual report:', error)
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to generate report')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    if (reportRef.current && reportData) {
      exportToPDF(reportRef.current, `Annual_Report_${(reportData.academic_year || '2024_2025').replace('/', '_')}`)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="Annual School Report"
        subtitle="Comprehensive yearly report"
        actions={
          <button onClick={() => navigate('/reports')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <div className="flex gap-3">
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<FileText size={18} />}>
            Generate Annual Report
          </Button>
          {generated && (
            <Button onClick={handleExportPDF} variant="secondary" icon={<Download size={18} />}>
              Export PDF
            </Button>
          )}
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {!loading && !generated && (
        <div className="text-center py-12">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Click "Generate Annual Report" to view the comprehensive yearly report.</p>
        </div>
      )}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          <Card title={`Annual Report - ${reportData.academic_year || '2024/2025'}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Students', value: reportData.enrollment?.total_students || 0 },
                { label: 'Pass Rate', value: `${reportData.academic?.overall_pass_rate || 0}%` },
                { label: 'Attendance', value: `${reportData.attendance?.overall_rate || 0}%` },
                { label: 'Balance', value: `SSP ${(reportData.financial?.balance || 0).toLocaleString()}` },
              ].map((stat, i) => (
                <div key={i} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-primary-600">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>

          {reportData.highlights?.achievements && reportData.highlights.achievements.length > 0 && (
            <Card title="Achievements">
              <ul className="list-disc list-inside space-y-2">
                {reportData.highlights.achievements.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{item}</li>
                ))}
              </ul>
            </Card>
          )}

          {reportData.highlights?.challenges && reportData.highlights.challenges.length > 0 && (
            <Card title="Challenges">
              <ul className="list-disc list-inside space-y-2">
                {reportData.highlights.challenges.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{item}</li>
                ))}
              </ul>
            </Card>
          )}

          {reportData.highlights?.recommendations && reportData.highlights.recommendations.length > 0 && (
            <Card title="Recommendations">
              <ul className="list-disc list-inside space-y-2">
                {reportData.highlights.recommendations.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{item}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default AnnualReport
