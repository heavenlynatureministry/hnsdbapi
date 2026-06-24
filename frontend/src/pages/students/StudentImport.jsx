import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import studentsAPI from '../../api/students'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

function StudentImport() {
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [step, setStep] = useState(1)

  useEffect(() => {
    updatePageTitle('Import Students')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Students', path: '/students' },
      { label: 'Import' },
    ])
  }, [updatePageTitle, updateBreadcrumbs])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // Parse CSV preview
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result || ''
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length === 0) {
          toast.error('CSV file is empty')
          return
        }
        const headers = lines[0].split(',').map(h => h.trim())
        const rows = lines.slice(1, 5).map(line => {
          const values = line.split(',').map(v => v.trim())
          const obj = {}
          headers.forEach((h, i) => { obj[h] = values[i] || '' })
          return obj
        })
        setPreview({ headers, rows, totalRows: lines.length - 1 })
        setStep(2)
      } catch (error) {
        toast.error('Failed to parse CSV file')
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read file')
    }
    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const text = event.target.result || ''
          const lines = text.split('\n').filter(line => line.trim())
          if (lines.length === 0) {
            toast.error('CSV file is empty')
            setImporting(false)
            return
          }
          const headers = lines[0].split(',').map(h => h.trim())
          const students = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim())
            const obj = {}
            headers.forEach((h, i) => { obj[h] = values[i] || '' })
            return {
              first_name: obj['First Name'] || obj['first_name'] || '',
              last_name: obj['Last Name'] || obj['last_name'] || '',
              gender: obj['Gender'] || obj['gender'] || 'Male',
              date_of_birth: obj['Date of Birth'] || obj['date_of_birth'] || '',
              student_type: obj['Student Type'] || obj['student_type'] || 'other',
              enrollment_date: obj['Enrollment Date'] || obj['enrollment_date'] || new Date().toISOString().split('T')[0],
            }
          }).filter(s => s.first_name && s.last_name)

          if (students.length === 0) {
            toast.error('No valid students found in CSV')
            setImporting(false)
            return
          }

          try {
            const response = await studentsAPI.bulkImport(students)
            const safeData = response?.data || {}
            setResults({
              successful: safeData?.successful || students.length,
              failed: safeData?.failed || 0,
              errors: safeData?.errors || [],
            })
            setStep(3)
            if (response?.success) {
              toast.success(`Successfully imported ${safeData?.successful || students.length} students`)
            }
          } catch (error) {
            toast.error(error.message || 'Import failed')
            setResults({ successful: 0, failed: students.length, errors: [error.message || 'Import failed'] })
            setStep(3)
          }
        } catch (error) {
          toast.error('Failed to process CSV data')
          setImporting(false)
        }
      }
      reader.onerror = () => {
        toast.error('Failed to read file')
        setImporting(false)
      }
      reader.readAsText(file)
    } catch (error) {
      toast.error('Failed to process file')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const headers = 'First Name,Last Name,Gender,Date of Birth,Student Type,Enrollment Date\n'
    const example = 'John,Doe,Male,2016-05-15,street,2024-01-10\n'
    const blob = new Blob([headers + example], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <PageHeader
        title="Import Students"
        subtitle="Bulk import students from a CSV file"
        actions={
          <button onClick={() => navigate('/students')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 mb-4">
              <Upload size={36} className="text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
            <p className="text-sm text-gray-500 mb-6">
              Select a CSV file with student data. The first row should contain column headers.
            </p>
            <div className="flex flex-col items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="primary" icon={<FileSpreadsheet size={18} />}>
                Select CSV File
              </Button>
              <button onClick={downloadTemplate} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Download size={14} /> Download Template
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 2 && preview && (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">File Preview</h3>
                <p className="text-sm text-gray-500">{file?.name} • {preview.totalRows || 0} students found</p>
              </div>
              <button onClick={() => { setStep(1); setFile(null); setPreview(null) }} className="text-sm text-red-600">Change File</button>
            </div>
            {(preview.headers || []).length > 0 && (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      {preview.headers.map((h, i) => <th key={i}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(preview.rows || []).map((row, i) => (
                      <tr key={i}>
                        {preview.headers.map((h, j) => <td key={j} className="text-sm">{row[h] || ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(preview.totalRows || 0) > 4 && (
              <p className="text-sm text-gray-500 mt-2 text-center">... and {(preview.totalRows || 0) - 4} more rows</p>
            )}
          </Card>
          <div className="flex gap-3">
            <Button onClick={handleImport} variant="primary" loading={importing} icon={<Upload size={18} />}>
              Import {preview.totalRows || 0} Students
            </Button>
            <Button onClick={() => { setStep(1); setFile(null); setPreview(null) }} variant="secondary">
              Cancel
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Results */}
      {step === 3 && results && (
        <Card>
          <div className="text-center mb-6">
            {(results.failed || 0) === 0 ? (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-3">
                <AlertTriangle size={32} className="text-yellow-600" />
              </div>
            )}
            <h3 className="text-lg font-semibold">Import {(results.failed || 0) === 0 ? 'Complete' : 'Completed with Errors'}</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{results.successful || 0}</p>
              <p className="text-xs text-gray-500">Successful</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{results.failed || 0}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{(results.successful || 0) + (results.failed || 0)}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
          {(results.errors || []).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Errors</h4>
              <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                {results.errors.map((err, i) => <li key={i}>{err || 'Unknown error'}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <Button onClick={() => navigate('/students')} variant="primary">
              Go to Students List
            </Button>
            <Button onClick={() => { setStep(1); setFile(null); setPreview(null); setResults(null) }} variant="secondary">
              Import Another File
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

export default StudentImport
