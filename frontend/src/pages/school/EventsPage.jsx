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
import { Calendar, Plus, Edit, Trash2, MapPin, Clock, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'

function EventsPage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('upcoming')

  const [formData, setFormData] = useState({
    title: '', event_type: 'other', description: '',
    start_date: '', end_date: '', location: 'School Premises',
    organizer: 'School Administration', target_audience: ['all'],
    max_participants: '', budget: '',
  })

  useEffect(() => {
    updatePageTitle('School Events')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'School' }, { label: 'Events' }])
    fetchEvents()
  }, [])

  const fetchEvents = () => {
    setLoading(true)
    setTimeout(() => {
      setEvents([
        { _id: '1', title: 'Parent-Teacher Meeting', event_type: 'parent_meeting', start_date: '2024-02-15T09:00:00', end_date: '2024-02-15T12:00:00', location: 'School Hall', organizer: 'Head Teacher', status: 'upcoming', target_audience: ['parents', 'teachers'] },
        { _id: '2', title: 'Annual Sports Day', event_type: 'sports', start_date: '2024-02-28T08:00:00', end_date: '2024-02-28T16:00:00', location: 'School Field', organizer: 'Sports Department', status: 'upcoming', target_audience: ['all'] },
        { _id: '3', title: 'Cultural Festival', event_type: 'cultural', start_date: '2024-03-15T10:00:00', end_date: '2024-03-15T15:00:00', location: 'School Grounds', organizer: 'Cultural Committee', status: 'upcoming', target_audience: ['all'] },
        { _id: '4', title: 'Staff Training Workshop', event_type: 'training', start_date: '2024-01-20T08:00:00', end_date: '2024-01-22T16:00:00', location: 'Library', organizer: 'Admin', status: 'completed', target_audience: ['teachers', 'staff'] },
      ])
      setLoading(false)
    }, 500)
  }

  const openCreateModal = () => {
    setEditingEvent(null)
    setFormData({ title: '', event_type: 'other', description: '', start_date: '', end_date: '', location: 'School Premises', organizer: 'School Administration', target_audience: ['all'], max_participants: '', budget: '' })
    setShowModal(true)
  }

  const openEditModal = (event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title, event_type: event.event_type, description: event.description || '',
      start_date: event.start_date?.split('T')[0], end_date: event.end_date?.split('T')[0],
      location: event.location, organizer: event.organizer, target_audience: event.target_audience || ['all'],
      max_participants: event.max_participants || '', budget: event.budget || '',
    })
    setShowModal(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 800))
      toast.success(editingEvent ? 'Event updated!' : 'Event created!')
      setShowModal(false)
      fetchEvents()
    } catch (error) {
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (eventId) => {
    try {
      await schoolAPI.cancelEvent(eventId, 'Cancelled by admin')
      toast.success('Event cancelled')
      fetchEvents()
    } catch (error) {
      toast.error('Failed to cancel event')
    }
  }

  const getEventBadge = (type) => {
    const variants = { academic: 'info', sports: 'success', cultural: 'warning', parent_meeting: 'info', training: 'purple', religious: 'gray', other: 'gray' }
    return <Badge variant={variants[type] || 'gray'}>{type?.replace('_', ' ')}</Badge>
  }

  const getStatusBadge = (status) => {
    const variants = { upcoming: 'info', ongoing: 'success', completed: 'gray', cancelled: 'danger', postponed: 'warning' }
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
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filteredEvents.length === 0 ? (
        <EmptyState icon={<Calendar size={48} />} title="No events found" description="No events match your filter." action={<Button onClick={openCreateModal} variant="primary">Add Event</Button>} />
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
                  <Calendar size={14} /> {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock size={14} /> {new Date(event.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
                      <button onClick={() => openEditModal(event)} className="btn btn-ghost btn-sm btn-icon text-blue-600"><Edit size={14} /></button>
                      <button onClick={() => handleCancel(event._id)} className="btn btn-ghost btn-sm btn-icon text-red-600"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingEvent ? 'Edit Event' : 'Create Event'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Event Title *" name="title" value={formData.title} onChange={handleChange} required />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Event Type" name="event_type" value={formData.event_type} onChange={handleChange}
              options={[{ value: 'academic', label: 'Academic' }, { value: 'sports', label: 'Sports' }, { value: 'cultural', label: 'Cultural' }, { value: 'parent_meeting', label: 'Parent Meeting' }, { value: 'training', label: 'Training' }, { value: 'religious', label: 'Religious' }, { value: 'other', label: 'Other' }]} />
            <FormSelect label="Status" name="status" value={formData.status || 'upcoming'} onChange={handleChange}
              options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'ongoing', label: 'Ongoing' }]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Start Date *" name="start_date" type="datetime-local" value={formData.start_date} onChange={handleChange} required />
            <FormInput label="End Date *" name="end_date" type="datetime-local" value={formData.end_date} onChange={handleChange} required />
          </div>
          <FormInput label="Location" name="location" value={formData.location} onChange={handleChange} />
          <FormInput label="Organizer" name="organizer" value={formData.organizer} onChange={handleChange} />
          <div>
            <label className="form-label">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Max Participants" name="max_participants" type="number" value={formData.max_participants} onChange={handleChange} />
            <FormInput label="Budget (SSP)" name="budget" type="number" value={formData.budget} onChange={handleChange} />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" loading={saving} icon={<Save size={18} />}>
              {editingEvent ? 'Update Event' : 'Create Event'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// Need to import Save
import { Save } from 'lucide-react'

export default EventsPage