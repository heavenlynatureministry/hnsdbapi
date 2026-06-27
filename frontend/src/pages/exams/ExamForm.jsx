import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
import classesAPI from '../../api/classes'
import schoolAPI from '../../api/school'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const EXAM_TYPE_OPTIONS = [
  { value: '', label: '-- Select Exam Type --' },
  { value: 'mid_term', label: 'Mid Term' },
  { value: 'end_term', label: 'End Term' },
  { value: 'final', label: 'Final' },
  { value: 'mock', label: 'Mock' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'project', label: 'Project' },
  { value: 'oral', label: 'Oral' },
]

const TERM_OPTIONS = [
  { value: '', label: '-- Select Term --' },
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
]

const CLASS_PLACEHOLDER = [{ value: '', label: '-- Select Class --' }]
const SUBJECT_PLACEHOLDER = [{ value: '', label: '-- Select Subject --' }]

function ExamForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs, currentAcademicYear, currentTerm } = useApp()
  
  // ALL hooks at the top
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])

  const [formData, setFormData] = useState({
    exam_name: '',
    exam_type: '',
    class_id: '',
    subject_id: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    max_score: 100,
    pass_mark: 50,
    weight: 1.0,
    academic_year: currentAcademicYear || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
    term: currentTerm || '',
    instructions: '',
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
      let classList = response?.data || response || []
      if (!Array.isArray(classList)) {
        classList = classList?.classes || classList?.data || []
      }
      const safeClasses = Array.isArray(classList) ? classList : []
      setClasses(safeClasses)
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      setClasses([])
    }
  }

  const fetchSubjects = async () => {
    try {
      // Use schoolAPI.getSubjects() instead of examsAPI.listSubjects()
      const response = await schoolAPI.getSubjects()
      let subjectList = []
      
      if (response?.data?.success && Array.isArray(response.data.data)) {
        subjectList = response.data.data
      } else if (response?.success && Array.isArray(response.data)) {
        subjectList = response.data
      } else if (Array.isArray(response?.data)) {
        subjectList = response.data
      }
      
      // Convert string subjects to objects if needed
      const formattedSubjects = subjectList.map(s => {
        if (typeof s === 'string') return { name: s, id: s }
        return s
      })
      
      setSubjects(formattedSubjects)
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
      // Fallback to default subjects
      setSubjects([
        { name: 'English Language', id: 'english' },
        { name: 'Mathematics', id: 'math' },
        { name: 'Science', id: 'science' },
        { name: 'Social Studies', id: 'social_studies' },
        { name: 'Religious Education', id: 're' },
        { name: 'Creative Arts', id: 'arts' },
        { name: 'Physical Education', id: 'pe' },
        { name: 'Local Language', id: 'local_lang' },
        { name: 'Computer Studies', id: 'computer' },
        { name: 'Agriculture', id: 'agriculture' },
        { name: 'Business Studies', id: 'business' },
        { name: 'History', id: 'history' },
        { name: 'Geography', id: 'geography' },
        { name: 'Civics', id: 'civics' },
      ])
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
          exam_type: exam.exam_type || '',
          class_id: exam.class_id || '',
          subject_id: exam.subject_id || '',
          exam_date: exam.exam_date?.split('T')[0] || '',
          start_time: exam.start_time || '',
          end_time: exam.end_time || '',
          max_score: exam.max_score || 100,
          pass_mark: exam.pass_mark || 50,
          weight: exam.weight || 1.0,
          academic_year: exam.academic_year || currentAcademicYear || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
          term: exam.term || currentTerm || '',
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
    if (!formData.exam_type) newErrors.exam_type = 'Please select an exam type'
    if (!formData.class_id) newErrors.class_id = 'Please select a class'
    if (!formData.subject_id) newErrors.subject_id = 'Please select a subject'
    if (!formData.exam_date) newErrors.exam_date = 'Date is required'
    if (!formData.term) newErrors.term = 'Please select a term'
    if (!formData.max_score || parseInt(formData.max_score, 10) <= 0) newErrors.max_score = 'Valid max score is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload = {
        exam_name: formData.exam_name,
        exam_type: formData.exam_type,
        class_id: formData.class_id,
        subject_id: formData.subject_id,
        exam_date: formData.exam_date,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        max_score: parseInt(formData.max_score, 10),
        pass_mark: parseInt(formData.pass_mark, 10),
        weight: parseFloat(formData.weight),
        academic_year: formData.academic_year,
        term: formData.term,
        instructions: formData.instructions || undefined,
      }
      
      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) delete payload[key]
      })
      
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

  const classOptions = [
    ...CLASS_PLACEHOLDER,
    ...classes.map(c => ({
      value: c._id || c.id || '',
      label: c.class_name || c.name || `${c.class_level || ''} ${c.class_name || ''}`.trim() || 'Unknown Class',
    })),
  ]

  const subjectOptions = [
    ...SUBJECT_PLACEHOLDER,
    ...subjects.map(s => ({
      value: s._id || s.subject_id || s.id || s.name || '',
      label: s.subject_name || s.name || String(s) || 'Unknown Subject',
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
          <FormInput 
            label="Exam Name *" 
            name="exam_name" 
            value={formData.exam_name} 
            onChange={handleChange} 
            error={errors.exam_name} 
            placeholder="e.g., Mid-Term English Exam" 
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect 
              label="Exam Type *" 
              name="exam_type" 
              value={formData.exam_type} 
              onChange={handleChange} 
              options={EXAM_TYPE_OPTIONS} 
              error={errors.exam_type} 
            />
            <FormSelect 
              label="Class *" 
              name="class_id" 
              value={formData.class_id} 
              onChange={handleChange} 
              error={errors.class_id}
              options={classOptions} 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect 
              label="Subject *" 
              name="subject_id" 
              value={formData.subject_id} 
              onChange={handleChange} 
              error={errors.subject_id}
              options={subjectOptions} 
            />
            <FormInput 
              label="Exam Date *" 
              name="exam_date" 
              type="date" 
              value={formData.exam_date} 
              onChange={handleChange} 
              error={errors.exam_date} 
            />
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
            <FormInput label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange} placeholder="e.g., 2026/2027" />
            <FormSelect label="Term *" name="term" value={formData.term} onChange={handleChange} options={TERM_OPTIONS} error={errors.term} />
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
