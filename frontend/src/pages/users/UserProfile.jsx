import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import api from '../../api/axios'
import authAPI from '../../api/auth'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { User, Mail, Phone, Shield, Key, Save, Camera, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

function UserProfile() {
  const { user, setUser } = useAuth()
  const { updatePageTitle, updateBreadcrumbs } = useApp()

  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
  })

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  })

  const [passwordErrors, setPasswordErrors] = useState({})

  useEffect(() => {
    updatePageTitle('My Profile')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'My Profile' },
    ])
  }, [updatePageTitle, updateBreadcrumbs])

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
      })
    }
  }, [user])

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      const response = await api.put('/auth/me', profileData)
      if (response.success) {
        const updatedUser = { ...user, ...profileData }
        setUser(updatedUser)
        localStorage.setItem('hns_user', JSON.stringify(updatedUser))
        toast.success('Profile updated successfully')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validatePasswordForm = () => {
    const newErrors = {}
    if (!passwordData.current_password) newErrors.current_password = 'Current password is required'
    if (!passwordData.new_password) {
      newErrors.new_password = 'New password is required'
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters'
    }
    if (passwordData.new_password !== passwordData.confirm_new_password) {
      newErrors.confirm_new_password = 'Passwords do not match'
    }
    setPasswordErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!validatePasswordForm()) return
    setPasswordLoading(true)
    try {
      const response = await api.post('/auth/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_new_password: passwordData.confirm_new_password,
      })
      if (response.success) {
        toast.success('Password changed successfully')
        setPasswordData({ current_password: '', new_password: '', confirm_new_password: '' })
      } else {
        toast.error(response.message || 'Failed to change password')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!user) return <LoadingSpinner />

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'password', label: 'Change Password', icon: Key },
  ]

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      accountant: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      counselor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      staff: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in-up">
      <PageHeader title="My Profile" />

      {/* Profile Header */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={user?.photo_url || "/logo.png"} 
              alt="Profile" 
              className="w-20 h-20 rounded-full object-cover border-2 border-primary-200 bg-primary-100"
              onError={(e) => { 
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 text-2xl font-bold" style={{ display: 'none' }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors">
              <Camera size={14} />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {user.first_name} {user.last_name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
              {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Mail size={16} /> {user.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Phone size={16} /> {user.phone_number || 'Not set'}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Shield size={16} /> {user.permissions?.length || 0} permissions
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock size={16} /> {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Form */}
      {activeTab === 'profile' && (
        <Card>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="First Name" name="first_name" value={profileData.first_name} onChange={handleProfileChange} />
              <FormInput label="Last Name" name="last_name" value={profileData.last_name} onChange={handleProfileChange} />
            </div>
            <FormInput label="Email Address" value={user.email} disabled helperText="Email cannot be changed" />
            <FormInput label="Phone Number" name="phone_number" value={profileData.phone_number} onChange={handleProfileChange} placeholder="+211 900 000 000" />
            <div className="pt-4">
              <Button type="submit" variant="primary" loading={profileLoading} icon={<Save size={18} />}>
                Update Profile
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Password Form */}
      {activeTab === 'password' && (
        <Card>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <FormInput label="Current Password" name="current_password" type="password" value={passwordData.current_password} onChange={handlePasswordChange} error={passwordErrors.current_password} placeholder="Enter current password" />
            <FormInput label="New Password" name="new_password" type="password" value={passwordData.new_password} onChange={handlePasswordChange} error={passwordErrors.new_password} placeholder="Enter new password" helperText="Min 8 characters with uppercase, lowercase, number & special character" />
            <FormInput label="Confirm New Password" name="confirm_new_password" type="password" value={passwordData.confirm_new_password} onChange={handlePasswordChange} error={passwordErrors.confirm_new_password} placeholder="Confirm new password" />
            <div className="pt-4">
              <Button type="submit" variant="primary" loading={passwordLoading} icon={<Key size={18} />}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

export default UserProfile
