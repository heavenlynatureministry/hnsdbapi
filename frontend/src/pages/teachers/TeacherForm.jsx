import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import teachersAPI from '../../api/teachers'
import schoolAPI from '../../api/school'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, UserPlus, GraduationCap, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

function TeacherForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})
  const [subjectsList, setSubjectsList] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  const QUALIFICATIONS = [
    'Certificate', 'Diploma', 'B.Ed', 'B.Sc', 'B.A',
    'M.Ed', 'M.Sc', 'M.A', 'PhD', 'PGDE', 'Other',
  ]

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    gender: 'Male',
    date_of_birth: '',
    nationality: 'South Sudanese',
    qualification: '',
    specialization: '',
    subjects: [],
    phone_number: '',
    email: '',
    address: '',
    hire_date: '',
    years_of_experience: 0,
    salary_grade: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
  })

  useEffect(() => {
    updatePageTitle(isEdit ? 'Edit Teacher' : 'Add Teacher')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Teachers', path: '/teachers' },
      { label: isEdit ? 'Edit Teacher' : 'Add Teacher' },
    ])
  }, [isEdit, updatePageTitle, updateBreadcrumbs])

  useEffect(() => {
    fetchSubjects()
    if (isEdit) {
      fetchTeacher()
    } else {
      setFetching(false)
    }
  }, [id])

  const fetchSubjects = async () => {
    setLoadingSubjects(true)
    try {
      // Try to fetch subjects from the school settings/subjects endpoint
      // Adjust the API call based on your actual endpoint for fetching subjects
      const response = await schoolAPI.getSettings({ category: 'subjects' })
      if (response?.success && response.data?.subjects) {
        setSubjectsList(response.data.subjects)
      } else if (response?.success && Array.isArray(response.data)) {
        setSubjectsList(response.data)
      } else {
        // Fallback: try fetching from a dedicated subjects endpoint if it exists
        // or use a reasonable default list
        console.warn('Could not fetch subjects from settings, using defaults')
        setSubjectsList([
          'English Language', 'Mathematics', 'Science', 'Social Studies',
          'Religious Education', 'Creative Arts', 'Physical Education',
          'Local Language', 'Computer Studies',
        ])
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
      // Fallback to default subjects if API fails
      setSubjectsList([
        'English Language', 'Mathematics', 'Science', 'Social Studies',
        'Religious Education', 'Creative Arts', 'Physical Education',
        'Local Language', 'Computer Studies',
      ])
    } finally {
      setLoadingSubjects(false)
    }
  }

  const fetchTeacher = async () => {
    setFetching(true)
    try {
      const response = await teachersAPI.getById(id)
      if (response?.success && response.data) {
        const t = response.data
        setFormData({
          first_name: t.first_name || '',
          last_name: t.last_name || '',
          middle_name: t.middle_name || '',
          gender: t.gender || 'Male',
          date_of_birth: t.date_of_birth?.split('T')[0] || '',
          nationality: t.nationality || 'South Sudanese',
          qualification: t.qualification || '',
          specialization: t.specialization || '',
          subjects: t.subjects || [],
          phone_number: t.phone_number || '',
          email: t.email || '',
          address: t.address || '',
          hire_date: t.hire_date?.split('T')[0] || '',
          years_of_experience: t.years_of_experience || 0,
          salary_grade: t.salary_grade || '',
          emergency_contact_name: t.emergency_contact?.name || '',
          emergency_contact_phone: t.emergency_contact?.phone_number || '',
          notes: t.notes || '',
        })
      } else {
        toast.error('Failed to load teacher data')
        navigate('/teachers')
      }
    } catch (error) {
      toast.error('Failed to fetch teacher')
      navigate('/teachers')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubjectsChange = (subject) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
    if (!formData.qualification) newErrors.qualification = 'Qualification is required'
    if (!formData.phone_number.trim()) newErrors.phone_number = 'Phone number is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (!formData.hire_date) newErrors.hire_date = 'Hire date is required'

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
        emergency_contact: {
          name: formData.emergency_contact_name,
          relationship: 'Emergency Contact',
          phone_number: formData.emergency_contact_phone,
        },
      }
      delete payload.emergency_contact_name
      delete payload.emergency_contact_phone

      let response
      if (isEdit) {
        response = await teachersAPI.update(id, payload)
      } else {
        response = await teachersAPI.create(payload)
      }

      if (response && response.success) {
        toast.success(`Teacher ${isEdit ? 'updated' : 'registered'} successfully`)
        navigate('/teachers')
      } else {
        toast.error(response?.message || 'Failed to save teacher')
      }
    } catch (error) {
      // Handle specific error cases
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
        toast.error('A teacher with this email already exists')
      } else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'An error occurred while saving teacher')
      }
      console.error('Teacher save error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner fullScreen />

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <PageHeader
        title={isEdit ? 'Edit Teacher' : 'Register New Teacher'}
        actions={
          <button onClick={() => navigate('/teachers')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card title="Personal Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput label="First Name *" name="first_name" value={formData.first_name} onChange={handleChange} error={errors.first_name} />
            <FormInput label="Last Name *" name="last_name" value={formData.last_name} onChange={handleChange} error={errors.last_name} />
            <FormInput label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} />
            <FormSelect label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} />
            <FormInput label="Date of Birth *" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} error={errors.date_of_birth} />
            <FormInput label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} />
          </div>
        </Card>

        {/* Professional Information */}
        <Card title="Professional Information" icon={<GraduationCap size={20} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Qualification *" name="qualification" value={formData.qualification} onChange={handleChange} options={QUALIFICATIONS.map(q => ({ value: q, label: q }))} error={errors.qualification} />
            <FormInput label="Specialization" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="e.g., Mathematics" />
            <FormInput label="Hire Date *" name="hire_date" type="date" value={formData.hire_date} onChange={handleChange} error={errors.hire_date} />
            <FormInput label="Years of Experience" name="years_of_experience" type="number" value={formData.years_of_experience} onChange={handleChange} min="0" max="50" />
            <FormInput label="Salary Grade" name="salary_grade" value={formData.salary_grade} onChange={handleChange} placeholder="e.g., Grade 5" />
          </div>
        </Card>

        {/* Subjects */}
        <Card title="Subjects" icon={<BookOpen size={20} />}>
          {loadingSubjects ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-sm text-gray-500">Loading subjects...</span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {subjectsList.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => handleSubjectsChange(subject)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.subjects.includes(subject)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {subject}
                  </button>
                ))}
                {subjectsList.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">No subjects available</p>
                )}
              </div>
              {formData.subjects.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  {formData.subjects.length} subject{formData.subjects.length > 1 ? 's' : ''} selected
                </p>
              )}
            </>
          )}
        </Card>

        {/* Contact Information */}
        <Card title="Contact Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Phone Number *" name="phone_number" value={formData.phone_number} onChange={handleChange} error={errors.phone_number} placeholder="+211 900 000 000" />
            <FormInput label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} />
            <div className="sm:col-span-2">
              <FormInput label="Address" name="address" value={formData.address} onChange={handleChange} placeholder="Enter address" />
            </div>
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card title="Emergency Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Contact Name" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} />
            <FormInput label="Contact Phone" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} />
          </div>
        </Card>

        {/* Notes */}
        <Card title="Additional Notes">
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="form-input"
            placeholder="Any additional notes about the teacher..."
          />
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={loading} icon={<Save size={18} />}>
            {isEdit ? 'Update Teacher' : 'Register Teacher'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/teachers')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default TeacherForm
