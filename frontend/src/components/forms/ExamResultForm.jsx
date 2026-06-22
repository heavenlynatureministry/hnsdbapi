import { useState } from 'react'
import FormInput from '../common/FormInput'
import Button from '../common/Button'
import Card from '../common/Card'
import Badge from '../common/Badge'
import { Save, CheckCircle, XCircle, Zap, AlertTriangle } from 'lucide-react'

function ExamResultForm({ students = [], examInfo = { max_score: 100, pass_mark: 50 }, onSubmit, onCancel, loading = false }) {
  const [results, setResults] = useState(
    students.map(s => ({ student_id: s.student_id, student_name: s.student_name, score: '', remarks: '' }))
  )
  const [quickFill, setQuickFill] = useState('')
  const [showWarning, setShowWarning] = useState(false)

  const updateScore = (studentId, score) => {
    if (score !== '' && (score < 0 || score > examInfo.max_score)) return
    setResults(prev => prev.map(r => r.student_id === studentId ? { ...r, score: score === '' ? '' : Number(score) } : r))
    setShowWarning(false)
  }

  const updateRemarks = (studentId, remarks) => {
    setResults(prev => prev.map(r => r.student_id === studentId ? { ...r, remarks } : r))
  }

  const applyQuickFill = () => {
    if (!quickFill || quickFill < 0 || quickFill > examInfo.max_score) return
    setResults(prev => prev.map(r => ({ ...r, score: Number(quickFill) })))
    setQuickFill('')
    setShowWarning(false)
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

  const enteredCount = results.filter(r => r.score !== '' && r.score !== null).length
  const unenteredCount = results.length - enteredCount
  const passCount = results.filter(r => r.score !== '' && r.score !== null && r.score >= examInfo.pass_mark).length
  const failCount = enteredCount - passCount

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Check for unentered scores
    if (unenteredCount > 0) {
      setShowWarning(true)
      return
    }

    onSubmit?.({ 
      results: results.filter(r => r.score !== '' && r.score !== null),
      summary: {
        total_students: results.length,
        entered: enteredCount,
        passed: passCount,
        failed: failCount,
        pass_rate: enteredCount > 0 ? Math.round((passCount / enteredCount) * 100) : 0,
      }
    })
  }

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
            {enteredCount > 0 && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{passCount}</p>
                  <p className="text-xs text-gray-500">Passed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{failCount}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{Math.round((passCount / enteredCount) * 100)}%</p>
                  <p className="text-xs text-gray-500">Pass Rate</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={quickFill}
              onChange={(e) => setQuickFill(e.target.value)}
              className="form-input w-24 text-sm"
              placeholder="Score"
              min="0"
              max={examInfo.max_score}
            />
            <button type="button" onClick={applyQuickFill} className="btn btn-secondary btn-sm">
              <Zap size={14} /> Fill All
            </button>
          </div>
        </div>

        {/* Warning for unentered scores */}
        {showWarning && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <span className="font-medium">{unenteredCount} student{unenteredCount > 1 ? 's' : ''}</span> don't have scores entered. 
              Please enter all scores before submitting, or leave blank students will be excluded.
            </p>
          </div>
        )}
      </Card>

      {/* Results Entry */}
      <Card>
        <div className="space-y-2">
          {results.map((result) => {
            const grade = getGrade(result.score)
            const isEntered = result.score !== '' && result.score !== null
            return (
              <div
                key={result.student_id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isEntered
                    ? 'bg-gray-50 dark:bg-gray-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-medium text-sm flex-shrink-0">
                  {result.student_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{result.student_name}</p>
                    {!isEntered && (
                      <span className="text-[10px] text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">
                        Missing
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={result.remarks}
                    onChange={(e) => updateRemarks(result.student_id, e.target.value)}
                    className="form-input text-xs mt-1"
                    placeholder="Remarks (optional)"
                  />
                </div>
                <input
                  type="number"
                  value={result.score}
                  onChange={(e) => updateScore(result.student_id, e.target.value)}
                  className={`form-input w-20 text-sm text-center ${!isEntered ? 'border-yellow-400 focus:border-primary-500' : ''}`}
                  placeholder="Score"
                  min="0"
                  max={examInfo.max_score}
                />
                <div className="w-16 text-center">
                  <Badge variant={grade.variant}>{grade.grade}</Badge>
                  {isEntered && (
                    <div className="mt-1">
                      {result.score >= examInfo.pass_mark ? (
                        <CheckCircle size={14} className="text-green-500 mx-auto" />
                      ) : (
                        <XCircle size={14} className="text-red-500 mx-auto" />
                      )}
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
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          icon={<Save size={18} />}
        >
          {unenteredCount > 0 ? `Save (${enteredCount}/${results.length})` : 'Save All Results'}
        </Button>
      </div>
    </form>
  )
}

export default ExamResultForm
