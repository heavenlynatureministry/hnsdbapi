import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import studentsAPI from '../../../api/students'
import { GraduationCap, ArrowRight } from 'lucide-react'
import Badge from '../../../components/common/Badge'

function RecentStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentStudents()
  }, [])

  const fetchRecentStudents = async () => {
    setLoading(true)
    try {
      const response = await studentsAPI.getAll({ limit: 5, sort: '-enrollment_date' })
      if (response?.success) {
        setStudents(response.data?.students || response.data || [])
      } else {
        setStudents([])
      }
    } catch (error) {
      console.error('Failed to fetch recent students:', error)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <GraduationCap size={18} className="text-primary-600" />
          Recent Enrollments
        </h3>
        <Link to="/students" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton w-10 h-10 rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-4 w-32 mb-1" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-6">
          <GraduationCap size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No students enrolled yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <Link
              key={student._id}
              to={`/students/${student._id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-semibold text-sm flex-shrink-0">
                {student.first_name?.[0]}{student.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                  {student.first_name} {student.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {student.class_name || 'Unassigned'} • {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <Badge variant="success" className="text-xs">New</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecentStudents
