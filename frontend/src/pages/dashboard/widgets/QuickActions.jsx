import { Link } from 'react-router-dom'
import { 
  UserPlus, ClipboardCheck, FileText, DollarSign,
  Users, BookOpen, Calendar, Settings
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'

function QuickActions() {
  const { hasRole } = useAuth()

  const actions = [
    { 
      label: 'Mark Attendance', 
      icon: ClipboardCheck, 
      path: '/attendance', 
      color: 'bg-blue-500 hover:bg-blue-600',
      roles: ['admin', 'teacher'],
    },
    { 
      label: 'Add Student', 
      icon: UserPlus, 
      path: '/students/new', 
      color: 'bg-green-500 hover:bg-green-600',
      roles: ['admin'],
    },
    { 
      label: 'Enter Results', 
      icon: FileText, 
      path: '/exams', 
      color: 'bg-purple-500 hover:bg-purple-600',
      roles: ['admin', 'teacher'],
    },
    { 
      label: 'Record Payment', 
      icon: DollarSign, 
      path: '/financial/payments', 
      color: 'bg-emerald-500 hover:bg-emerald-600',
      roles: ['admin', 'accountant'],
    },
    { 
      label: 'Add Teacher', 
      icon: Users, 
      path: '/teachers/new', 
      color: 'bg-orange-500 hover:bg-orange-600',
      roles: ['admin'],
    },
    { 
      label: 'Create Exam', 
      icon: BookOpen, 
      path: '/exams/new', 
      color: 'bg-pink-500 hover:bg-pink-600',
      roles: ['admin', 'teacher'],
    },
    { 
      label: 'Add Event', 
      icon: Calendar, 
      path: '/school/events', 
      color: 'bg-indigo-500 hover:bg-indigo-600',
      roles: ['admin'],
    },
    { 
      label: 'Settings', 
      icon: Settings, 
      path: '/school/settings', 
      color: 'bg-gray-500 hover:bg-gray-600',
      roles: ['admin'],
    },
  ]

  // Filter actions based on user role
  const filteredActions = actions.filter(
    action => hasRole(action.roles)
  )

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {filteredActions.map((action, index) => (
          <Link
            key={index}
            to={action.path}
            className={`${action.color} text-white p-3 rounded-lg transition-all hover:scale-105 text-center`}
          >
            <action.icon size={20} className="mx-auto mb-1" />
            <span className="text-xs font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
      {filteredActions.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No actions available for your role.
        </p>
      )}
    </div>
  )
}

export default QuickActions