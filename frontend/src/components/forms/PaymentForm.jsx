import { useState, useEffect } from 'react'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import Button from '../common/Button'
import Card from '../common/Card'
import LoadingSpinner from '../common/LoadingSpinner'
import { Save, DollarSign, Search, User, X } from 'lucide-react'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Cheque' },
]

const TERMS = [
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
]

function PaymentForm({ initialData = null, students = [], onSubmit, onCancel, loading = false }) {
  const [formData, setFormData] = useState({
    student_id: initialData?.student_id || '',
    fee_structure_id: initialData?.fee_structure_id || '',
    amount_paid: initialData?.amount_paid || '',
    payment_method: initialData?.payment_method || 'cash',
    paid_by: initialData?.paid_by || '',
    transaction_reference: initialData?.transaction_reference || '',
    academic_year: initialData?.academic_year || '2024/2025',
    term: initialData?.term || 'Term 1',
    notes: initialData?.notes || '',
  })

  const [errors, setErrors] = useState({})
  const [studentSearch, setStudentSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)

  // Set initial student if editing
  useEffect(() => {
    if (initialData?.student_id && students.length > 0) {
      const student = students.find(s => s.student_id === initialData.student_id || s._id === initialData.student_id)
      if (student) {
        setSelectedStudent(student)
        setStudentSearch(student.student_name || `${student.first_name} ${student.last_name}`)
      }
    }
  }, [initialData, students])

  // Filter students based on search
  const filteredStudents = studentSearch.trim()
    ? students.filter(s => {
        const name = s.student_name || `${s.first_name || ''} ${s.last_name || ''}`
        const id = s.student_id || s._id || ''
        return name.toLowerCase().includes(studentSearch.toLowerCase()) ||
               id.toLowerCase().includes(studentSearch.toLowerCase())
      }).slice(0, 5)
    : []

  const selectStudent = (student) => {
    setSelectedStudent(student)
    setStudentSearch(student.student_name || `${student.first_name} ${student.last_name}`)
    setFormData(prev => ({ ...prev, student_id: student.student_id || student._id }))
    setShowResults(false)
    if (errors.student_id) setErrors(prev => ({ ...prev, student_id: '' }))
  }

  const clearStudent = () => {
    setSelectedStudent(null)
    setStudentSearch('')
    setFormData(prev => ({ ...prev, student_id: '' }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleStudentSearchChange = (e) => {
    setStudentSearch(e.target.value)
    setShowResults(true)
    if (selectedStudent) {
      setSelectedStudent(null)
      setFormData(prev => ({ ...prev, student_id: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.student_id) newErrors.student_id = 'Please select a student'
    if (!formData.amount_paid || formData.amount_paid <= 0) newErrors.amount_paid = 'Valid amount is required'
    if (!formData.paid_by.trim()) newErrors.paid_by = 'Payer name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit?.(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <Card>
        <div className="space-y-4">
          {/* Student Search */}
          <div>
            <label className="form-label">Student *</label>
            <div className="relative">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={handleStudentSearchChange}
                  onFocus={() => studentSearch.trim() && setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  className={`form-input pl-9 pr-8 ${errors.student_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Search by name or ID..."
                />
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={clearStudent}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown Results */}
              {showResults && studentSearch.trim() && !selectedStudent && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <button
                        key={student.student_id || student._id}
                        type="button"
                        onClick={() => selectStudent(student)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-medium text-sm flex-shrink-0">
                          <User size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {student.student_name || `${student.first_name || ''} ${student.last_name || ''}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.student_id || student._id} • {student.class_name || student.current_class_id || 'N/A'}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                      No students found
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.student_id && <p className="text-xs text-red-500 mt-1">{errors.student_id}</p>}

            {/* Selected Student Card */}
            {selectedStudent && (
              <div className="mt-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  {(selectedStudent.student_name || selectedStudent.first_name || 'S').charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {selectedStudent.student_name || `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedStudent.student_id || selectedStudent._id} • {selectedStudent.class_name || 'Unassigned'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <FormInput
            label="Amount Paid (SSP) *"
            name="amount_paid"
            type="number"
            value={formData.amount_paid}
            onChange={handleChange}
            error={errors.amount_paid}
            min="0"
            step="0.01"
          />
          <FormSelect
            label="Payment Method"
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
            options={PAYMENT_METHODS}
          />
          <FormInput
            label="Paid By *"
            name="paid_by"
            value={formData.paid_by}
            onChange={handleChange}
            error={errors.paid_by}
            placeholder="Name of payer"
          />
          <FormInput
            label="Transaction Reference"
            name="transaction_reference"
            value={formData.transaction_reference}
            onChange={handleChange}
            placeholder="Bank ref, mobile ref, etc."
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Academic Year"
              name="academic_year"
              value={formData.academic_year}
              onChange={handleChange}
            />
            <FormSelect
              label="Term"
              name="term"
              value={formData.term}
              onChange={handleChange}
              options={TERMS}
            />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="form-input"
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" variant="primary" loading={loading} icon={<DollarSign size={18} />}>
          Record Payment
        </Button>
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}

export default PaymentForm
