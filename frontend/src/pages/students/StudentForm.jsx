do the same thing to import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import studentsAPI from '../../api/students'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, UserPlus, Users, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

function StudentForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})
  const [classOptions, setClassOptions] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    gender: 'Male',
    date_of_birth: '',
    place_of_birth: '',
    nationality: 'South Sudanese',
    student_type: 'other',
    current_class_id: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    medical_notes: '',
    special_needs: '',
    address: '',
    guardians: [{ first_name: '', last_name: '', relationship: '', phone_number: '', email: '', is_primary_contact: true }],
  })

  useEffect(() => {
    updatePageTitle(isEdit ? 'Edit Student' : 'Add Student')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Students', path: '/students' },
      { label: isEdit ? 'Edit Student' : 'Add Student' },
    ])
  }, [isEdit])

  useEffect(() => {
    fetchClasses()
    if (isEdit) {
      fetchStudent()
    } else {
      setFetching(false)
    }
  }, [id])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      console.log('Fetching classes...')
      const response = await classesAPI.getAll()
      console.log('Classes API raw response:', response)

      // Extract classes array from various possible response formats
      let classesArray = null

      if (Array.isArray(response)) {
        classesArray = response
      } else if (response?.data && Array.isArray(response.data)) {
        classesArray = response.data
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        classesArray = response.data.data
      } else if (response?.data?.success && Array.isArray(response.data.data)) {
        classesArray = response.data.data
      } else if (response?.success && Array.isArray(response.data)) {
        classesArray = response.data
      } else if (response?.data?.classes && Array.isArray(response.data.classes)) {
        classesArray = response.data.classes
      } else if (response?.classes && Array.isArray(response.classes)) {
        classesArray = response.classes
      } else if (response?.data?.results && Array.isArray(response.data.results)) {
        classesArray = response.data.results
      }

      if (classesArray && classesArray.length > 0) {
        console.log('Classes array found:', classesArray)
        const options = classesArray.map(cls => {
          // Try multiple possible field names for ID and name
          const id = cls._id || cls.id || cls.class_id || cls.classId || ''
          const name = cls.name || cls.class_name || cls.className || 
                      (cls.level ? `${cls.level} ${cls.section || ''}`.trim() : '') ||
                      cls.label || cls.title || 'Unknown Class'
          
          return {
            value: id,
            label: name,
          }
        }).filter(option => option.value && option.label)
        
        console.log('Processed class options:', options)
        setClassOptions(options)
        
        if (options.length === 0) {
          toast.error('No valid classes found in response')
        }
      } else {
        console.warn('No classes found in response. Full response:', response)
        toast.error('No classes found. Please create classes first.')
        setClassOptions([])
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      
      // Try without params as fallback
      try {
        console.log('Retrying classes fetch without params...')
        const retryResponse = await classesAPI.getAll()
        console.log('Retry response:', retryResponse)
        
        if (Array.isArray(retryResponse?.data)) {
          const options = retryResponse.data.map(cls => ({
            value: cls._id || cls.id || cls.class_id || '',
            label: cls.name || cls.class_name || `${cls.level || ''} ${cls.section || ''}`.trim() || 'Unknown Class',
          })).filter(option => option.value)
          setClassOptions(options)
          return
        }
      } catch (retryError) {
        console.error('Retry also failed:', retryError)
      }
      
      toast.error('Failed to load classes. Please check your connection and try again.')
      setClassOptions([])
    } finally {
      setLoadingClasses(false)
    }
  }

  const fetchStudent = async () => {
    setFetching(true)
    try {
      const response = await studentsAPI.getById(id)
      if (response?.success && response.data) {
        const s = response.data
        setFormData({
          first_name: s.first_name || '',
          last_name: s.last_name || '',
          middle_name: s.middle_name || '',
          gender: s.gender || 'Male',
          date_of_birth: s.date_of_birth?.split('T')[0] || '',
          place_of_birth: s.place_of_birth || '',
          nationality: s.nationality || 'South Sudanese',
          student_type: s.student_type || 'other',
          current_class_id: s.current_class_id || '',
          enrollment_date: s.enrollment_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          medical_notes: s.medical_notes || '',
          special_needs: s.special_needs || '',
          address: s.address || '',
          guardians: s.guardians?.length > 0
            ? s.guardians.map(g => ({
                first_name: g.first_name || '',
                last_name: g.last_name || '',
                relationship: g.relationship || '',
                phone_number: g.phone_number || '',
                email: g.email || '',
                is_primary_contact: g.is_primary_contact || false,
              }))
            : [{ first_name: '', last_name: '', relationship: '', phone_number: '', email: '', is_primary_contact: true }],
        })
      } else {
        toast.error('Failed to load student data')
        navigate('/students')
      }
    } catch (error) {
      toast.error('Failed to fetch student')
      navigate('/students')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleGuardianChange = (index, field, value) => {
    setFormData((prev) => {
      const guardians = [...prev.guardians]
      guardians[index] = { ...guardians[index], [field]: value }
      return { ...prev, guardians }
    })
  }

  const addGuardian = () => {
    setFormData((prev) => ({
      ...prev,
      guardians: [...prev.guardians, { first_name: '', last_name: '', relationship: '', phone_number: '', email: '', is_primary_contact: false }],
    }))
  }

  const removeGuardian = (index) => {
    if (formData.guardians.length <= 1) return
    setFormData((prev) => ({
      ...prev,
      guardians: prev.guardians.filter((_, i) => i !== index),
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
    if (!formData.gender) newErrors.gender = 'Gender is required'
    if (!formData.student_type) newErrors.student_type = 'Student type is required'
    
    // Validate primary guardian has at least name and phone
    const primaryGuardian = formData.guardians[0]
    if (primaryGuardian && !primaryGuardian.first_name.trim() && !primaryGuardian.last_name.trim()) {
      newErrors.guardians = 'Primary guardian name is required'
    }
    
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
        response = await studentsAPI.update(id, payload)
      } else {
        response = await studentsAPI.create(payload)
      }

      if (response && response.success) {
        toast.success(`Student ${isEdit ? 'updated' : 'enrolled'} successfully`)
        navigate('/students')
      } else {
        toast.error(response?.message || 'Failed to save student')
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
        toast.error('A student with this information already exists')
      } else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'An error occurred while saving student')
      }
      console.error('Student save error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner fullScreen />

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <PageHeader
        title={isEdit ? 'Edit Student' : 'Enroll New Student'}
        actions={
          <button onClick={() => navigate('/students')} className="btn btn-secondary">
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
            <FormSelect label="Gender *" name="gender" value={formData.gender} onChange={handleChange} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
            <FormInput label="Date of Birth *" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} error={errors.date_of_birth} />
            <FormInput label="Place of Birth" name="place_of_birth" value={formData.place_of_birth} onChange={handleChange} />
          </div>
        </Card>

        {/* Enrollment Information */}
        <Card title="Enrollment Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Student Type *" name="student_type" value={formData.student_type} onChange={handleChange} options={[
              { value: 'street', label: 'Street Child' }, { value: 'abundant', label: 'Abundant Family' },
              { value: 'orphan', label: 'Orphan' }, { value: 'other', label: 'Other' },
            ]} error={errors.student_type} />
            <FormSelect 
              label="Assign to Class" 
              name="current_class_id" 
              value={formData.current_class_id} 
              onChange={handleChange} 
              options={classOptions} 
              disabled={loadingClasses}
              placeholder={loadingClasses ? 'Loading classes...' : classOptions.length === 0 ? 'No classes available - Create classes first' : 'Select a class'}
            />
            <FormInput label="Enrollment Date" name="enrollment_date" type="date" value={formData.enrollment_date} onChange={handleChange} />
            <FormInput label="Address" name="address" value={formData.address} onChange={handleChange} />
          </div>
        </Card>

        {/* Medical Information */}
        <Card title="Medical & Special Needs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Medical Notes</label>
              <textarea name="medical_notes" value={formData.medical_notes} onChange={handleChange} rows={2} className="form-input" placeholder="Any medical conditions..." />
            </div>
            <div>
              <label className="form-label">Special Needs</label>
              <textarea name="special_needs" value={formData.special_needs} onChange={handleChange} rows={2} className="form-input" placeholder="Any special educational needs..." />
            </div>
          </div>
        </Card>

        {/* Guardians */}
        <Card 
          title="Guardians" 
          icon={<Users size={20} />}
          actions={
            <button type="button" onClick={addGuardian} className="btn btn-secondary btn-sm">
              <UserPlus size={14} /> Add Guardian
            </button>
          }
        >
          {errors.guardians && (
            <p className="text-sm text-red-500 mb-3">{errors.guardians}</p>
          )}
          <div className="space-y-6">
            {formData.guardians.map((guardian, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative">
                {formData.guardians.length > 1 && (
                  <button type="button" onClick={() => removeGuardian(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm">Remove</button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FormInput label="First Name" value={guardian.first_name} onChange={(e) => handleGuardianChange(index, 'first_name', e.target.value)} />
                  <FormInput label="Last Name" value={guardian.last_name} onChange={(e) => handleGuardianChange(index, 'last_name', e.target.value)} />
                  <FormInput label="Relationship" value={guardian.relationship} onChange={(e) => handleGuardianChange(index, 'relationship', e.target.value)} placeholder="Father, Mother, etc." />
                  <FormInput label="Phone" value={guardian.phone_number} onChange={(e) => handleGuardianChange(index, 'phone_number', e.target.value)} />
                  <FormInput label="Email" type="email" value={guardian.email} onChange={(e) => handleGuardianChange(index, 'email', e.target.value)} />
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={guardian.is_primary_contact} onChange={(e) => handleGuardianChange(index, 'is_primary_contact', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                      Primary Contact
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={loading} icon={<Save size={18} />}>
            {isEdit ? 'Update Student' : 'Enroll Student'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/students')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default StudentForm
