import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import studentsAPI from '../../api/students'
import teachersAPI from '../../api/teachers'
import boardMembersAPI from '../../api/boardMembers'
import { exportStudentIDCard, exportTeacherIDCard, exportBoardMemberIDCard } from '../../utils/exportIDCard'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import IDCardPreview from '../../components/common/IDCardPreview'
import { Printer, Users, UserCheck, Building, Download } from 'lucide-react'
import toast from 'react-hot-toast'

function IDCards() {
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  
  const [activeTab, setActiveTab] = useState('student') // 'student', 'teacher', 'board'
  const [loading, setLoading] = useState(false)
  const [people, setPeople] = useState([])
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    updatePageTitle('ID Cards')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Academic', path: '/academic' },
      { label: 'ID Cards' },
    ])
  }, [])

  useEffect(() => {
    fetchPeople()
  }, [activeTab])

  const fetchPeople = async () => {
    setLoading(true)
    try {
      let response
      switch (activeTab) {
        case 'student':
          response = await studentsAPI.getAll({ status: 'active', limit: 200 })
          const studentList = response?.data?.students || response?.students || response?.data || []
          setPeople(Array.isArray(studentList) ? studentList.map(s => ({ ...s, personType: 'student' })) : [])
          break
        case 'teacher':
          response = await teachersAPI.getAll({ status: 'active', limit: 100 })
          const teacherList = response?.data?.teachers || response?.teachers || response?.data || []
          setPeople(Array.isArray(teacherList) ? teacherList.map(t => ({ ...t, personType: 'teacher' })) : [])
          break
        case 'board':
          response = await boardMembersAPI.getAll({ status: 'active', limit: 50 })
          const boardList = response?.data?.boardMembers || response?.boardMembers || response?.data || []
          setPeople(Array.isArray(boardList) ? boardList.map(b => ({ ...b, personType: 'board' })) : [])
          break
      }
    } catch (error) {
      console.error('Failed to fetch:', error)
      setPeople([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPeople = people.filter(p => {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase()
    const id = (p.student_id || p.teacher_id || p.board_member_id || '').toLowerCase()
    const term = searchTerm.toLowerCase()
    return fullName.includes(term) || id.includes(term)
  })

  const handlePrint = (person) => {
    switch (person.personType || activeTab) {
      case 'student':
        exportStudentIDCard(person)
        break
      case 'teacher':
        exportTeacherIDCard(person)
        break
      case 'board':
        exportBoardMemberIDCard(person)
        break
    }
  }

  const handlePrintAll = async () => {
    toast.success(`Printing ${filteredPeople.length} ID cards...`)
    for (const person of filteredPeople) {
      handlePrint(person)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const tabs = [
    { id: 'student', label: 'Students', icon: <Users size={16} /> },
    { id: 'teacher', label: 'Teachers', icon: <UserCheck size={16} /> },
    { id: 'board', label: 'Board Members', icon: <Building size={16} /> },
  ]

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in-up">
      <PageHeader
        title="ID Cards"
        subtitle="Generate and print identification cards"
        actions={
          <div className="flex gap-2">
            <Button onClick={handlePrintAll} variant="secondary" icon={<Download size={18} />}>
              Print All
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedPerson(null) }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card title={`Select ${tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}`}>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredPeople.map(person => (
                  <button
                    key={person._id || person.id}
                    onClick={() => setSelectedPerson(person)}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                      selectedPerson?._id === person._id || selectedPerson?.id === person.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    <p className="font-medium">
                      {person.first_name} {person.last_name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {person.student_id || person.teacher_id || person.board_member_id || 'N/A'}
                    </p>
                  </button>
                ))}
                {filteredPeople.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No records found</p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card title="ID Card Preview">
            {selectedPerson ? (
              <div className="space-y-4">
                <IDCardPreview
                  person={selectedPerson}
                  type={activeTab}
                  onPrint={() => handlePrint(selectedPerson)}
                />
                
                {/* Verification Info */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Verification URL:
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-1">
                    {window.location.origin}/verify/id/{activeTab}/{selectedPerson._id || selectedPerson.id}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    This URL will be printed on the ID card for verification purposes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Printer size={48} className="mx-auto mb-3 opacity-30" />
                <p>Select a person to preview their ID card</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

export default IDCards
