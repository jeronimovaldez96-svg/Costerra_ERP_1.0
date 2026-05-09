import { useState, useEffect, useCallback } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { ViewInvoiceModal } from '../../components/modals/ViewInvoiceModal'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

interface Sale {
  id: number
  saleNumber: string
  quote: { quoteNumber: string, salesLead: { leadNumber: string, client: { name: string, surname: string } } }
  totalRevenue: number
  profitMargin: number
  saleDate: string
}

const columns: ColumnDef<Sale>[] = [
  { accessorKey: 'saleNumber', header: 'Invoice #' },
  { 
    id: 'clientName',
    header: 'Client',
    cell: ({ row }) => `${row.original.quote.salesLead.client.name} ${row.original.quote.salesLead.client.surname}`
  },
  { 
    accessorKey: 'saleDate', 
    header: 'Date',
    cell: ({ row }) => new Date(row.original.saleDate).toLocaleDateString()
  },
  { 
    accessorKey: 'totalRevenue', 
    header: 'Amount',
    cell: ({ row }) => <span className="font-medium text-white">${row.original.totalRevenue.toFixed(2)}</span>
  },
  { 
    accessorKey: 'profitMargin', 
    header: 'Margin',
    cell: ({ row }) => {
      const margin = row.original.profitMargin
      let color = 'text-slate-400'
      if (margin > 30) color = 'text-emerald-400'
      else if (margin < 10) color = 'text-amber-400'
      
      return <span className={`font-medium ${color}`}>{margin.toFixed(1)}%</span>
    }
  }
]

export function Invoices() {
  const [data, setData] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewSaleId, setViewSaleId] = useState<number | null>(null)

  // Sorting & Filtering State
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>(undefined)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)

  const fetchSales = useCallback(async (pageIndex: number, currentSearch: string, currentSortBy?: string, currentSortDir?: 'asc' | 'desc') => {
    setIsLoading(true)
    try {
      const res = await window.api.invoke<{ items: Sale[], total: number }>('sale:list', { 
        page: pageIndex, 
        pageSize: 15,
        search: currentSearch,
        sortBy: currentSortBy,
        sortDir: currentSortDir
      })
      setData(res.items)
      setTotalPages(Math.ceil(res.total / 15))
    } catch (error) {
      toast.error('Failed to load invoices', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSales(page, search, sortBy, sortDir)
  }, [page, search, sortBy, sortDir, fetchSales])

  return (
    <PageContainer title="Invoices & Sales">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">View completed transactions, revenue, and margins.</p>
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
            pageIndex={page}
            pageCount={totalPages}
            onPageChange={setPage}
            onRowClick={(row) => setViewSaleId(row.id)}
            onSearchChange={(val) => { setSearch(val); setPage(1); }}
            onSortChange={(col, dir) => { setSortBy(col); setSortDir(dir); setPage(1); }}
          />
        )}
      </div>

      <ViewInvoiceModal
        isOpen={viewSaleId !== null}
        onClose={() => setViewSaleId(null)}
        saleId={viewSaleId}
      />
    </PageContainer>
  )
}
