import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { exportToPDF } from '../../utils/exportPDF'

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
    setTimeout(() => {
      setReportData({
        academic_year: '2024/2025',
        enrollment: { total_students: 180, new_enrollments: 35 },
        academic: { overall_pass_rate: 85, class_average: 72.5 },
        attendance: { overall_rate: 88.5 },
        financial: { total_income: 450000, total_expenses: 320000, balance: 130000 },
        highlights: {
          achievements: [
            'Successfully completed academic year 2024/2025',
            'Enrolled 180 students across 11 classes',
            'Maintained 88.5% attendance rate',
            '85% overall pass rate in examinations',
          ],
          challenges: [
            'Need for additional classroom space',
            'Teacher recruitment for specialized subjects',
          ],
          recommendations: [
            'Continue improving academic performance',
            'Enhance teacher professional development',
            'Strengthen parent-teacher communication',
            'Upgrade school facilities and resources',
          ],
        },
      })
      setLoading(false)
      setGenerated(true)
    }, 1200)
  }

  const handleExportPDF = () => {
    exportToPDF(reportRef.current, `Annual_Report_${reportData.academic_year.replace('/', '_')}`)
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

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          <Card title={`Annual Report - ${reportData.academic_year}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Students', value: reportData.enrollment.total_students },
                { label: 'Pass Rate', value: `${reportData.academic.overall_pass_rate}%` },
                { label: 'Attendance', value: `${reportData.attendance.overall_rate}%` },
                { label: 'Balance', value: `SSP ${reportData.financial.balance.toLocaleString()}` },
              ].map((stat, i) => (
                <div key={i} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-primary-600">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Achievements">
            <ul className="list-disc list-inside space-y-2">
              {reportData.highlights.achievements.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{item}</li>
              ))}
            </ul>
          </Card>

          <Card title="Challenges">
            <ul className="list-disc list-inside space-y-2">
              {reportData.highlights.challenges.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{item}</li>
              ))}
            </ul>
          </Card>

          <Card title="Recommendations">
            <ul className="list-disc list-inside space-y-2">
              {reportData.highlights.recommendations.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{item}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}

export default AnnualReport
