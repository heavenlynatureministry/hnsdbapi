import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function AttendanceHeatmap({ 
  data = {}, 
  startDate, 
  endDate,
  className = '' 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  // Generate calendar data
  const calendarData = useMemo(() => {
    const months = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Generate data for current month view
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    
    const days = []
    // Empty cells for days before month start
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const status = data[dateStr] || null
      days.push({ day, date: dateStr, status })
    }
    
    return {
      monthName: monthNames[currentMonth],
      year: currentYear,
      days,
      daysInMonth,
      firstDay,
    }
  }, [currentMonth, currentYear, data])

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 dark:bg-gray-800'
    const colors = {
      present: 'bg-green-500',
      absent: 'bg-red-500',
      excused: 'bg-yellow-500',
      late: 'bg-blue-500',
      holiday: 'bg-purple-500',
    }
    return colors[status] || 'bg-gray-300'
  }

  const getStatusLabel = (status) => {
    if (!status) return 'No data'
    const labels = {
      present: 'Present',
      absent: 'Absent',
      excused: 'Excused',
      late: 'Late',
      holiday: 'Holiday',
    }
    return labels[status] || status
  }

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(prev => prev - 1)
      } else {
        setCurrentMonth(prev => prev - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(prev => prev + 1)
      } else {
        setCurrentMonth(prev => prev + 1)
      }
    }
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Calculate statistics
  const stats = useMemo(() => {
    const monthDays = calendarData.days.filter(d => d !== null)
    const total = monthDays.length
    const present = monthDays.filter(d => d.status === 'present' || d.status === 'late').length
    const absent = monthDays.filter(d => d.status === 'absent').length
    const excused = monthDays.filter(d => d.status === 'excused').length
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0
    return { total, present, absent, excused, rate }
  }, [calendarData])

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 ${className}`}>
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Attendance Heatmap
        </h3>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth('prev')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {calendarData.monthName} {calendarData.year}
          </span>
          <button onClick={() => navigateMonth('next')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-lg font-bold text-green-600">{stats.rate}%</p>
          <p className="text-[10px] text-gray-500">Rate</p>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-lg font-bold text-green-600">{stats.present}</p>
          <p className="text-[10px] text-gray-500">Present</p>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-lg font-bold text-red-600">{stats.absent}</p>
          <p className="text-[10px] text-gray-500">Absent</p>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-lg font-bold text-yellow-600">{stats.excused}</p>
          <p className="text-[10px] text-gray-500">Excused</p>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.days.map((day, i) => (
          <div key={i} className="aspect-square">
            {day ? (
              <div
                className={`w-full h-full rounded-md flex items-center justify-center text-xs font-medium transition-colors cursor-default ${getStatusColor(day.status)} ${
                  day.status ? 'text-white' : 'text-gray-400 dark:text-gray-600'
                }`}
                title={`${day.date}: ${getStatusLabel(day.status)}`}
              >
                {day.day}
              </div>
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        {[
          { status: 'present', label: 'Present' },
          { status: 'absent', label: 'Absent' },
          { status: 'excused', label: 'Excused' },
          { status: 'late', label: 'Late' },
        ].map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${getStatusColor(item.status)}`} />
            <span className="text-[10px] text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AttendanceHeatmap