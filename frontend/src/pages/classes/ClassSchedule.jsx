import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, Plus, Trash2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const SUBJECTS = ['English', 'Mathematics', 'Science', 'Social Studies', 'Religious Education', 'Creative Arts', 'Physical Education', 'Computer Studies', 'Local Language']
const TIME_SLOTS = ['08:00', '08:45', '09:30', '10:15', '11:00', '11:45', '12:30', '13:15', '14:00', '14:45']

function ClassSchedule() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [classInfo, setClassInfo] = useState(null)
  const [schedule, setSchedule] = useState({})
  const [selectedDay, setSelectedDay] = useState('monday')

  useEffect(() => {
    updatePageTitle('Class Schedule')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Classes', path: '/classes' }, { label: 'Schedule' }])
    
    setTimeout(() => {
      setClassInfo({ class_name: 'P5', class_level: 'primary' })
      setSchedule({
        monday: [
          { id: '1', subject: 'English', start_time: '08:00', end_time: '08:45' },
          { id: '2', subject: 'Mathematics', start_time: '08:45', end_time: '09:30' },
          { id: '3', subject: 'Science', start_time: '09:30', end_time: '10:15' },
          { id: '4', subject: 'Social Studies', start_time: '10:15', end_time: '11:00' },
        ],
        tuesday: [
          { id: '5', subject: 'Mathematics', start_time: '08:00', end_time: '08:45' },
          { id: '6', subject: 'English', start_time: '08:45', end_time: '09:30' },
        ],
        wednesday: [
          { id: '7', subject: 'Science', start_time: '08:00', end_time: '08:45' },
          { id: '8', subject: 'Religious Education', start_time: '08:45', end_time: '09:30' },
        ],
        thursday: [
          { id: '9', subject: 'Creative Arts', start_time: '08:00', end_time: '08:45' },
          { id: '10', subject: 'Physical Education', start_time: '08:45', end_time: '09:30' },
        ],
        friday: [
          { id: '11', subject: 'Computer Studies', start_time: '08:00', end_time: '08:45' },
          { id: '12', subject: 'Local Language', start_time: '08:45', end_time: '09:30' },
        ],
      })
      setLoading(false)
    }, 500)
  }, [id])

  const addPeriod = (day) => {
    const newPeriod = {
      id: Date.now().toString(),
      subject: '',
      start_time: '',
      end_time: '',
    }
    setSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), newPeriod],
    }))
  }

  const removePeriod = (day, periodId) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter(p => p.id !== periodId),
    }))
  }

  const updatePeriod = (day, periodId, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].map(p => p.id === periodId ? { ...p, [field]: value } : p),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      toast.success('Schedule saved successfully')
    } catch (error) { toast.error('Failed to save schedule') }
    finally { setSaving(false) }
  }

  const totalPeriods = Object.values(schedule).reduce((sum, periods) => sum + periods.length, 0)

  if (loading) return <LoadingSpinner fullScreen />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title={`Schedule - ${classInfo?.class_name}`}
        subtitle={`${totalPeriods} total periods per week`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/classes')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>
            <Button onClick={handleSave} variant="primary" loading={saving} icon={<Save size={18} />}>Save Schedule</Button>
          </div>
        }
      />

      {/* Day Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              selectedDay === day ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {day.charAt(0).toUpperCase() + day.slice(1)}
            <span className="ml-1 text-xs text-gray-400">({schedule[day]?.length || 0})</span>
          </button>
        ))}
      </div>

      {/* Periods for Selected Day */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold capitalize">{selectedDay}'s Schedule</h3>
          <button onClick={() => addPeriod(selectedDay)} className="btn btn-secondary btn-sm">
            <Plus size={14} /> Add Period
          </button>
        </div>

        {schedule[selectedDay]?.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No periods scheduled</p>
            <button onClick={() => addPeriod(selectedDay)} className="btn btn-primary btn-sm mt-3">Add Period</button>
          </div>
        ) : (
          <div className="space-y-3">
            {schedule[selectedDay]?.map((period, index) => (
              <div key={period.id} className="flex items-end gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Subject</label>
                  <select
                    value={period.subject}
                    onChange={(e) => updatePeriod(selectedDay, period.id, 'subject', e.target.value)}
                    className="form-input text-sm"
                  >
                    <option value="">Select Subject</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="w-28">
                  <label className="text-xs text-gray-500 mb-1 block">Start</label>
                  <select
                    value={period.start_time}
                    onChange={(e) => updatePeriod(selectedDay, period.id, 'start_time', e.target.value)}
                    className="form-input text-sm"
                  >
                    <option value="">--:--</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="w-28">
                  <label className="text-xs text-gray-500 mb-1 block">End</label>
                  <select
                    value={period.end_time}
                    onChange={(e) => updatePeriod(selectedDay, period.id, 'end_time', e.target.value)}
                    className="form-input text-sm"
                  >
                    <option value="">--:--</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button
                  onClick={() => removePeriod(selectedDay, period.id)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Weekly Overview */}
      <Card title="Weekly Overview">
        <div className="grid grid-cols-5 gap-2">
          {DAYS.map((day) => (
            <div key={day} className="text-center">
              <p className="text-xs font-medium capitalize mb-2">{day.slice(0, 3)}</p>
              <div className="space-y-1">
                {schedule[day]?.slice(0, 6).map((period) => (
                  <div
                    key={period.id}
                    className="p-1 bg-primary-100 dark:bg-primary-900/30 rounded text-xs truncate"
                    title={`${period.subject} (${period.start_time}-${period.end_time})`}
                  >
                    {period.subject?.slice(0, 3)}
                  </div>
                ))}
                {(schedule[day]?.length || 0) > 6 && (
                  <p className="text-xs text-gray-500">+{schedule[day].length - 6} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default ClassSchedule