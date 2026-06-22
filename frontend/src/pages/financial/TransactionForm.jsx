import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import financialAPI from '../../api/financial'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Save, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

const INCOME_CATEGORIES = [
  { value: 'tuition_fees', label: 'Tuition Fees' },
  { value: 'registration_fees', label: 'Registration Fees' },
  { value: 'examination_fees', label: 'Examination Fees' },
  { value: 'transportation_fees', label: 'Transportation Fees' },
  { value: 'uniform_fees', label: 'Uniform Fees' },
  { value: 'donations', label: 'Donations' },
  { value: 'grants', label: 'Grants' },
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'other_income', label: 'Other Income' },
]

const EXPENSE_CATEGORIES = [
  { value: 'salaries', label: 'Salaries & Wages' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'supplies', label: 'School Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'textbooks', label: 'Textbooks' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'food_program', label: 'Food Program' },
  { value: 'medical', label: 'Medical' },
  { value: 'training', label: 'Training & Development' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other_expenses', label: 'Other Expenses' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cheque', label: 'Cheque' },
]

function TransactionForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    transaction_type: 'income',
    category: '',
    description: '',
    payment_method: 'cash',
    academic_year: '2024/2025',
    term: 'Term 1',
    currency: 'SSP',
    notes: '',
    receipt_url: '',
  })

  useEffect(() => {
    updatePageTitle(isEdit ? 'Edit Transaction' : 'New Transaction')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Financial', path: '/financial' },
      { label: isEdit ? 'Edit' : 'New' },
    ])
    
    if (isEdit) {
      fetchTransaction()
    } else {
      setFetching(false)
    }
  }, [id])

  const fetchTransaction = async () => {
    setFetching(true)
    try {
      const response = await financialAPI.getTransaction(id)
      if (response?.success && response.data) {
        const t = response.data
        setFormData({
          transaction_date: t.transaction_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          amount: t.amount || '',
          transaction_type: t.transaction_type || 'income',
          category: t.category || '',
          description: t.description || '',
          payment_method: t.payment_method || 'cash',
          academic_year: t.academic_year || '2024/2025',
          term: t.term || 'Term 1',
          currency: t.currency || 'SSP',
          notes: t.notes || '',
          receipt_url: t.receipt_url || '',
        })
      } else {
        toast.error('Failed to load transaction')
        navigate('/financial')
      }
    } catch (error) {
      toast.error('Failed to fetch transaction')
      navigate('/financial')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
    if (name === 'transaction_type') setFormData(prev => ({ ...prev, category: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.transaction_date) newErrors.transaction_date = 'Date is required'
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount is required'
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload = { ...formData }
      
      let response
      if (isEdit) {
        response = await financialAPI.updateTransaction(id, payload)
      } else {
        response = await financialAPI.createTransaction(payload)
      }

      if (response && response.success) {
        toast.success(`Transaction ${isEdit ? 'updated' : 'recorded'} successfully`)
        navigate('/financial')
      } else {
        toast.error(response?.message || 'Failed to save transaction')
      }
    } catch (error) {
      if (error.status === 422) {
        const fieldErrors = error.errors || []
        const newErrors = {}
        fieldErrors.forEach(err => {
          const field = err.loc?.[err.loc.length - 1] || 'general'
          newErrors[field] = err.msg
        })
        setErrors(newErrors)
        toast.error('Please fix the validation errors')
      } else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to save transaction')
      }
      console.error('Transaction save error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <LoadingSpinner fullScreen />

  const categories = formData.transaction_type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in-up">
      <PageHeader
        title={isEdit ? 'Edit Transaction' : 'Record Transaction'}
        actions={<button onClick={() => navigate('/financial')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>}
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Transaction Type *" name="transaction_type" value={formData.transaction_type} onChange={handleChange}
              options={[{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }]} error={errors.transaction_type} />
            <FormInput label="Date *" name="transaction_date" type="date" value={formData.transaction_date} onChange={handleChange} error={errors.transaction_date} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label={`Amount (${formData.currency}) *`} name="amount" type="number" value={formData.amount} onChange={handleChange} error={errors.amount} placeholder="0.00" min="0" step="0.01" />
            <FormSelect label="Payment Method" name="payment_method" value={formData.payment_method} onChange={handleChange} options={PAYMENT_METHODS} />
          </div>

          <FormSelect label="Category *" name="category" value={formData.category} onChange={handleChange} options={categories} error={errors.category} />

          <div>
            <label className="form-label">Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className={`form-input ${errors.description ? 'error' : ''}`} placeholder="Describe the transaction..." />
            {errors.description && <p className="form-error">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange}
              options={[{ value: '2024/2025', label: '2024/2025' }, { value: '2023/2024', label: '2023/2024' }]} />
            <FormSelect label="Term" name="term" value={formData.term} onChange={handleChange}
              options={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }, { value: 'Term 3', label: 'Term 3' }]} />
          </div>

          <FormInput label="Receipt/Invoice URL" name="receipt_url" value={formData.receipt_url} onChange={handleChange} placeholder="https://..." />

          <div>
            <label className="form-label">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="form-input" placeholder="Additional notes..." />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" loading={loading} icon={<Save size={18} />}>
              {isEdit ? 'Update' : 'Record'} Transaction
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/financial')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default TransactionForm
