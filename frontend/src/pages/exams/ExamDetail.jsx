import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Edit, BarChart3, FileText, Users, Target, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

function ExamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    updatePageTitle('Exam Details')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Exams', path: '/exams' },
      { label: 'Details' },
    ])
    fetchExam()
  }, [id])

  const fetchExam = async () => {
    setLoading(true)
    try {
      const response = await examsAPI.getById(id)
      if (response?.success && response.data) {
        setExam(response.data)
      } else {
        toast.error('Failed to load exam details')
        navigate('/exams')
      }
    } catch (error) {
      console.error('Failed to fetch exam:', error)
      toast.error('Failed to load exam details')
      navigate('/exams')
    } finally {
      setLoading(false)
    }
  }

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Date', value: exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : 'N/A', icon: FileText, color: 'bg-blue-100 text-blue-600' },
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

      {exam.status === 'completed' && exam.statistics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Average', value: `${exam.statistics.average_score || 0}%`, color: 'text-primary-600' },
              { label: 'Highest', value: `${exam.statistics.highest_score || 0}%`, color: 'text-green-600' },
              { label: 'Lowest', value: `${exam.statistics.lowest_score || 0}%`, color: 'text-red-600' },
              { label: 'Pass Rate', value: `${exam.statistics.pass_rate || 0}%`, color: 'text-blue-600' },
              { label: 'Students', value: exam.statistics.total_students || 0, color: 'text-purple-600' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {exam.grade_distribution && (
            <Card title="Grade Distribution">
              <div className="flex gap-1 h-8 rounded-full overflow-hidden">
                {Object.entries(exam.grade_distribution).map(([grade, data]) => (
                  <div key={grade} className={`${getGradeColor(grade)} flex items-center justify-center text-xs text-white font-medium transition-all`} style={{ width: `${data.percentage || 0}%` }} title={`Grade ${grade}: ${data.count} students (${data.percentage}%)`}>
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
          )}

          {(exam.results || []).length > 0 && (
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
          )}
        </>
      )}
    </div>
  )
}

export default ExamDetail
