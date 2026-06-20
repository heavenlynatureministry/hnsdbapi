import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import SearchBar from '../../components/common/SearchBar'
import Pagination from '../../components/common/Pagination'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Badge from '../../components/common/Badge'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { 
  DollarSign, Plus, Download, Filter, TrendingUp, TrendingDown,
  Search, MoreVertical, Edit, Trash2, CheckCircle, XCircle, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

function TransactionsList() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const limit = 20

  useEffect(() => {
    updatePageTitle('Financial Transactions')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Financial', path: '/financial' }])
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setTransactions([
        { _id: '1', transaction_date: '2024-01-15', amount: 50000, transaction_type: 'income', category: 'tuition_fees', description: 'Term 1 Tuition - P5 Class', reference_number: 'INC-20240115-0001', approval_status: 'approved', payment_method: 'cash' },
        { _id: '2', transaction_date: '2024-01-20', amount: 15000, transaction_type: 'expense', category: 'salaries', description: 'January Staff Salaries', reference_number: 'EXP-20240120-0001', approval_status: 'approved', payment_method: 'bank_transfer' },
        { _id: '3', transaction_date: '2024-02-01', amount: 8000, transaction_type: 'expense', category: 'utilities', description: 'Electricity Bill', reference_number: 'EXP-20240201-0001', approval_status: 'pending', payment_method: 'bank_transfer' },
        { _id: '4', transaction_date: '2024-02-10', amount: 35000, transaction_type: 'income', category: 'registration_fees', description: 'New Student Registrations', reference_number: 'INC-20240210-0001', approval_status: 'approved', payment_method: 'mobile_money' },
        { _id: '5', transaction_date: '2024-02-15', amount: 12000, transaction_type: 'expense', category: 'supplies', description: 'School Supplies Purchase', reference_number: 'EXP-20240215-0001', approval_status: 'rejected', payment_method: 'cash' },
      ])
      setTotal(5)
      setTotalPages(1)
      setLoading(false)
    }, 500)
  }, [search, typeFilter, statusFilter, page])

  const getCategoryDisplay = (category) => {
    const categories = {
      tuition_fees: 'Tuition Fees', registration_fees: 'Registration Fees',
      examination_fees: 'Exam Fees', transportation_fees: 'Transport',
      donations: 'Donations', grants: 'Grants', other_income: 'Other Income',
      salaries: 'Salaries', utilities: 'Utilities', rent: 'Rent',
      maintenance: 'Maintenance', supplies: 'Supplies', equipment: 'Equipment',
      textbooks: 'Textbooks', food_program: 'Food Program', other_expenses: 'Other Expenses',
    }
    return categories[category] || category
  }

  const getStatusBadge = (status) => {
    const variants = { approved: 'success', pending: 'warning', rejected: 'danger', cancelled: 'gray' }
    const icons = { approved: CheckCircle, pending: Clock, rejected: XCircle }
    const Icon = icons[status]
    return (
      <Badge variant={variants[status] || 'gray'}>
        <span className="flex items-center gap-1">
          {Icon && <Icon size={12} />}
          {status}
        </span>
      </Badge>
    )
  }

  const totalIncome = transactions.filter(t => t.transaction_type === 'income' && t.approval_status === 'approved').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.transaction_type === 'expense' && t.approval_status === 'approved').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Financial Transactions"
        subtitle="Manage income and expense records"
        actions={
          <Link to="/financial/new" className="btn btn-primary">
            <Plus size={18} /> Add Transaction
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: `SSP ${totalIncome.toLocaleString()}`, icon: TrendingUp, color: 'bg-green-100 text-green-600' },
          { label: 'Total Expenses', value: `SSP ${totalExpenses.toLocaleString()}`, icon: TrendingDown, color: 'bg-red-100 text-red-600' },
          { label: 'Net Balance', value: `SSP ${(totalIncome - totalExpenses).toLocaleString()}`, icon: DollarSign, color: 'bg-blue-100 text-blue-600' },
          { label: 'Pending', value: transactions.filter(t => t.approval_status === 'pending').length, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value text-sm">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search transactions..." /></div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="form-input w-full sm:w-36">
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input w-full sm:w-36">
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="btn btn-secondary"><Download size={18} /> Export</button>
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : transactions.length === 0 ? (
        <EmptyState icon={<DollarSign size={48} />} title="No transactions" description="No transactions found." action={<Link to="/financial/new" className="btn btn-primary">Add Transaction</Link>} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn._id}>
                    <td className="text-sm">{new Date(txn.transaction_date).toLocaleDateString()}</td>
                    <td className="text-xs font-mono">{txn.reference_number}</td>
                    <td className="text-sm max-w-xs truncate">{txn.description}</td>
                    <td className="text-sm">{getCategoryDisplay(txn.category)}</td>
                    <td>
                      <Badge variant={txn.transaction_type === 'income' ? 'success' : 'danger'}>
                        {txn.transaction_type}
                      </Badge>
                    </td>
                    <td className={`text-sm font-semibold ${txn.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.transaction_type === 'income' ? '+' : '-'} SSP {txn.amount.toLocaleString()}
                    </td>
                    <td>{getStatusBadge(txn.approval_status)}</td>
                    <td className="text-right">
                      <div className="relative">
                        <button onClick={() => setOpenDropdown(openDropdown === txn._id ? null : txn._id)} className="btn btn-ghost btn-sm btn-icon">
                          <MoreVertical size={16} />
                        </button>
                        {openDropdown === txn._id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-20 py-1">
                              <Link to={`/financial/${txn._id}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Edit size={14} /> Edit
                              </Link>
                              {txn.approval_status === 'pending' && (
                                <button onClick={() => { setShowDelete(txn); setOpenDropdown(null) }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                                  <Trash2 size={14} /> Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="border-t px-4 py-3"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>}
        </div>
      )}

      <ConfirmDialog open={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={() => { toast.success('Transaction deleted'); setShowDelete(null) }} title="Delete Transaction" message="Are you sure you want to delete this transaction?" confirmText="Delete" variant="danger" />
    </div>
  )
}

export default TransactionsList