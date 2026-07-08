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
import { BarChart3, Plus, Edit, DollarSign, TrendingUp, AlertTriangle, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

function getCurrentAcademicYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month === 1 ? year - 1 : year
  return `${startYear}/${startYear + 1}`
}

const currentYear = getCurrentAcademicYear()

const ACADEMIC_YEAR_OPTIONS = [
  { value: currentYear, label: currentYear },
  { value: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, label: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}` },
]

const EXPENSE_CATEGORIES = [
  { value: '', label: '-- Select Category --' },
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

function BudgetPage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const [formData, setFormData] = useState({
    academic_year: currentYear,
    category: '',
    allocated_amount: '',
    description: '',
    term_1: '',
    term_2: '',
    term_3: '',
  })

  useEffect(() => {
    updatePageTitle('Budget Management')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Financial', path: '/financial' },
      { label: 'Budget' },
    ])
  }, [])

  useEffect(() => {
    fetchBudgets()
  }, [selectedYear])

  const fetchBudgets = async () => {
    setLoading(true)
    try {
      // ✅ Get saved budgets from backend
      let savedBudgets = []
      try {
        const budgetResponse = await financialAPI.getBudgets({ academic_year: selectedYear })
        const data = budgetResponse?.data || budgetResponse
        savedBudgets = data?.categories || data?.data || []
        if (!Array.isArray(savedBudgets)) savedBudgets = []
      } catch (e) {
        console.log('No saved budgets found, building from transactions')
      }

      // Get actual spending from transactions
      const response = await financialAPI.listTransactions({
        type: 'expense',
        academic_year: selectedYear,
        limit: 500,
      })
      
      const transactions = response?.data?.transactions || response?.data || response || []
      const txns = Array.isArray(transactions) ? transactions : []
      
      // Group spending by category
      const spendingMap = {}
      txns.forEach(t => {
        const cat = t.category || 'other'
        if (!spendingMap[cat]) spendingMap[cat] = 0
        spendingMap[cat] += (t.amount || 0)
      })
      
      // Merge saved budgets with actual spending
      const budgetMap = {}
      
      // First add saved budgets
      savedBudgets.forEach(b => {
        const cat = b.category
        budgetMap[cat] = {
          _id: b._id || b.id,
          category: cat,
          category_display: b.display || cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          allocated_amount: b.allocated || b.allocated_amount || 0,
          spent_amount: spendingMap[cat] || 0,
          academic_year: selectedYear,
          description: b.description || '',
        }
      })
      
      // Add categories that have spending but no budget
      Object.entries(spendingMap).forEach(([cat, spent]) => {
        if (!budgetMap[cat]) {
          budgetMap[cat] = {
            category: cat,
            category_display: cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            allocated_amount: 0,
            spent_amount: spent,
            academic_year: selectedYear,
            description: '',
          }
        }
      })
      
      const budgetList = Object.values(budgetMap).map(b => ({
        ...b,
        remaining_amount: b.allocated_amount - b.spent_amount,
        utilization_percentage: b.allocated_amount > 0 
          ? parseFloat(((b.spent_amount / b.allocated_amount) * 100).toFixed(1))
          : 0,
      }))
      
      setBudgets(budgetList)
    } catch (error) {
      console.error('Failed to fetch budgets:', error)
      toast.error('Failed to load budget data')
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingBudget(null)
    setErrors({})
    setFormData({
      academic_year: selectedYear,
      category: '',
      allocated_amount: '',
      description: '',
      term_1: '',
      term_2: '',
      term_3: '',
    })
    setShowModal(true)
  }

  const openEditModal = (budget) => {
    setEditingBudget(budget)
    setErrors({})
    setFormData({
      academic_year: budget.academic_year || selectedYear,
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
    if (!formData.category) newErrors.category = 'Please select a category'
    if (!formData.allocated_amount || parseFloat(formData.allocated_amount) <= 0) {
      newErrors.allocated_amount = 'Valid amount is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    try {
      const payload = {
        academic_year: formData.academic_year,
        category: formData.category,
        allocated_amount: parseFloat(formData.allocated_amount),
        description: formData.description,
        term_breakdown: {
          "Term 1": formData.term_1 ? parseFloat(formData.term_1) : parseFloat(formData.allocated_amount) / 3,
          "Term 2": formData.term_2 ? parseFloat(formData.term_2) : parseFloat(formData.allocated_amount) / 3,
          "Term 3": formData.term_3 ? parseFloat(formData.term_3) : parseFloat(formData.allocated_amount) / 3,
        },
      }

      // ✅ Save to backend
      let response
      if (editingBudget?._id) {
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
      console.error('Budget save error:', error)
      toast.error(error.message || 'Failed to save budget')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (budget) => {
    if (!confirm(`Delete budget for ${budget.category_display}?`)) return
    try {
      if (budget._id) {
        await financialAPI.deleteBudget(budget._id)
      }
      toast.success('Budget deleted')
      fetchBudgets()
    } catch (error) {
      toast.error('Failed to delete budget')
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
        subtitle={`${budgets.length} categories • ${selectedYear}`}
        actions={
          <div className="flex gap-2">
            <FormSelect value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} options={ACADEMIC_YEAR_OPTIONS} className="w-40" />
            <Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>Add Budget</Button>
          </div>
        }
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
        <EmptyState icon={<BarChart3 size={48} />} title="No budgets" description={`Create budget allocations for ${selectedYear}.`} action={<Button onClick={openCreateModal} variant="primary">Add Budget</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((budget, index) => (
            <Card key={budget.category || index}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{budget.category_display || budget.category}</h3>
                <Badge variant={(budget.utilization_percentage || 0) > 100 ? 'danger' : (budget.utilization_percentage || 0) > 80 ? 'warning' : 'success'}>
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
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEditModal(budget)} className="btn btn-ghost btn-sm text-blue-600"><Edit size={14} /> Edit</button>
                <button onClick={() => handleDelete(budget)} className="btn btn-ghost btn-sm text-red-600"><Trash2 size={14} /> Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingBudget ? 'Edit Budget' : 'Add Budget'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect label="Category *" name="category" value={formData.category} onChange={handleChange} error={errors.category} options={EXPENSE_CATEGORIES} disabled={!!editingBudget} />
          <FormInput label="Allocated Amount (SSP) *" name="allocated_amount" type="number" value={formData.allocated_amount} onChange={handleChange} error={errors.allocated_amount} min="0" step="0.01" placeholder="0.00" />
          <FormSelect label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange} options={ACADEMIC_YEAR_OPTIONS} />
          <div>
            <label className="form-label">Term Breakdown (Optional)</label>
            <div className="grid grid-cols-3 gap-3">
              <FormInput label="Term 1" name="term_1" type="number" value={formData.term_1} onChange={handleChange} min="0" placeholder="Auto" />
              <FormInput label="Term 2" name="term_2" type="number" value={formData.term_2} onChange={handleChange} min="0" placeholder="Auto" />
              <FormInput label="Term 3" name="term_3" type="number" value={formData.term_3} onChange={handleChange} min="0" placeholder="Auto" />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="form-input" placeholder="Budget description..." />
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
