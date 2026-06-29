import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, TrendingUp, BarChart3, Target, Users, BookOpen } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444']

function getCurrentAcademicYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month === 1 ? year - 1 : year
  return `${startYear}/${startYear + 1}`
}

function getCurrentTerm() {
  const month = new Date().getMonth() + 1
  if (month >= 2 && month <= 4) return 'Term 1'
  if (month >= 5 && month <= 7) return 'Term 2'
  if (month >= 9 && month <= 11) return 'Term 3'
  return 'Term 2'
}

const currentYear = getCurrentAcademicYear()
const currentTerm = getCurrentTerm()

const ACADEMIC_YEAR_OPTIONS = [
  { value: currentYear, label: currentYear },
  { value: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, label: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}` },
]

const TERM_OPTIONS = [
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
]

function ExamAnalytics() {
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [classOptions, setClassOptions] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  const [filters, setFilters] = useState({
    class_id: '',
    academic_year: currentYear,
    term: currentTerm,
  })

  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Exam Analytics')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Exams', path: '/exams' },
      { label: 'Analytics' },
    ])
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const response = await classesAPI.getAll({ status: 'active' })
      let classesArray = response?.data || response || []
      if (!Array.isArray(classesArray)) {
        classesArray = classesArray?.classes || classesArray?.data || []
      }
      const options = [{ value: '', label: 'All Classes' }]
      classesArray.forEach(c => {
        options.push({
          value: c._id || c.id || '',
          label: c.class_name || c.name || `${c.class_level || ''} ${c.class_name || ''}`.trim(),
        })
      })
      setClassOptions(options)
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      setClassOptions([{ value: '', label: 'All Classes' }])
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)
    try {
      // Use getClassPerformance for class-specific, or list exams for all
      let response
      if (filters.class_id) {
        response = await examsAPI.getClassPerformance(filters.class_id, {
          academic_year: filters.academic_year,
          term: filters.term,
        })
      } else {
        // Get all exams and aggregate
        response = await examsAPI.list({
          academic_year: filters.academic_year,
          term: filters.term,
          limit: 500,
        })
      }

      console.log('Analytics response:', response)

      if (response?.success && response.data) {
        const data = response.data
        
        // Transform data for display
        const subjects = data.subjects || []
        const totalStudents = data.overall?.total_results || data.total_students || 0
        const classAverage = data.overall?.class_average || data.class_average || 0
        const passRate = data.overall?.pass_rate || data.overall_pass_rate || 0

        // Build chart data
        const performanceComparison = subjects.map(s => ({
          name: s._id || s.subject_name || 'Unknown',
          average: s.average_score || 0,
          passRate: s.pass_rate || 0,
        }))

        // Build grade distribution
        let gradeDistribution = []
        if (data.grade_distribution) {
          gradeDistribution = Object.entries(data.grade_distribution).map(([name, value]) => ({
            name,
            value: value?.count || value || 0,
          }))
        }

        setReportData({
          class_average: classAverage,
          overall_pass_rate: passRate,
          total_students: totalStudents,
          subjects: subjects.map(s => ({
            subject_name: s._id || s.subject_name || 'Unknown',
            average_score: s.average_score || 0,
            highest: s.highest_score || 0,
            lowest: s.lowest_score || 0,
            pass_rate: s.pass_rate || 0,
            grade_distribution: s.grade_distribution || null,
          })),
          performance_comparison: performanceComparison,
          grade_distribution_summary: gradeDistribution,
          top_performers: data.top_performers || data.top_students || [],
          students_at_risk: data.students_at_risk || [],
        })
        setGenerated(true)
      } else if (response?.data) {
        const data = response.data
        const subjects = data.subjects || []
        setReportData({
          class_average: data.overall?.class_average || 0,
          overall_pass_rate: data.overall?.pass_rate || 0,
          total_students: data.overall?.total_results || 0,
          subjects: subjects.map(s => ({
            subject_name: s._id || s.subject_name || 'Unknown',
            average_score: s.average_score || 0,
            highest: s.highest_score || 0,
            lowest: s.lowest_score || 0,
            pass_rate: s.pass_rate || 0,
          })),
          performance_comparison: subjects.map(s => ({
            name: s._id || s.subject_name || 'Unknown',
            average: s.average_score || 0,
            passRate: s.pass_rate || 0,
          })),
          grade_distribution_summary: [],
          top_performers: [],
          students_at_risk: [],
        })
        setGenerated(true)
      } else {
        toast.error('Failed to generate analytics')
      }
    } catch (error) {
      console.error('Failed to generate analytics:', error)
      toast.error(error.message || 'Failed to generate analytics')
    } finally {
      setLoading(false)
    }
  }

  const getGradeColor = (grade) => ({ A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' }[grade] || '#6b7280')

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in-up">
      <PageHeader
        title="Exam Analytics"
        subtitle={`Deep insights into examination performance • ${currentYear}`}
        actions={<button onClick={() => navigate('/exams')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>}
      />

      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <FormSelect
            label="Class"
            value={filters.class_id}
            onChange={(e) => setFilters(prev => ({ ...prev, class_id: e.target.value }))}
            options={classOptions}
            disabled={loadingClasses}
            placeholder={loadingClasses ? 'Loading...' : 'All Classes'}
          />
          <FormSelect
            label="Academic Year"
            value={filters.academic_year}
            onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={ACADEMIC_YEAR_OPTIONS}
          />
          <FormSelect
            label="Term"
            value={filters.term}
            onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            options={TERM_OPTIONS}
          />
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<BarChart3 size={18} />}>
            Generate Analytics
          </Button>
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {!loading && !generated && (
        <div className="text-center py-12">
          <BarChart3 size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select filters and click "Generate Analytics" to view exam data.</p>
        </div>
      )}

      {generated && reportData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Pass Rate', value: `${reportData.overall_pass_rate || 0}%`, icon: TrendingUp, color: 'bg-green-100 text-green-600' },
              { label: 'Class Average', value: `${reportData.class_average || 0}%`, icon: Target, color: 'bg-blue-100 text-blue-600' },
              { label: 'Students', value: reportData.total_students || 0, icon: Users, color: 'bg-purple-100 text-purple-600' },
              { label: 'Subjects', value: (reportData.subjects || []).length, icon: BookOpen, color: 'bg-orange-100 text-orange-600' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {reportData.performance_comparison && reportData.performance_comparison.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Subject Performance Comparison">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.performance_comparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                      <Tooltip />
                      <Bar dataKey="average" name="Average Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Overall Grade Distribution">
                <div className="h-72">
                  {reportData.grade_distribution_summary.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reportData.grade_distribution_summary} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {reportData.grade_distribution_summary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">No grade data available</div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {(reportData.subjects || []).length > 0 && (
            <Card title="Subject Breakdown">
              <div className="space-y-3">
                {reportData.subjects.map((subject, i) => (
                  <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{subject.subject_name}</h4>
                      <Badge variant={subject.pass_rate >= 80 ? 'success' : subject.pass_rate >= 60 ? 'warning' : 'danger'}>
                        {subject.pass_rate}% Pass
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
                      <div><p className="font-bold">{subject.average_score}%</p><p className="text-xs text-gray-500">Average</p></div>
                      <div><p className="font-bold text-green-600">{subject.highest}%</p><p className="text-xs text-gray-500">Highest</p></div>
                      <div><p className="font-bold text-red-600">{subject.lowest}%</p><p className="text-xs text-gray-500">Lowest</p></div>
                      <div><p className="font-bold">{subject.pass_rate}%</p><p className="text-xs text-gray-500">Pass Rate</p></div>
                    </div>
                    {subject.grade_distribution && (
                      <div className="flex gap-1 h-6 rounded-full overflow-hidden">
                        {Object.entries(subject.grade_distribution).map(([grade, count]) => (
                          <div key={grade} className="flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(count / (reportData.total_students || 1)) * 100}%`, backgroundColor: getGradeColor(grade) }}>
                            {count > 2 && grade}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Top Performers">
              {(reportData.top_performers || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No data available</p>
              ) : (
                <div className="space-y-2">
                  {reportData.top_performers.map((student, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-green-700 font-bold text-sm">{i + 1}</span>
                        <span className="font-medium text-sm">{student.student_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-600">{student.overall_percentage || student.average_score || 0}%</span>
                        <Badge variant="success">{student.grade || 'N/A'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Students At Risk (Below 50%)">
              {(reportData.students_at_risk || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No students at risk</p>
              ) : (
                <div className="space-y-2">
                  {reportData.students_at_risk.map((student, i) => (
                    <div key={i} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{student.student_name}</span>
                        <Badge variant="danger">{student.overall_percentage || 0}%</Badge>
                      </div>
                      {student.weak_subjects && (
                        <p className="text-xs text-gray-500">Weak in: {student.weak_subjects?.join(', ')}</p>
                      )}
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

export default ExamAnalytics
