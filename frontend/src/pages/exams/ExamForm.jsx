import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
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
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    exam_name: '', exam_type: 'mid_term', class_id: '', subject_id: '',
    exam_date: '', start_time: '', end_time: '', max_score: '100',
    pass_mark: '50', weight: '1.0', academic_year: '2024/2025',
    term: 'Term 1', instructions: '',
  })

  useEffect(() => {
    updatePageTitle(isEdit ? 'Edit Exam' : 'Create Exam')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Exams', path: '/exams' }, { label: isEdit ? 'Edit' : 'Create' }])
    if (isEdit) {
      setTimeout(() => {
        setFormData(prev => ({ ...prev, exam_name: 'Mid-Term English', exam_type: 'mid_term', class_id: 'c8', subject_id: 's1', exam_date: '2024-03-15', max_score: '100' }))
        setFetching(false)
      }, 400)
    }
  }, [id])

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
      await new Promise(resolve => setTimeout(resolve, 800))
      toast.success(`Exam ${isEdit ? 'updated' : 'created'} successfully`)
      navigate('/exams')
    } catch (error) { toast.error('Failed to save exam') }
    finally { setLoading(false) }
  }

  if (fetching) return <LoadingSpinner fullScreen />

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
              options={[{ value: '', label: 'Select Class' }, { value: 'c8', label: 'P5' }, { value: 'c9', label: 'P6' }]} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Subject *" name="subject_id" value={formData.subject_id} onChange={handleChange} error={errors.subject_id}
              options={[{ value: '', label: 'Select Subject' }, { value: 's1', label: 'English' }, { value: 's2', label: 'Mathematics' }]} />
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
            <FormSelect label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange}
              options={[{ value: '2024/2025', label: '2024/2025' }]} />
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