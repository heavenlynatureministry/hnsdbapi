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
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { DollarSign, Plus, Download, CheckCircle, Clock, XCircle, Edit, Trash2, MoreVertical } from 'lucide-react'
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

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
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
  const [editingPayment, setEditingPayment] = useState(null)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [showDelete, setShowDelete] = useState(null)

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
    status: 'completed',
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

  const openEditModal = (payment) => {
    setEditingPayment(payment)
    setFormData({
      student_id: payment.student_id || '',
      amount_paid: payment.amount_paid || '',
      payment_method: payment.payment_method || 'cash',
      payment_type: payment.payment_type || 'school_fees',
      fee_type: payment.fee_type || 'tuition',
      paid_by: payment.paid_by || '',
      transaction_reference: payment.transaction_reference || '',
      academic_year: payment.academic_year || currentYear,
      term: payment.term || currentTerm,
      status: payment.status || 'completed',
      notes: payment.notes || '',
    })
    setShowModal(true)
    setOpenDropdown(null)
  }

  const openCreateModal = () => {
    setEditingPayment(null)
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
      status: 'completed',
      notes: '',
    })
    setStudentSearch('')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!editingPayment && !formData.student_id) {
      toast.error('Please select a student')
      return
    }
    if (!formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    setSaving(true)
    try {
      let response
      
      if (editingPayment) {
        // Update existing payment
        response = await financialAPI.updatePayment(editingPayment._id, {
          status: formData.status,
          amount_paid: parseFloat(formData.amount_paid),
          payment_method: formData.payment_method,
          notes: formData.notes,
          transaction_reference: formData.transaction_reference,
        })
      } else {
        // Create new payment
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
          status: formData.status,
          notes: formData.notes || undefined,
        }
        response = await financialAPI.recordPayment(payload)
      }
      
      if (response?.success) {
        toast.success(editingPayment ? 'Payment updated!' : 'Payment recorded successfully!')
        setShowModal(false)
        fetchPayments()
      } else {
        toast.error(response?.message || 'Failed to save payment')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!showDelete) return
    try {
      await financialAPI.deletePayment(showDelete._id)
      toast.success('Payment deleted')
      setShowDelete(null)
      fetchPayments()
    } catch (error) {
      toast.error(error.message || 'Failed to delete payment')
    }
  }

  const getStatusBadge = (status) => {
    const variants = { completed: 'success', pending: 'warning', failed: 'danger', refunded: 'gray', partial: 'info' }
    const icons = { completed: CheckCircle, pending: Clock, failed: XCircle }
    const Icon = icons[status]
    return <Badge variant={variants[status] || 'gray'}><span className="flex items-center gap-1">{Icon && <Icon size={12} />}{status || 'unknown'}</span></Badge>
  }

  const totalCollected = payments
    .filter(p => p.status === 'completed')
    .reduce((s, p) => s + (p.amount_paid || 0), 0)

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
        actions={<Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>Record Payment</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Collected', value: `SSP ${totalCollected.toLocaleString()}`, color: 'bg-green-100 text-green-600', icon: DollarSign },
          { label: 'Completed', value: payments.filter(p => p.status === 'completed').length, color: 'bg-blue-100 text-blue-600', icon: CheckCircle },
          { label: 'Pending', value: payments.filter(p => p.status === 'pending').length, color: 'bg-yellow-100 text-yellow-600', icon: Clock },
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
        <EmptyState icon={<DollarSign size={48} />} title="No payments" description="No payments recorded yet." action={<Button onClick={openCreateModal} variant="primary">Record Payment</Button>} />
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
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
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
                    <td className="text-sm">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                    <td className="text-right">
                      <div className="relative">
                        <button onClick={() => setOpenDropdown(openDropdown === payment._id ? null : payment._id)} className="btn btn-ghost btn-sm btn-icon"><MoreVertical size={16} /></button>
                        {openDropdown === payment._id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-20 py-1">
                              <button onClick={() => openEditModal(payment)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"><Edit size={14} /> Edit</button>
                              <button onClick={() => { setShowDelete(payment); setOpenDropdown(null) }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"><Trash2 size={14} /> Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingPayment ? 'Edit Payment' : 'Record Payment'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingPayment && (
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
          )}

          {editingPayment && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium">{editingPayment.student_name}</p>
              <p className="text-xs text-gray-500">Receipt: {editingPayment.receipt_number}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Payment Type"
              name="payment_type"
              value={formData.payment_type}
              onChange={handleChange}
              disabled={!!editingPayment}
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
              disabled={!!editingPayment}
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
            {!editingPayment && (
              <FormInput
                label="Paid By"
                name="paid_by"
                value={formData.paid_by}
                onChange={handleChange}
                placeholder="Name of payer"
              />
            )}
            {editingPayment && (
              <FormSelect
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                options={STATUS_OPTIONS}
              />
            )}
          </div>

          {editingPayment && (
            <FormSelect
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={STATUS_OPTIONS}
            />
          )}

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
              {editingPayment ? 'Update Payment' : 'Record Payment'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        open={!!showDelete} 
        onClose={() => setShowDelete(null)} 
        onConfirm={handleDelete} 
        title="Delete Payment" 
        message="Are you sure you want to delete this payment? This action cannot be undone." 
        confirmText="Delete Payment" 
        variant="danger" 
      />
    </div>
  )
}

export default PaymentsPage
