import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import financialAPI from '../../api/financial'
import studentsAPI from '../../api/students'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import SearchBar from '../../components/common/SearchBar'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { DollarSign, Plus, Search, Download, CheckCircle, Clock, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function getCurrentAcademicYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month === 1 ? year - 1 : year
  return `${startYear}/${startYear + 1}`
}

function getCurrentTerm() {
  const month = new Date().getMonth() + 1
  if (month >= 2 && month <= 4) return 'Term 1'
  if (month >= 5 && month <= 7) return 'Term 2'
  if (month >= 9 && month <= 11) return 'Term 3'
  return 'Term 2'
}

const currentYear = getCurrentAcademicYear()
const currentTerm = getCurrentTerm()

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Cheque' },
]

const ACADEMIC_YEAR_OPTIONS = [
  { value: currentYear, label: currentYear },
  { value: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, label: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}` },
]

const TERM_OPTIONS = [
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
]

function PaymentsPage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  const [formData, setFormData] = useState({
    student_id: '',
    amount_paid: '',
    payment_method: 'cash',
    payment_type: 'school_fees',
    fee_type: 'tuition',
    paid_by: '',
    transaction_reference: '',
    academic_year: currentYear,
    term: currentTerm,
    notes: '',
  })

  useEffect(() => {
    updatePageTitle('Payments')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Financial', path: '/financial' },
      { label: 'Payments' },
    ])
    fetchPayments()
    fetchStudents()
  }, [])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const response = await financialAPI.getPayments({ search: search || undefined })
      if (response?.success) {
        setPayments(response.data?.payments || response.data || [])
      } else {
        setPayments([])
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error)
      toast.error('Failed to load payments')
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    setLoadingStudents(true)
    try {
      const response = await studentsAPI.getAll({ status: 'active', limit: 200 })
      let studentList = response?.data || response || []
      if (!Array.isArray(studentList)) {
        studentList = studentList?.students || studentList?.data || []
      }
      const safeStudents = Array.isArray(studentList) ? studentList : []
      setStudents(safeStudents)
    } catch (error) {
      console.error('Failed to fetch students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [search])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleStudentSelect = (studentId) => {
    const student = students.find(s => (s._id || s.id) === studentId)
    setFormData(prev => ({
      ...prev,
      student_id: studentId,
      paid_by: student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : prev.paid_by,
    }))
  }

  const filteredStudents = studentSearch
    ? students.filter(s => {
        const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase()
        return name.includes(studentSearch.toLowerCase())
      })
    : students

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.student_id) {
      toast.error('Please select a student')
      return
    }
    if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        student_id: formData.student_id,
        amount_paid: parseFloat(formData.amount_paid),
        amount: parseFloat(formData.amount_paid),
        payment_method: formData.payment_method,
        payment_type: formData.payment_type,
        fee_type: formData.fee_type,
        paid_by: formData.paid_by || undefined,
        transaction_reference: formData.transaction_reference || undefined,
        academic_year: formData.academic_year,
        term: formData.term,
        notes: formData.notes || undefined,
      }
      
      const response = await financialAPI.recordPayment(payload)
      if (response?.success) {
        toast.success('Payment recorded successfully!')
        setShowModal(false)
        setFormData({
          student_id: '',
          amount_paid: '',
          payment_method: 'cash',
          payment_type: 'school_fees',
          fee_type: 'tuition',
          paid_by: '',
          transaction_reference: '',
          academic_year: currentYear,
          term: currentTerm,
          notes: '',
        })
        setStudentSearch('')
        fetchPayments()
      } else {
        toast.error(response?.message || 'Failed to record payment')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = { completed: 'success', pending: 'warning', failed: 'danger', refunded: 'gray', partial: 'info' }
    const icons = { completed: CheckCircle, pending: Clock, failed: XCircle }
    const Icon = icons[status]
    return <Badge variant={variants[status] || 'gray'}><span className="flex items-center gap-1">{Icon && <Icon size={12} />}{status}</span></Badge>
  }

  const totalCollected = payments.reduce((s, p) => s + (p.amount_paid || 0), 0)

  const studentOptions = [
    { value: '', label: loadingStudents ? 'Loading students...' : '-- Select Student --' },
    ...filteredStudents.slice(0, 50).map(s => ({
      value: s._id || s.id || '',
      label: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || 'Unknown Student',
    })),
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Payments"
        subtitle={`Total collected: SSP ${totalCollected.toLocaleString()}`}
        actions={<Button onClick={() => setShowModal(true)} variant="primary" icon={<Plus size={18} />}>Record Payment</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Collected', value: `SSP ${totalCollected.toLocaleString()}`, color: 'bg-green-100 text-green-600', icon: DollarSign },
          { label: 'Completed', value: payments.filter(p => p.status === 'completed').length, color: 'bg-blue-100 text-blue-600', icon: CheckCircle },
          { label: 'Partial', value: payments.filter(p => p.status === 'partial').length, color: 'bg-yellow-100 text-yellow-600', icon: Clock },
          { label: 'Failed', value: payments.filter(p => p.status === 'failed').length, color: 'bg-red-100 text-red-600', icon: XCircle },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value text-sm">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex gap-3">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search by student or receipt..." /></div>
          <button className="btn btn-secondary"><Download size={18} /> Export</button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : payments.length === 0 ? (
        <EmptyState icon={<DollarSign size={48} />} title="No payments" description="No payments recorded yet." action={<Button onClick={() => setShowModal(true)} variant="primary">Record Payment</Button>} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Paid By</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td className="text-xs font-mono">{payment.receipt_number}</td>
                    <td className="font-medium text-sm">{payment.student_name}</td>
                    <td className="text-sm">{payment.class_name}</td>
                    <td className="text-sm font-semibold text-green-600">SSP {(payment.amount_paid || 0).toLocaleString()}</td>
                    <td className="text-sm capitalize">{payment.payment_method?.replace('_', ' ')}</td>
                    <td className="text-sm">{payment.paid_by}</td>
                    <td className="text-sm">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Payment" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Student *</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student by name..."
                className="form-input flex-1"
              />
            </div>
            <FormSelect
              name="student_id"
              value={formData.student_id}
              onChange={(e) => handleStudentSelect(e.target.value)}
              options={studentOptions}
              disabled={loadingStudents}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Payment Type"
              name="payment_type"
              value={formData.payment_type}
              onChange={handleChange}
              options={[
                { value: 'school_fees', label: 'School Fees' },
                { value: 'registration', label: 'Registration' },
                { value: 'exam', label: 'Exam Fees' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <FormSelect
              label="Fee Type"
              name="fee_type"
              value={formData.fee_type}
              onChange={handleChange}
              options={[
                { value: 'tuition', label: 'Tuition' },
                { value: 'registration', label: 'Registration' },
                { value: 'exam', label: 'Examination' },
                { value: 'library', label: 'Library' },
                { value: 'sports', label: 'Sports' },
                { value: 'uniform', label: 'Uniform' },
                { value: 'transport', label: 'Transport' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>

          <FormInput
            label="Amount Paid (SSP) *"
            name="amount_paid"
            type="number"
            value={formData.amount_paid}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            placeholder="0.00"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Payment Method"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              options={PAYMENT_METHODS}
            />
            <FormInput
              label="Paid By"
              name="paid_by"
              value={formData.paid_by}
              onChange={handleChange}
              placeholder="Name of payer"
            />
          </div>

          <FormInput
            label="Transaction Reference"
            name="transaction_reference"
            value={formData.transaction_reference}
            onChange={handleChange}
            placeholder="e.g., bank transaction ID"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Academic Year"
              name="academic_year"
              value={formData.academic_year}
              onChange={handleChange}
              options={ACADEMIC_YEAR_OPTIONS}
            />
            <FormSelect
              label="Term"
              name="term"
              value={formData.term}
              onChange={handleChange}
              options={TERM_OPTIONS}
            />
          </div>

          <FormInput
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional notes..."
          />

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" loading={saving} icon={<DollarSign size={18} />}>
              Record Payment
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PaymentsPage
