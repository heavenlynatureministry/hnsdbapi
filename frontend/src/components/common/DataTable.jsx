import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import EmptyState from './EmptyState'
import Pagination from './Pagination'

function DataTable({
  columns = [],
  data = [],
  loading = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  onSearch,
  onSort,
  emptyIcon,
  emptyTitle = 'No data found',
  emptyDescription = '',
  emptyAction,
  hoverable = true,
  striped = false,
}) {
  const [sortField, setSortField] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')

  const handleSort = (field) => {
    let newDirection = 'asc'
    if (sortField === field) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    }
    setSortField(field)
    setSortDirection(newDirection)
    onSort?.(field, newDirection)
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return <ChevronsUpDown size={14} className="text-gray-400" />
    return sortDirection === 'asc' ? <ChevronUp size={14} className="text-primary-600" /> : <ChevronDown size={14} className="text-primary-600" />
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Search Bar */}
      {searchable && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch?.(e.target.value)}
              className="form-input pl-9"
            />
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="p-12"><LoadingSpinner /></div>
      ) : data.length === 0 ? (
        <div className="p-12">
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''} ${col.className || ''}`}
                      style={col.width ? { width: col.width } : {}}
                      onClick={() => col.sortable && handleSort(col.field)}
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {col.sortable && getSortIcon(col.field)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {data.map((row, rowIndex) => (
                  <tr
                    key={row._id || rowIndex}
                    className={`${hoverable ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors' : ''} ${striped && rowIndex % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}`}
                  >
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 ${col.className || ''}`}>
                        {col.render ? col.render(row[col.field], row) : row[col.field]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {((page - 1) * (data.length)) + 1} to {Math.min(page * data.length, total)} of {total} results
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DataTable