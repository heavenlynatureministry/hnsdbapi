import { useState } from 'react'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import Button from '../common/Button'
import Card from '../common/Card'
import { Save, Calendar } from 'lucide-react'

const EVENT_TYPES = [
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'religious', label: 'Religious' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'parent_meeting', label: 'Parent Meeting' },
  { value: 'staff_meeting', label: 'Staff Meeting' },
  { value: 'training', label: 'Training' },
  { value: 'community', label: 'Community' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'other', label: 'Other' },
]

const AUDIENCES = [
  { value: 'all', label: 'All' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'parents', label: 'Parents' },
  { value: 'staff', label: 'Staff' },
]

function EventForm({ initialData = null, onSubmit, onCancel, loading = false }) {
  const isEdit = Boolean(initialData)

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    event_type: initialData?.event_type || 'other',
    description: initialData?.description || '',
    start_date: initialData?.start_date?.split('T')[0] || '',
    end_date: initialData?.end_date?.split('T')[0] || '',
    location: initialData?.location || 'School Premises',
    organizer: initialData?.organizer || 'School Administration',
    target_audience: initialData?.target_audience || ['all'],
    max_participants: initialData?.max_participants || '',
    budget: initialData?.budget || '',
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const toggleAudience = (audience) => {
    setFormData(prev => ({
      ...prev,
      target_audience: prev.target_audience.includes(audience)
        ? prev.target_audience.filter(a => a !== audience)
        : [...prev.target_audience, audience],
    }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Event title is required'
    if (!formData.start_date) newErrors.start_date = 'Start date is required'
    if (!formData.end_date) newErrors.end_date = 'End date is required'
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      newErrors.end_date = 'End date must be after start date'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit?.(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <Card>
        <div className="space-y-4">
          <FormInput label="Event Title *" name="title" value={formData.title} onChange={handleChange} error={errors.title} placeholder="e.g., Annual Sports Day" />
          <FormSelect label="Event Type" name="event_type" value={formData.event_type} onChange={handleChange} options={EVENT_TYPES} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Start Date/Time *" name="start_date" type="datetime-local" value={formData.start_date} onChange={handleChange} error={errors.start_date} />
            <FormInput label="End Date/Time *" name="end_date" type="datetime-local" value={formData.end_date} onChange={handleChange} error={errors.end_date} />
          </div>
          <FormInput label="Location" name="location" value={formData.location} onChange={handleChange} />
          <FormInput label="Organizer" name="organizer" value={formData.organizer} onChange={handleChange} />
          
          {/* Target Audience */}
          <div>
            <label className="form-label">Target Audience</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map((aud) => (
                <button
                  key={aud.value}
                  type="button"
                  onClick={() => toggleAudience(aud.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    formData.target_audience.includes(aud.value)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {aud.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Max Participants" name="max_participants" type="number" value={formData.max_participants} onChange={handleChange} min="0" />
            <FormInput label="Budget (SSP)" name="budget" type="number" value={formData.budget} onChange={handleChange} min="0" step="0.01" />
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="form-input" placeholder="Event description..." />
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" loading={loading} icon={<Save size={18} />}>
          {isEdit ? 'Update Event' : 'Create Event'}
        </Button>
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}

export default EventForm