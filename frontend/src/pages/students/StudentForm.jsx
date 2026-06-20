import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import studentsAPI from '../../api/students'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, UserPlus, Users, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

const CLASSES = [
  { value: 'c1', label: 'Baby (Nursery)' },
  { value: 'c2', label: 'Middle (Nursery)' },
  { value: 'c3', label: 'Top (Nursery)' },
  { value: 'c4', label: 'P1 (Primary)' },
  { value: 'c5', label: 'P2 (Primary)' },
  { value: 'c6', label: 'P3 (Primary)' },
  { value: 'c7', label: 'P4 (Primary)' },
  { value: 'c8', label: 'P5 (Primary)' },
  { value: 'c9', label: 'P6 (Primary)' },
  { value: 'c10', label: 'P7 (Primary)' },
  { value: 'c11', label: 'P8 (Primary)' },
]

function StudentForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})

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
    if (isEdit) {
      const timer = setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          first_name: 'Abraham', last_name: 'Kuol', gender: 'Male',
          date_of_birth: '2016-03-10', place_of_birth: 'Juba',
          student_type: 'street', current_class_id: 'c6',
          guardians: [{ first_name: 'Michael', last_name: 'Kuol', relationship: 'Father', phone_number: '+211 912 987 654', email: 'michael@example.com', is_primary_contact: true }],
        }))
        setFetching(false)
      }, 500)
    }
  }, [id])

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
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    try {
      const payload = { ...formData }
      const response = isEdit
        ? await studentsAPI.update(id, payload)
        : await studentsAPI.create(payload)
      if (response.success) {
        toast.success(`Student ${isEdit ? 'updated' : 'enrolled'} successfully`)
        navigate('/students')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save student')
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
            <FormSelect label="Assign to Class" name="current_class_id" value={formData.current_class_id} onChange={handleChange} options={CLASSES} />
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