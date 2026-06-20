import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import schoolAPI from '../../api/school'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { Calendar, Plus, Save, Trash2, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

function AcademicCalendar() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(true)
  const [calendar, setCalendar] = useState(null)
  const [editMode, setEditMode] = useState(false)

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
    setTimeout(() => {
      setCalendar({
        academic_year: '2024/2025',
        status: 'active',
        terms: [
          {
            term_name: 'Term 1', term_number: 1,
            start_date: '2024-09-15', end_date: '2024-12-15',
            mid_term_break_start: '2024-10-20', mid_term_break_end: '2024-10-25',
            exam_period_start: '2024-12-01', exam_period_end: '2024-12-10',
            report_card_date: '2024-12-18', total_school_days: 65,
          },
          {
            term_name: 'Term 2', term_number: 2,
            start_date: '2025-01-15', end_date: '2025-04-15',
            mid_term_break_start: '2025-02-20', mid_term_break_end: '2025-02-25',
            exam_period_start: '2025-04-01', exam_period_end: '2025-04-10',
            report_card_date: '2025-04-18', total_school_days: 62,
          },
          {
            term_name: 'Term 3', term_number: 3,
            start_date: '2025-05-01', end_date: '2025-08-15',
            mid_term_break_start: '2025-06-15', mid_term_break_end: '2025-06-20',
            exam_period_start: '2025-08-01', exam_period_end: '2025-08-10',
            report_card_date: '2025-08-18', total_school_days: 68,
          },
        ],
        holidays: [
          { name: 'Christmas Break', start_date: '2024-12-20', end_date: '2025-01-05', is_recurring: true },
          { name: 'Easter Break', start_date: '2025-04-18', end_date: '2025-04-21', is_recurring: true },
          { name: 'Independence Day', start_date: '2025-07-09', end_date: '2025-07-09', is_recurring: true },
        ],
        important_dates: [
          { name: 'Opening Day', date: '2024-09-15', category: 'general' },
          { name: 'Sports Day', date: '2024-11-10', category: 'sports' },
          { name: 'Graduation Day', date: '2025-08-20', category: 'graduation' },
        ],
      })
      setLoading(false)
    }, 600)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title="Academic Calendar"
        subtitle={`${calendar?.academic_year} Academic Year`}
        actions={
          <Button onClick={() => setEditMode(!editMode)} variant={editMode ? 'secondary' : 'primary'}>
            {editMode ? 'Cancel' : 'Edit Calendar'}
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
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{term.term_name}</h3>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium">{formatDate(term.start_date)} - {formatDate(term.end_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-orange-400" />
                  <span className="text-gray-500">Mid-Term Break:</span>
                  <span className="font-medium">{formatDate(term.mid_term_break_start)} - {formatDate(term.mid_term_break_end)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-purple-400" />
                  <span className="text-gray-500">Exams:</span>
                  <span className="font-medium">{formatDate(term.exam_period_start)} - {formatDate(term.exam_period_end)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-green-400" />
                  <span className="text-gray-500">Report Cards:</span>
                  <span className="font-medium">{formatDate(term.report_card_date)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500">School Days: </span>
                  <span className="font-bold text-primary-600">{term.total_school_days} days</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Holidays */}
      <Card title="Holidays & Breaks">
        <div className="space-y-2">
          {calendar?.holidays?.map((holiday, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div>
                  <p className="font-medium text-sm">{holiday.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(holiday.start_date)} - {formatDate(holiday.end_date)}</p>
                </div>
              </div>
              {holiday.is_recurring && <Badge variant="info">Recurring</Badge>}
            </div>
          ))}
        </div>
      </Card>

      {/* Important Dates */}
      <Card title="Important Dates">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {calendar?.important_dates?.map((date, i) => (
            <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="font-medium text-sm">{date.name}</p>
              <p className="text-xs text-gray-500">{formatDate(date.date)}</p>
              <Badge variant="info" className="mt-1">{date.category}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default AcademicCalendar