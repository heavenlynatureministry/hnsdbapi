import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import schoolAPI from '../../api/school'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { Calendar, Plus, Edit, Trash2, MapPin, Clock, Users, Save } from 'lucide-react'
import toast from 'react-hot-toast'

function EventsPage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('upcoming')
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    title: '', event_type: 'other', description: '',
    start_date: '', end_date: '', location: 'School Premises',
    organizer: 'School Administration', target_audience: ['all'],
    max_participants: '', budget: '',
  })

  useEffect(() => {
    updatePageTitle('School Events')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'School' },
      { label: 'Events' },
    ])
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const response = await schoolAPI.getEvents()
      if (response?.success) {
        setEvents(response.data?.events || response.data || [])
      } else {
        setEvents([])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
      toast.error('Failed to load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingEvent(null)
    setErrors({})
    setFormData({
      title: '', event_type: 'other', description: '',
      start_date: '', end_date: '', location: 'School Premises',
      organizer: 'School Administration', target_audience: ['all'],
      max_participants: '', budget: '',
    })
    setShowModal(true)
  }

  const openEditModal = (event) => {
    setEditingEvent(event)
    setErrors({})
    setFormData({
      title: event.title || '',
      event_type: event.event_type || 'other',
      description: event.description || '',
      start_date: event.start_date?.split('T')[0] || '',
      end_date: event.end_date?.split('T')[0] || '',
      location: event.location || 'School Premises',
      organizer: event.organizer || 'School Administration',
      target_audience: event.target_audience || ['all'],
      max_participants: event.max_participants || '',
      budget: event.budget || '',
    })
    setShowModal(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    try {
      const payload = { ...formData }
      
      let response
      if (editingEvent) {
        response = await schoolAPI.updateEvent(editingEvent._id, payload)
      } else {
        response = await schoolAPI.createEvent(payload)
      }

      if (response?.success) {
        toast.success(editingEvent ? 'Event updated!' : 'Event created!')
        setShowModal(false)
        fetchEvents()
      } else {
        toast.error(response?.message || 'Failed to save event')
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
      } else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to save event')
      }
      console.error('Event save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (eventId) => {
    if (!confirm('Are you sure you want to cancel this event?')) return
    
    try {
      const response = await schoolAPI.cancelEvent(eventId, 'Cancelled by admin')
      if (response?.success) {
        toast.success('Event cancelled')
        fetchEvents()
      } else {
        toast.error(response?.message || 'Failed to cancel event')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to cancel event')
    }
  }

  const getEventBadge = (type) => {
    const variants = { 
      academic: 'info', sports: 'success', cultural: 'warning', 
      parent_meeting: 'info', training: 'info', religious: 'gray', 
      other: 'gray', graduation: 'success', community: 'info',
      fundraising: 'warning', staff_meeting: 'info' 
    }
    return <Badge variant={variants[type] || 'gray'}>{type?.replace(/_/g, ' ')}</Badge>
  }

  const getStatusBadge = (status) => {
    const variants = { 
      upcoming: 'info', ongoing: 'success', completed: 'gray', 
      cancelled: 'danger', postponed: 'warning' 
    }
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>
  }

  const filteredEvents = events.filter(e => {
    if (filter === 'upcoming') return e.status === 'upcoming'
    if (filter === 'completed') return e.status === 'completed'
    return true
  })

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="School Events"
        subtitle={`${events.length} total events`}
        actions={
          <Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>
            Add Event
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['upcoming', 'completed', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title="No events found"
          description="No events match your filter."
          action={
            <Button onClick={openCreateModal} variant="primary">
              Add Event
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <Card key={event._id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                {getStatusBadge(event.status)}
              </div>
              <div className="space-y-2 text-sm mb-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={14} />
                  {new Date(event.start_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock size={14} />
                  {new Date(event.start_date).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {new Date(event.end_date).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin size={14} /> {event.location}
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Users size={14} /> {(event.target_audience || []).join(', ')}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                {getEventBadge(event.event_type)}
                <div className="flex gap-1">
                  {event.status === 'upcoming' && (
                    <>
                      <button
                        onClick={() => openEditModal(event)}
                        className="btn btn-ghost btn-sm btn-icon text-blue-600"
                        title="Edit event"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleCancel(event._id)}
                        className="btn btn-ghost btn-sm btn-icon text-red-600"
                        title="Cancel event"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingEvent ? 'Edit Event' : 'Create Event'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Event Title *"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            placeholder="e.g., Annual Sports Day"
          />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Event Type"
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              options={[
                { value: 'academic', label: 'Academic' },
                { value: 'sports', label: 'Sports' },
                { value: 'cultural', label: 'Cultural' },
                { value: 'parent_meeting', label: 'Parent Meeting' },
                { value: 'training', label: 'Training' },
                { value: 'religious', label: 'Religious' },
                { value: 'graduation', label: 'Graduation' },
                { value: 'community', label: 'Community' },
                { value: 'fundraising', label: 'Fundraising' },
                { value: 'staff_meeting', label: 'Staff Meeting' },
                { value: 'other', label: 'Other' },
              ]}
            />
            {editingEvent && (
              <FormSelect
                label="Status"
                name="status"
                value={formData.status || 'upcoming'}
                onChange={handleChange}
                options={[
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'ongoing', label: 'Ongoing' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'postponed', label: 'Postponed' },
                ]}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Start Date *"
              name="start_date"
              type="datetime-local"
              value={formData.start_date}
              onChange={handleChange}
              error={errors.start_date}
            />
            <FormInput
              label="End Date *"
              name="end_date"
              type="datetime-local"
              value={formData.end_date}
              onChange={handleChange}
              error={errors.end_date}
            />
          </div>
          <FormInput
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
          />
          <FormInput
            label="Organizer"
            name="organizer"
            value={formData.organizer}
            onChange={handleChange}
          />
          <div>
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="form-input"
              placeholder="Event description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Max Participants"
              name="max_participants"
              type="number"
              value={formData.max_participants}
              onChange={handleChange}
              min="0"
            />
            <FormInput
              label="Budget (SSP)"
              name="budget"
              type="number"
              value={formData.budget}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" loading={saving} icon={<Save size={18} />}>
              {editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default EventsPage
