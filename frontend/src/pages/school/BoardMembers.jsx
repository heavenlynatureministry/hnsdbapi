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
import { Users, UserPlus, Edit, Trash2, Mail, Phone, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

function BoardMembers() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', position: 'member',
    phone_number: '', email: '', address: '', bio: '',
  })

  useEffect(() => {
    updatePageTitle('Board Members')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'School' }, { label: 'Board Members' }])
    fetchMembers()
  }, [])

  const fetchMembers = () => {
    setLoading(true)
    setTimeout(() => {
      setMembers([
        { _id: '1', first_name: 'Daniel', last_name: 'Johnson', position: 'chairperson', phone_number: '+211 978 901 234', email: 'daniel@example.com', status: 'active', valid_from: '2023-01-01' },
        { _id: '2', first_name: 'Rebecca', last_name: 'Williams', position: 'secretary', phone_number: '+211 989 012 345', email: 'rebecca@example.com', status: 'active', valid_from: '2023-01-01' },
        { _id: '3', first_name: 'Mark', last_name: 'Davis', position: 'treasurer', phone_number: '+211 990 123 456', email: 'mark@example.com', status: 'active', valid_from: '2023-01-01' },
        { _id: '4', first_name: 'Sarah', last_name: 'Brown', position: 'member', phone_number: '+211 991 234 567', email: 'sarah@example.com', status: 'active', valid_from: '2023-06-01' },
      ])
      setLoading(false)
    }, 500)
  }

  const openCreateModal = () => {
    setEditingMember(null)
    setFormData({ first_name: '', last_name: '', position: 'member', phone_number: '', email: '', address: '', bio: '' })
    setShowModal(true)
  }

  const openEditModal = (member) => {
    setEditingMember(member)
    setFormData({
      first_name: member.first_name, last_name: member.last_name,
      position: member.position, phone_number: member.phone_number,
      email: member.email || '', address: member.address || '', bio: member.bio || '',
    })
    setShowModal(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      toast.success(editingMember ? 'Member updated!' : 'Member added!')
      setShowModal(false)
      fetchMembers()
    } catch (error) {
      toast.error('Failed to save member')
    } finally { setSaving(false) }
  }

  const handleRemove = async (id) => {
    try {
      await schoolAPI.removeBoardMember(id)
      toast.success('Member removed')
      fetchMembers()
    } catch (error) { toast.error('Failed to remove member') }
  }

  const getPositionBadge = (position) => {
    const variants = { chairperson: 'danger', vice_chairperson: 'warning', secretary: 'info', treasurer: 'success', member: 'gray', advisor: 'purple' }
    return <Badge variant={variants[position] || 'gray'}>{position?.replace('_', ' ')}</Badge>
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Board of Directors"
        subtitle={`${members.length} members`}
        actions={
          <Button onClick={openCreateModal} variant="primary" icon={<UserPlus size={18} />}>Add Member</Button>
        }
      />

      {members.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="No board members" description="Add your first board member." action={<Button onClick={openCreateModal} variant="primary">Add Member</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Card key={member._id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-bold text-lg">
                  {member.first_name?.[0]}{member.last_name?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{member.first_name} {member.last_name}</h3>
                  <p className="text-xs text-gray-500">Since {new Date(member.valid_from).getFullYear()}</p>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {getPositionBadge(member.position)}
                <div className="flex items-center gap-2 text-sm text-gray-500"><Phone size={14} /> {member.phone_number}</div>
                {member.email && <div className="flex items-center gap-2 text-sm text-gray-500"><Mail size={14} /> {member.email}</div>}
              </div>
              <div className="flex gap-1 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => openEditModal(member)} className="btn btn-ghost btn-sm text-blue-600"><Edit size={14} /> Edit</button>
                <button onClick={() => handleRemove(member._id)} className="btn btn-ghost btn-sm text-red-600"><Trash2 size={14} /> Remove</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingMember ? 'Edit Member' : 'Add Member'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="First Name *" name="first_name" value={formData.first_name} onChange={handleChange} required />
            <FormInput label="Last Name *" name="last_name" value={formData.last_name} onChange={handleChange} required />
          </div>
          <FormSelect label="Position *" name="position" value={formData.position} onChange={handleChange} required
            options={[
              { value: 'chairperson', label: 'Chairperson' }, { value: 'vice_chairperson', label: 'Vice Chairperson' },
              { value: 'secretary', label: 'Secretary' }, { value: 'treasurer', label: 'Treasurer' },
              { value: 'member', label: 'Member' }, { value: 'advisor', label: 'Advisor' }, { value: 'patron', label: 'Patron' },
            ]} />
          <FormInput label="Phone *" name="phone_number" value={formData.phone_number} onChange={handleChange} required />
          <FormInput label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
          <FormInput label="Address" name="address" value={formData.address} onChange={handleChange} />
          <div>
            <label className="form-label">Bio</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} rows={2} className="form-input" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" loading={saving} icon={<Save size={18} />}>
              {editingMember ? 'Update' : 'Add'} Member
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

import { Save } from 'lucide-react'

export default BoardMembers