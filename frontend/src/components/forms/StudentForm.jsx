import { useState, useEffect } from 'react'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import Button from '../common/Button'
import Card from '../common/Card'
import { Save, X, Plus, Users } from 'lucide-react'
import classesAPI from '../../api/classes'
import toast from 'react-hot-toast'

const CLASS_PLACEHOLDER = [{ value: '', label: '-- Select Class --' }]

const GENDERS = [
  { value: '', label: '-- Select Gender --' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
]

const STUDENT_TYPES = [
  { value: '', label: '-- Select Student Type --' },
  { value: 'street', label: 'Street Child' },
  { value: 'abundant', label: 'Abundant Family' },
  { value: 'orphan', label: 'Orphan' },
  { value: 'other', label: 'Other' },
]

function StudentForm({ initialData = null, onSubmit, onCancel, loading = false }) {
  const isEdit = Boolean(initialData)

  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    middle_name: initialData?.middle_name || '',
    gender: initialData?.gender || '',
    date_of_birth: initialData?.date_of_birth || '',
    place_of_birth: initialData?.place_of_birth || '',
    nationality: initialData?.nationality || 'South Sudanese',
    student_type: initialData?.student_type || '',
    current_class_id: initialData?.current_class_id || '',
    enrollment_date: initialData?.enrollment_date || new Date().toISOString().split('T')[0],
    medical_notes: initialData?.medical_notes || '',
    special_needs: initialData?.special_needs || '',
    address: initialData?.address || '',
  })

  const [guardians, setGuardians] = useState(
    initialData?.guardians?.length > 0
      ? initialData.guardians
      : [{ first_name: '', last_name: '', relationship: '', phone_number: '', email: '', is_primary_contact: true }]
  )

  const [errors, setErrors] = useState({})
  const [classOptions, setClassOptions] = useState(CLASS_PLACEHOLDER)
  const [loadingClasses, setLoadingClasses] = useState(false)

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const response = await classesAPI.getAll({ status: 'active' })
      let classesArray = response?.data || response || []
      if (!Array.isArray(classesArray)) {
        classesArray = classesArray?.classes || classesArray?.data || []
      }

      if (classesArray.length > 0) {
        const options = classesArray.map(cls => ({
          value: cls._id || cls.id || '',
          label: cls.class_name || cls.name || 
                 `${cls.class_level || ''} ${cls.class_name || ''}`.trim() ||
                 'Unknown Class',
        })).filter(opt => opt.value && opt.label)
        setClassOptions([...CLASS_PLACEHOLDER, ...options])
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      toast.error('Failed to load classes')
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleGuardianChange = (index, field, value) => {
    setGuardians(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addGuardian = () => {
    setGuardians(prev => [...prev, { first_name: '', last_name: '', relationship: '', phone_number: '', email: '', is_primary_contact: false }])
  }

  const removeGuardian = (index) => {
    if (guardians.length <= 1) return
    setGuardians(prev => prev.filter((_, i) => i !== index))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.gender) newErrors.gender = 'Please select a gender'
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
    if (!formData.student_type) newErrors.student_type = 'Please select a student type'
    
    const primaryGuardian = guardians[0]
    if (!primaryGuardian?.first_name?.trim() && !primaryGuardian?.last_name?.trim()) {
      newErrors.guardians = 'At least one guardian name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    
    const payload = { ...formData }
    // Only include class_id if selected
    if (!payload.current_class_id) {
      delete payload.current_class_id
    }
    
    onSubmit?.({ ...payload, guardians })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <Card title="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormInput label="First Name *" name="first_name" value={formData.first_name} onChange={handleChange} error={errors.first_name} placeholder="Enter first name" />
          <FormInput label="Last Name *" name="last_name" value={formData.last_name} onChange={handleChange} error={errors.last_name} placeholder="Enter last name" />
          <FormInput label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} placeholder="Optional" />
          <FormSelect label="Gender *" name="gender" value={formData.gender} onChange={handleChange} options={GENDERS} error={errors.gender} />
          <FormInput label="Date of Birth *" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} error={errors.date_of_birth} />
          <FormInput label="Place of Birth" name="place_of_birth" value={formData.place_of_birth} onChange={handleChange} placeholder="City, Country" />
        </div>
      </Card>

      {/* Enrollment Information */}
      <Card title="Enrollment Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect label="Student Type *" name="student_type" value={formData.student_type} onChange={handleChange} options={STUDENT_TYPES} error={errors.student_type} />
          <FormSelect 
            label="Assign to Class" 
            name="current_class_id" 
            value={formData.current_class_id} 
            onChange={handleChange} 
            options={classOptions}
            disabled={loadingClasses}
            placeholder={loadingClasses ? 'Loading classes...' : 'Select a class (optional)'}
          />
          <FormInput label="Enrollment Date" name="enrollment_date" type="date" value={formData.enrollment_date} onChange={handleChange} />
          <FormInput label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} placeholder="South Sudanese" />
        </div>
      </Card>

      {/* Medical Information */}
      <Card title="Medical & Special Needs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Medical Notes</label>
            <textarea name="medical_notes" value={formData.medical_notes} onChange={handleChange} rows={2} className="form-input" placeholder="Any medical conditions, allergies, etc." />
          </div>
          <div>
            <label className="form-label">Special Needs</label>
            <textarea name="special_needs" value={formData.special_needs} onChange={handleChange} rows={2} className="form-input" placeholder="Any special educational needs" />
          </div>
        </div>
        <FormInput label="Address" name="address" value={formData.address} onChange={handleChange} className="mt-4" placeholder="Home address" />
      </Card>

      {/* Guardians */}
      <Card 
        title="Guardians" 
        icon={<Users size={20} />}
        actions={
          <button type="button" onClick={addGuardian} className="btn btn-secondary btn-sm">
            <Plus size={14} /> Add Guardian
          </button>
        }
      >
        {errors.guardians && (
          <p className="text-sm text-red-500 mb-3">{errors.guardians}</p>
        )}
        <div className="space-y-4">
          {guardians.map((guardian, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative">
              {guardians.length > 1 && (
                <button type="button" onClick={() => removeGuardian(index)} className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                  <X size={14} />
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <FormInput label="First Name" value={guardian.first_name} onChange={(e) => handleGuardianChange(index, 'first_name', e.target.value)} placeholder="Guardian first name" />
                <FormInput label="Last Name" value={guardian.last_name} onChange={(e) => handleGuardianChange(index, 'last_name', e.target.value)} placeholder="Guardian last name" />
                <FormInput label="Relationship" value={guardian.relationship} onChange={(e) => handleGuardianChange(index, 'relationship', e.target.value)} placeholder="Father, Mother, Uncle, etc." />
                <FormInput label="Phone Number" value={guardian.phone_number} onChange={(e) => handleGuardianChange(index, 'phone_number', e.target.value)} placeholder="+211 XXX XXX XXX" />
                <FormInput label="Email" type="email" value={guardian.email} onChange={(e) => handleGuardianChange(index, 'email', e.target.value)} placeholder="guardian@email.com" />
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
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  )
}

export default StudentForm
