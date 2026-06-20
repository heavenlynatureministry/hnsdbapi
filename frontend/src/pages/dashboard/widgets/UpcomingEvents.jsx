import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ArrowRight, Clock, MapPin } from 'lucide-react'
import Badge from '../../../components/common/Badge'

function UpcomingEvents({ data }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setEvents([
        { _id: '1', title: 'Parent-Teacher Meeting', event_type: 'parent_meeting', start_date: '2024-02-15T09:00:00', location: 'School Hall', status: 'upcoming' },
        { _id: '2', title: 'Sports Day', event_type: 'sports', start_date: '2024-02-28T08:00:00', location: 'School Field', status: 'upcoming' },
        { _id: '3', title: 'End of Term Exams', event_type: 'academic', start_date: '2024-03-10T08:00:00', location: 'Classrooms', status: 'upcoming' },
      ])
      setLoading(false)
    }, 400)
  }, [])

  const getEventBadge = (type) => {
    const variants = {
      academic: 'info',
      sports: 'success',
      parent_meeting: 'warning',
      cultural: 'purple',
      religious: 'gray',
    }
    const labels = {
      academic: 'Academic',
      sports: 'Sports',
      parent_meeting: 'Meeting',
      cultural: 'Cultural',
      religious: 'Religious',
    }
    return <Badge variant={variants[type] || 'gray'}>{labels[type] || type}</Badge>
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
                  {new Date(event.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {event.location}
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