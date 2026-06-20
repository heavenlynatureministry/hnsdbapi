import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, ArrowRight } from 'lucide-react'
import Badge from '../../../components/common/Badge'

function RecentStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulated data
    const timer = setTimeout(() => {
      setStudents([
        { _id: '1', first_name: 'Abraham', last_name: 'Kuol', class_name: 'P3', enrollment_date: '2024-01-15', status: 'active', student_type: 'street' },
        { _id: '2', first_name: 'Achol', last_name: 'Deng', class_name: 'P2', enrollment_date: '2024-02-20', status: 'active', student_type: 'abundant' },
        { _id: '3', first_name: 'Bol', last_name: 'Malek', class_name: 'P4', enrollment_date: '2024-03-10', status: 'active', student_type: 'orphan' },
        { _id: '4', first_name: 'Aya', last_name: 'Dut', class_name: 'Baby', enrollment_date: '2024-04-05', status: 'active', student_type: 'other' },
        { _id: '5', first_name: 'Peter', last_name: 'Garang', class_name: 'P5', enrollment_date: '2024-05-12', status: 'active', student_type: 'street' },
      ])
      setLoading(false)
    }, 600)
  }, [])

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
                  {student.class_name} • {new Date(student.enrollment_date).toLocaleDateString()}
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