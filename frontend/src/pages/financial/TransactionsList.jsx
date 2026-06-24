import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import financialAPI from '../../api/financial'
import api from '../../api/axios'
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

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await financialAPI.listTransactions({
        search: search || undefined,
        transaction_type: typeFilter || undefined,
        approval_status: statusFilter || undefined,
        page,
        limit,
      })
      
      const data = response?.data || response
      const txnList = data?.transactions || data || []
      const safeTxns = Array.isArray(txnList) ? txnList : []
      
      setTransactions(safeTxns)
      setTotal(data?.total || 0)
      setTotalPages(data?.total_pages || Math.ceil((data?.total || 0) / limit))
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      toast.error('Failed to load transactions')
      setTransactions([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter, page])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleDelete = async () => {
    if (!showDelete) return
    try {
      await api.delete(`/financial/transactions/${showDelete._id}`)
      toast.success('Transaction deleted permanently')
      setShowDelete(null)
      fetchTransactions()
    } catch (error) {
      toast.error(error.message || 'Failed to delete transaction')
    }
  }

  const getCategoryDisplay = (category) => {
    const categories = {
      tuition_fees: 'Tuition Fees', registration_fees: 'Registration Fees',
      examination_fees: 'Exam Fees', transportation_fees: 'Transport',
      donations: 'Donations', grants: 'Grants', other_income: 'Other Income',
      salaries: 'Salaries', utilities: 'Utilities', rent: 'Rent',
      maintenance: 'Maintenance', supplies: 'Supplies', equipment: 'Equipment',
      textbooks: 'Textbooks', food_program: 'Food Program', other_expenses: 'Other Expenses',
    }
    return categories[category] || category?.replace(/_/g, ' ') || 'N/A'
  }

  const getStatusBadge = (status) => {
    const variants = { approved: 'success', pending: 'warning', rejected: 'danger', cancelled: 'gray' }
    const icons = { approved: CheckCircle, pending: Clock, rejected: XCircle }
    const Icon = icons[status]
    return (
      <Badge variant={variants[status] || 'gray'}>
        <span className="flex items-center gap-1">
          {Icon && <Icon size={12} />}
          {status || 'unknown'}
        </span>
      </Badge>
    )
  }

  const safeTransactions = Array.isArray(transactions) ? transactions : []
  const totalIncome = safeTransactions
    .filter(t => t?.transaction_type === 'income' && t?.approval_status === 'approved')
    .reduce((s, t) => s + (t?.amount || 0), 0)
  const totalExpenses = safeTransactions
    .filter(t => t?.transaction_type === 'expense' && t?.approval_status === 'approved')
    .reduce((s, t) => s + (t?.amount || 0), 0)

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: `SSP ${totalIncome.toLocaleString()}`, icon: TrendingUp, color: 'bg-green-100 text-green-600' },
          { label: 'Total Expenses', value: `SSP ${totalExpenses.toLocaleString()}`, icon: TrendingDown, color: 'bg-red-100 text-red-600' },
          { label: 'Net Balance', value: `SSP ${(totalIncome - totalExpenses).toLocaleString()}`, icon: DollarSign, color: 'bg-blue-100 text-blue-600' },
          { label: 'Pending', value: safeTransactions.filter(t => t?.approval_status === 'pending').length, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value text-sm">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Search transactions..." /></div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} className="form-input w-full sm:w-36">
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="form-input w-full sm:w-36">
            <option value="">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="btn btn-secondary"><Download size={18} /> Export</button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : safeTransactions.length === 0 ? (
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
                {safeTransactions.map((txn) => (
                  <tr key={txn?._id || Math.random()}>
                    <td className="text-sm">{txn?.transaction_date ? new Date(txn.transaction_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="text-xs font-mono">{txn?.reference_number || 'N/A'}</td>
                    <td className="text-sm max-w-xs truncate">{txn?.description || 'N/A'}</td>
                    <td className="text-sm">{getCategoryDisplay(txn?.category)}</td>
                    <td><Badge variant={txn?.transaction_type === 'income' ? 'success' : 'danger'}>{txn?.transaction_type || 'N/A'}</Badge></td>
                    <td className={`text-sm font-semibold ${txn?.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn?.transaction_type === 'income' ? '+' : '-'} SSP {(txn?.amount || 0).toLocaleString()}
                    </td>
                    <td>{getStatusBadge(txn?.approval_status)}</td>
                    <td className="text-right">
                      <div className="relative">
                        <button onClick={() => setOpenDropdown(openDropdown === txn?._id ? null : txn?._id)} className="btn btn-ghost btn-sm btn-icon"><MoreVertical size={16} /></button>
                        {openDropdown === txn?._id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-20 py-1">
                              <Link to={`/financial/${txn?._id}/edit`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={14} /> Edit</Link>
                              <button onClick={() => { setShowDelete(txn); setOpenDropdown(null) }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"><Trash2 size={14} /> Delete</button>
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

      <ConfirmDialog 
        open={!!showDelete} 
        onClose={() => setShowDelete(null)} 
        onConfirm={handleDelete} 
        title="Delete Transaction" 
        message="Are you sure you want to permanently delete this transaction? This action cannot be undone." 
        confirmText="Delete Permanently" 
        variant="danger" 
      />
    </div>
  )
}

export default TransactionsList
