import { useState, useEffect, useCallback } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

interface InventorySummary {
  productId: number
  skuNumber: string
  productName: string
  productGroup: string
  productFamily: string
  color: string
  totalUnits: number
  availableUnits: number
  reservedUnits: number
  avgUnitCost: number
  totalStockValue: number
}

const columns: ColumnDef<InventorySummary>[] = [
  { accessorKey: 'skuNumber', header: 'SKU' },
  { accessorKey: 'productName', header: 'Product Name' },
  { 
    accessorKey: 'availableUnits', 
    header: 'Available',
    cell: ({ row }) => (
      <span className="font-medium text-emerald-400">{row.original.availableUnits}</span>
    )
  },
  { 
    accessorKey: 'reservedUnits', 
    header: 'Reserved',
    cell: ({ row }) => (
      <span className="text-amber-400">{row.original.reservedUnits}</span>
    )
  },
  { 
    accessorKey: 'avgUnitCost', 
    header: 'Avg Cost',
    cell: ({ row }) => `$${row.original.avgUnitCost.toFixed(2)}`
  },
  { 
    accessorKey: 'totalStockValue', 
    header: 'Total Value',
    cell: ({ row }) => <span className="font-semibold text-white">${row.original.totalStockValue.toFixed(2)}</span>
  }
]

export function Stock() {
  const [data, setData] = useState<InventorySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Sorting & Filtering State
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>(undefined)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)

  const fetchStock = useCallback(async (currentSearch: string, currentSortBy?: string, currentSortDir?: 'asc' | 'desc') => {
    setIsLoading(true)
    try {
      const res = await window.api.invoke<InventorySummary[]>('inventory:summary', {
        search: currentSearch,
        sortBy: currentSortBy,
        sortDir: currentSortDir
      })
      setData(res)
    } catch (error) {
      toast.error('Failed to load live stock', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStock(search, sortBy, sortDir)
  }, [search, sortBy, sortDir, fetchStock])

  return (
    <PageContainer title="Live Stock">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">Real-time inventory levels, reservations, and FIFO valuations.</p>
      </div>

      <div className="flex-1 no-drag">
        {isLoading && data.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <span className="w-8 h-8 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
            onSearchChange={(val) => { setSearch(val); }}
            onSortChange={(col, dir) => { setSortBy(col); setSortDir(dir); }}
          />
        )}
      </div>
    </PageContainer>
  )
}
