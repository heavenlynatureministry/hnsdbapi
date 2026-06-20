import { useState } from 'react'
import FormInput from '../common/FormInput'
import Button from '../common/Button'
import Card from '../common/Card'
import Badge from '../common/Badge'
import { Save, CheckCircle, XCircle, Zap } from 'lucide-react'

function ExamResultForm({ students = [], examInfo = { max_score: 100, pass_mark: 50 }, onSubmit, onCancel, loading = false }) {
  const [results, setResults] = useState(
    students.map(s => ({ student_id: s.student_id, student_name: s.student_name, score: '', remarks: '' }))
  )
  const [quickFill, setQuickFill] = useState('')

  const updateScore = (studentId, score) => {
    if (score !== '' && (score < 0 || score > examInfo.max_score)) return
    setResults(prev => prev.map(r => r.student_id === studentId ? { ...r, score: score === '' ? '' : Number(score) } : r))
  }

  const updateRemarks = (studentId, remarks) => {
    setResults(prev => prev.map(r => r.student_id === studentId ? { ...r, remarks } : r))
  }

  const applyQuickFill = () => {
    if (!quickFill || quickFill < 0 || quickFill > examInfo.max_score) return
    setResults(prev => prev.map(r => ({ ...r, score: Number(quickFill) })))
    setQuickFill('')
  }

  const getGrade = (score) => {
    if (score === '' || score === null) return { grade: '-', variant: 'gray' }
    const pct = (score / examInfo.max_score) * 100
    if (pct >= 80) return { grade: 'A', variant: 'success' }
    if (pct >= 70) return { grade: 'B', variant: 'info' }
    if (pct >= 60) return { grade: 'C', variant: 'warning' }
    if (pct >= 50) return { grade: 'D', variant: 'warning' }
    return { grade: 'F', variant: 'danger' }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit?.({ results: results.filter(r => r.score !== '' && r.score !== null) })
  }

  const enteredCount = results.filter(r => r.score !== '' && r.score !== null).length
  const passCount = results.filter(r => r.score !== '' && r.score !== null && r.score >= examInfo.pass_mark).length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Summary */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-4">
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
            <input type="number" value={quickFill} onChange={(e) => setQuickFill(e.target.value)} className="form-input w-24 text-sm" placeholder="Score" min="0" max={examInfo.max_score} />
            <button type="button" onClick={applyQuickFill} className="btn btn-secondary btn-sm">
              <Zap size={14} /> Fill All
            </button>
          </div>
        </div>
      </Card>

      {/* Results Entry */}
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
                <input type="number" value={result.score} onChange={(e) => updateScore(result.student_id, e.target.value)} className="form-input w-20 text-sm text-center" placeholder="Score" min="0" max={examInfo.max_score} />
                <div className="w-16 text-center">
                  <Badge variant={grade.variant}>{grade.grade}</Badge>
                  {result.score !== '' && result.score !== null && (
                    <div className="mt-1">
                      {result.score >= examInfo.pass_mark ? <CheckCircle size={14} className="text-green-500 mx-auto" /> : <XCircle size={14} className="text-red-500 mx-auto" />}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="primary" loading={loading} icon={<Save size={18} />} disabled={enteredCount < results.length}>
          Save All Results
        </Button>
      </div>
    </form>
  )
}

export default ExamResultForm