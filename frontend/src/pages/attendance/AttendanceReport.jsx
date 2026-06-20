import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { 
  ArrowLeft, Download, ClipboardCheck, CheckCircle, 
  XCircle, AlertTriangle, Clock, TrendingUp 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import toast from 'react-hot-toast'

function AttendanceReport() {
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  
  const [filters, setFilters] = useState({
    class_id: '', academic_year: '2024/2025', term: 'Term 1',
  })

  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Attendance Report')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Attendance', path: '/attendance' }, { label: 'Report' }])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setTimeout(() => {
      setReportData({
        class_name: filters.class_id ? 'P5' : 'All Classes',
        attendance_rate: 88.5,
        total_records: 1250,
        status_summary: {
          present: { count: 980, percentage: 78.4 },
          absent: { count: 150, percentage: 12 },
          excused: { count: 75, percentage: 6 },
          late: { count: 45, percentage: 3.6 },
        },
        daily_trend: [
          { day: 'Mon', present: 85, absent: 15 },
          { day: 'Tue', present: 90, absent: 10 },
          { day: 'Wed', present: 78, absent: 22 },
          { day: 'Thu', present: 92, absent: 8 },
          { day: 'Fri', present: 88, absent: 12 },
        ],
        by_class: [
          { class_name: 'P3', rate: 92 }, { class_name: 'P4', rate: 88 },
          { class_name: 'P5', rate: 85 }, { class_name: 'P6', rate: 90 },
          { class_name: 'P7', rate: 87 },
        ],
        chronic_absentees: [
          { student_name: 'John Smith', class_name: 'P5', rate: 65, days_missed: 18 },
          { student_name: 'Mary Jane', class_name: 'P6', rate: 70, days_missed: 15 },
        ],
        perfect_attendance: [
          { student_name: 'Abraham Kuol', class_name: 'P3', days: 50 },
          { student_name: 'Achol Deng', class_name: 'P2', days: 50 },
        ],
      })
      setLoading(false)
      setGenerated(true)
    }, 1000)
  }

  const classOptions = [
    { value: '', label: 'All Classes' },
    { value: 'c1', label: 'Baby' }, { value: 'c2', label: 'Middle' },
    { value: 'c3', label: 'Top' }, { value: 'c4', label: 'P1' },
    { value: 'c5', label: 'P2' }, { value: 'c6', label: 'P3' },
    { value: 'c7', label: 'P4' }, { value: 'c8', label: 'P5' },
    { value: 'c9', label: 'P6' }, { value: 'c10', label: 'P7' }, { value: 'c11', label: 'P8' },
  ]

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title="Attendance Report"
        actions={<button onClick={() => navigate('/attendance')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>}
      />

      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <FormSelect label="Class" value={filters.class_id} onChange={(e) => setFilters(prev => ({ ...prev, class_id: e.target.value }))} options={classOptions} />
          <FormSelect label="Academic Year" value={filters.academic_year} onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={[{ value: '2024/2025', label: '2024/2025' }]} />
          <FormSelect label="Term" value={filters.term} onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            options={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }, { value: 'Term 3', label: 'Term 3' }]} />
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<ClipboardCheck size={18} />}>Generate</Button>
          {generated && <Button variant="secondary" icon={<Download size={18} />}>Export</Button>}
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {generated && reportData && (
        <div className="space-y-6">
          {/* Overall Rate */}
          <Card>
            <div className="text-center">
              <p className="text-5xl font-bold text-primary-600">{reportData.attendance_rate}%</p>
              <p className="text-gray-500 mt-1">Overall Attendance Rate</p>
              <p className="text-xs text-gray-400">{reportData.total_records.toLocaleString()} total records</p>
            </div>
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { label: 'Present', value: `${reportData.status_summary.present.percentage}%`, count: reportData.status_summary.present.count, icon: CheckCircle, color: 'text-green-600' },
                { label: 'Absent', value: `${reportData.status_summary.absent.percentage}%`, count: reportData.status_summary.absent.count, icon: XCircle, color: 'text-red-600' },
                { label: 'Excused', value: `${reportData.status_summary.excused.percentage}%`, count: reportData.status_summary.excused.count, icon: AlertTriangle, color: 'text-yellow-600' },
                { label: 'Late', value: `${reportData.status_summary.late.percentage}%`, count: reportData.status_summary.late.count, icon: Clock, color: 'text-blue-600' },
              ].map((stat, i) => (
                <div key={i} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <stat.icon size={20} className={`${stat.color} mx-auto mb-1`} />
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label} ({stat.count})</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Trend Chart */}
            <Card title="Weekly Attendance Pattern">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.daily_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* By Class */}
            <Card title="Attendance by Class">
              <div className="space-y-3">
                {reportData.by_class.map((cls, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-12">{cls.class_name}</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div className="bg-primary-600 h-4 rounded-full transition-all" style={{ width: `${cls.rate}%` }} />
                    </div>
                    <span className="text-sm font-bold w-12 text-right">{cls.rate}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Chronic Absentees & Perfect Attendance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Chronic Absentees (Below 75%)">
              {reportData.chronic_absentees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No chronic absentees</p>
              ) : (
                <div className="space-y-2">
                  {reportData.chronic_absentees.map((student, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{student.student_name}</p>
                        <p className="text-xs text-gray-500">{student.class_name} • {student.days_missed} days missed</p>
                      </div>
                      <Badge variant="danger">{student.rate}%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Perfect Attendance">
              {reportData.perfect_attendance.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No students with perfect attendance</p>
              ) : (
                <div className="space-y-2">
                  {reportData.perfect_attendance.map((student, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{student.student_name}</p>
                        <p className="text-xs text-gray-500">{student.class_name} • {student.days} days</p>
                      </div>
                      <Badge variant="success">100%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default AttendanceReport