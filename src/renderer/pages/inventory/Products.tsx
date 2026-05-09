import { useState, useEffect, useCallback } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'
import { CreateProductModal } from '../../components/modals/CreateProductModal'
import { ViewProductModal } from '../../components/modals/ViewProductModal'
import { Plus } from 'lucide-react'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

// Basic Product Type
interface Product {
  id: number
  skuNumber: string
  productGroup: string
  name: string
  defaultUnitCost: number
  defaultUnitPrice: number
  isActive: boolean
}

const columns: ColumnDef<Product>[] = [
  { accessorKey: 'skuNumber', header: 'SKU' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'productGroup', header: 'Group' },
  { 
    accessorKey: 'defaultUnitCost', 
    header: 'Unit Cost',
    cell: ({ row }) => `$${row.original.defaultUnitCost.toFixed(2)}`
  },
  { 
    accessorKey: 'defaultUnitPrice', 
    header: 'Unit Price',
    cell: ({ row }) => `$${row.original.defaultUnitPrice.toFixed(2)}`
  },
  { 
    accessorKey: 'isActive', 
    header: 'Status',
    cell: ({ row }) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.original.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </span>
    )
  }
]

export function Products() {
  const [data, setData] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewProductId, setViewProductId] = useState<number | null>(null)
  
  // Sorting & Filtering State
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>(undefined)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)

  const fetchProducts = useCallback(async (pageIndex: number, currentSearch: string, currentSortBy?: string, currentSortDir?: 'asc' | 'desc') => {
    setIsLoading(true)
    try {
      const res = await window.api.invoke<{ items: Product[], total: number }>('product:list', { 
        page: pageIndex, 
        pageSize: 15,
        search: currentSearch,
        sortBy: currentSortBy,
        sortDir: currentSortDir
      })
      setData(res.items)
      setTotalPages(Math.ceil(res.total / 15))
    } catch (error) {
      toast.error('Failed to load products', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts(page, search, sortBy, sortDir)
  }, [page, search, sortBy, sortDir, fetchProducts])

  const handleProductCreated = useCallback(() => {
    fetchProducts(page, search, sortBy, sortDir)
  }, [page, search, sortBy, sortDir, fetchProducts])

  return (
    <PageContainer title="Products">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">Manage your product catalog, pricing, and status.</p>
        <Button onClick={() => { setIsCreateModalOpen(true); }}>
          <Plus size={16} className="mr-2" />
          Add Product
        </Button>
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
            onRowClick={(row) => { setViewProductId(row.id); }}
            onSearchChange={(val) => { setSearch(val); setPage(1); }}
            onSortChange={(col, dir) => { setSortBy(col); setSortDir(dir); setPage(1); }}
          />
        )}
      </div>

      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); }}
        onCreated={handleProductCreated}
      />

      <ViewProductModal
        isOpen={viewProductId !== null}
        onClose={() => { setViewProductId(null); }}
        onUpdated={handleProductCreated}
        productId={viewProductId}
      />
    </PageContainer>
  )
}
