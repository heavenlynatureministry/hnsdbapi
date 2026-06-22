import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import financialAPI from '../../api/financial'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { BarChart3, Plus, Edit, DollarSign, TrendingUp, AlertTriangle, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const EXPENSE_CATEGORIES = [
  'salaries', 'utilities', 'rent', 'maintenance', 'supplies',
  'equipment', 'textbooks', 'transportation', 'food_program',
  'medical', 'training', 'insurance', 'administrative', 'other_expenses',
]

function BudgetPage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    academic_year: '2024/2025', category: '', allocated_amount: '',
    description: '', term_1: '', term_2: '', term_3: '',
  })

  useEffect(() => {
    updatePageTitle('Budget Management')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Financial', path: '/financial' },
      { label: 'Budget' },
    ])
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    setLoading(true)
    try {
      const response = await financialAPI.getBudgetSummary()
      if (response?.success && response.data) {
        setBudgets(response.data.categories || response.data || [])
      } else if (response?.data) {
        setBudgets(Array.isArray(response.data) ? response.data : response.data.categories || [])
      } else {
        setBudgets([])
      }
    } catch (error) {
      console.error('Failed to fetch budgets:', error)
      toast.error('Failed to load budgets')
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingBudget(null)
    setErrors({})
    setFormData({ academic_year: '2024/2025', category: '', allocated_amount: '', description: '', term_1: '', term_2: '', term_3: '' })
    setShowModal(true)
  }

  const openEditModal = (budget) => {
    setEditingBudget(budget)
    setErrors({})
    setFormData({
      academic_year: budget.academic_year || '2024/2025',
      category: budget.category || '',
      allocated_amount: budget.allocated_amount?.toString() || '',
      description: budget.description || '',
      term_1: budget.term_1 || '',
      term_2: budget.term_2 || '',
      term_3: budget.term_3 || '',
    })
    setShowModal(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.allocated_amount || parseFloat(formData.allocated_amount) <= 0) newErrors.allocated_amount = 'Valid amount is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    try {
      const payload = { ...formData, allocated_amount: parseFloat(formData.allocated_amount) }
      
      let response
      if (editingBudget) {
        response = await financialAPI.updateBudget(editingBudget._id, payload)
      } else {
        response = await financialAPI.createBudget(payload)
      }

      if (response?.success) {
        toast.success(editingBudget ? 'Budget updated!' : 'Budget created!')
        setShowModal(false)
        fetchBudgets()
      } else {
        toast.error(response?.message || 'Failed to save budget')
      }
    } catch (error) {
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to save budget')
      }
    } finally {
      setSaving(false)
    }
  }

  const totalBudget = budgets.reduce((s, b) => s + (b.allocated_amount || 0), 0)
  const totalSpent = budgets.reduce((s, b) => s + (b.spent_amount || 0), 0)
  const overallUtilization = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Budget Management"
        subtitle={`${budgets.length} budget categories`}
        actions={<Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>Add Budget</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Budget', value: `SSP ${totalBudget.toLocaleString()}`, color: 'bg-blue-100 text-blue-600', icon: DollarSign },
          { label: 'Total Spent', value: `SSP ${totalSpent.toLocaleString()}`, color: 'bg-red-100 text-red-600', icon: TrendingUp },
          { label: 'Remaining', value: `SSP ${(totalBudget - totalSpent).toLocaleString()}`, color: 'bg-green-100 text-green-600', icon: DollarSign },
          { label: 'Utilization', value: `${overallUtilization}%`, color: 'bg-purple-100 text-purple-600', icon: BarChart3 },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value text-sm">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {budgets.length === 0 ? (
        <EmptyState icon={<BarChart3 size={48} />} title="No budgets" description="Create your first budget." action={<Button onClick={openCreateModal} variant="primary">Add Budget</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <Card key={budget._id}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{budget.category_display || budget.category}</h3>
                <Badge variant={budget.utilization_percentage > 100 ? 'danger' : budget.utilization_percentage > 80 ? 'warning' : 'success'}>
                  {budget.utilization_percentage || 0}%
                </Badge>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Allocated:</span>
                  <span className="font-semibold">SSP {(budget.allocated_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Spent:</span>
                  <span className="font-semibold text-red-600">SSP {(budget.spent_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Remaining:</span>
                  <span className={`font-semibold ${(budget.remaining_amount || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    SSP {(budget.remaining_amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-1">
                <div
                  className={`h-3 rounded-full transition-all ${(budget.utilization_percentage || 0) > 100 ? 'bg-red-500' : (budget.utilization_percentage || 0) > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(budget.utilization_percentage || 0, 100)}%` }}
                />
              </div>
              {(budget.utilization_percentage || 0) > 80 && (
                <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                  <AlertTriangle size={12} />
                  {(budget.utilization_percentage || 0) > 100 ? 'Over budget!' : 'Approaching limit'}
                </div>
              )}
              <button onClick={() => openEditModal(budget)} className="btn btn-ghost btn-sm text-blue-600 mt-3"><Edit size={14} /> Edit</button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingBudget ? 'Edit Budget' : 'Add Budget'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect label="Category *" name="category" value={formData.category} onChange={handleChange} error={errors.category}
            options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))} />
          <FormInput label="Allocated Amount (SSP) *" name="allocated_amount" type="number" value={formData.allocated_amount} onChange={handleChange} error={errors.allocated_amount} min="0" />
          <FormSelect label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange}
            options={[{ value: '2024/2025', label: '2024/2025' }]} />
          <div>
            <label className="form-label">Term Breakdown (Optional)</label>
            <div className="grid grid-cols-3 gap-3">
              <FormInput label="Term 1" name="term_1" type="number" value={formData.term_1} onChange={handleChange} />
              <FormInput label="Term 2" name="term_2" type="number" value={formData.term_2} onChange={handleChange} />
              <FormInput label="Term 3" name="term_3" type="number" value={formData.term_3} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="form-input" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" loading={saving} icon={<Save size={18} />}>
              {editingBudget ? 'Update' : 'Create'} Budget
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default BudgetPage
