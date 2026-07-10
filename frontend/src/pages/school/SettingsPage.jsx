import { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { Link } from 'react-router-dom'
import schoolAPI from '../../api/school'
import financialAPI from '../../api/financial'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import Modal from '../../components/common/Modal'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  Settings, Save, Bell, Shield,
  GraduationCap, Clock, RotateCcw, DollarSign, ExternalLink,
  AlertTriangle, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'

function getCurrentAcademicYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month === 1 ? year - 1 : year
  return `${startYear}/${startYear + 1}`
}

const currentYear = getCurrentAcademicYear()

const IMMUTABLE_FIELDS = ['_id', 'id', 'created_at', 'created_by', 'updated_at', 'updated_by']

function SettingsPage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const { theme, toggleTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('general')

  // Reset states
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetType, setResetType] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)

  const [settings, setSettings] = useState({
    school_name: 'Heavenly Nature Nursery & Primary School',
    language: 'en', timezone: 'Africa/Juba', date_format: 'DD/MM/YYYY',
    default_academic_year: currentYear, terms_per_year: '3', pass_mark_percentage: '50',
    max_students_per_class: '25', nursery_max_students: '20', primary_max_students: '25',
    min_enrollment_age: '3', chronic_absence_threshold: '75', attendance_warning_threshold: '85',
    consecutive_absence_warning: '3', consecutive_absence_critical: '5',
    email_enabled: true, notify_attendance: true, notify_payments: true, notify_events: true,
    session_timeout: '30', max_login_attempts: '5', password_expiry_days: '90',
  })

  useEffect(() => {
    updatePageTitle('System Settings')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' }, { label: 'School' }, { label: 'Settings' },
    ])
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await schoolAPI.getSettings()
      if (response?.success && response.data) {
        const serverData = { ...response.data }
        IMMUTABLE_FIELDS.forEach(field => delete serverData[field])
        setSettings(prev => ({ ...prev, ...serverData,
          default_academic_year: response.data.default_academic_year || response.data.current_academic_year || currentYear,
        }))
      }
    } catch (error) { console.error('Failed to fetch settings:', error) }
    finally { setLoading(false) }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const cleanForUpdate = (data) => {
    const cleaned = { ...data }
    IMMUTABLE_FIELDS.forEach(field => delete cleaned[field])
    return cleaned
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const cleanedSettings = cleanForUpdate(settings)
      const response = await schoolAPI.updateSetting(cleanedSettings)
      if (response?.success) {
        if (response.data) {
          const returnedData = { ...response.data }
          IMMUTABLE_FIELDS.forEach(field => delete returnedData[field])
          setSettings(prev => ({ ...prev, ...returnedData }))
        }
        toast.success('Settings saved successfully')
      } else { toast.error(response?.message || 'Failed to save settings') }
    } catch (error) {
      if (error.status === 0) toast.error('Server is starting up. Please try again in 30 seconds.')
      else toast.error(error.message || 'Failed to save settings')
    } finally { setSaving(false) }
  }

  const handleReload = () => {
    if (!confirm('Reset all settings to defaults?')) return
    fetchSettings()
    toast.success('Settings reloaded from server')
  }

  const openResetDialog = (type) => {
    setResetType(type)
    setResetConfirm('')
    setShowResetDialog(true)
  }

  // ✅ Fixed reset handler - uses response directly (interceptor unwraps)
  const handleResetData = async () => {
    const confirmPhrase = resetType === 'financial' 
      ? 'DELETE ALL FINANCIAL DATA' 
      : 'DELETE ALL ACADEMIC DATA'
    
    if (resetConfirm !== confirmPhrase) {
      toast.error(`Please type "${confirmPhrase}" exactly`)
      return
    }
    
    setResetting(true)
    try {
      let response
      if (resetType === 'financial') {
        response = await financialAPI.resetFinancialData({ confirmation: resetConfirm })
      } else {
        response = await schoolAPI.resetAcademicData({ confirmation: resetConfirm })
      }
      
      // ✅ Interceptor returns response.data directly
      // So response = { success: true, message: "...", data: {...} }
      if (response?.success === true) {
        const deleted = response.data?.total_deleted || 0
        toast.success(`✅ Reset complete! ${deleted} records deleted.`)
        setShowResetDialog(false)
        setResetConfirm('')
      } else {
        toast.error(response?.message || 'Reset failed')
      }
    } catch (error) {
      console.error('Reset error:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Reset failed'
      toast.error(errorMsg)
    } finally {
      setResetting(false)
    }
  }

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'reset', label: 'Data Reset', icon: Trash2 },
  ]

  const resetLabel = resetType === 'financial' ? 'DELETE ALL FINANCIAL DATA' : 'DELETE ALL ACADEMIC DATA'

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="System Settings"
        subtitle="Configure your school management system"
        actions={
          <div className="flex gap-2">
            <Button onClick={handleReload} variant="secondary" icon={<RotateCcw size={18} />}>Reload</Button>
            <Button onClick={handleSave} variant="primary" loading={saving} icon={<Save size={18} />}>Save Settings</Button>
          </div>
        }
      />

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0 hidden md:block">
          <div className="card p-2 space-y-1">
            {sections.map((section) => (
              <button key={section.id} onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                <section.icon size={18} />{section.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {activeSection === 'general' && (
            <Card title="General Settings" icon={<Settings size={20} />}>
              <div className="space-y-4">
                <FormInput label="School Name" name="school_name" value={settings.school_name} onChange={handleChange} />
                <div className="grid grid-cols-2 gap-4">
                  <FormSelect label="Language" name="language" value={settings.language} onChange={handleChange}
                    options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'Arabic' }]} />
                  <FormSelect label="Timezone" name="timezone" value={settings.timezone} onChange={handleChange}
                    options={[{ value: 'Africa/Juba', label: 'Africa/Juba (GMT+2)' }, { value: 'Africa/Nairobi', label: 'Africa/Nairobi (GMT+3)' }]} />
                </div>
                <FormSelect label="Date Format" name="date_format" value={settings.date_format} onChange={handleChange}
                  options={[{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }]} />
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div><p className="font-medium text-sm">Dark Mode</p><p className="text-xs text-gray-500">Toggle dark/light theme</p></div>
                  <button onClick={toggleTheme} className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'academic' && (
            <Card title="Academic Settings" icon={<GraduationCap size={20} />}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Default Academic Year" name="default_academic_year" value={settings.default_academic_year} onChange={handleChange} />
                  <FormInput label="Terms Per Year" name="terms_per_year" type="number" value={settings.terms_per_year} onChange={handleChange} min="1" max="4" />
                </div>
                <FormInput label="Pass Mark Percentage" name="pass_mark_percentage" type="number" value={settings.pass_mark_percentage} onChange={handleChange} min="0" max="100" />
                <div className="grid grid-cols-3 gap-4">
                  <FormInput label="Max Students/Class" name="max_students_per_class" type="number" value={settings.max_students_per_class} onChange={handleChange} min="1" />
                  <FormInput label="Nursery Max" name="nursery_max_students" type="number" value={settings.nursery_max_students} onChange={handleChange} min="1" />
                  <FormInput label="Primary Max" name="primary_max_students" type="number" value={settings.primary_max_students} onChange={handleChange} min="1" />
                </div>
                <FormInput label="Minimum Enrollment Age" name="min_enrollment_age" type="number" value={settings.min_enrollment_age} onChange={handleChange} min="2" max="10" />
              </div>
            </Card>
          )}

          {activeSection === 'financial' && (
            <div className="space-y-6">
              <Card title="Fee Management" icon={<DollarSign size={20} />}>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Manage school fees, tuition amounts, and other financial structures.</p>
                  <Link to="/financial/fees" className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 hover:bg-primary-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center"><DollarSign size={20} className="text-white" /></div>
                      <div><p className="font-medium text-primary-700 dark:text-primary-300">Fee Structures</p><p className="text-xs text-gray-500">Set annual tuition, exam fees, and other charges</p></div>
                    </div>
                    <ExternalLink size={18} className="text-primary-600" />
                  </Link>
                  <Link to="/financial/payments" className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center"><DollarSign size={20} className="text-white" /></div>
                      <div><p className="font-medium text-green-700 dark:text-green-300">Record Payments</p><p className="text-xs text-gray-500">Record student payments and print receipts</p></div>
                    </div>
                    <ExternalLink size={18} className="text-green-600" />
                  </Link>
                  <Link to="/financial" className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center"><DollarSign size={20} className="text-white" /></div>
                      <div><p className="font-medium text-blue-700 dark:text-blue-300">Financial Dashboard</p><p className="text-xs text-gray-500">View all transactions and financial overview</p></div>
                    </div>
                    <ExternalLink size={18} className="text-blue-600" />
                  </Link>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'attendance' && (
            <Card title="Attendance Settings" icon={<Clock size={20} />}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Chronic Absence Threshold (%)" name="chronic_absence_threshold" type="number" value={settings.chronic_absence_threshold} onChange={handleChange} min="0" max="100" />
                  <FormInput label="Warning Threshold (%)" name="attendance_warning_threshold" type="number" value={settings.attendance_warning_threshold} onChange={handleChange} min="0" max="100" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Consecutive Warning (days)" name="consecutive_absence_warning" type="number" value={settings.consecutive_absence_warning} onChange={handleChange} min="1" />
                  <FormInput label="Consecutive Critical (days)" name="consecutive_absence_critical" type="number" value={settings.consecutive_absence_critical} onChange={handleChange} min="1" />
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card title="Notification Settings" icon={<Bell size={20} />}>
              <div className="space-y-4">
                {[
                  { name: 'email_enabled', label: 'Enable Email Notifications', desc: 'Send notifications via email' },
                  { name: 'notify_attendance', label: 'Attendance Alerts', desc: 'Notify about low attendance' },
                  { name: 'notify_payments', label: 'Payment Alerts', desc: 'Notify about pending payments' },
                  { name: 'notify_events', label: 'Event Reminders', desc: 'Remind about upcoming events' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div><p className="font-medium text-sm">{item.label}</p><p className="text-xs text-gray-500">{item.desc}</p></div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" name={item.name} checked={settings[item.name]} onChange={handleChange} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card title="Security Settings" icon={<Shield size={20} />}>
              <div className="space-y-4">
                <FormInput label="Session Timeout (minutes)" name="session_timeout" type="number" value={settings.session_timeout} onChange={handleChange} min="5" max="480" />
                <FormInput label="Max Login Attempts" name="max_login_attempts" type="number" value={settings.max_login_attempts} onChange={handleChange} min="1" max="10" />
                <FormInput label="Password Expiry (days)" name="password_expiry_days" type="number" value={settings.password_expiry_days} onChange={handleChange} min="30" max="365" />
              </div>
            </Card>
          )}

          {/* DATA RESET SECTION */}
          {activeSection === 'reset' && (
            <div className="space-y-6">
              <Card title="⚠️ Data Reset" icon={<AlertTriangle size={20} className="text-red-600" />}>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      <strong>WARNING:</strong> These actions permanently delete ALL records. 
                      Always <strong>download all reports</strong> before resetting. 
                      This cannot be undone! User accounts are preserved.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={20} className="text-red-600" />
                        <h4 className="font-semibold">Financial Data Reset</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Deletes all transactions, payments, fee structures, and budgets.
                      </p>
                      <Button onClick={() => openResetDialog('financial')} variant="danger" size="sm" icon={<Trash2 size={14} />}>
                        Reset Financial Data
                      </Button>
                    </div>

                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap size={20} className="text-red-600" />
                        <h4 className="font-semibold">Academic Data Reset</h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Deletes all students, teachers, classes, exams, results, and attendance records.
                      </p>
                      <Button onClick={() => openResetDialog('academic')} variant="danger" size="sm" icon={<Trash2 size={14} />}>
                        Reset Academic Data
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      <strong>💡 Tip:</strong> Go to <Link to="/reports" className="underline">Reports</Link> to download all reports before resetting.
                      User accounts (admin, teachers, etc.) are NOT deleted.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal 
        open={showResetDialog} 
        onClose={() => setShowResetDialog(false)} 
        title={`⚠️ Reset ${resetType === 'financial' ? 'Financial' : 'Academic'} Data`} 
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
            <AlertTriangle size={24} className="text-red-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-700 dark:text-red-400">DANGER: This cannot be undone!</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                All {resetType === 'financial' ? 'financial' : 'academic'} records will be permanently deleted.
              </p>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-1">
              Type <code className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-red-700 font-mono text-xs">{resetLabel}</code> to confirm:
            </p>
            <input 
              type="text" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)}
              className="form-input w-full font-mono text-sm" placeholder="Type the confirmation phrase..."
            />
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={handleResetData} variant="danger" loading={resetting}
              disabled={resetConfirm !== resetLabel} icon={<RotateCcw size={18} />}>
              {resetting ? 'Resetting...' : `Reset ${resetType === 'financial' ? 'Financial' : 'Academic'} Data`}
            </Button>
            <Button variant="secondary" onClick={() => setShowResetDialog(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SettingsPage
