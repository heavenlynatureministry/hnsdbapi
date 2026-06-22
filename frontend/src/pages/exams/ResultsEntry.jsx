import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function ResultsEntry() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exam, setExam] = useState(null)
  const [results, setResults] = useState([])
  const [quickFill, setQuickFill] = useState('')

  useEffect(() => {
    updatePageTitle('Enter Results')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Exams', path: '/exams' },
      { label: 'Results' },
    ])
    fetchExamAndResults()
  }, [id])

  const fetchExamAndResults = async () => {
    setLoading(true)
    try {
      const response = await examsAPI.getResults(id)
      if (response?.success && response.data) {
        setExam({
          exam_name: response.data.exam_name || 'Unknown',
          class_name: response.data.class_name || '',
          subject_name: response.data.subject_name || '',
          max_score: response.data.max_score || 100,
          pass_mark: response.data.pass_mark || 50,
        })
        setResults((response.data.students || []).map(s => ({
          student_id: s.student_id || s._id,
          student_name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          score: s.score !== undefined && s.score !== null ? s.score : '',
          remarks: s.remarks || '',
        })))
      } else {
        toast.error('Failed to load exam data')
        navigate('/exams')
      }
    } catch (error) {
      console.error('Failed to fetch results:', error)
      toast.error('Failed to load exam data')
      navigate('/exams')
    } finally {
      setLoading(false)
    }
  }

  const updateScore = (studentId, score) => {
    if (score !== '' && (score < 0 || score > (exam?.max_score || 100))) return
    setResults(prev => prev.map(r => r.student_id === studentId ? { ...r, score: score === '' ? '' : Number(score) } : r))
  }

  const updateRemarks = (studentId, remarks) => {
    setResults(prev => prev.map(r => r.student_id === studentId ? { ...r, remarks } : r))
  }

  const applyQuickFill = () => {
    if (!quickFill || quickFill < 0 || quickFill > (exam?.max_score || 100)) {
      toast.error('Enter a valid score for quick fill')
      return
    }
    setResults(prev => prev.map(r => ({ ...r, score: Number(quickFill) })))
    toast.success(`All scores set to ${quickFill}`)
    setQuickFill('')
  }

  const handleSubmit = async () => {
    const empty = results.filter(r => r.score === '' || r.score === null)
    if (empty.length > 0) {
      toast.error(`${empty.length} student(s) missing scores`)
      return
    }
    setSaving(true)
    try {
      const response = await examsAPI.bulkRecordResults({
        exam_id: id,
        results: results.map(r => ({
          student_id: r.student_id,
          score: r.score,
          remarks: r.remarks || '',
        })),
      })

      if (response?.success) {
        const entered = results.filter(r => r.score !== '').length
        toast.success(`Results saved! ${entered} scores entered.`)
        navigate('/exams')
      } else {
        toast.error(response?.message || 'Failed to save results')
      }
    } catch (error) {
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to save results')
      }
    } finally {
      setSaving(false)
    }
  }

  const getGrade = (score) => {
    if (score === '' || score === null) return { grade: '-', variant: 'gray' }
    const pct = (score / (exam?.max_score || 100)) * 100
    if (pct >= 80) return { grade: 'A', variant: 'success' }
    if (pct >= 70) return { grade: 'B', variant: 'info' }
    if (pct >= 60) return { grade: 'C', variant: 'warning' }
    if (pct >= 50) return { grade: 'D', variant: 'warning' }
    return { grade: 'F', variant: 'danger' }
  }

  if (loading) return <LoadingSpinner fullScreen />

  const enteredCount = results.filter(r => r.score !== '' && r.score !== null).length
  const passCount = results.filter(r => r.score !== '' && r.score !== null && r.score >= (exam?.pass_mark || 0)).length

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <PageHeader
        title={`Enter Results - ${exam?.exam_name}`}
        subtitle={`${exam?.class_name} • ${exam?.subject_name} • Max: ${exam?.max_score} • Pass: ${exam?.pass_mark}`}
        actions={<button onClick={() => navigate('/exams')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>}
      />

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{enteredCount}/{results.length}</p>
              <p className="text-xs text-gray-500">Entered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{passCount}</p>
              <p className="text-xs text-gray-500">Passed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{enteredCount - passCount}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" value={quickFill} onChange={(e) => setQuickFill(e.target.value)} className="form-input w-24 text-sm" placeholder="Score" min="0" max={exam?.max_score} />
            <button onClick={applyQuickFill} className="btn btn-secondary btn-sm">Fill All</button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          {results.map((result) => {
            const grade = getGrade(result.score)
            return (
              <div key={result.student_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-medium text-sm flex-shrink-0">
                  {result.student_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{result.student_name}</p>
                  <input type="text" value={result.remarks} onChange={(e) => updateRemarks(result.student_id, e.target.value)} className="form-input text-xs mt-1" placeholder="Remarks (optional)" />
                </div>
                <input type="number" value={result.score} onChange={(e) => updateScore(result.student_id, e.target.value)} className="form-input w-20 text-sm text-center" placeholder="Score" min="0" max={exam?.max_score} />
                <div className="w-16 text-center">
                  <Badge variant={grade.variant}>{grade.grade}</Badge>
                  {result.score !== '' && result.score !== null && (
                    <div className="mt-1">
                      {result.score >= (exam?.pass_mark || 0) ? <CheckCircle size={14} className="text-green-500 mx-auto" /> : <XCircle size={14} className="text-red-500 mx-auto" />}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} variant="primary" size="lg" loading={saving} icon={<Save size={18} />}>
          Save All Results
        </Button>
      </div>
    </div>
  )
}

export default ResultsEntry
