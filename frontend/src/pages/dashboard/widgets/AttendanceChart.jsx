import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function AttendanceChart({ data }) {
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setChartData([
        { day: 'Mon', present: 85, absent: 15 },
        { day: 'Tue', present: 90, absent: 10 },
        { day: 'Wed', present: 78, absent: 22 },
        { day: 'Thu', present: 92, absent: 8 },
        { day: 'Fri', present: 88, absent: 12 },
      ])
      setLoading(false)
    }, 700)
  }, [])

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ClipboardCheck size={18} className="text-primary-600" />
          Weekly Attendance Overview
        </h3>
        <Link to="/attendance" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
          View Details <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="skeleton h-64 w-full rounded-lg" />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">85%</p>
          <p className="text-xs text-gray-500">Present</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">10%</p>
          <p className="text-xs text-gray-500">Absent</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">5%</p>
          <p className="text-xs text-gray-500">Late/Excused</p>
        </div>
      </div>
    </div>
  )
}

export default AttendanceChart