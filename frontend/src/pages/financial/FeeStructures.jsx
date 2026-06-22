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
import { DollarSign, Plus, Edit, Trash2, Save } from 'lucide-react'
import toast from 'react-hot-toast'

function FeeStructures() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [structures, setStructures] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingStructure, setEditingStructure] = useState(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '', academic_year: '2024/2025', class_id: '', student_type: 'all',
    currency: 'SSP', due_date: '', late_fee: '0',
    fee_items: [{ name: 'Tuition', amount: '', description: '', is_optional: false }],
  })

  useEffect(() => {
    updatePageTitle('Fee Structures')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Financial', path: '/financial' },
      { label: 'Fees' },
    ])
    fetchStructures()
  }, [])

  const fetchStructures = async () => {
    setLoading(true)
    try {
      const response = await financialAPI.getFeeStructures()
      if (response?.success) {
        setStructures(response.data?.structures || response.data || [])
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

  const openCreateModal = () => {
    setEditingStructure(null)
    setFormData({ name: '', academic_year: '2024/2025', class_id: '', student_type: 'all', currency: 'SSP', due_date: '', late_fee: '0', fee_items: [{ name: 'Tuition', amount: '', description: '', is_optional: false }] })
    setShowModal(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFeeItemChange = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.fee_items]
      items[index] = { ...items[index], [field]: value }
      return { ...prev, fee_items: items }
    })
  }

  const addFeeItem = () => {
    setFormData(prev => ({ ...prev, fee_items: [...prev.fee_items, { name: '', amount: '', description: '', is_optional: false }] }))
  }

  const removeFeeItem = (index) => {
    if (formData.fee_items.length <= 1) return
    setFormData(prev => ({ ...prev, fee_items: prev.fee_items.filter((_, i) => i !== index) }))
  }

  const totalAmount = formData.fee_items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...formData, total_amount: totalAmount }
      
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

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Fee Structures"
        subtitle={`${structures.length} structures`}
        actions={<Button onClick={openCreateModal} variant="primary" icon={<Plus size={18} />}>Create Structure</Button>}
      />

      {structures.length === 0 ? (
        <EmptyState icon={<DollarSign size={48} />} title="No fee structures" description="Create your first fee structure." action={<Button onClick={openCreateModal} variant="primary">Create Structure</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {structures.map((structure) => (
            <Card key={structure._id}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{structure.name}</h3>
                <Badge variant={structure.status === 'active' ? 'success' : 'gray'}>{structure.status}</Badge>
              </div>
              <div className="space-y-2 text-sm mb-3">
                <p><span className="text-gray-500">Class:</span> {structure.class_name}</p>
                <p><span className="text-gray-500">Year:</span> {structure.academic_year}</p>
                <p className="text-2xl font-bold text-primary-600">SSP {(structure.total_amount || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-1 mb-3">
                {(structure.fee_items || []).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-500">
                    <span>{item.name}</span>
                    <span>SSP {(item.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button onClick={openCreateModal} className="btn btn-ghost btn-sm text-blue-600"><Edit size={14} /> Edit</button>
                <button className="btn btn-ghost btn-sm text-red-600"><Trash2 size={14} /> Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingStructure ? 'Edit Fee Structure' : 'Create Fee Structure'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Structure Name *" name="name" value={formData.name} onChange={handleChange} required />
          <div className="grid grid-cols-3 gap-4">
            <FormSelect label="Academic Year" name="academic_year" value={formData.academic_year} onChange={handleChange}
              options={[{ value: '2024/2025', label: '2024/2025' }]} />
            <FormSelect label="Class" name="class_id" value={formData.class_id} onChange={handleChange}
              options={[{ value: 'all', label: 'All Classes' }, { value: 'nursery', label: 'Nursery' }, { value: 'primary', label: 'Primary' }]} />
            <FormSelect label="Student Type" name="student_type" value={formData.student_type} onChange={handleChange}
              options={[{ value: 'all', label: 'All' }, { value: 'street', label: 'Street' }, { value: 'abundant', label: 'Abundant' }, { value: 'orphan', label: 'Orphan' }]} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Fee Items</label>
              <button type="button" onClick={addFeeItem} className="text-sm text-primary-600">+ Add Item</button>
            </div>
            <div className="space-y-3">
              {formData.fee_items.map((item, index) => (
                <div key={index} className="flex items-end gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <input type="text" value={item.name} onChange={(e) => handleFeeItemChange(index, 'name', e.target.value)} className="form-input text-sm" placeholder="Item name" />
                  </div>
                  <div className="w-32">
                    <input type="number" value={item.amount} onChange={(e) => handleFeeItemChange(index, 'amount', e.target.value)} className="form-input text-sm" placeholder="Amount" />
                  </div>
                  {formData.fee_items.length > 1 && (
                    <button type="button" onClick={() => removeFeeItem(index)} className="text-red-500 hover:text-red-700 p-2">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-primary-600 mt-2 font-medium">Total: SSP {totalAmount.toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Due Date" name="due_date" type="date" value={formData.due_date} onChange={handleChange} />
            <FormInput label="Late Fee (SSP)" name="late_fee" type="number" value={formData.late_fee} onChange={handleChange} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" loading={saving} icon={<Save size={18} />}>
              {editingStructure ? 'Update' : 'Create'} Structure
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default FeeStructures
