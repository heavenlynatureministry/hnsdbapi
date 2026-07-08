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
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import { 
  DollarSign, Plus, Download, TrendingUp, TrendingDown,
  MoreVertical, Edit, Trash2, CheckCircle, XCircle, Clock, Eye, Printer,
  RotateCcw, AlertTriangle
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
  
  // ✅ Reset state
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetOptions, setResetOptions] = useState({
    reset_transactions: true,
    reset_payments: true,
    reset_fees: true,
    reset_budgets: true,
  })
  
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

  // ✅ Reset handler
  const handleReset = async () => {
    if (resetConfirm !== 'DELETE ALL FINANCIAL DATA') {
      toast.error('Please type the confirmation phrase exactly')
      return
    }
    
    setResetting(true)
    try {
      const response = await financialAPI.resetFinancialData({
        confirmation: resetConfirm,
        academic_year: currentYear,
        ...resetOptions,
      })
      
      const result = response?.data || response
      if (result?.success) {
        const deleted = result.data?.total_deleted || 0
        toast.success(`✅ Reset complete! ${deleted} records deleted.`)
        setShowResetDialog(false)
        setResetConfirm('')
        fetchTransactions()
      } else {
        toast.error(result?.message || 'Reset failed')
      }
    } catch (error) {
      console.error('Reset error:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Reset failed'
      toast.error(errorMsg)
    } finally {
      setResetting(false)
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
  
  const totalIncome = safeTransactions
    .filter(t => t?.transaction_type === 'income' && (t?.approval_status === 'approved' || t?.approval_status === 'completed'))
    .reduce((s, t) => s + (t?.amount || 0), 0)
  const totalExpenses = safeTransactions
    .filter(t => t?.transaction_type === 'expense' && (t?.approval_status === 'approved' || t?.approval_status === 'completed'))
    .reduce((s, t) => s + (t?.amount || 0), 0)
  
  const completedCount = safeTransactions.filter(t => 
    t?.approval_status === 'approved' || t?.approval_status === 'completed'
  ).length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Financial Transactions"
        subtitle="Manage income and expense records"
        actions={
          <div className="flex gap-2">
            <Link to="/financial/new" className="btn btn-primary">
              <Plus size={18} /> Add Transaction
            </Link>
            {/* ✅ Reset Button */}
            <Button 
              onClick={() => setShowResetDialog(true)} 
              variant="danger" 
              icon={<RotateCcw size={18} />}
            >
              Reset Data
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: `SSP ${totalIncome.toLocaleString()}`, icon: TrendingUp, color: 'bg-green-100 text-green-600' },
          { label: 'Total Expenses', value: `SSP ${totalExpenses.toLocaleString()}`, icon: TrendingDown, color: 'bg-red-100 text-red-600' },
          { label: 'Net Balance', value: `SSP ${(totalIncome - totalExpenses).toLocaleString()}`, icon: DollarSign, color: 'bg-blue-100 text-blue-600' },
          { label: 'Completed', value: completedCount, icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600' },
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
            <option value="completed">Completed</option>
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
                <tr><th>Date</th><th>Reference</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th><th>Status</th><th className="text-right">Actions</th></tr>
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

      {/* ✅ Reset Financial Data Modal */}
      <Modal 
        open={showResetDialog} 
        onClose={() => { setShowResetDialog(false); setResetConfirm('') }} 
        title="⚠️ Reset Financial Data" 
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
            <AlertTriangle size={24} className="text-red-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-700 dark:text-red-400">DANGER: This action cannot be undone!</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                All financial records for <strong>{currentYear}</strong> will be permanently deleted.
                Make sure to download all reports before resetting!
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="font-medium">Select what to delete:</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={resetOptions.reset_transactions} 
                onChange={(e) => setResetOptions(prev => ({ ...prev, reset_transactions: e.target.checked }))}
                className="w-4 h-4 text-red-600 rounded" />
              Transactions (income & expense records)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={resetOptions.reset_payments} 
                onChange={(e) => setResetOptions(prev => ({ ...prev, reset_payments: e.target.checked }))}
                className="w-4 h-4 text-red-600 rounded" />
              Student Payments
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={resetOptions.reset_fees} 
                onChange={(e) => setResetOptions(prev => ({ ...prev, reset_fees: e.target.checked }))}
                className="w-4 h-4 text-red-600 rounded" />
              Fee Structures
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={resetOptions.reset_budgets} 
                onChange={(e) => setResetOptions(prev => ({ ...prev, reset_budgets: e.target.checked }))}
                className="w-4 h-4 text-red-600 rounded" />
              Budget Allocations
            </label>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-1">
              Type <code className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-red-700 font-mono text-xs">DELETE ALL FINANCIAL DATA</code> to confirm:
            </p>
            <input 
              type="text" 
              value={resetConfirm} 
              onChange={(e) => setResetConfirm(e.target.value)}
              className="form-input w-full font-mono text-sm"
              placeholder="Type the confirmation phrase..."
            />
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              onClick={handleReset} 
              variant="danger" 
              loading={resetting}
              disabled={resetConfirm !== 'DELETE ALL FINANCIAL DATA'}
              icon={<RotateCcw size={18} />}
            >
              {resetting ? 'Resetting...' : 'Reset All Financial Data'}
            </Button>
            <Button variant="secondary" onClick={() => { setShowResetDialog(false); setResetConfirm('') }}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TransactionsList
