import { useState, useEffect } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

interface InventorySummary {
  productId: number
  skuNumber: string
  name: string
  totalReceived: number
  availableUnits: number
  reservedUnits: number
  blendedUnitCost: number
  totalValue: number
}

const columns: ColumnDef<InventorySummary>[] = [
  { accessorKey: 'skuNumber', header: 'SKU' },
  { accessorKey: 'name', header: 'Product Name' },
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
    accessorKey: 'blendedUnitCost', 
    header: 'Avg Cost',
    cell: ({ row }) => `$${row.original.blendedUnitCost.toFixed(2)}`
  },
  { 
    accessorKey: 'totalValue', 
    header: 'Total Value',
    cell: ({ row }) => <span className="font-semibold text-white">${row.original.totalValue.toFixed(2)}</span>
  }
]

export function Stock() {
  const [data, setData] = useState<InventorySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStock()
  }, [])

  const fetchStock = async () => {
    setIsLoading(true)
    try {
      // The inventory:summary endpoint doesn't paginate by default, it just returns the array
      const res = await window.api.invoke<InventorySummary[]>('inventory:summary')
      setData(res)
    } catch (error) {
      toast.error('Failed to load live stock', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageContainer title="Live Stock">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">Real-time inventory levels, reservations, and FIFO valuations.</p>
      </div>

      <div className="flex-1 no-drag">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <span className="w-8 h-8 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
          />
        )}
      </div>
    </PageContainer>
  )
}
