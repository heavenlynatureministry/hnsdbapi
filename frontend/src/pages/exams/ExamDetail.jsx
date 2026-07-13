import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Edit, BarChart3, FileText, Users, Target, BookOpen, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function ExamDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [exam, setExam] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)

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
        // If exam is completed, fetch results
        if (response.data.status === 'completed') {
          fetchResults()
        }
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

  const fetchResults = async () => {
    setLoadingResults(true)
    try {
      const response = await examsAPI.getResults(id)
      if (response?.success && response.data) {
        setResults(response.data)
      } else {
        setResults(null)
      }
    } catch (error) {
      console.error('Failed to fetch results:', error)
      // Don't show error - results might not be available yet
      setResults(null)
    } finally {
      setLoadingResults(false)
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
    return <Badge variant={variants[grade] || 'gray'}>{grade || 'N/A'}</Badge>
  }

  const getStatusBadge = (status) => {
    const variants = { scheduled: 'info', completed: 'success', cancelled: 'danger' }
    return <Badge variant={variants[status] || 'gray'}>{status || 'unknown'}</Badge>
  }

  // Use results from API or embedded exam data
  const statistics = results?.statistics || exam.statistics || null
  const gradeDistribution = results?.grade_distribution || exam.grade_distribution || null
  const studentResults = results?.results || exam.results || []

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title={exam.exam_name || 'Exam'}
        subtitle={`${exam.class_name || 'N/A'} • ${exam.subject_name || exam.subject || 'N/A'}`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/exams')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>
            {exam.status === 'scheduled' && <Link to={`/exams/${id}/edit`} className="btn btn-primary"><Edit size={18} /> Edit</Link>}
            <Link to={`/exams/${id}/results`} className="btn btn-primary"><BarChart3 size={18} /> Enter Results</Link>
          </div>
        }
      />

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Status:</span>
        {getStatusBadge(exam.status)}
        {exam.academic_year && <span className="text-sm text-gray-400 ml-2">• {exam.academic_year}</span>}
        {exam.term && <span className="text-sm text-gray-400">• {exam.term}</span>}
      </div>

      {/* Exam Info Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Date', value: exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : 'N/A', icon: FileText, color: 'bg-blue-100 text-blue-600' },
          { label: 'Max Score', value: exam.max_score || 100, icon: Target, color: 'bg-purple-100 text-purple-600' },
          { label: 'Pass Mark', value: exam.pass_mark || 50, icon: Target, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Weight', value: exam.weight || 1, icon: BookOpen, color: 'bg-green-100 text-green-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Instructions (if any) */}
      {exam.instructions && (
        <Card title="Instructions">
          <p className="text-sm text-gray-600 dark:text-gray-400">{exam.instructions}</p>
        </Card>
      )}

      {/* Results Section - only for completed exams */}
      {exam.status === 'completed' && (
        loadingResults ? <LoadingSpinner /> : (
          <>
            {/* Statistics */}
            {statistics ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Average', value: `${statistics.average_score || 0}%`, color: 'text-primary-600' },
                  { label: 'Highest', value: `${statistics.highest_score || 0}%`, color: 'text-green-600' },
                  { label: 'Lowest', value: `${statistics.lowest_score || 0}%`, color: 'text-red-600' },
                  { label: 'Pass Rate', value: `${statistics.pass_rate || 0}%`, color: 'text-blue-600' },
                  { label: 'Students', value: statistics.total_students || statistics.results_entered || 0, color: 'text-purple-600' },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <div className="flex items-center gap-3 text-yellow-600">
                  <AlertCircle size={20} />
                  <p className="text-sm">Results data not available. Enter results to see statistics.</p>
                </div>
              </Card>
            )}

            {/* Grade Distribution */}
            {gradeDistribution && Object.keys(gradeDistribution).length > 0 && (
              <Card title="Grade Distribution">
                <div className="flex gap-1 h-8 rounded-full overflow-hidden">
                  {Object.entries(gradeDistribution).map(([grade, data]) => (
                    <div 
                      key={grade} 
                      className={`${getGradeColor(grade)} flex items-center justify-center text-xs text-white font-medium transition-all`} 
                      style={{ width: `${Math.max(data.percentage || 0, 2)}%` }} 
                      title={`Grade ${grade}: ${data.count || 0} students (${data.percentage || 0}%)`}
                    >
                      {data.percentage > 10 && `${grade} (${data.percentage}%)`}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                  {Object.entries(gradeDistribution).map(([grade, data]) => (
                    <span key={grade}>{grade}: {data.count || 0} ({data.percentage || 0}%)</span>
                  ))}
                </div>
              </Card>
            )}

            {/* Student Results Table */}
            {studentResults.length > 0 && (
              <Card title={`Student Results (${studentResults.length})`}>
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
                      {[...studentResults].sort((a, b) => (b.score || 0) - (a.score || 0)).map((result, i) => (
                        <tr key={result.student_id || result._id || i}>
                          <td className="text-sm text-gray-500">{i + 1}</td>
                          <td className="font-medium text-sm">{result.student_name || 'Unknown'}</td>
                          <td className="text-sm font-semibold">{result.score ?? 'N/A'}</td>
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
        )
      )}

      {/* Show message for non-completed exams */}
      {exam.status !== 'completed' && (
        <Card>
          <div className="text-center py-8">
            <BarChart3 size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {exam.status === 'scheduled' 
                ? 'Results will appear here once the exam is completed and scores are entered.' 
                : 'This exam has been cancelled.'}
            </p>
            {exam.status === 'scheduled' && (
              <Link to={`/exams/${id}/results`} className="btn btn-primary mt-4">
                Enter Results
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

export default ExamDetail
