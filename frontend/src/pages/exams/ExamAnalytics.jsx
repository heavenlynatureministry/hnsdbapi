import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Target, Users, BookOpen } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444']

function ExamAnalytics() {
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [filters, setFilters] = useState({ class_id: '', academic_year: '2024/2025', term: 'Term 1' })
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Exam Analytics')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Exams', path: '/exams' }, { label: 'Analytics' }])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setTimeout(() => {
      setReportData({
        class_name: 'P5', total_students: 22, overall_pass_rate: 85, class_average: 72.5,
        subjects: [
          { subject_name: 'English', average_score: 78, pass_rate: 90, highest: 95, lowest: 45, grade_distribution: { A: 8, B: 7, C: 4, D: 2, F: 1 } },
          { subject_name: 'Mathematics', average_score: 68, pass_rate: 75, highest: 98, lowest: 30, grade_distribution: { A: 5, B: 6, C: 6, D: 3, F: 2 } },
          { subject_name: 'Science', average_score: 72, pass_rate: 82, highest: 92, lowest: 40, grade_distribution: { A: 6, B: 8, C: 4, D: 3, F: 1 } },
          { subject_name: 'Social Studies', average_score: 74, pass_rate: 88, highest: 96, lowest: 42, grade_distribution: { A: 7, B: 7, C: 5, D: 2, F: 1 } },
        ],
        grade_distribution_summary: [
          { name: 'A', value: 26 }, { name: 'B', value: 28 }, { name: 'C', value: 19 }, { name: 'D', value: 10 }, { name: 'F', value: 5 },
        ],
        performance_comparison: [
          { name: 'English', average: 78 }, { name: 'Math', average: 68 }, { name: 'Science', average: 72 }, { name: 'Social Studies', average: 74 },
        ],
        top_performers: [
          { student_name: 'Abraham Kuol', overall_percentage: 92, grade: 'A' },
          { student_name: 'Mary John', overall_percentage: 88, grade: 'A' },
          { student_name: 'Achol Deng', overall_percentage: 85, grade: 'A' },
        ],
        students_at_risk: [
          { student_name: 'James Lual', overall_percentage: 42, grade: 'F', weak_subjects: ['Mathematics', 'Science'] },
          { student_name: 'Peter Garang', overall_percentage: 48, grade: 'F', weak_subjects: ['English'] },
        ],
      })
      setLoading(false)
      setGenerated(true)
    }, 1200)
  }

  const getGradeColor = (grade) => ({ A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' }[grade] || '#6b7280')

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in-up">
      <PageHeader
        title="Exam Analytics"
        subtitle="Deep insights into examination performance"
        actions={<button onClick={() => navigate('/exams')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>}
      />

      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <FormSelect label="Class" value={filters.class_id} onChange={(e) => setFilters(prev => ({ ...prev, class_id: e.target.value }))}
            options={[{ value: '', label: 'All Classes' }, { value: 'c8', label: 'P5' }, { value: 'c9', label: 'P6' }]} />
          <FormSelect label="Term" value={filters.term} onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            options={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }]} />
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<BarChart3 size={18} />}>Generate Analytics</Button>
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {generated && reportData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Pass Rate', value: `${reportData.overall_pass_rate}%`, icon: TrendingUp, color: 'bg-green-100 text-green-600' },
              { label: 'Class Average', value: `${reportData.class_average}%`, icon: Target, color: 'bg-blue-100 text-blue-600' },
              { label: 'Students', value: reportData.total_students, icon: Users, color: 'bg-purple-100 text-purple-600' },
              { label: 'Subjects', value: reportData.subjects.length, icon: BookOpen, color: 'bg-orange-100 text-orange-600' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Performance Comparison */}
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

            {/* Grade Distribution Pie */}
            <Card title="Overall Grade Distribution">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportData.grade_distribution_summary} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {reportData.grade_distribution_summary.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Subject Details */}
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
                  <div className="flex gap-1 h-6 rounded-full overflow-hidden">
                    {Object.entries(subject.grade_distribution).map(([grade, count]) => (
                      <div key={grade} className="flex items-center justify-center text-xs text-white font-medium" style={{ width: `${(count / reportData.total_students) * 100}%`, backgroundColor: getGradeColor(grade) }}>
                        {count > 2 && grade}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Performers & At Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Top Performers">
              <div className="space-y-2">
                {reportData.top_performers.map((student, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-green-700 font-bold text-sm">{i + 1}</span>
                      <span className="font-medium text-sm">{student.student_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-600">{student.overall_percentage}%</span>
                      <Badge variant="success">{student.grade}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Students At Risk (Below 50%)">
              {reportData.students_at_risk.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No students at risk</p>
              ) : (
                <div className="space-y-2">
                  {reportData.students_at_risk.map((student, i) => (
                    <div key={i} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{student.student_name}</span>
                        <Badge variant="danger">{student.overall_percentage}%</Badge>
                      </div>
                      <p className="text-xs text-gray-500">Weak in: {student.weak_subjects.join(', ')}</p>
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