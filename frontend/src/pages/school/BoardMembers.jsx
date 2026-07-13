import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import schoolAPI from '../../api/school'
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
import { Users, UserPlus, Edit, Trash2, Mail, Phone, Save, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

function BoardMembers() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', position: 'member',
    phone_number: '', email: '', address: '', bio: '',
    valid_from: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    updatePageTitle('Board Members')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'School' },
      { label: 'Board Members' },
    ])
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const response = await schoolAPI.getBoardMembers()
      if (response?.success) {
        const memberList = response.data?.members || response.data || []
        setMembers(Array.isArray(memberList) ? memberList : [])
      } else {
        setMembers([])
      }
    } catch (error) {
      console.error('Failed to fetch board members:', error)
      // Don't show error toast if it's just a 404 (endpoint not implemented yet)
      if (error.status !== 404) {
        toast.error('Failed to load board members')
      }
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingMember(null)
    setErrors({})
    setFormData({
      first_name: '', last_name: '', position: 'member',
      phone_number: '', email: '', address: '', bio: '',
      valid_from: new Date().toISOString().split('T')[0],
    })
    setShowModal(true)
  }

  const openEditModal = (member) => {
    setEditingMember(member)
    setErrors({})
    setFormData({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      position: member.position || 'member',
      phone_number: member.phone_number || '',
      email: member.email || '',
      address: member.address || '',
      bio: member.bio || '',
      valid_from: member.valid_from 
        ? new Date(member.valid_from).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
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
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.phone_number.trim()) newErrors.phone_number = 'Phone number is required'
    if (!formData.position) newErrors.position = 'Position is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    try {
      let response
      if (editingMember) {
        response = await schoolAPI.updateBoardMember(editingMember._id, formData)
      } else {
        response = await schoolAPI.addBoardMember(formData)
      }

      if (response?.success) {
        toast.success(editingMember ? 'Member updated!' : 'Member added!')
        setShowModal(false)
        fetchMembers()
      } else {
        toast.error(response?.message || 'Failed to save member')
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
      } else if (error.status === 404) {
        toast.error('Board members feature not available yet. Please try again later.')
      } else if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to save member')
      }
      console.error('Board member save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!deleteConfirm) return
    
    try {
      const response = await schoolAPI.removeBoardMember(deleteConfirm._id)
      if (response?.success) {
        toast.success('Member removed')
        setDeleteConfirm(null)
        fetchMembers()
      } else {
        toast.error(response?.message || 'Failed to remove member')
      }
    } catch (error) {
      if (error.status === 404) {
        toast.error('Board members feature not available yet.')
      } else {
        toast.error(error.message || 'Failed to remove member')
      }
    }
  }

  const getPositionBadge = (position) => {
    const variants = {
      chairperson: 'danger', vice_chairperson: 'warning',
      secretary: 'info', treasurer: 'success',
      member: 'gray', advisor: 'info', patron: 'info',
    }
    return <Badge variant={variants[position] || 'gray'}>{position?.replace(/_/g, ' ')}</Badge>
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Board of Directors"
        subtitle={`${members.length} member${members.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={openCreateModal} variant="primary" icon={<UserPlus size={18} />}>
            Add Member
          </Button>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No board members"
          description="Add your first board member."
          action={
            <Button onClick={openCreateModal} variant="primary">
              Add Member
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Card key={member._id || member.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-bold text-lg">
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {member.first_name} {member.last_name}
                  </h3>
                  {member.valid_from && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={12} />
                      Since {new Date(member.valid_from).getFullYear()}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div>{getPositionBadge(member.position)}</div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={14} /> {member.phone_number || 'N/A'}
                </div>
                {member.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={14} /> {member.email}
                  </div>
                )}
                {member.address && (
                  <p className="text-xs text-gray-400 mt-1">{member.address}</p>
                )}
              </div>
              <div className="flex gap-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => openEditModal(member)}
                  className="btn btn-ghost btn-sm text-blue-600 flex-1 justify-center"
                  title="Edit member"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(member)}
                  className="btn btn-ghost btn-sm text-red-600 flex-1 justify-center"
                  title="Remove member"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingMember ? 'Edit Board Member' : 'Add Board Member'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="First Name *"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={errors.first_name}
              placeholder="e.g., John"
            />
            <FormInput
              label="Last Name *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={errors.last_name}
              placeholder="e.g., Doe"
            />
          </div>
          <FormSelect
            label="Position *"
            name="position"
            value={formData.position}
            onChange={handleChange}
            error={errors.position}
            options={[
              { value: 'chairperson', label: 'Chairperson' },
              { value: 'vice_chairperson', label: 'Vice Chairperson' },
              { value: 'secretary', label: 'Secretary' },
              { value: 'treasurer', label: 'Treasurer' },
              { value: 'member', label: 'Member' },
              { value: 'advisor', label: 'Advisor' },
              { value: 'patron', label: 'Patron' },
            ]}
          />
          <FormInput
            label="Phone *"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            error={errors.phone_number}
            placeholder="e.g., +211 900 000 000"
          />
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g., john@example.com"
          />
          <FormInput
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Physical address"
          />
          <FormInput
            label="Valid From"
            name="valid_from"
            type="date"
            value={formData.valid_from}
            onChange={handleChange}
          />
          <div>
            <label className="form-label">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              className="form-input"
              placeholder="Brief biography or notes about this board member..."
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="submit" variant="primary" loading={saving} icon={<Save size={18} />}>
              {editingMember ? 'Update' : 'Add'} Member
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleRemove}
        title="Remove Board Member"
        message={`Are you sure you want to remove ${deleteConfirm?.first_name} ${deleteConfirm?.last_name} from the board?`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  )
}

export default BoardMembers
