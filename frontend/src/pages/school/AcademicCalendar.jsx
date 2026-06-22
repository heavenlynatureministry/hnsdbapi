import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import schoolAPI from '../../api/school'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

function AcademicCalendar() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(true)
  const [calendar, setCalendar] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    updatePageTitle('Academic Calendar')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'School', path: '/school/info' },
      { label: 'Calendar' },
    ])
    fetchCalendar()
  }, [])

  const fetchCalendar = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await schoolAPI.getAcademicCalendar()
      if (response?.success && response.data) {
        setCalendar(response.data)
      } else {
        setCalendar(null)
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error)
      setError('Failed to load academic calendar')
      toast.error('Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  const getTermStatus = (term) => {
    const today = new Date()
    const start = new Date(term.start_date)
    const end = new Date(term.end_date)
    if (today < start) return { label: 'Upcoming', variant: 'info' }
    if (today > end) return { label: 'Completed', variant: 'gray' }
    return { label: 'Current', variant: 'success' }
  }

  if (loading) return <LoadingSpinner fullScreen />

  if (error || !calendar) {
    return (
      <EmptyState
        icon={<Calendar size={48} />}
        title="No Calendar Data"
        description={error || 'The academic calendar is not yet configured.'}
        action={
          <Button onClick={fetchCalendar} variant="primary">
            Retry
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title="Academic Calendar"
        subtitle={`${calendar?.academic_year} Academic Year`}
        actions={
          <Button onClick={fetchCalendar} variant="secondary" icon={<RotateCcw size={16} />}>
            Refresh
          </Button>
        }
      />

      {/* Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {calendar?.terms?.map((term, index) => {
          const status = getTermStatus(term)
          return (
            <Card key={index}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  {term.term_name}
                </h3>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium">
                    {formatDate(term.start_date)} - {formatDate(term.end_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-orange-400" />
                  <span className="text-gray-500">Mid-Term Break:</span>
                  <span className="font-medium">
                    {formatDate(term.mid_term_break_start)} - {formatDate(term.mid_term_break_end)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" />
                  <span className="text-gray-500">Exams:</span>
                  <span className="font-medium">
                    {formatDate(term.exam_period_start)} - {formatDate(term.exam_period_end)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-green-400" />
                  <span className="text-gray-500">Report Cards:</span>
                  <span className="font-medium">{formatDate(term.report_card_date)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500">School Days: </span>
                  <span className="font-bold text-primary-600">
                    {term.total_school_days} days
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Holidays */}
      <Card title="Holidays & Breaks">
        {calendar?.holidays?.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No holidays configured.</p>
        ) : (
          <div className="space-y-2">
            {calendar?.holidays?.map((holiday, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div>
                    <p className="font-medium text-sm">{holiday.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(holiday.start_date)} - {formatDate(holiday.end_date)}
                    </p>
                  </div>
                </div>
                {holiday.is_recurring && <Badge variant="info">Recurring</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Important Dates */}
      <Card title="Important Dates">
        {calendar?.important_dates?.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No important dates configured.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {calendar?.important_dates?.map((date, i) => (
              <div
                key={i}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <p className="font-medium text-sm">{date.name}</p>
                <p className="text-xs text-gray-500">{formatDate(date.date)}</p>
                <Badge variant="info" className="mt-1">
                  {date.category}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// Need RotateCcw icon
import { RotateCcw } from 'lucide-react'

export default AcademicCalendar
