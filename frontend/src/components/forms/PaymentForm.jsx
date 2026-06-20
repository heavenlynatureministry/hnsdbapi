import { useState } from 'react'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import Button from '../common/Button'
import Card from '../common/Card'
import { Save, DollarSign } from 'lucide-react'

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

function PaymentForm({ initialData = null, onSubmit, onCancel, loading = false }) {
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.student_id.trim()) newErrors.student_id = 'Student is required'
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
          <FormInput label="Student ID *" name="student_id" value={formData.student_id} onChange={handleChange} error={errors.student_id} placeholder="Search student..." />
          <FormInput label="Amount Paid (SSP) *" name="amount_paid" type="number" value={formData.amount_paid} onChange={handleChange} error={errors.amount_paid} min="0" step="0.01" />
          <FormSelect label="Payment Method" name="payment_method" value={formData.payment_method} onChange={handleChange} options={PAYMENT_METHODS} />
          <FormInput label="Paid By *" name="paid_by" value={formData.paid_by} onChange={handleChange} error={errors.paid_by} placeholder="Name of payer" />
          <FormInput label="Transaction Reference" name="transaction_reference" value={formData.transaction_reference} onChange={handleChange} placeholder="Bank ref, mobile ref, etc." />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange} />
            <FormSelect label="Term" name="term" value={formData.term} onChange={handleChange} options={TERMS} />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="form-input" placeholder="Additional notes..." />
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