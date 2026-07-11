import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import financialAPI from '../../api/financial'
import ReceiptPrint from '../../components/receipts/ReceiptPrint'
import PageHeader from '../../components/common/PageHeader'
import SearchBar from '../../components/common/SearchBar'
import Pagination from '../../components/common/Pagination'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Badge from '../../components/common/Badge'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import { 
  DollarSign, Plus, Download, TrendingUp, TrendingDown,
  MoreVertical, Edit, Trash2, CheckCircle, XCircle, Clock, Eye, Printer,
  GraduationCap, Building2
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
  
  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState(null)
  
  // ✅ Dashboard data for combined stats
  const [dashboardData, setDashboardData] = useState(null)
  
  const limit = 20

  useEffect(() => {
    updatePageTitle('Financial Overview')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Financial' }])
    fetchDashboard()
  }, [])

  // ✅ Fetch combined dashboard stats
  const fetchDashboard = async () => {
    try {
      const response = await financialAPI.getDashboard()
      if (response?.success) {
        setDashboardData(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    }
  }

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await financialAPI.listTransactions({
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit,
      })
      
      const data = response?.data || response
      const txnList = data?.transactions || data || []
      const safeTxns = Array.isArray(txnList) ? txnList : []
      
      setTransactions(safeTxns)
      setTotal(data?.total || safeTxns.length)
      setTotalPages(data?.total_pages || Math.ceil((data?.total || safeTxns.length) / limit))
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
      await financialAPI.deleteTransaction(showDelete._id)
      toast.success('Transaction deleted')
      setShowDelete(null)
      fetchTransactions()
      fetchDashboard()
    } catch (error) {
      toast.error(error.message || 'Failed to delete transaction')
    }
  }

  const handleViewReceipt = async (transactionId) => {
    if (!transactionId) return
    try {
      toast.loading('Loading receipt...')
      const response = await financialAPI.getTransactionReceipt(transactionId)
      toast.dismiss()
      if (response?.success === true && response.data) {
        setReceiptData(response.data)
        setShowReceipt(true)
      } else {
        toast.error('Could not load receipt')
      }
    } catch (error) {
      toast.dismiss()
      console.error('Receipt load error:', error)
      toast.error('Failed to load receipt')
    }
  }

  const getCategoryDisplay = (category) => {
    if (!category) return 'N/A'
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getStatusBadge = (status) => {
    const variants = { 
      approved: 'success', completed: 'success', 
      pending: 'warning', rejected: 'danger', cancelled: 'gray' 
    }
    const icons = { approved: CheckCircle, completed: CheckCircle, pending: Clock, rejected: XCircle }
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
  
  // Transaction-only stats (for reference)
  const txIncome = safeTransactions
    .filter(t => t?.transaction_type === 'income' && (t?.approval_status === 'approved' || t?.approval_status === 'completed'))
    .reduce((s, t) => s + (t?.amount || 0), 0)
  const txExpenses = safeTransactions
    .filter(t => t?.transaction_type === 'expense' && (t?.approval_status === 'approved' || t?.approval_status === 'completed'))
    .reduce((s, t) => s + (t?.amount || 0), 0)

  // ✅ Combined stats from dashboard (payments + transactions)
  const totalIncome = dashboardData?.total_income || txIncome
  const totalExpenses = dashboardData?.total_expenses || txExpenses
  const netBalance = dashboardData?.net_balance || (totalIncome - totalExpenses)
  const studentPayments = dashboardData?.student_payments || 0
  const donationsIncome = dashboardData?.donations_income || 0

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Financial Overview"
        subtitle={`Total collected: SSP ${(totalIncome || 0).toLocaleString()} • Student Payments: SSP ${(studentPayments || 0).toLocaleString()} • Donations: SSP ${(donationsIncome || 0).toLocaleString()}`}
        actions={
          <div className="flex gap-2">
            <Link to="/financial/payments" className="btn btn-secondary">
              <GraduationCap size={18} /> Student Payments
            </Link>
            <Link to="/financial/new" className="btn btn-primary">
              <Plus size={18} /> Add Transaction
            </Link>
          </div>
        }
      />

      {/* ✅ Combined Stats - Payments + Transactions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: `SSP ${(totalIncome || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-green-100 text-green-600', sub: 'Payments + Donations' },
          { label: 'Student Payments', value: `SSP ${(studentPayments || 0).toLocaleString()}`, icon: GraduationCap, color: 'bg-blue-100 text-blue-600', sub: `${dashboardData?.student_payments_count || 0} payments` },
          { label: 'Donations/Income', value: `SSP ${(donationsIncome || 0).toLocaleString()}`, icon: Building2, color: 'bg-purple-100 text-purple-600', sub: 'Orgs & donations' },
          { label: 'Total Expenses', value: `SSP ${(totalExpenses || 0).toLocaleString()}`, icon: TrendingDown, color: 'bg-red-100 text-red-600', sub: `Balance: SSP ${(netBalance || 0).toLocaleString()}` },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value text-sm">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
            <div className="text-xs text-gray-400 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/financial/payments" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <GraduationCap size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm">Student Payments</p>
            <p className="text-xs text-gray-500">Record & view student fee payments</p>
          </div>
        </Link>
        <Link to="/financial/fees" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <DollarSign size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-medium text-sm">Fee Structures</p>
            <p className="text-xs text-gray-500">Set annual school fees</p>
          </div>
        </Link>
        <Link to="/financial/new" className="card p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Building2 size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-sm">Record Transaction</p>
            <p className="text-xs text-gray-500">Donations, expenses, income</p>
          </div>
        </Link>
      </div>

      {/* Transaction Filters */}
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
            <option value="completed">Completed</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="btn btn-secondary"><Download size={18} /> Export</button>
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? <LoadingSpinner /> : safeTransactions.length === 0 ? (
        <EmptyState icon={<DollarSign size={48} />} title="No transactions" description="No transactions found." action={<Link to="/financial/new" className="btn btn-primary">Add Transaction</Link>} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Reference</th><th>Description</th><th>Organization</th><th>Type</th><th>Amount</th><th>Status</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {safeTransactions.map((txn) => (
                  <tr key={txn?._id || Math.random()}>
                    <td className="text-sm">{txn?.transaction_date ? new Date(txn.transaction_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="text-xs font-mono">{txn?.reference_number || 'N/A'}</td>
                    <td className="text-sm max-w-xs truncate">{txn?.description || 'N/A'}</td>
                    <td className="text-sm">{txn?.organization_name || txn?.representative_name || 'N/A'}</td>
                    <td><Badge variant={txn?.transaction_type === 'income' ? 'success' : 'danger'}>{txn?.transaction_type || 'N/A'}</Badge></td>
                    <td className={`text-sm font-semibold ${txn?.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn?.transaction_type === 'income' ? '+' : '-'} SSP {(txn?.amount || 0).toLocaleString()}
                    </td>
                    <td>{getStatusBadge(txn?.approval_status)}</td>
                    <td className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => handleViewReceipt(txn?._id)} className="btn btn-ghost btn-sm btn-icon text-blue-600" title="View Receipt"><Eye size={14} /></button>
                        <div className="relative">
                          <button onClick={() => setOpenDropdown(openDropdown === txn?._id ? null : txn?._id)} className="btn btn-ghost btn-sm btn-icon"><MoreVertical size={16} /></button>
                          {openDropdown === txn?._id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border z-20 py-1">
                                <Link to={`/financial/edit/${txn?._id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"><Edit size={14} /> Edit</Link>
                                <button onClick={() => { setShowDelete(txn); setOpenDropdown(null) }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"><Trash2 size={14} /> Delete</button>
                              </div>
                            </>
                          )}
                        </div>
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

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <ReceiptPrint receipt={receiptData} onClose={() => { setShowReceipt(false); setReceiptData(null) }} />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog 
        open={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={handleDelete} 
        title="Delete Transaction" message="Are you sure you want to permanently delete this transaction?" 
        confirmText="Delete Permanently" variant="danger" 
      />
    </div>
  )
}

export default TransactionsList
