import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import schoolAPI from '../../api/school'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { Save, Mail, Phone, MapPin, Globe, Camera } from 'lucide-react'
import toast from 'react-hot-toast'

function SchoolInfo() {
  const { schoolInfo, fetchSchoolInfo, updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    updatePageTitle('School Information')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'School', path: '/school/info' },
      { label: 'Information' },
    ])
  }, [updatePageTitle, updateBreadcrumbs])

  useEffect(() => {
    if (schoolInfo) {
      setFormData({
        school_name: schoolInfo.school_name || '',
        motto: schoolInfo.motto || '',
        logo_url: schoolInfo.logo_url || '/logo.png',
        vision: schoolInfo.vision || '',
        mission: schoolInfo.mission || '',
        contact_email: schoolInfo.contact_email || '',
        contact_phone: schoolInfo.contact_phone || '',
        alternate_phone: schoolInfo.alternate_phone || '',
        website: schoolInfo.website || '',
        postal_address: schoolInfo.postal_address || '',
        street: schoolInfo.address?.street || '',
        city: schoolInfo.address?.city || 'Juba',
        state: schoolInfo.address?.state || 'Central Equatoria',
        country: schoolInfo.address?.country || 'South Sudan',
        founded_year: schoolInfo.founded_year || '',
        registration_number: schoolInfo.registration_number || '',
        accreditation_status: schoolInfo.accreditation_status || '',
        school_type: schoolInfo.school_type || 'combined',
        facebook: schoolInfo.social_media?.facebook || '',
        twitter: schoolInfo.social_media?.twitter || '',
        instagram: schoolInfo.social_media?.instagram || '',
      })
    }
  }, [schoolInfo])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleLogoUpload = () => {
    // Placeholder for future file upload implementation
    toast.success('Logo upload will be available in a future update')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await schoolAPI.updateInfo(formData)
      if (response.success) {
        toast.success('School information updated successfully')
        await fetchSchoolInfo()
        setEditMode(false)
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="School Information"
        subtitle="Manage your school's profile and contact details"
        actions={
          !editMode && (
            <Button onClick={() => setEditMode(true)} variant="primary">
              Edit Information
            </Button>
          )
        }
      />

      {/* School Banner */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <img 
              src={formData.logo_url || "/logo.png"} 
              alt="School Logo" 
              className="w-24 h-24 rounded-2xl object-cover shadow-lg bg-primary-100"
              onError={(e) => { 
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className="w-24 h-24 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg" style={{ display: 'none' }}>
              {(formData.school_name || 'H').charAt(0)}
            </div>
            {editMode && (
              <button 
                onClick={handleLogoUpload}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Upload logo"
              >
                <Camera size={14} />
              </button>
            )}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formData.school_name || 'Heavenly Nature Nursery & Primary School'}
            </h2>
            <p className="text-primary-600 dark:text-primary-400 font-medium mt-1">
              {formData.motto || 'Nurturing Right Leaders'}
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card title="Basic Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormInput label="School Name" name="school_name" value={formData.school_name} onChange={handleChange} disabled={!editMode} error={errors.school_name} />
            </div>
            <FormInput label="Motto" name="motto" value={formData.motto} onChange={handleChange} disabled={!editMode} />
            <FormInput label="Founded Year" name="founded_year" type="number" value={formData.founded_year} onChange={handleChange} disabled={!editMode} />
            <FormInput label="Registration Number" name="registration_number" value={formData.registration_number} onChange={handleChange} disabled={!editMode} />
            <FormInput label="Accreditation Status" name="accreditation_status" value={formData.accreditation_status} onChange={handleChange} disabled={!editMode} />
            <FormInput label="School Type" name="school_type" value={formData.school_type} onChange={handleChange} disabled={!editMode} />
            {editMode && (
              <div className="sm:col-span-2">
                <FormInput label="Logo URL" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="/logo.png" helperText="Path to school logo image" />
              </div>
            )}
          </div>
        </Card>

        {/* Vision & Mission */}
        <Card title="Vision & Mission">
          <div className="space-y-4">
            <div>
              <label className="form-label">Vision Statement</label>
              <textarea name="vision" value={formData.vision} onChange={handleChange} disabled={!editMode} rows={3} className="form-input" placeholder="Our vision..." />
            </div>
            <div>
              <label className="form-label">Mission Statement</label>
              <textarea name="mission" value={formData.mission} onChange={handleChange} disabled={!editMode} rows={3} className="form-input" placeholder="Our mission..." />
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card title="Contact Information" icon={<Phone size={20} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Primary Email" name="contact_email" type="email" value={formData.contact_email} onChange={handleChange} disabled={!editMode} />
            <FormInput label="Primary Phone" name="contact_phone" value={formData.contact_phone} onChange={handleChange} disabled={!editMode} />
            <FormInput label="Alternate Phone" name="alternate_phone" value={formData.alternate_phone} onChange={handleChange} disabled={!editMode} />
            <FormInput label="Website" name="website" value={formData.website} onChange={handleChange} disabled={!editMode} placeholder="https://" />
            <div className="sm:col-span-2">
              <FormInput label="Postal Address" name="postal_address" value={formData.postal_address} onChange={handleChange} disabled={!editMode} />
            </div>
          </div>
        </Card>

        {/* Physical Address */}
        <Card title="Physical Address" icon={<MapPin size={20} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormInput label="Street" name="street" value={formData.street} onChange={handleChange} disabled={!editMode} />
            </div>
            <FormInput label="City" name="city" value={formData.city} onChange={handleChange} disabled={!editMode} />
            <FormInput label="State" name="state" value={formData.state} onChange={handleChange} disabled={!editMode} />
            <FormInput label="Country" name="country" value={formData.country} onChange={handleChange} disabled={!editMode} />
          </div>
        </Card>

        {/* Social Media */}
        <Card title="Social Media Links">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Facebook" name="facebook" value={formData.facebook} onChange={handleChange} disabled={!editMode} placeholder="Facebook URL" />
            <FormInput label="Twitter/X" name="twitter" value={formData.twitter} onChange={handleChange} disabled={!editMode} placeholder="Twitter URL" />
            <FormInput label="Instagram" name="instagram" value={formData.instagram} onChange={handleChange} disabled={!editMode} placeholder="Instagram URL" />
          </div>
        </Card>

        {/* Save Button */}
        {editMode && (
          <div className="flex gap-3">
            <Button type="submit" variant="primary" loading={loading} icon={<Save size={18} />}>
              Save Changes
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}

export default SchoolInfo
