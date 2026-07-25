import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import classesAPI from '../../api/classes'
import { exportSectionTimetable } from '../../utils/exportTimetable'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { Clock, BookOpen, Users, Printer, Edit } from 'lucide-react'
import toast from 'react-hot-toast'

const SECTIONS = [
  { id: 'nursery', label: 'Nursery', color: 'bg-pink-500' },
  { id: 'primary', label: 'Primary', color: 'bg-blue-500' },
  { id: 'secondary', label: 'Secondary', color: 'bg-green-500' },
]

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function TimetableDashboard() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [activeSection, setActiveSection] = useState('primary')
  const [loading, setLoading] = useState(false)
  const [timetable, setTimetable] = useState(null)

  useEffect(() => {
    updatePageTitle('Timetable')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Timetable' },
    ])
  }, [])

  useEffect(() => {
    fetchTimetable()
  }, [activeSection])

  const fetchTimetable = async () => {
    setLoading(true)
    try {
      const response = await classesAPI.getSectionTimetable(activeSection)
      if (response?.success && response.data) {
        setTimetable(response.data)
      } else {
        setTimetable(null)
        toast.error('No timetable data found')
      }
    } catch (error) {
      console.error('Failed to fetch timetable:', error)
      setTimetable(null)
      toast.error('Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Uses the export utility
  const handlePrintSection = () => {
    if (timetable) {
      const sectionName = SECTIONS.find(s => s.id === activeSection)?.label || activeSection
      exportSectionTimetable(timetable, sectionName)
    }
  }

  const getPeriodCount = (cls) => {
    let count = 0
    DAYS.forEach(day => {
      count += (cls.days?.[day] || []).length
    })
    return count
  }

  const getTotalPeriods = () => {
    if (!timetable?.timetable) return 0
    return timetable.timetable.reduce((sum, cls) => sum + getPeriodCount(cls), 0)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="School Timetable"
        subtitle={`${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Section • ${timetable?.academic_year || ''} • ${getTotalPeriods()} total periods`}
        actions={
          <Button onClick={handlePrintSection} variant="primary" icon={<Printer size={18} />}>
            Print {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Timetable
          </Button>
        }
      />

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-0">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-5 py-2.5 rounded-t-lg text-sm font-medium transition-colors ${
              activeSection === section.id
                ? `${section.color} text-white`
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Timetable Content */}
      {!timetable?.timetable || timetable.timetable.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <Clock size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No timetable data</p>
            <p className="text-sm">Use the Class Schedule page to add periods for each class, or click Edit to set up a timetable.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {timetable.timetable.map((cls) => (
            <Card key={cls.class_id}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{cls.class_name}</h3>
                  <Badge variant="info">{getPeriodCount(cls)} periods/week</Badge>
                </div>
                <Link
                  to={`/timetable/${cls.class_id}`}
                  className="btn btn-secondary btn-sm flex items-center gap-1"
                >
                  <Edit size={14} /> Edit Timetable
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="p-2 text-left border w-20">Day</th>
                      <th className="p-2 text-left border">Periods</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, di) => {
                      const periods = cls.days?.[day] || []
                      return (
                        <tr key={day} className="border-b">
                          <td className="p-2 border font-semibold align-top">{DAY_LABELS[di]}</td>
                          <td className="p-2 border">
                            {periods.length === 0 ? (
                              <span className="text-gray-400 italic text-xs">No periods scheduled</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {periods.map((period, pi) => (
                                  <div key={pi} className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded p-2 text-xs min-w-[150px]">
                                    <p className="font-bold text-blue-700 dark:text-blue-300">{period.subject || 'N/A'}</p>
                                    <p className="text-gray-500">{period.start_time || '--'} - {period.end_time || '--'}</p>
                                    <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                                      <Users size={10} className="inline mr-1" />
                                      {period.teacher_name || 'Unassigned'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default TimetableDashboard
