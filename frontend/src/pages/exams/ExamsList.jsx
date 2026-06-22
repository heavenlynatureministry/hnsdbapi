import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { FileText, Plus, MoreVertical, Eye, Edit, BarChart3, GraduationCap, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

function ExamsList() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [openDropdown, setOpenDropdown] = useState(null)

  useEffect(() => {
    updatePageTitle('Examinations')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Exams' }])
    fetchExams()
  }, [])

  const fetchExams = async () => {
    setLoading(true)
    try {
      const response = await examsAPI.list({ exam_type: typeFilter || undefined })
      if (response?.success) {
        setExams(response.data?.exams || response.data || [])
      } else {
        setExams([])
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error)
      toast.error('Failed to load exams')
      setExams([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExams()
  }, [typeFilter])

  const getStatusBadge = (status) => {
    const variants = { scheduled: 'info', ongoing: 'warning', completed: 'success', cancelled: 'danger' }
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>
  }

  const getTypeBadge = (type) => {
    const variants = { mid_term: 'warning', end_term: 'info', final: 'danger', mock: 'info', quiz: 'success', assignment: 'gray' }
    return <Badge variant={variants[type] || 'gray'}>{type?.replace('_', ' ')}</Badge>
  }

  const filteredExams = typeFilter ? exams.filter(e => e.exam_type === typeFilter) : exams

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Examinations"
        subtitle={`${exams.length} exams`}
        actions={
          <div className="flex gap-2">
            <Link to="/exams/report-cards" className="btn btn-secondary"><GraduationCap size={18} /> Report Cards</Link>
            <Link to="/exams/new" className="btn btn-primary"><Plus size={18} /> Create Exam</Link>
          </div>
        }
      />

      <div className="flex gap-2 flex-wrap">
        {['', 'mid_term', 'end_term', 'quiz', 'mock'].map((type) => (
          <button key={type} onClick={() => setTypeFilter(type)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${typeFilter === type ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
            {type ? type.replace('_', ' ') : 'All'} {type && `(${exams.filter(e => e.exam_type === type).length})`}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : filteredExams.length === 0 ? (
        <EmptyState icon={<FileText size={48} />} title="No exams found" action={<Link to="/exams/new" className="btn btn-primary">Create Exam</Link>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => (
            <Card key={exam._id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{exam.exam_name}</h3>
                    <p className="text-xs text-gray-500">{exam.class_name} • {exam.subject_name}</p>
                  </div>
                </div>
                <div className="relative">
                  <button onClick={() => setOpenDropdown(openDropdown === exam._id ? null : exam._id)} className="btn btn-ghost btn-sm btn-icon">
                    <MoreVertical size={16} />
                  </button>
                  {openDropdown === exam._id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-20 py-1">
                        <Link to={`/exams/${exam._id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><Eye size={14} /> View</Link>
                        {exam.status === 'scheduled' && <Link to={`/exams/${exam._id}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={14} /> Edit</Link>}
                        <Link to={`/exams/${exam._id}/results`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><BarChart3 size={14} /> Results</Link>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span>{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Max Score:</span>
                  <span className="font-medium">{exam.max_score}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Results:</span>
                  <span className="font-medium">{exam.results_entered || 0}/{exam.total_students || 0}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-1">{getTypeBadge(exam.exam_type)}</div>
                {getStatusBadge(exam.status)}
              </div>

              {exam.status !== 'scheduled' && exam.total_students > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-primary-600 h-1.5 rounded-full" style={{ width: `${((exam.results_entered || 0) / exam.total_students) * 100}%` }} />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExamsList
