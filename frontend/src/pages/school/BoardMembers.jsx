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
import { Users, UserPlus, Edit, Trash2, Mail, Phone, Save } from 'lucide-react'
import toast from 'react-hot-toast'

function BoardMembers() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', position: 'member',
    phone_number: '', email: '', address: '', bio: '',
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
        setMembers(response.data?.members || response.data || [])
      } else {
        setMembers([])
      }
    } catch (error) {
      console.error('Failed to fetch board members:', error)
      toast.error('Failed to load board members')
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

  const handleRemove = async (id) => {
    if (!confirm('Are you sure you want to remove this board member?')) return
    
    try {
      const response = await schoolAPI.removeBoardMember(id)
      if (response?.success) {
        toast.success('Member removed')
        fetchMembers()
      } else {
        toast.error(response?.message || 'Failed to remove member')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to remove member')
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
        subtitle={`${members.length} members`}
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
            <Card key={member._id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-bold text-lg">
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {member.first_name} {member.last_name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Since {member.valid_from ? new Date(member.valid_from).getFullYear() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {getPositionBadge(member.position)}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={14} /> {member.phone_number}
                </div>
                {member.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={14} /> {member.email}
                  </div>
                )}
              </div>
              <div className="flex gap-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => openEditModal(member)}
                  className="btn btn-ghost btn-sm text-blue-600"
                  title="Edit member"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => handleRemove(member._id)}
                  className="btn btn-ghost btn-sm text-red-600"
                  title="Remove member"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingMember ? 'Edit Member' : 'Add Member'}
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
            />
            <FormInput
              label="Last Name *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={errors.last_name}
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
          />
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          <FormInput
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
          <div>
            <label className="form-label">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={2}
              className="form-input"
              placeholder="Brief biography..."
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
    </div>
  )
}

export default BoardMembers
