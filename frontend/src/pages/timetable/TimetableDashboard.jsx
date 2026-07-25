import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { Download, Clock, BookOpen, Users, Printer } from 'lucide-react'
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

  const handlePrintSection = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800')
    if (!printWindow) { alert('Please allow pop-ups'); return }
    
    const sectionLabel = SECTIONS.find(s => s.id === activeSection)?.label || activeSection
    
    let html = `<!DOCTYPE html><html><head><title>Timetable - ${sectionLabel}</title>
    <meta charset="utf-8"><style>
      @page { size: A4 landscape; margin: 10mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; }
      h1 { text-align: center; font-size: 18px; margin-bottom: 5px; color: #1a3a6b; }
      h3 { text-align: center; font-size: 14px; color: #1a3a6b; margin: 10px 0 5px; border-top: 1px solid #ddd; padding-top: 8px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
      th { background: #1a56db; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
      td { padding: 5px 8px; border: 1px solid #ddd; vertical-align: top; }
      .period { background: #f0f4ff; padding: 3px 5px; margin: 2px 0; border-radius: 3px; font-size: 10px; border-left: 3px solid #1a56db; }
      .period .subject { font-weight: bold; }
      .period .time { color: #666; font-size: 9px; }
      .period .teacher { color: #059669; font-size: 9px; }
      .no-print { text-align: center; margin: 20px; }
      .btn { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
      @media print { .no-print { display: none; } }
    </style></head><body>
    <h1>${timetable?.school_name || 'School'} - ${sectionLabel} Timetable</h1>
    <p style="text-align:center;color:#666;font-size:11px">Academic Year: ${timetable?.academic_year || 'N/A'}</p>`
    
    if (timetable?.timetable) {
      timetable.timetable.forEach(cls => {
        html += `<h3>${cls.class_name}</h3><table><thead><tr><th>Day</th><th>Periods</th></tr></thead><tbody>`
        DAYS.forEach((day, di) => {
          const periods = cls.days?.[day] || []
          let periodHTML = ''
          if (periods.length === 0) {
            periodHTML = '<span style="color:#999;font-style:italic">No periods</span>'
          } else {
            periods.forEach(p => {
              periodHTML += `<div class="period"><span class="subject">${p.subject || 'N/A'}</span><br/><span class="time">${p.start_time || '--'} - ${p.end_time || '--'}</span><br/><span class="teacher">${p.teacher_name || 'Unassigned'}</span></div>`
            })
          }
          html += `<tr><td style="width:80px;font-weight:bold">${DAY_LABELS[di]}</td><td>${periodHTML}</td></tr>`
        })
        html += '</tbody></table>'
      })
    }
    
    html += `<div class="no-print"><button class="btn" onclick="window.print()">🖨️ Print Timetable</button></div></body></html>`
    
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.focus(); printWindow.print() }, 500)
  }

  const getPeriodCount = (cls) => {
    let count = 0
    DAYS.forEach(day => {
      count += (cls.days?.[day] || []).length
    })
    return count
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="School Timetable"
        subtitle={`${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Section • ${timetable?.academic_year || ''}`}
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
            <p className="text-sm">Use the Class Schedule page to add periods for each class.</p>
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
