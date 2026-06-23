import { useState } from 'react'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import Button from '../common/Button'
import Card from '../common/Card'
import Badge from '../common/Badge'
import { Save, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'

const CLASSES = [
  { value: '', label: 'Select Class' },
  { value: 'c1', label: 'Baby (Nursery)' },
  { value: 'c2', label: 'Middle (Nursery)' },
  { value: 'c3', label: 'Top (Nursery)' },
  { value: 'c4', label: 'P1' },
  { value: 'c5', label: 'P2' },
  { value: 'c6', label: 'P3' },
  { value: 'c7', label: 'P4' },
  { value: 'c8', label: 'P5' },
  { value: 'c9', label: 'P6' },
  { value: 'c10', label: 'P7' },
  { value: 'c11', label: 'P8' },
]

const STATUS_BUTTONS = [
  { status: 'present', label: 'Present', icon: CheckCircle, activeClass: 'bg-green-500 text-white', inactiveClass: 'bg-gray-200 dark:bg-gray-700 text-gray-500' },
  { status: 'absent', label: 'Absent', icon: XCircle, activeClass: 'bg-red-500 text-white', inactiveClass: 'bg-gray-200 dark:bg-gray-700 text-gray-500' },
  { status: 'excused', label: 'Excused', icon: AlertTriangle, activeClass: 'bg-yellow-500 text-white', inactiveClass: 'bg-gray-200 dark:bg-gray-700 text-gray-500' },
  { status: 'late', label: 'Late', icon: Clock, activeClass: 'bg-blue-500 text-white', inactiveClass: 'bg-gray-200 dark:bg-gray-700 text-gray-500' },
]

function AttendanceForm({ students = [], initialDate = new Date().toISOString().split('T')[0], onSubmit, onCancel, loading = false }) {
  const [selectedClass, setSelectedClass] = useState('')
  const [date, setDate] = useState(initialDate)
  const [attendance, setAttendance] = useState({})

  const setStatus = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: prev[studentId]?.status === status ? null : status,
      },
    }))
  }

  const setNote = (studentId, notes) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }))
  }

  const markAllPresent = () => {
    const allPresent = {}
    students.forEach(s => { allPresent[s.student_id] = { status: 'present', notes: '' } })
    setAttendance(allPresent)
  }

  const counts = { present: 0, absent: 0, excused: 0, late: 0, unmarked: students.length }
  Object.values(attendance).forEach(a => {
    if (a.status) { counts[a.status]++; counts.unmarked-- }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const unmarked = students.filter(s => !attendance[s.student_id]?.status)
    if (unmarked.length > 0) {
      return // Validation handled by parent
    }
    onSubmit?.({ 
      class_id: selectedClass, 
      date, 
      attendance_data: Object.entries(attendance).map(([id, data]) => ({ 
        student_id: id, 
        ...data 
      })) 
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Class & Date Selection */}
      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <FormSelect 
              label="Select Class" 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)} 
              options={CLASSES} 
            />
          </div>
          <div className="w-full sm:w-48">
            <FormInput 
              label="Date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>
          <button 
            type="button" 
            onClick={markAllPresent} 
            className="btn btn-secondary whitespace-nowrap"
          >
            Mark All Present
          </button>
        </div>

        {/* Status Summary */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {STATUS_BUTTONS.map((btn) => (
            <div key={btn.status} className="flex items-center gap-1 text-sm">
              <btn.icon 
                size={16} 
                className={
                  btn.status === 'present' ? 'text-green-600' : 
                  btn.status === 'absent' ? 'text-red-600' : 
                  btn.status === 'excused' ? 'text-yellow-600' : 
                  'text-blue-600'
                } 
              />
              <span className="capitalize">{btn.status}:</span>
              <span className="font-bold">{counts[btn.status]}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-sm">
            <span className="text-orange-600">Unmarked:</span>
            <span className="font-bold text-orange-600">{counts.unmarked}</span>
          </div>
        </div>
      </Card>

      {/* Student List */}
      {students.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((student) => {
            const record = attendance[student.student_id]
            const status = record?.status
            const ringColor = 
              status === 'present' ? 'ring-green-500' : 
              status === 'absent' ? 'ring-red-500' : 
              status === 'excused' ? 'ring-yellow-500' : 
              status === 'late' ? 'ring-blue-500' : ''
            
            return (
              <Card 
                key={student.student_id} 
                className={`transition-all ${status ? 'ring-2 ring-offset-1 ' + ringColor : ''}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-bold text-sm">
                    {student.student_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{student.student_name}</p>
                    {student.gender && <p className="text-xs text-gray-500">{student.gender}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {STATUS_BUTTONS.map((btn) => (
                    <button
                      key={btn.status}
                      type="button"
                      onClick={() => setStatus(student.student_id, btn.status)}
                      className={`flex-1 p-1.5 rounded text-xs font-medium transition-all ${
                        status === btn.status ? btn.activeClass : btn.inactiveClass
                      }`}
                      title={btn.label}
                    >
                      <btn.icon size={14} className="mx-auto" />
                    </button>
                  ))}
                </div>
                {(status === 'absent' || status === 'excused') && (
                  <input
                    type="text"
                    value={record?.notes || ''}
                    onChange={(e) => setNote(student.student_id, e.target.value)}
                    className="form-input text-xs mt-2"
                    placeholder="Reason (optional)..."
                  />
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {students.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <Clock size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Select a class to load students</p>
          </div>
        </Card>
      )}

      {/* Actions */}
      {students.length > 0 && (
        <div className="flex gap-3 justify-end">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading} 
            icon={<Save size={18} />} 
            disabled={counts.unmarked > 0}
          >
            {counts.unmarked > 0 
              ? `Save Attendance (${students.length - counts.unmarked}/${students.length})` 
              : 'Save Attendance'
            }
          </Button>
        </div>
      )}
    </form>
  )
}

export default AttendanceForm
