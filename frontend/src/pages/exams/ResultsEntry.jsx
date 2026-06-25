import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, CheckCircle, XCircle, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'

function ResultsEntry() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
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

  // Handle CSV file upload
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result || ''
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          toast.error('CSV file must have a header row and at least one data row')
          return
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        const nameCol = headers.findIndex(h => h === 'name' || h === 'student_name' || h === 'student')
        const scoreCol = headers.findIndex(h => h === 'score' || h === 'marks' || h === 'result')
        const remarksCol = headers.findIndex(h => h === 'remarks' || h === 'notes')

        if (nameCol === -1 || scoreCol === -1) {
          toast.error('CSV must have "Name" and "Score" columns')
          return
        }

        let updated = 0
        const newResults = [...results]

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          const studentName = values[nameCol]?.toLowerCase()
          const score = parseFloat(values[scoreCol])
          const remarks = remarksCol >= 0 ? values[remarksCol] : ''

          if (!studentName || isNaN(score)) continue

          // Find matching student by name (case-insensitive)
          const matchIndex = newResults.findIndex(r =>
            r.student_name.toLowerCase().includes(studentName) ||
            studentName.includes(r.student_name.toLowerCase())
          )

          if (matchIndex >= 0 && score >= 0 && score <= (exam?.max_score || 100)) {
            newResults[matchIndex].score = score
            if (remarks) newResults[matchIndex].remarks = remarks
            updated++
          }
        }

        setResults(newResults)
        toast.success(`Updated ${updated} scores from CSV`)
      } catch (error) {
        toast.error('Failed to parse CSV file')
      }
    }
    reader.onerror = () => toast.error('Failed to read file')
    reader.readAsText(file)

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Download CSV template
  const downloadTemplate = () => {
    const headers = 'Name,Score,Remarks\n'
    const rows = results.map(r => `"${r.student_name}",,`).join('\n')
    const csv = headers + rows
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `results_template_${exam?.exam_name || 'exam'}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
        const entered = results.length
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
            <input type="number" value={quickFill} onChange={(e) => setQuickFill(e.target.value)} className="form-input w-24 text-sm" placeholder="Score" min="0" max={exam?.max_score} />
            <button onClick={applyQuickFill} className="btn btn-secondary btn-sm">Fill All</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm" title="Import CSV">
              <Upload size={14} /> CSV
            </button>
            <button onClick={downloadTemplate} className="btn btn-secondary btn-sm" title="Download Template">
              <Download size={14} /> Template
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          {results.map((result) => {
            const grade = getGrade(result.score)
            const isEntered = result.score !== '' && result.score !== null
            return (
              <div key={result.student_id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isEntered ? 'bg-gray-50 dark:bg-gray-800' : 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800'
              }`}>
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-medium text-sm flex-shrink-0">
                  {result.student_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{result.student_name}</p>
                    {!isEntered && (
                      <span className="text-[10px] text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded">Missing</span>
                    )}
                  </div>
                  <input type="text" value={result.remarks} onChange={(e) => updateRemarks(result.student_id, e.target.value)} className="form-input text-xs mt-1" placeholder="Remarks (optional)" />
                </div>
                <input type="number" value={result.score} onChange={(e) => updateScore(result.student_id, e.target.value)} className={`form-input w-20 text-sm text-center ${!isEntered ? 'border-yellow-400' : ''}`} placeholder="Score" min="0" max={exam?.max_score} />
                <div className="w-16 text-center">
                  <Badge variant={grade.variant}>{grade.grade}</Badge>
                  {isEntered && (
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

      <div className="flex justify-end gap-3">
        <Button onClick={handleSubmit} variant="primary" size="lg" loading={saving} icon={<Save size={18} />} disabled={enteredCount < results.length}>
          {enteredCount < results.length ? `Save (${enteredCount}/${results.length})` : 'Save All Results'}
        </Button>
      </div>
    </div>
  )
}

export default ResultsEntry
