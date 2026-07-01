import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import financialAPI from '../../api/financial'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { DollarSign, Plus, Edit, Trash2, Save, Calculator, Eye } from 'lucide-react'
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
  { value: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, label: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}` },
]

const FEE_TYPE_OPTIONS = [
  { value: 'tuition', label: 'Tuition (Annual)' },
  { value: 'registration', label: 'Registration' },
  { value: 'exam', label: 'Examination' },
  { value: 'library', label: 'Library' },
  { value: 'sports', label: 'Sports' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'transport', label: 'Transport' },
  { value: 'development', label: 'Development Fee' },
  { value: 'activities', label: 'Activities' },
  { value: 'other', label: 'Other' },
]

function FeeStructures() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [structures, setStructures] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStructure, setEditingStructure] = useState(null)
  const [saving, setSaving] = useState(false)
  const [classOptions, setClassOptions] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [formData, setFormData] = useState({
    fee_name: '',
    fee_type: 'tuition',
    amount: '',
    class_level: '',
    academic_year: currentYear,
    term: '',
    description: '',
    is_mandatory: true,
    status: 'active',
  })

  useEffect(() => {
    updatePageTitle('Fee Structures')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Financial', path: '/financial' },
      { label: 'Fees' },
    ])
    fetchStructures()
    fetchClasses()
  }, [selectedYear])

  const fetchStructures = async () => {
    setLoading(true)
    try {
      const response = await financialAPI.getFeeStructure({ academic_year: selectedYear })
      if (response?.success) {
        setStructures(response.data?.fees || response.data || [])
      } else if (response?.data) {
        const fees = response.data?.fees || response.data || []
        setStructures(Array.isArray(fees) ? fees : [])
      } else {
        setStructures([])
      }
    } catch (error) {
      console.error('Failed to fetch fee structures:', error)
      toast.error('Failed to load fee structures')
      setStructures([])
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const response = await classesAPI.getAll({ status: 'active' })
      let classList = response?.data || response || []
      if (!Array.isArray(classList)) {
        classList = classList?.classes || classList?.data || []
      }
      const options = [{ value: '', label: 'All Classes' }]
      classList.forEach(c => {
        options.push({
          value: c.class_level || c._id || '',
          label: c.class_name || c.name || `${c.class_level || ''}`.trim(),
        })
      })
      setClassOptions(options)
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      setClassOptions([{ value: '', label: 'All Classes' }])
    } finally {
      setLoadingClasses(false)
    }
  }

  const openCreateModal = () => {
    setEditingStructure(null)
    setFormData({
      fee_name: '',
      fee_type: 'tuition',
      amount: '',
      class_level: '',
      academic_year: selectedYear,
      term: '',
      description: '',
      is_mandatory: true,
      status: 'active',
    })
    setShowModal(true)
  }

  const openEditModal = (structure) => {
    setEditingStructure(structure)
    setFormData({
      fee_name: structure.fee_name || '',
      fee_type: structure.fee_type || 'tuition',
      amount: structure.amount || '',
      class_level: structure.class_level || '',
      academic_year: structure.academic_year || selectedYear,
      term: structure.term || '',
      description: structure.description || '',
      is_mandatory: structure.is_mandatory !== false,
      status: structure.status || 'active',
    })
    setShowModal(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.fee_name.trim()) {
      toast.error('Fee name is required')
      return
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Valid amount is required')
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        fee_name: formData.fee_name.trim(),
        fee_type: formData.fee_type,
        amount: parseFloat(formData.amount),
        class_level: formData.class_level || undefined,
        academic_year: formData.academic_year,
        term: formData.term || undefined,
        description: formData.description || undefined,
        is_mandatory: formData.is_mandatory,
        status: formData.status,
      }

      let response
      if (editingStructure) {
        response = await financialAPI.updateFeeStructure(editingStructure._id, payload)
      } else {
        response = await financialAPI.createFeeStructure(payload)
      }

      if (response?.success) {
        toast.success(editingStructure ? 'Fee structure updated!' : 'Fee structure created!')
        setShowModal(false)
        fetchStructures()
      } else {
        toast.error(response?.message || 'Failed to save fee structure')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save fee structure')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      const response = await financialAPI.deleteFeeStructure(deleteConfirm._id)
      if (response?.success) {
        toast.success('Fee structure deleted')
        setDeleteConfirm(null)
        fetchStructures()
      } else {
        toast.error(response?.message || 'Failed to delete')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete')
    }
  }

  // ✅ Calculate termly amount from annual
  const getTermlyAmount = (amount) => {
    return Math.round(amount / 3)
  }

  // ✅ Format currency
  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en')
  }

  const totalAnnualFees = structures
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.amount || 0), 0)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Fee Structures"
        subtitle={`${structures.length} structures • Total Annual: SSP ${formatCurrency(totalAnnualFees)}`}
        actions={
          <div className="flex gap-2">
            <FormSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={ACADEMIC_YEAR_OPTIONS}
              className="w-40"
            />
            <Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>Add Fee</Button>
          </div>
        }
      />

      {/* Summary Cards */}
      {structures.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="text-center">
            <p className="text-xs text-gray-500">Total Annual</p>
            <p className="text-xl font-bold text-primary-600">SSP {formatCurrency(totalAnnualFees)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-gray-500">Per Term</p>
            <p className="text-xl font-bold text-green-600">SSP {formatCurrency(getTermlyAmount(totalAnnualFees))}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-gray-500">Active Fees</p>
            <p className="text-xl font-bold text-blue-600">{structures.filter(s => s.status === 'active').length}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-gray-500">Categories</p>
            <p className="text-xl font-bold text-purple-600">{new Set(structures.map(s => s.fee_type)).size}</p>
          </Card>
        </div>
      )}

      {structures.length === 0 ? (
        <EmptyState 
          icon={<DollarSign size={48} />} 
          title="No fee structures" 
          description={`Create fee structures for ${selectedYear} to start tracking payments.`}
          action={<Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>Create Fee</Button>} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {structures.map((structure) => (
            <Card key={structure._id} className={structure.status !== 'active' ? 'opacity-60' : ''}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{structure.fee_name}</h3>
                <Badge variant={structure.status === 'active' ? 'success' : 'gray'}>
                  {structure.status || 'active'}
                </Badge>
              </div>
              
              <div className="space-y-1.5 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <Badge variant="info" className="text-xs">{structure.fee_type?.replace(/_/g, ' ') || 'N/A'}</Badge>
                </div>
                {structure.class_level && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Class:</span>
                    <span>{structure.class_level}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Year:</span>
                  <span>{structure.academic_year || selectedYear}</span>
                </div>
                {structure.term && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Term:</span>
                    <span>{structure.term}</span>
                  </div>
                )}
              </div>
              
              {/* Amount Display */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    SSP {formatCurrency(structure.amount)}
                  </p>
                  <p className="text-xs text-gray-500">per year</p>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                  <span className="text-gray-500">Per Term:</span>
                  <span className="font-medium text-green-600">SSP {formatCurrency(getTermlyAmount(structure.amount))}</span>
                </div>
              </div>
              
              {structure.description && (
                <p className="text-xs text-gray-400 mb-3 italic">{structure.description}</p>
              )}
              
              <div className="flex gap-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => openEditModal(structure)} 
                  className="btn btn-ghost btn-sm text-blue-600 flex-1 justify-center">
                  <Edit size={14} /> Edit
                </button>
                <button onClick={() => setDeleteConfirm(structure)} 
                  className="btn btn-ghost btn-sm text-red-600 flex-1 justify-center">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} 
        title={editingStructure ? 'Edit Fee Structure' : 'Create Fee Structure'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput 
            label="Fee Name *" 
            name="fee_name" 
            value={formData.fee_name} 
            onChange={handleChange} 
            placeholder="e.g., Annual Tuition Fee 2026/2027" 
          />

          <div className="grid grid-cols-2 gap-4">
            <FormSelect 
              label="Fee Type" 
              name="fee_type" 
              value={formData.fee_type} 
              onChange={handleChange}
              options={FEE_TYPE_OPTIONS} 
            />
            <FormInput 
              label="Annual Amount (SSP) *" 
              name="amount" 
              type="number" 
              value={formData.amount} 
              onChange={handleChange} 
              min="0" 
              step="0.01" 
              placeholder="e.g., 6000000" 
            />
          </div>

          {/* Termly amount preview */}
          {formData.amount && parseFloat(formData.amount) > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Annual Amount:</span>
                <span className="font-bold">SSP {formatCurrency(parseFloat(formData.amount))}</span>
              </div>
              <div className="flex justify-between mt-1 text-green-700">
                <span>Per Term (÷3):</span>
                <span className="font-bold">SSP {formatCurrency(getTermlyAmount(parseFloat(formData.amount)))}</span>
              </div>
              <div className="flex justify-between mt-1 text-gray-500">
                <span>Monthly (÷12):</span>
                <span>SSP {formatCurrency(Math.round(parseFloat(formData.amount) / 12))}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormSelect 
              label="Academic Year" 
              name="academic_year" 
              value={formData.academic_year} 
              onChange={handleChange}
              options={ACADEMIC_YEAR_OPTIONS} 
            />
            <FormSelect 
              label="Term (Optional)" 
              name="term" 
              value={formData.term} 
              onChange={handleChange}
              options={[
                { value: '', label: 'All Terms (Annual)' },
                { value: 'Term 1', label: 'Term 1 Only' },
                { value: 'Term 2', label: 'Term 2 Only' },
                { value: 'Term 3', label: 'Term 3 Only' },
              ]} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormSelect 
              label="Class Level (Optional)" 
              name="class_level" 
              value={formData.class_level} 
              onChange={handleChange}
              options={classOptions}
              disabled={loadingClasses}
            />
            {editingStructure && (
              <FormSelect 
                label="Status" 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]} 
              />
            )}
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={2} 
              className="form-input" 
              placeholder="Optional description..." 
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              name="is_mandatory" 
              checked={formData.is_mandatory} 
              onChange={handleChange} 
              className="w-4 h-4 text-primary-600 rounded" 
            />
            <span className="text-sm">Mandatory fee</span>
          </label>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" loading={saving} icon={<Save size={18} />}>
              {editingStructure ? 'Update Fee' : 'Create Fee'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Fee Structure"
        message={`Are you sure you want to delete "${deleteConfirm?.fee_name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

export default FeeStructures
