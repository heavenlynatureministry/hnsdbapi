import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import schoolAPI from '../../../api/school'
import { Calendar, ArrowRight, Clock, MapPin } from 'lucide-react'
import Badge from '../../../components/common/Badge'

function UpcomingEvents({ data }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingEvents()
  }, [])

  const fetchUpcomingEvents = async () => {
    setLoading(true)
    try {
      // Try to use passed data first
      if (data && Array.isArray(data) && data.length > 0) {
        setEvents(data)
        setLoading(false)
        return
      }

      const response = await schoolAPI.listEvents({ status: 'upcoming' })
      if (response?.success) {
        const allEvents = response.data?.events || response.data || []
        setEvents(allEvents.slice(0, 3))
      } else {
        setEvents([])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const getEventBadge = (type) => {
    const variants = {
      academic: 'info', sports: 'success', parent_meeting: 'warning',
      cultural: 'info', religious: 'gray', graduation: 'success',
      training: 'info', community: 'info', fundraising: 'warning',
    }
    const labels = {
      academic: 'Academic', sports: 'Sports', parent_meeting: 'Meeting',
      cultural: 'Cultural', religious: 'Religious', graduation: 'Graduation',
      training: 'Training', community: 'Community', fundraising: 'Fundraising',
    }
    return <Badge variant={variants[type] || 'gray'}>{labels[type] || type?.replace(/_/g, ' ')}</Badge>
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar size={18} className="text-primary-600" />
          Upcoming Events
        </h3>
        <Link to="/school/events" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-6">
          <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event._id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  {event.title}
                </h4>
                {getEventBadge(event.event_type)}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {event.start_date ? new Date(event.start_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  }) : 'TBD'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {event.location || 'TBD'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UpcomingEvents
