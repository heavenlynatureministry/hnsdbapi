import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import classesAPI from '../../api/classes'
import teachersAPI from '../../api/teachers'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, School } from 'lucide-react'
import toast from 'react-hot-toast'

const CLASS_LEVEL_OPTIONS = [
  { value: '', label: '-- Select Class Level --' },
  { value: 'nursery', label: 'Nursery' },
  { value: 'primary', label: 'Primary' },
]

const NURSERY_CLASS_OPTIONS = [
  { value: '', label: '-- Select Class Name --' },
  { value: 'Baby', label: 'Baby' },
  { value: 'Middle', label: 'Middle' },
  { value: 'Top', label: 'Top' },
]

const PRIMARY_CLASS_OPTIONS = [
  { value: '', label: '-- Select Class Name --' },
  { value: 'P1', label: 'P1' },
  { value: 'P2', label: 'P2' },
  { value: 'P3', label: 'P3' },
  { value: 'P4', label: 'P4' },
  { value: 'P5', label: 'P5' },
  { value: 'P6', label: 'P6' },
  { value: 'P7', label: 'P7' },
  { value: 'P8', label: 'P8' },
]

const TEACHER_PLACEHOLDER = [{ value: '', label: '-- Select Teacher (Optional) --' }]

const CLASSROOM_OPTIONS = [
  { value: '', label: '-- Select Classroom (Optional) --' },
  { value: 'r1', label: 'Room 1' },
  { value: 'r2', label: 'Room 2' },
  { value: 'r3', label: 'Room 3' },
  { value: 'r4', label: 'Room 4' },
  { value: 'r5', label: 'Room 5' },
  { value: 'r6', label: 'Room 6' },
  { value: 'r7', label: 'Room 7' },
  { value: 'r8', label: 'Room 8' },
]

function ClassForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs, currentAcademicYear } = useApp()
  
  // ALL hooks must be here, before any conditional returns
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})
  const [teachers, setTeachers] = useState([])

  const [formData, setFormData] = useState({
    class_name: '',
    class_level: '',
    academic_year: currentAcademicYear || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
    max_capacity: '25',
    class_teacher_id: '',
    classroom_id: '',
    section: '',
    stream: '',
  })

  // Update max capacity when level changes
  useEffect(() => {
    if (formData.class_level) {
      setFormData(prev => ({
        ...prev,
        max_capacity: prev.class_level === 'nursery' ? '20' : '25',
      }))
    }
  }, [formData.class_level])

  useEffect(() => {
    updatePageTitle(isEdit ? 'Edit Class' : 'Add Class')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Classes', path: '/classes' },
      { label: isEdit ? 'Edit' : 'Add' },
    ])
    fetchTeachers()
    
    if (isEdit) {
      fetchClass()
    } else {
      setFetching(false)
    }
  }, [id])

  const fetchTeachers = async () => {
    try {
      const response = await teachersAPI.getAll({ status: 'active', limit: 100 })
      const teacherList = response?.data?.teachers || response?.teachers || response?.data || []
      const safeTeachers = Array.isArray(teacherList) ? teacherList : []
      setTeachers(safeTeachers)
    } catch (error) {
      console.error('Failed to fetch teachers:', error)
      setTeachers([])
    }
  }

  const fetchClass = async () => {
    setFetching(true)
    try {
      const response = await classesAPI.getById(id)
      if (response?.success && response.data) {
        const c = response.data
        setFormData({
          class_name: c.class_name || '',
          class_level: c.class_level || '',
          academic_year: c.academic_year || currentAcademicYear || new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
          max_capacity: c.max_capacity?.toString() || '25',
          class_teacher_id: c.class_teacher_id || '',
          classroom_id: c.classroom_id || '',
          section: c.section || '',
          stream: c.stream || '',
        })
      } else {
        toast.error('Failed to load class data')
        navigate('/classes')
      }
    } catch (error) {
      toast.error('Failed to fetch class')
      navigate('/classes')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    // Reset class name when level changes
    if (name === 'class_level') {
      setFormData(prev => ({ ...prev, class_name: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.class_level) newErrors.class_level = 'Please select a class level'
    if (!formData.class_name) newErrors.class_name = 'Please select a class name'
    if (!formData.academic_year) newErrors.academic_year = 'Academic year is required'
    if (!formData.max_capacity || parseInt(formData.max_capacity, 10) < 1) {
      newErrors.max_capacity = 'Valid capacity is required (minimum 1)'
    }
    if (parseInt(formData.max_capacity, 10) > 100) {
      newErrors.max_capacity = 'Capacity cannot exceed 100'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      // Build clean payload - only include optional fields if they have values
      const payload = {
        class_name: formData.class_name,
        class_level: formData.class_level,
        academic_year: formData.academic_year,
        max_capacity: parseInt(formData.max_capacity, 10),
        section: formData.section || undefined,
        stream: formData.stream || undefined,
      }
      
      // Only include teacher if selected
      if (formData.class_teacher_id) {
        payload.class_teacher_id = formData.class_teacher_id
      }
      
      // Only include classroom if selected
      if (formData.classroom_id) {
        payload.classroom_id = formData.classroom_id
      }
      
      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) delete payload[key]
      })

      let response
      if (isEdit) {
        response = await classesAPI.update(id, payload)
      } else {
        response = await classesAPI.create(payload)
      }

      if (response && response.success) {
        toast.success(`Class ${isEdit ? 'updated' : 'created'} successfully`)
        navigate('/classes')
      } else {
        toast.error(response?.message || 'Failed to save class')
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
        toast.error('A class with this name already exists for this academic year')
      } else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to save class')
      }
      console.error('Class save error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Conditional return AFTER all hooks
  if (fetching) return <LoadingSpinner fullScreen />

  const classOptions = formData.class_level === 'nursery' ? NURSERY_CLASS_OPTIONS : 
                       formData.class_level === 'primary' ? PRIMARY_CLASS_OPTIONS : 
                       [{ value: '', label: '-- Select Class Level First --' }]

  const teacherOptions = [
    ...TEACHER_PLACEHOLDER,
    ...teachers.map(t => ({
      value: t._id || t.id || '',
      label: `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || 'Unknown Teacher',
    })),
  ]

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in-up">
      <PageHeader
        title={isEdit ? 'Edit Class' : 'Create New Class'}
        actions={
          <button onClick={() => navigate('/classes')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Class Level *"
              name="class_level"
              value={formData.class_level}
              onChange={handleChange}
              options={CLASS_LEVEL_OPTIONS}
              error={errors.class_level}
            />
            <FormSelect
              label="Class Name *"
              name="class_name"
              value={formData.class_name}
              onChange={handleChange}
              options={classOptions}
              error={errors.class_name}
              disabled={!formData.class_level}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Academic Year *"
              name="academic_year"
              value={formData.academic_year}
              onChange={handleChange}
              error={errors.academic_year}
              placeholder="e.g., 2026/2027"
            />
            <FormInput
              label="Max Capacity *"
              name="max_capacity"
              type="number"
              value={formData.max_capacity}
              onChange={handleChange}
              error={errors.max_capacity}
              min="1"
              max="100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Class Teacher"
              name="class_teacher_id"
              value={formData.class_teacher_id}
              onChange={handleChange}
              options={teacherOptions}
            />
            <FormSelect
              label="Classroom"
              name="classroom_id"
              value={formData.classroom_id}
              onChange={handleChange}
              options={CLASSROOM_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Section"
              name="section"
              value={formData.section}
              onChange={handleChange}
              placeholder="e.g., A, B (optional)"
            />
            <FormInput
              label="Stream"
              name="stream"
              value={formData.stream}
              onChange={handleChange}
              placeholder="e.g., Science, Arts (optional)"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" loading={loading} icon={<Save size={18} />}>
              {isEdit ? 'Update Class' : 'Create Class'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/classes')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default ClassForm
