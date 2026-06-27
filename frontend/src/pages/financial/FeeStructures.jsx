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
import { DollarSign, Plus, Edit, Trash2, Save } from 'lucide-react'
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

const STUDENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Students' },
  { value: 'street', label: 'Street Child' },
  { value: 'abundant', label: 'Abundant Family' },
  { value: 'orphan', label: 'Orphan' },
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

  const [formData, setFormData] = useState({
    fee_name: '',
    fee_type: 'tuition',
    amount: '',
    class_level: '',
    academic_year: currentYear,
    term: '',
    description: '',
    is_mandatory: true,
    student_type: 'all',
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
  }, [])

  const fetchStructures = async () => {
    setLoading(true)
    try {
      const response = await financialAPI.getFeeStructure()
      if (response?.success) {
        setStructures(response.data?.fees || response.data || [])
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
      academic_year: currentYear,
      term: '',
      description: '',
      is_mandatory: true,
      student_type: 'all',
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
      academic_year: structure.academic_year || currentYear,
      term: structure.term || '',
      description: structure.description || '',
      is_mandatory: structure.is_mandatory !== false,
      student_type: structure.student_type || 'all',
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
        fee_name: formData.fee_name,
        fee_type: formData.fee_type,
        amount: parseFloat(formData.amount),
        class_level: formData.class_level || undefined,
        academic_year: formData.academic_year,
        term: formData.term || undefined,
        description: formData.description || undefined,
        is_mandatory: formData.is_mandatory,
        student_type: formData.student_type,
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
        toast.error(response?.message || 'Failed to save')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return
    try {
      const response = await financialAPI.deleteFeeStructure(id)
      if (response?.success) {
        toast.success('Fee structure deleted')
        fetchStructures()
      } else {
        toast.error(response?.message || 'Failed to delete')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Fee Structures"
        subtitle={`${structures.length} structures • ${currentYear}`}
        actions={<Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>Create Fee</Button>}
      />

      {structures.length === 0 ? (
        <EmptyState icon={<DollarSign size={48} />} title="No fee structures" description="Create your first fee structure for the current academic year." action={<Button onClick={openCreateModal} variant="primary">Create Fee</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {structures.map((structure) => (
            <Card key={structure._id}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{structure.fee_name}</h3>
                <Badge variant={structure.status === 'active' ? 'success' : 'gray'}>{structure.status || 'active'}</Badge>
              </div>
              <div className="space-y-2 text-sm mb-3">
                <p><span className="text-gray-500">Type:</span> {structure.fee_type?.replace(/_/g, ' ') || 'N/A'}</p>
                <p><span className="text-gray-500">Class Level:</span> {structure.class_level || 'All'}</p>
                <p><span className="text-gray-500">Year:</span> {structure.academic_year || currentYear}</p>
                <p><span className="text-gray-500">Term:</span> {structure.term || 'All'}</p>
                <p className="text-2xl font-bold text-primary-600">SSP {(structure.amount || 0).toLocaleString()}</p>
                {structure.description && <p className="text-xs text-gray-400">{structure.description}</p>}
              </div>
              <div className="flex gap-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => openEditModal(structure)} className="btn btn-ghost btn-sm text-blue-600"><Edit size={14} /> Edit</button>
                <button onClick={() => handleDelete(structure._id)} className="btn btn-ghost btn-sm text-red-600"><Trash2 size={14} /> Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingStructure ? 'Edit Fee' : 'Create Fee'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput 
            label="Fee Name *" 
            name="fee_name" 
            value={formData.fee_name} 
            onChange={handleChange} 
            required 
            placeholder="e.g., Nursery Tuition Fee" 
          />

          <div className="grid grid-cols-2 gap-4">
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
            <FormInput 
              label="Amount (SSP) *" 
              name="amount" 
              type="number" 
              value={formData.amount} 
              onChange={handleChange} 
              required 
              min="0" 
              step="0.01" 
              placeholder="0.00" 
            />
          </div>

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
              options={[
                { value: '', label: 'All Terms' },
                { value: 'Term 1', label: 'Term 1' },
                { value: 'Term 2', label: 'Term 2' },
                { value: 'Term 3', label: 'Term 3' },
              ]} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormSelect 
              label="Class Level" 
              name="class_level" 
              value={formData.class_level} 
              onChange={handleChange}
              options={classOptions}
              disabled={loadingClasses}
            />
            <FormSelect 
              label="Student Type" 
              name="student_type" 
              value={formData.student_type} 
              onChange={handleChange}
              options={STUDENT_TYPE_OPTIONS} 
            />
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={2} 
              className="form-input" 
              placeholder="Fee description..." 
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
              {editingStructure ? 'Update' : 'Create'} Fee
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default FeeStructures
