import { useState, useEffect } from 'react'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  className?: string
  onRowClick?: (row: TData) => void
  
  // Server-side Pagination
  pageCount?: number
  pageIndex?: number
  onPageChange?: (page: number) => void

  // Server-side Sorting & Filtering
  onSearchChange?: (search: string) => void
  onSortChange?: (columnId: string, direction: 'asc' | 'desc' | undefined) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  onRowClick,
  pageCount,
  pageIndex = 1,
  onPageChange,
  onSearchChange,
  onSortChange
}: DataTableProps<TData, TValue>) {
  const [searchValue, setSearchValue] = useState('')
  const [sortConfig, setSortConfig] = useState<{ id: string, desc: boolean } | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(searchValue)
      }
    }, 300)
    return () => { clearTimeout(timer); }
  }, [searchValue, onSearchChange])

  const handleSort = (columnId: string) => {
    if (!onSortChange) return

    let nextDesc = false
    let isReset = false

    if (sortConfig?.id === columnId) {
      if (!sortConfig.desc) {
        nextDesc = true
      } else {
        isReset = true
      }
    }

    if (isReset) {
      setSortConfig(null)
      onSortChange(columnId, undefined)
    } else {
      setSortConfig({ id: columnId, desc: nextDesc })
      onSortChange(columnId, nextDesc ? 'desc' : 'asc')
    }
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className={cn("w-full flex flex-col rounded-xl border border-border-glass bg-surface-base backdrop-blur-sm overflow-hidden", className)}>
      
      {/* Toolbar */}
      {onSearchChange && (
        <div className="flex items-center justify-between p-4 border-b border-border-glass bg-white/[0.02]">
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 text-sm bg-black/20 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => { setSearchValue(e.target.value); }}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase border-b border-border-glass bg-white/[0.02]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable = Boolean(onSortChange) && header.column.id
                  const isActiveSort = sortConfig?.id === header.column.id
                  return (
                    <th 
                      key={header.id} 
                      className={cn(
                        "px-6 py-4 font-medium whitespace-nowrap select-none",
                        isSortable && "cursor-pointer hover:text-slate-300 transition-colors group"
                      )}
                      onClick={() => isSortable && handleSort(header.column.id)}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {isSortable && (
                            <span className="text-slate-500">
                              {isActiveSort ? (
                                sortConfig.desc ? <ArrowDown size={14} className="text-primary-400" /> : <ArrowUp size={14} className="text-primary-400" />
                              ) : (
                                <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "border-b border-white/5 transition-colors hover:bg-surface-hover",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-slate-200">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pageCount !== undefined && pageCount > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border-glass bg-black/10">
          <span className="text-sm text-slate-400">
            Page {pageIndex} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange?.(pageIndex - 1)}
              disabled={pageIndex <= 1}
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange?.(pageIndex + 1)}
              disabled={pageIndex >= pageCount}
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
