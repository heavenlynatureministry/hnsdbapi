import { useState } from 'react'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import Button from '../common/Button'
import Card from '../common/Card'
import { Save, BookOpen } from 'lucide-react'

const QUALIFICATIONS = [
  { value: '', label: '-- Select Qualification --' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'B.Ed', label: 'B.Ed (Bachelor of Education)' },
  { value: 'B.Sc', label: 'B.Sc (Bachelor of Science)' },
  { value: 'B.A', label: 'B.A (Bachelor of Arts)' },
  { value: 'M.Ed', label: 'M.Ed (Master of Education)' },
  { value: 'M.Sc', label: 'M.Sc (Master of Science)' },
  { value: 'M.A', label: 'M.A (Master of Arts)' },
  { value: 'PhD', label: 'PhD (Doctor of Philosophy)' },
  { value: 'PGDE', label: 'PGDE (Post Graduate Diploma)' },
  { value: 'Other', label: 'Other' },
]

const GENDERS = [
  { value: '', label: '-- Select Gender --' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
]

const SUBJECTS = [
  'English Language', 'Mathematics', 'Science', 'Social Studies',
  'Religious Education', 'Creative Arts', 'Physical Education',
  'Local Language', 'Computer Studies', 'Agriculture',
  'Business Studies', 'History', 'Geography', 'Civics',
]

function TeacherForm({ initialData = null, onSubmit, onCancel, loading = false }) {
  const isEdit = Boolean(initialData)

  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    middle_name: initialData?.middle_name || '',
    gender: initialData?.gender || '',
    date_of_birth: initialData?.date_of_birth || '',
    nationality: initialData?.nationality || 'South Sudanese',
    qualification: initialData?.qualification || '',
    specialization: initialData?.specialization || '',
    subjects: initialData?.subjects || [],
    phone_number: initialData?.phone_number || '',
    email: initialData?.email || '',
    address: initialData?.address || '',
    hire_date: initialData?.hire_date || '',
    years_of_experience: initialData?.years_of_experience || 0,
    salary_grade: initialData?.salary_grade || '',
    emergency_contact_name: initialData?.emergency_contact?.name || '',
    emergency_contact_phone: initialData?.emergency_contact?.phone_number || '',
    notes: initialData?.notes || '',
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const toggleSubject = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.gender) newErrors.gender = 'Please select a gender'
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required'
    if (!formData.qualification) newErrors.qualification = 'Please select a qualification'
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    
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
    
    onSubmit?.(payload)
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
          <FormInput label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} />
        </div>
      </Card>

      {/* Professional Information */}
      <Card title="Professional Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect label="Qualification *" name="qualification" value={formData.qualification} onChange={handleChange} options={QUALIFICATIONS} error={errors.qualification} />
          <FormInput label="Specialization" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="e.g., Mathematics" />
          <FormInput label="Hire Date *" name="hire_date" type="date" value={formData.hire_date} onChange={handleChange} error={errors.hire_date} />
          <FormInput label="Years of Experience" name="years_of_experience" type="number" value={formData.years_of_experience} onChange={handleChange} min="0" max="50" />
          <FormInput label="Salary Grade" name="salary_grade" value={formData.salary_grade} onChange={handleChange} placeholder="e.g., Grade 5" />
        </div>
      </Card>

      {/* Subjects */}
      <Card title="Subjects" icon={<BookOpen size={20} />}>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => toggleSubject(subject)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                formData.subjects.includes(subject)
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
        {formData.subjects.length > 0 ? (
          <p className="text-sm text-green-600 mt-3 font-medium">
            ✅ {formData.subjects.length} subject{formData.subjects.length > 1 ? 's' : ''} selected
          </p>
        ) : (
          <p className="text-sm text-gray-400 mt-3">No subjects selected</p>
        )}
      </Card>

      {/* Contact Information */}
      <Card title="Contact Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Phone Number *" name="phone_number" value={formData.phone_number} onChange={handleChange} error={errors.phone_number} placeholder="+211 900 000 000" />
          <FormInput label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} placeholder="teacher@school.com" />
          <div className="sm:col-span-2">
            <FormInput label="Address" name="address" value={formData.address} onChange={handleChange} placeholder="Enter residential address" />
          </div>
        </div>
      </Card>

      {/* Emergency Contact */}
      <Card title="Emergency Contact (Optional)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput label="Contact Name" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} placeholder="Full name of emergency contact" />
          <FormInput label="Contact Phone" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} placeholder="+211 900 000 000" />
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
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}

export default TeacherForm
