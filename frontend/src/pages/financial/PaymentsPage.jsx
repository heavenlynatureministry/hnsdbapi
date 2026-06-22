import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import financialAPI from '../../api/financial'
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

function PaymentsPage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    student_id: '', fee_structure_id: '', amount_paid: '',
    payment_method: 'cash', paid_by: '', transaction_reference: '',
    academic_year: '2024/2025', term: 'Term 1', notes: '',
  })

  useEffect(() => {
    updatePageTitle('Payments')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Financial', path: '/financial' },
      { label: 'Payments' },
    ])
    fetchPayments()
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

  useEffect(() => {
    fetchPayments()
  }, [search])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await financialAPI.recordPayment(formData)
      if (response?.success) {
        toast.success('Payment recorded successfully!')
        setShowModal(false)
        setFormData({ student_id: '', fee_structure_id: '', amount_paid: '', payment_method: 'cash', paid_by: '', transaction_reference: '', academic_year: '2024/2025', term: 'Term 1', notes: '' })
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
          <FormInput label="Student ID *" name="student_id" value={formData.student_id} onChange={handleChange} required placeholder="Search student..." />
          <FormSelect label="Fee Structure" name="fee_structure_id" value={formData.fee_structure_id} onChange={handleChange}
            options={[{ value: '', label: 'Select...' }, { value: 'fs1', label: 'Nursery Fees 2024/2025' }, { value: 'fs2', label: 'Primary Fees 2024/2025' }]} />
          <FormInput label="Amount Paid (SSP) *" name="amount_paid" type="number" value={formData.amount_paid} onChange={handleChange} required min="0" />
          <FormSelect label="Payment Method" name="payment_method" value={formData.payment_method} onChange={handleChange}
            options={[{ value: 'cash', label: 'Cash' }, { value: 'bank_transfer', label: 'Bank Transfer' }, { value: 'mobile_money', label: 'Mobile Money' }, { value: 'cheque', label: 'Cheque' }]} />
          <FormInput label="Paid By *" name="paid_by" value={formData.paid_by} onChange={handleChange} required placeholder="Name of payer" />
          <FormInput label="Transaction Reference" name="transaction_reference" value={formData.transaction_reference} onChange={handleChange} />
          <FormSelect label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange}
            options={[{ value: '2024/2025', label: '2024/2025' }]} />
          <FormSelect label="Term" name="term" value={formData.term} onChange={handleChange}
            options={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }, { value: 'Term 3', label: 'Term 3' }]} />
          <FormInput label="Notes" name="notes" value={formData.notes} onChange={handleChange} />

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" loading={saving} icon={<DollarSign size={18} />}>Record Payment</Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PaymentsPage
