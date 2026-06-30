import { useState, useEffect, useMemo } from 'react'
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
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { Calendar, Plus, Edit, Trash2, MapPin, Clock, Users, Save, Filter } from 'lucide-react'
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

  // Delete confirmation
  const [deleteEvent, setDeleteEvent] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [formData, setFormData] = useState({
    title: '', event_type: 'other', description: '',
    start_date: '', end_date: '', location: 'School Premises',
    organizer: 'School Administration', target_audience: ['all'],
    max_participants: '', budget: '', status: 'upcoming',
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
      const response = await schoolAPI.listEvents()
      const data = response?.data || response
      const eventList = data?.events || data || []
      const safeEvents = Array.isArray(eventList) ? eventList : []
      console.log('Events loaded:', safeEvents.length)
      setEvents(safeEvents)
    } catch (error) {
      console.error('Failed to fetch events:', error)
      toast.error('Failed to load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Determine the effective status of an event based on dates
   * This ensures events are properly classified even if status field isn't manually updated
   */
  const getEffectiveStatus = (event) => {
    const now = new Date()
    const startDate = event.start_date ? new Date(event.start_date) : null
    const endDate = event.end_date ? new Date(event.end_date) : null
    
    // If manually set to cancelled or postponed, respect that
    if (event.status === 'cancelled') return 'cancelled'
    if (event.status === 'postponed') return 'postponed'
    
    // If manually set to completed and there's no future date, respect it
    if (event.status === 'completed') return 'completed'
    
    // Auto-determine based on dates
    if (startDate && endDate) {
      if (now > endDate) return 'completed'
      if (now >= startDate && now <= endDate) return 'ongoing'
      if (now < startDate) return 'upcoming'
    } else if (startDate) {
      // If only start date, consider it a single-day event
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      if (today > startDay) return 'completed'
      if (today.getTime() === startDay.getTime()) return 'ongoing'
      if (today < startDay) return 'upcoming'
    }
    
    // Fallback to the event's stored status
    return event.status || 'upcoming'
  }

  /**
   * Get classified events with effective status
   */
  const classifiedEvents = useMemo(() => {
    return events.map(event => ({
      ...event,
      effectiveStatus: getEffectiveStatus(event)
    }))
  }, [events])

  /**
   * Filter events based on active filter
   */
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return classifiedEvents
    
    return classifiedEvents.filter(event => {
      if (filter === 'upcoming') {
        // Include both upcoming and ongoing events
        return event.effectiveStatus === 'upcoming' || event.effectiveStatus === 'ongoing'
      }
      return event.effectiveStatus === filter
    })
  }, [classifiedEvents, filter])

  /**
   * Count events for each filter tab
   */
  const filterCounts = useMemo(() => {
    return {
      upcoming: classifiedEvents.filter(e => e.effectiveStatus === 'upcoming' || e.effectiveStatus === 'ongoing').length,
      completed: classifiedEvents.filter(e => e.effectiveStatus === 'completed').length,
      cancelled: classifiedEvents.filter(e => e.effectiveStatus === 'cancelled' || e.effectiveStatus === 'postponed').length,
      all: classifiedEvents.length,
    }
  }, [classifiedEvents])

  const openCreateModal = () => {
    setEditingEvent(null)
    setErrors({})
    setFormData({
      title: '', event_type: 'other', description: '',
      start_date: '', end_date: '', location: 'School Premises',
      organizer: 'School Administration', target_audience: ['all'],
      max_participants: '', budget: '', status: 'upcoming',
    })
    setShowModal(true)
  }

  const openEditModal = (event) => {
    setEditingEvent(event)
    setErrors({})
    setFormData({
      title: event?.title || '',
      event_type: event?.event_type || 'other',
      description: event?.description || '',
      start_date: event?.start_date?.split('T')[0] || '',
      end_date: event?.end_date?.split('T')[0] || '',
      location: event?.location || 'School Premises',
      organizer: event?.organizer || 'School Administration',
      target_audience: event?.target_audience || ['all'],
      max_participants: event?.max_participants || '',
      budget: event?.budget || '',
      status: event?.status || 'upcoming',
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

  const handleCancel = async () => {
    if (!deleteEvent) return
    try {
      const response = await schoolAPI.cancelEvent(deleteEvent._id, 'Cancelled by admin')
      if (response?.success) {
        toast.success('Event cancelled')
        setShowDeleteDialog(false)
        setDeleteEvent(null)
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
    return <Badge variant={variants[type] || 'gray'}>{type?.replace(/_/g, ' ') || 'unknown'}</Badge>
  }

  const getStatusBadge = (status) => {
    const variants = { 
      upcoming: 'info', ongoing: 'success', completed: 'gray', 
      cancelled: 'danger', postponed: 'warning' 
    }
    return <Badge variant={variants[status] || 'gray'}>{status || 'unknown'}</Badge>
  }

  const getStatusLabel = (status) => {
    const labels = {
      upcoming: 'Upcoming',
      ongoing: 'Ongoing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      postponed: 'Postponed',
    }
    return labels[status] || status || 'Unknown'
  }

  const safeEvents = Array.isArray(events) ? events : []

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="School Events"
        subtitle={`${safeEvents.length} total events • ${filterCounts.upcoming} upcoming • ${filterCounts.completed} completed`}
        actions={
          <Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>
            Add Event
          </Button>
        }
      />

      {/* Filter Tabs with Counts */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {[
          { id: 'upcoming', label: 'Upcoming', count: filterCounts.upcoming },
          { id: 'completed', label: 'Completed', count: filterCounts.completed },
          { id: 'cancelled', label: 'Cancelled', count: filterCounts.cancelled },
          { id: 'all', label: 'All', count: filterCounts.all },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors relative ${
              filter === tab.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
              filter === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title={`No ${filter === 'all' ? '' : filter} events`}
          description={
            filter === 'upcoming' 
              ? 'No upcoming events scheduled. Add a new event to get started!'
              : filter === 'completed'
              ? 'No completed events yet. Events will appear here once their end date has passed.'
              : filter === 'cancelled'
              ? 'No cancelled or postponed events.'
              : 'No events found. Create your first event!'
          }
          action={
            <Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>
              Add Event
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => {
            const effectiveStatus = event.effectiveStatus || event.status
            const isCancelled = effectiveStatus === 'cancelled' || effectiveStatus === 'postponed'
            const isCompleted = effectiveStatus === 'completed'
            
            return (
              <Card 
                key={event?._id || Math.random()} 
                className={`hover:shadow-md transition-shadow ${
                  isCancelled ? 'opacity-70 border-dashed' : ''
                } ${
                  isCompleted ? 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className={`font-semibold ${
                    isCancelled ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
                  }`}>
                    {event?.title || 'N/A'}
                  </h3>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(effectiveStatus)}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Calendar size={14} />
                    <span>
                      {event?.start_date ? new Date(event.start_date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      }) : 'N/A'}
                      {event?.end_date && event.end_date !== event.start_date && (
                        <> — {new Date(event.end_date).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}</>
                      )}
                    </span>
                  </div>
                  
                  {/* Show time only for single-day events */}
                  {event?.start_date && event?.end_date && 
                   new Date(event.start_date).toDateString() === new Date(event.end_date).toDateString() && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Clock size={14} />
                      <span>
                        {new Date(event.start_date).toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {' — '}
                        {new Date(event.end_date).toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <MapPin size={14} /> {event?.location || 'N/A'}
                  </div>
                  
                  {event?.organizer && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Users size={14} /> {event.organizer}
                    </div>
                  )}
                </div>
                
                {/* Description preview */}
                {event?.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  {getEventBadge(event?.event_type)}
                  <div className="flex gap-1">
                    {/* Allow editing of upcoming and ongoing events */}
                    {(effectiveStatus === 'upcoming' || effectiveStatus === 'ongoing') && (
                      <>
                        <button
                          onClick={() => openEditModal(event)}
                          className="btn btn-ghost btn-sm btn-icon text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Edit event"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteEvent(event)
                            setShowDeleteDialog(true)
                          }}
                          className="btn btn-ghost btn-sm btn-icon text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Cancel event"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    
                    {/* Allow editing completed events to change status back */}
                    {isCompleted && (
                      <button
                        onClick={() => openEditModal(event)}
                        className="btn btn-ghost btn-sm btn-icon text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit event"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    
                    {/* Show cancelled reason if available */}
                    {isCancelled && event?.cancellation_reason && (
                      <span className="text-xs text-red-500 italic" title={event.cancellation_reason}>
                        Cancelled
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
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
          <FormInput label="Location" name="location" value={formData.location} onChange={handleChange} />
          <FormInput label="Organizer" name="organizer" value={formData.organizer} onChange={handleChange} />
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setDeleteEvent(null)
        }}
        onConfirm={handleCancel}
        title="Cancel Event"
        message={`Are you sure you want to cancel "${deleteEvent?.title}"? This will mark the event as cancelled.`}
        confirmText="Cancel Event"
        variant="danger"
      />
    </div>
  )
}

export default EventsPage
