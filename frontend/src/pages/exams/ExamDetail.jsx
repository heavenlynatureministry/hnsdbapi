import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Edit, BarChart3, FileText, Users, Target, BookOpen, TrendingUp } from 'lucide-react'

function ExamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    updatePageTitle('Exam Details')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Exams', path: '/exams' }, { label: 'Details' }])
    setTimeout(() => {
      setExam({
        _id: id, exam_name: 'Mid-Term English', exam_type: 'mid_term',
        class_name: 'P5', subject_name: 'English', exam_date: '2024-03-15',
        start_time: '08:00', end_time: '09:30', max_score: 100, pass_mark: 50,
        weight: 1.0, term: 'Term 1', academic_year: '2024/2025',
        status: 'completed', results_entered: 22, total_students: 22,
        instructions: 'Answer all questions. Write clearly.',
        statistics: { average_score: 72.5, highest_score: 95, lowest_score: 30, pass_rate: 85, total_students: 22 },
        grade_distribution: { A: { count: 8, percentage: 36.4 }, B: { count: 6, percentage: 27.3 }, C: { count: 4, percentage: 18.2 }, D: { count: 3, percentage: 13.6 }, F: { count: 1, percentage: 4.5 } },
        results: [
          { student_name: 'Abraham Kuol', score: 92, grade: 'A', is_passed: true },
          { student_name: 'Achol Deng', score: 85, grade: 'A', is_passed: true },
          { student_name: 'Bol Malek', score: 78, grade: 'B', is_passed: true },
          { student_name: 'Aya Dut', score: 65, grade: 'C', is_passed: true },
          { student_name: 'Peter Garang', score: 55, grade: 'D', is_passed: true },
          { student_name: 'Mary John', score: 88, grade: 'A', is_passed: true },
          { student_name: 'James Lual', score: 42, grade: 'F', is_passed: false },
          { student_name: 'Sarah Nyok', score: 72, grade: 'B', is_passed: true },
        ],
      })
      setLoading(false)
    }, 500)
  }, [id])

  if (loading) return <LoadingSpinner fullScreen />
  if (!exam) return null

  const getGradeColor = (grade) => {
    const colors = { A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500' }
    return colors[grade] || 'bg-gray-500'
  }

  const getGradeBadge = (grade) => {
    const variants = { A: 'success', B: 'info', C: 'warning', D: 'warning', F: 'danger' }
    return <Badge variant={variants[grade] || 'gray'}>{grade}</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title={exam.exam_name}
        subtitle={`${exam.class_name} • ${exam.subject_name}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/exams')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>
            {exam.status === 'scheduled' && <Link to={`/exams/${id}/edit`} className="btn btn-primary"><Edit size={18} /> Edit</Link>}
            <Link to={`/exams/${id}/results`} className="btn btn-primary"><BarChart3 size={18} /> Enter Results</Link>
          </div>
        }
      />

      {/* Exam Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Date', value: new Date(exam.exam_date).toLocaleDateString(), icon: FileText, color: 'bg-blue-100 text-blue-600' },
          { label: 'Max Score', value: exam.max_score, icon: Target, color: 'bg-purple-100 text-purple-600' },
          { label: 'Pass Mark', value: exam.pass_mark, icon: Target, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Weight', value: exam.weight, icon: BookOpen, color: 'bg-green-100 text-green-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Statistics (if completed) */}
      {exam.status === 'completed' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Average', value: `${exam.statistics.average_score}%`, color: 'text-primary-600' },
              { label: 'Highest', value: `${exam.statistics.highest_score}%`, color: 'text-green-600' },
              { label: 'Lowest', value: `${exam.statistics.lowest_score}%`, color: 'text-red-600' },
              { label: 'Pass Rate', value: `${exam.statistics.pass_rate}%`, color: 'text-blue-600' },
              { label: 'Students', value: exam.statistics.total_students, color: 'text-purple-600' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Grade Distribution */}
          <Card title="Grade Distribution">
            <div className="flex gap-1 h-8 rounded-full overflow-hidden">
              {Object.entries(exam.grade_distribution).map(([grade, data]) => (
                <div key={grade} className={`${getGradeColor(grade)} flex items-center justify-center text-xs text-white font-medium transition-all`} style={{ width: `${data.percentage}%` }} title={`Grade ${grade}: ${data.count} students (${data.percentage}%)`}>
                  {data.percentage > 10 && `${grade} (${data.percentage}%)`}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
              {Object.entries(exam.grade_distribution).map(([grade, data]) => (
                <span key={grade}>{grade}: {data.count} ({data.percentage}%)</span>
              ))}
            </div>
          </Card>

          {/* Results Table */}
          <Card title="Student Results">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Score</th>
                    <th>Grade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.results.sort((a, b) => b.score - a.score).map((result, i) => (
                    <tr key={i}>
                      <td className="text-sm text-gray-500">{i + 1}</td>
                      <td className="font-medium text-sm">{result.student_name}</td>
                      <td className="text-sm font-semibold">{result.score}</td>
                      <td>{getGradeBadge(result.grade)}</td>
                      <td><Badge variant={result.is_passed ? 'success' : 'danger'}>{result.is_passed ? 'Pass' : 'Fail'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

export default ExamDetail