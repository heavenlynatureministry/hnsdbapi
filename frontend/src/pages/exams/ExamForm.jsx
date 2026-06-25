import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

function ExamForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs, currentAcademicYear, currentTerm } = useApp()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])

  const [formData, setFormData] = useState({
    exam_name: '', exam_type: 'mid_term', class_id: '', subject_id: '',
    exam_date: '', start_time: '', end_time: '', max_score: 100,
    pass_mark: 50, weight: 1.0, academic_year: currentAcademicYear || '2024/2025',
    term: currentTerm || 'Term 1', instructions: '',
  })

  useEffect(() => {
    updatePageTitle(isEdit ? 'Edit Exam' : 'Create Exam')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Exams', path: '/exams' },
      { label: isEdit ? 'Edit' : 'Create' },
    ])
    fetchClasses()
    fetchSubjects()
    
    if (isEdit) {
      fetchExam()
    } else {
      setFetching(false)
    }
  }, [id])

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll({ status: 'active', limit: 100 })
      const classList = response?.data?.classes || response?.classes || response?.data || []
      const safeClasses = Array.isArray(classList) ? classList : []
      setClasses(safeClasses)
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      setClasses([])
    }
  }

  const fetchSubjects = async () => {
    try {
      const response = await examsAPI.listSubjects()
      const subjectList = response?.data?.subjects || response?.subjects || response?.data || []
      const safeSubjects = Array.isArray(subjectList) ? subjectList : []
      setSubjects(safeSubjects)
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
      setSubjects([])
    }
  }

  const fetchExam = async () => {
    setFetching(true)
    try {
      const response = await examsAPI.getById(id)
      if (response?.success && response.data) {
        const exam = response.data
        setFormData({
          exam_name: exam.exam_name || '',
          exam_type: exam.exam_type || 'mid_term',
          class_id: exam.class_id || '',
          subject_id: exam.subject_id || '',
          exam_date: exam.exam_date?.split('T')[0] || '',
          start_time: exam.start_time || '',
          end_time: exam.end_time || '',
          max_score: exam.max_score || 100,
          pass_mark: exam.pass_mark || 50,
          weight: exam.weight || 1.0,
          academic_year: exam.academic_year || currentAcademicYear || '2024/2025',
          term: exam.term || currentTerm || 'Term 1',
          instructions: exam.instructions || '',
        })
      } else {
        toast.error('Failed to load exam data')
        navigate('/exams')
      }
    } catch (error) {
      toast.error('Failed to fetch exam')
      navigate('/exams')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.exam_name.trim()) newErrors.exam_name = 'Exam name is required'
    if (!formData.class_id) newErrors.class_id = 'Class is required'
    if (!formData.subject_id) newErrors.subject_id = 'Subject is required'
    if (!formData.exam_date) newErrors.exam_date = 'Date is required'
    if (!formData.max_score || formData.max_score <= 0) newErrors.max_score = 'Valid max score is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload = { ...formData }
      
      let response
      if (isEdit) {
        response = await examsAPI.update(id, payload)
      } else {
        response = await examsAPI.create(payload)
      }

      if (response && response.success) {
        toast.success(`Exam ${isEdit ? 'updated' : 'created'} successfully`)
        navigate('/exams')
      } else {
        toast.error(response?.message || 'Failed to save exam')
      }
    } catch (error) {
      if (error.status === 422) {
        const fieldErrors = error.errors || []
        const newErrors = {}
        fieldErrors.forEach(err => {
          const field = err.loc?.[err.loc.length - 1] || 'general'
          newErrors[field] = err.msg
        })
        setErrors(newErrors)
        toast.error('Please fix the validation errors')
      } else if (error.status === 409) {
        toast.error('An exam with this name already exists')
      } else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to save exam')
      }
      console.error('Exam save error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner fullScreen />

  // Build dynamic options from API data
  const classOptions = [
    { value: '', label: 'Select Class' },
    ...classes.map(c => ({
      value: c._id || c.class_id || '',
      label: c.class_name || `${c.class_name || ''} (${c.class_level || ''})`.trim() || 'Unknown',
    })),
  ]

  const subjectOptions = [
    { value: '', label: 'Select Subject' },
    ...subjects.map(s => ({
      value: s._id || s.subject_id || '',
      label: s.subject_name || s.name || 'Unknown',
    })),
  ]

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in-up">
      <PageHeader
        title={isEdit ? 'Edit Exam' : 'Create New Exam'}
        actions={<button onClick={() => navigate('/exams')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormInput label="Exam Name *" name="exam_name" value={formData.exam_name} onChange={handleChange} error={errors.exam_name} placeholder="e.g., Mid-Term English" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Exam Type" name="exam_type" value={formData.exam_type} onChange={handleChange}
              options={[
                { value: 'mid_term', label: 'Mid Term' }, { value: 'end_term', label: 'End Term' },
                { value: 'final', label: 'Final' }, { value: 'mock', label: 'Mock' },
                { value: 'quiz', label: 'Quiz' }, { value: 'assignment', label: 'Assignment' },
                { value: 'project', label: 'Project' }, { value: 'oral', label: 'Oral' },
              ]} />
            <FormSelect label="Class *" name="class_id" value={formData.class_id} onChange={handleChange} error={errors.class_id}
              options={classOptions} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Subject *" name="subject_id" value={formData.subject_id} onChange={handleChange} error={errors.subject_id}
              options={subjectOptions} />
            <FormInput label="Exam Date *" name="exam_date" type="date" value={formData.exam_date} onChange={handleChange} error={errors.exam_date} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Max Score *" name="max_score" type="number" value={formData.max_score} onChange={handleChange} error={errors.max_score} min="1" />
            <FormInput label="Pass Mark" name="pass_mark" type="number" value={formData.pass_mark} onChange={handleChange} min="0" />
            <FormInput label="Weight" name="weight" type="number" value={formData.weight} onChange={handleChange} min="0.1" step="0.1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Start Time" name="start_time" type="time" value={formData.start_time} onChange={handleChange} />
            <FormInput label="End Time" name="end_time" type="time" value={formData.end_time} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange} />
            <FormSelect label="Term" name="term" value={formData.term} onChange={handleChange}
              options={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }, { value: 'Term 3', label: 'Term 3' }]} />
          </div>

          <div>
            <label className="form-label">Instructions</label>
            <textarea name="instructions" value={formData.instructions} onChange={handleChange} rows={3} className="form-input" placeholder="Exam instructions for students..." />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" loading={loading} icon={<Save size={18} />}>
              {isEdit ? 'Update Exam' : 'Create Exam'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/exams')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default ExamForm
