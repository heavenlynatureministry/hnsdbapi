import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, School } from 'lucide-react'
import toast from 'react-hot-toast'

const NURSERY_CLASSES = ['Baby', 'Middle', 'Top']
const PRIMARY_CLASSES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']

function ClassForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    class_name: '',
    class_level: 'primary',
    academic_year: '2024/2025',
    max_capacity: '25',
    class_teacher_id: '',
    classroom_id: '',
    section: '',
    stream: '',
  })

  useEffect(() => {
    updatePageTitle(isEdit ? 'Edit Class' : 'Add Class')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Classes', path: '/classes' },
      { label: isEdit ? 'Edit' : 'Add' },
    ])
    
    if (isEdit) {
      fetchClass()
    } else {
      setFetching(false)
    }
  }, [id])

  const fetchClass = async () => {
    setFetching(true)
    try {
      const response = await classesAPI.getById(id)
      if (response?.success && response.data) {
        const c = response.data
        setFormData({
          class_name: c.class_name || '',
          class_level: c.class_level || 'primary',
          academic_year: c.academic_year || '2024/2025',
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
    if (name === 'class_level') setFormData(prev => ({ ...prev, class_name: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.class_name) newErrors.class_name = 'Class name is required'
    if (!formData.class_level) newErrors.class_level = 'Class level is required'
    if (!formData.academic_year) newErrors.academic_year = 'Academic year is required'
    if (!formData.max_capacity || formData.max_capacity < 1) newErrors.max_capacity = 'Valid capacity is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload = {
        ...formData,
        max_capacity: parseInt(formData.max_capacity, 10),
      }

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

  if (fetching) return <LoadingSpinner fullScreen />

  const classOptions = formData.class_level === 'nursery' ? NURSERY_CLASSES : PRIMARY_CLASSES

  // Update max capacity when level changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      max_capacity: prev.class_level === 'nursery' ? '20' : '25',
    }))
  }, [formData.class_level])

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
              options={[
                { value: 'nursery', label: 'Nursery' },
                { value: 'primary', label: 'Primary' },
              ]}
              error={errors.class_level}
            />
            <FormSelect
              label="Class Name *"
              name="class_name"
              value={formData.class_name}
              onChange={handleChange}
              options={classOptions.map(c => ({ value: c, label: c }))}
              error={errors.class_name}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Academic Year"
              name="academic_year"
              value={formData.academic_year}
              onChange={handleChange}
            />
            <FormInput
              label="Max Capacity"
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
              options={[
                { value: '', label: 'Select Teacher' },
                { value: 't1', label: 'John Doe' },
                { value: 't2', label: 'Mary Smith' },
                { value: 't3', label: 'James Johnson' },
              ]}
            />
            <FormSelect
              label="Classroom"
              name="classroom_id"
              value={formData.classroom_id}
              onChange={handleChange}
              options={[
                { value: '', label: 'Select Classroom' },
                { value: 'r1', label: 'Room 1' },
                { value: 'r2', label: 'Room 2' },
                { value: 'r8', label: 'Room 8' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Section"
              name="section"
              value={formData.section}
              onChange={handleChange}
              placeholder="e.g., A, B"
            />
            <FormInput
              label="Stream"
              name="stream"
              value={formData.stream}
              onChange={handleChange}
              placeholder="e.g., Science, Arts"
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
