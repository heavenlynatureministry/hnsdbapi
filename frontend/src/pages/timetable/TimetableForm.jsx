import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import classesAPI from '../../api/classes'
import teachersAPI from '../../api/teachers'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { ArrowLeft, Save, Plus, Trash2, Clock, BookOpen, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const SUBJECT_OPTIONS = [
  { value: '', label: '-- Select Subject --' },
  // Nursery
  { value: 'Health Habits', label: 'Health Habits' },
  { value: 'Social Development', label: 'Social Development' },
  { value: 'Life Skills Development', label: 'Life Skills Development' },
  { value: 'Creative Activities', label: 'Creative Activities' },
  { value: 'Language Development', label: 'Language Development' },
  { value: 'Numeracy', label: 'Numeracy' },
  // Primary
  { value: 'English Language', label: 'English Language' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'Science', label: 'Science' },
  { value: 'Social Studies', label: 'Social Studies' },
  { value: 'Christian Religious Education', label: 'Christian Religious Education' },
  { value: 'Islamic Religious Education', label: 'Islamic Religious Education' },
  { value: 'Creative Arts', label: 'Creative Arts' },
  { value: 'Physical Education', label: 'Physical Education' },
  { value: 'Local Language', label: 'Local Language' },
  { value: 'Computer Studies', label: 'Computer Studies' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Business Studies', label: 'Business Studies' },
  { value: 'History', label: 'History' },
  { value: 'Geography', label: 'Geography' },
  { value: 'Civics', label: 'Civics' },
  // Secondary
  { value: 'Biology', label: 'Biology' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Information and Communication Technology (ICT)', label: 'ICT' },
  { value: 'Additional Mathematics', label: 'Additional Mathematics' },
  { value: 'Agriculture Science', label: 'Agriculture Science' },
  { value: 'Commerce', label: 'Commerce' },
  { value: 'Accounting', label: 'Accounting' },
  { value: 'Literature in English', label: 'Literature in English' },
  { value: 'Kiswahili', label: 'Kiswahili' },
  { value: 'Arabic Language', label: 'Arabic Language' },
  { value: 'French Language', label: 'French Language' },
  { value: 'Fine Art', label: 'Fine Art' },
  { value: 'Citizenship', label: 'Citizenship' },
]

const TEACHER_PLACEHOLDER = [{ value: '', label: '-- Select Teacher --' }]

function TimetableForm() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [classData, setClassData] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [schedule, setSchedule] = useState({
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: []
  })
  const [activeDay, setActiveDay] = useState('monday')

  useEffect(() => {
    updatePageTitle('Edit Timetable')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Timetable', path: '/timetable' },
      { label: 'Edit' },
    ])
    fetchClassAndSchedule()
    fetchTeachers()
  }, [classId])

  const fetchClassAndSchedule = async () => {
    setFetching(true)
    try {
      const response = await classesAPI.getClassSchedule(classId)
      if (response?.success && response.data) {
        setClassData(response.data)
        setSchedule(response.data.schedule || {
          monday: [], tuesday: [], wednesday: [], thursday: [], friday: []
        })
      } else {
        toast.error('Failed to load class schedule')
        navigate('/timetable')
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
      toast.error('Failed to load class schedule')
      navigate('/timetable')
    } finally {
      setFetching(false)
    }
  }

  const fetchTeachers = async () => {
    try {
      const response = await teachersAPI.getAll({ status: 'active', limit: 100 })
      const teacherList = response?.data?.teachers || response?.teachers || response?.data || []
      setTeachers(Array.isArray(teacherList) ? teacherList : [])
    } catch (error) {
      console.error('Failed to fetch teachers:', error)
      setTeachers([])
    }
  }

  const addPeriod = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { subject: '', teacher_id: '', start_time: '', end_time: '' }]
    }))
  }

  const removePeriod = (day, index) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }))
  }

  const updatePeriod = (day, index, field, value) => {
    setSchedule(prev => {
      const updated = [...(prev[day] || [])]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, [day]: updated }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await classesAPI.updateClassTimetable(classId, { schedule })
      if (response?.success) {
        toast.success('Timetable updated successfully!')
        navigate('/timetable')
      } else {
        toast.error(response?.message || 'Failed to update timetable')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save timetable')
    } finally {
      setSaving(false)
    }
  }

  const getTotalPeriods = () => {
    return DAYS.reduce((sum, day) => sum + (schedule[day] || []).length, 0)
  }

  const teacherOptions = [
    ...TEACHER_PLACEHOLDER,
    ...teachers.map(t => ({
      value: t._id || t.id || '',
      label: `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || 'Unknown Teacher',
    })),
  ]

  if (fetching) return <LoadingSpinner fullScreen />

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title={`Timetable: ${classData?.class_name || 'Class'}`}
        subtitle={`${classData?.class_level || ''} • ${getTotalPeriods()} periods/week`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/timetable')} className="btn btn-secondary">
              <ArrowLeft size={18} /> Back
            </button>
            <Button onClick={handleSave} variant="primary" loading={saving} icon={<Save size={18} />}>
              Save Timetable
            </Button>
          </div>
        }
      />

      {/* Day Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeDay === day
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {DAY_LABELS[i]}
            <span className="ml-2 text-xs opacity-75">({(schedule[day] || []).length})</span>
          </button>
        ))}
      </div>

      {/* Periods for Active Day */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-primary-600" />
            {DAY_LABELS[DAYS.indexOf(activeDay)]} Periods
          </h3>
          <Button onClick={() => addPeriod(activeDay)} variant="secondary" size="sm" icon={<Plus size={14} />}>
            Add Period
          </Button>
        </div>

        {(schedule[activeDay] || []).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No periods scheduled for {DAY_LABELS[DAYS.indexOf(activeDay)]}</p>
            <p className="text-xs mt-1">Click "Add Period" to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(schedule[activeDay] || []).map((period, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="info">Period {index + 1}</Badge>
                  <button
                    onClick={() => removePeriod(activeDay, index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove period"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <FormSelect
                    label="Subject"
                    value={period.subject || ''}
                    onChange={(e) => updatePeriod(activeDay, index, 'subject', e.target.value)}
                    options={SUBJECT_OPTIONS}
                  />
                  <FormSelect
                    label="Teacher"
                    value={period.teacher_id || ''}
                    onChange={(e) => updatePeriod(activeDay, index, 'teacher_id', e.target.value)}
                    options={teacherOptions}
                  />
                  <FormInput
                    label="Start Time"
                    type="time"
                    value={period.start_time || ''}
                    onChange={(e) => updatePeriod(activeDay, index, 'start_time', e.target.value)}
                  />
                  <FormInput
                    label="End Time"
                    type="time"
                    value={period.end_time || ''}
                    onChange={(e) => updatePeriod(activeDay, index, 'end_time', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* All Days Summary */}
      <Card title="Weekly Overview">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {DAYS.map((day, i) => (
            <div key={day} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-sm mb-2">{DAY_LABELS[i]}</p>
              {(schedule[day] || []).length === 0 ? (
                <p className="text-xs text-gray-400 italic">No periods</p>
              ) : (
                <div className="space-y-1">
                  {(schedule[day] || []).map((p, pi) => (
                    <div key={pi} className="text-xs bg-white dark:bg-gray-700 rounded p-1.5 border-l-2 border-primary-500">
                      <p className="font-medium truncate">{p.subject || 'N/A'}</p>
                      <p className="text-gray-500">{p.start_time || '--'} - {p.end_time || '--'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button onClick={handleSave} variant="primary" loading={saving} icon={<Save size={18} />} size="lg">
          {saving ? 'Saving...' : 'Save Timetable'}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/timetable')} size="lg">
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default TimetableForm
