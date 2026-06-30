import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { 
  School, Plus, Users, GraduationCap, 
  MoreVertical, Eye, Edit, Calendar, DoorOpen, 
  Trash2, Archive, RotateCcw, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

function ClassesList() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active') // 'active', 'inactive', 'all'
  const [openDropdown, setOpenDropdown] = useState(null)

  // Delete confirmation
  const [deleteClass, setDeleteClass] = useState(null)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)

  useEffect(() => {
    updatePageTitle('Classes Management')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Classes' }])
    fetchClasses()
  }, [statusFilter]) // Refetch when status filter changes

  const fetchClasses = async () => {
    setLoading(true)
    try {
      // Pass status parameter to get active, inactive, or all classes
      const params = {}
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      const response = await classesAPI.getAll(params)
      console.log('Classes response:', response)
      
      let classList = []
      
      // Backend returns: { success: true, data: [ ... ] } (array directly)
      if (Array.isArray(response?.data)) {
        classList = response.data
      } else if (response?.data?.classes && Array.isArray(response.data.classes)) {
        classList = response.data.classes
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        classList = response.data.data
      } else if (Array.isArray(response)) {
        classList = response
      }
      
      console.log('Classes loaded:', classList.length)
      setClasses(Array.isArray(classList) ? classList : [])
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      toast.error('Failed to load classes')
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  // Archive (soft delete) handler
  const handleArchive = async () => {
    if (!deleteClass) return
    try {
      await classesAPI.archive(deleteClass._id || deleteClass.id)
      toast.success(`Class "${deleteClass.class_name}" archived successfully`)
      setShowArchiveDialog(false)
      setDeleteClass(null)
      fetchClasses()
    } catch (error) {
      console.error('Archive error:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to archive class'
      toast.error(errorMsg)
    }
  }

  // Permanent delete handler
  const handlePermanentDelete = async () => {
    if (!deleteClass) return
    try {
      const response = await classesAPI.permanentDelete(deleteClass._id || deleteClass.id)
      toast.success(`Class "${deleteClass.class_name}" permanently deleted`)
      
      // Log the response details
      console.log('Permanent delete response:', response.data)
      
      setShowPermanentDeleteDialog(false)
      setDeleteClass(null)
      fetchClasses()
    } catch (error) {
      console.error('Permanent delete error:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to permanently delete class'
      toast.error(errorMsg)
    }
  }

  // Reactivate handler
  const handleReactivate = async () => {
    if (!deleteClass) return
    try {
      await classesAPI.reactivate(deleteClass._id || deleteClass.id)
      toast.success(`Class "${deleteClass.class_name}" reactivated successfully`)
      setShowReactivateDialog(false)
      setDeleteClass(null)
      fetchClasses()
    } catch (error) {
      console.error('Reactivate error:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to reactivate class'
      toast.error(errorMsg)
    }
  }

  const safeClasses = Array.isArray(classes) ? classes : []
  const filteredClasses = levelFilter
    ? safeClasses.filter(c => c?.class_level === levelFilter)
    : safeClasses

  // Calculate stats only for active classes
  const activeClasses = safeClasses.filter(c => c?.status === 'active' || !c?.status)
  const totalStudents = activeClasses.reduce((s, c) => s + (c?.current_enrollment || 0), 0)
  const totalCapacity = activeClasses.reduce((s, c) => s + (c?.max_capacity || 0), 0)
  const occupancyRate = totalCapacity > 0 ? ((totalStudents / totalCapacity) * 100).toFixed(1) : 0

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Classes Management"
        subtitle={`${activeClasses.length} active classes • ${totalStudents} students enrolled`}
        actions={
          <div className="flex gap-2">
            <Link to="/classes/new" className="btn btn-primary">
              <Plus size={18} /> Add Class
            </Link>
          </div>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Classes', value: activeClasses.length, icon: School, color: 'bg-blue-100 text-blue-600' },
          { label: 'Total Students', value: totalStudents, icon: Users, color: 'bg-green-100 text-green-600' },
          { label: 'Total Capacity', value: totalCapacity, icon: DoorOpen, color: 'bg-purple-100 text-purple-600' },
          { label: 'Occupancy Rate', value: `${occupancyRate}%`, icon: GraduationCap, color: 'bg-orange-100 text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status Filter */}
        <div className="flex gap-2 mr-4">
          {[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Archived' },
            { value: 'all', label: 'All' },
          ].map((status) => (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status.value
                  ? status.value === 'inactive' 
                    ? 'bg-gray-600 text-white'
                    : status.value === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* Level Filter */}
        {['', 'nursery', 'primary'].map((level) => (
          <button
            key={level}
            onClick={() => setLevelFilter(level)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              levelFilter === level
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {level || 'All Levels'}{' '}
            {level && `(${safeClasses.filter(c => c?.class_level === level).length})`}
          </button>
        ))}
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          icon={<School size={48} />}
          title={statusFilter === 'inactive' ? "No archived classes" : "No classes found"}
          description={
            statusFilter === 'inactive' 
              ? "There are no archived classes." 
              : "No classes match your filter."
          }
          action={
            <Link to="/classes/new" className="btn btn-primary">Add Class</Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const occRate = (cls?.max_capacity || 0) > 0
              ? (((cls?.current_enrollment || 0) / (cls?.max_capacity || 1)) * 100).toFixed(0)
              : 0
            const isInactive = cls?.status === 'inactive'
            
            return (
              <Card 
                key={cls?._id || cls?.id || Math.random()} 
                className={`hover:shadow-md transition-shadow ${isInactive ? 'opacity-75 border-dashed' : ''}`}
              >
                {/* Status badge for inactive classes */}
                {isInactive && (
                  <div className="mb-2">
                    <Badge variant="default" className="bg-gray-200 text-gray-600">
                      <Archive size={12} className="mr-1" /> Archived
                    </Badge>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      isInactive 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        : 'bg-primary-100 dark:bg-primary-900 text-primary-600'
                    }`}>
                      {cls?.class_name || '?'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {cls?.class_name || 'N/A'}
                      </h3>
                      <Badge variant={cls?.class_level === 'nursery' ? 'info' : 'warning'}>
                        {cls?.class_level || 'unknown'}
                      </Badge>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === (cls?._id || cls?.id) ? null : (cls?._id || cls?.id))}
                      className="btn btn-ghost btn-sm btn-icon"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openDropdown === (cls?._id || cls?.id) && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-20 py-1">
                          <Link 
                            to={`/classes/${cls?._id || cls?.id}`} 
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <Eye size={14} /> View Details
                          </Link>
                          
                          {!isInactive && (
                            <>
                              <Link 
                                to={`/classes/${cls?._id || cls?.id}/edit`} 
                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setOpenDropdown(null)}
                              >
                                <Edit size={14} /> Edit
                              </Link>
                              <Link 
                                to={`/classes/${cls?._id || cls?.id}/schedule`} 
                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setOpenDropdown(null)}
                              >
                                <Calendar size={14} /> Schedule
                              </Link>
                              <div className="border-t my-1" />
                            </>
                          )}
                          
                          {isInactive ? (
                            <>
                              <button
                                onClick={() => {
                                  setDeleteClass(cls)
                                  setShowReactivateDialog(true)
                                  setOpenDropdown(null)
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 w-full text-left"
                              >
                                <RotateCcw size={14} /> Reactivate
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteClass(cls)
                                  setShowPermanentDeleteDialog(true)
                                  setOpenDropdown(null)
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                              >
                                <Trash2 size={14} /> Delete Permanently
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setDeleteClass(cls)
                                setShowArchiveDialog(true)
                                setOpenDropdown(null)
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 w-full text-left"
                            >
                              <Archive size={14} /> Archive
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {!isInactive && (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Users size={14} /> {cls?.current_enrollment || 0} / {cls?.max_capacity || 0} students
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <GraduationCap size={14} /> {cls?.teacher_name || 'No teacher assigned'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <DoorOpen size={14} /> {cls?.classroom_number || 'No room'}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Occupancy</span>
                        <span className="font-medium">{occRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            occRate >= 90 ? 'bg-red-500' : occRate >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(occRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Archive (Soft Delete) Confirmation Dialog */}
      <ConfirmDialog
        open={showArchiveDialog}
        onClose={() => {
          setShowArchiveDialog(false)
          setDeleteClass(null)
        }}
        onConfirm={handleArchive}
        title="Archive Class"
        message={
          <div>
            <p className="mb-2">
              Are you sure you want to archive <strong>"{deleteClass?.class_name}"</strong>?
            </p>
            <p className="text-sm text-gray-500">
              This will mark the class as inactive but preserve all data. 
              You can reactivate it later if needed.
            </p>
          </div>
        }
        confirmText="Archive Class"
        variant="warning"
      />

      {/* Reactivate Confirmation Dialog */}
      <ConfirmDialog
        open={showReactivateDialog}
        onClose={() => {
          setShowReactivateDialog(false)
          setDeleteClass(null)
        }}
        onConfirm={handleReactivate}
        title="Reactivate Class"
        message={
          <div>
            <p className="mb-2">
              Do you want to reactivate <strong>"{deleteClass?.class_name}"</strong>?
            </p>
            <p className="text-sm text-gray-500">
              This will restore the class to active status.
            </p>
          </div>
        }
        confirmText="Reactivate Class"
        variant="success"
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showPermanentDeleteDialog}
        onClose={() => {
          setShowPermanentDeleteDialog(false)
          setDeleteClass(null)
        }}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete Class"
        message={
          <div>
            <div className="flex items-center gap-2 mb-2 text-red-600">
              <AlertTriangle size={18} />
              <strong>Warning: This action cannot be undone!</strong>
            </div>
            <p className="mb-2">
              Are you sure you want to permanently delete <strong>"{deleteClass?.class_name}"</strong>?
            </p>
            <p className="text-sm text-gray-500">
              This will permanently remove the class from the database and update all associated students and teachers.
            </p>
          </div>
        }
        confirmText="Delete Permanently"
        variant="danger"
      />
    </div>
  )
}

export default ClassesList
