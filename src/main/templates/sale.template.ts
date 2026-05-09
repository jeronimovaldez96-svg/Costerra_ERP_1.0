import type { Sale, Quote, Product, TaxProfile, Client, SalesLead } from '../../shared/types'

type EnrichedSaleLineItem = {
  productId: number
  quantity: number
  unitPrice: number
  lineRevenue: number
  product: Product
}

type EnrichedTaxProfile = TaxProfile & { components: any[] }

export interface SaleTemplateData {
  sale: Sale
  lineItems: EnrichedSaleLineItem[]
  quote: Quote
  taxProfile: EnrichedTaxProfile | null
  client: Client
  lead: SalesLead
  companyInfo?: {
    name: string
    address: string
    phone: string
    email: string
    logoUrl?: string
  }
}

export function generateSaleHtml({ sale, lineItems, quote, taxProfile, client, lead, companyInfo }: SaleTemplateData): string {
  // Use the revenue fields directly mapped in the DB rather than recalculating to assure financial integrity
  const subtotal = sale.totalRevenue
  const taxAmount = sale.taxAmount
  const total = subtotal + taxAmount

  const formatCurrency = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Antigravity Aesthetic Styles (Clean, Monochrome, Minimalist, High-Tech)
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        :root {
          --color-bg: #FAFAFA;
          --color-surface: #FFFFFF;
          --color-text-main: #111827;
          --color-text-muted: #6B7280;
          --color-border: #E5E7EB;
          --color-primary: #0F172A;
          --color-accent: #2563EB;
          --color-success: #10B981;
          --spacing-xs: 0.5rem;
          --spacing-sm: 1rem;
          --spacing-md: 2rem;
          --spacing-lg: 3rem;
          --radius-md: 12px;
        }

        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
            background: var(--color-surface);
          }
          .page {
            width: 100%;
            height: 100%;
            padding: 2rem !important;
            box-sizing: border-box;
            box-shadow: none !important;
          }
        }

        body {
          font-family: 'Inter', sans-serif;
          background: var(--color-bg);
          color: var(--color-text-main);
          line-height: 1.5;
          margin: 0;
          padding: var(--spacing-md);
        }

        .page {
          background: var(--color-surface);
          max-width: 800px;
          margin: 0 auto;
          padding: var(--spacing-lg);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          border: 1px solid var(--color-border);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-md);
          border-bottom: 2px solid var(--color-border);
        }

        .brand h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-primary);
        }
        
        .brand p {
          margin: 0.25rem 0 0;
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }

        .badge {
          display: inline-block;
          background: #ECFDF5;
          color: #047857;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          margin-bottom: var(--spacing-sm);
        }

        .doc-title {
          text-align: right;
        }

        .doc-title h2 {
          margin: 0;
          font-size: 2rem;
          font-weight: 300;
          letter-spacing: -0.02em;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }

        .doc-title .sale-num {
          font-weight: 600;
          color: var(--color-primary);
          font-size: 1.25rem;
          margin-top: var(--spacing-xs);
        }

        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .meta-box h3 {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin: 0 0 var(--spacing-xs);
        }

        .meta-box p {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .meta-box .sub-text {
          font-weight: 400;
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-bottom: var(--spacing-lg);
        }

        th {
          text-align: left;
          padding: var(--spacing-sm) var(--spacing-xs);
          border-bottom: 2px solid var(--color-border);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }

        th.right, td.right {
          text-align: right;
        }

        td {
          padding: var(--spacing-sm) var(--spacing-xs);
          border-bottom: 1px solid var(--color-border);
          font-size: 0.95rem;
          color: var(--color-primary);
        }

        .product-name {
          font-weight: 600;
        }

        .product-meta {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin-top: 2px;
        }

        .totals {
          width: 50%;
          margin-left: auto;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: var(--spacing-xs) 0;
          font-size: 0.95rem;
        }

        .total-row.grand {
          border-top: 2px solid var(--color-primary);
          margin-top: var(--spacing-xs);
          padding-top: var(--spacing-sm);
          font-size: 1.25rem;
          font-weight: 700;
        }

        .footer {
          margin-top: var(--spacing-lg);
          text-align: center;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          border-top: 1px solid var(--color-border);
          padding-top: var(--spacing-sm);
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="brand">
            <h1>${companyInfo?.name || 'Costerra Local Systems'}</h1>
            <p>${companyInfo?.address || '123 Enterprise Drive, Business City'}</p>
            <p>${companyInfo?.email || 'contact@costerra.local'} | ${companyInfo?.phone || '+1 (555) 123-4567'}</p>
          </div>
          <div class="doc-title">
            <span class="badge">EXECUTED SALE / INVOICE</span>
            <h2>INVOICE</h2>
            <div class="sale-num">#${sale.saleNumber}</div>
            <p style="margin: 4px 0 0; color: var(--color-text-muted); font-size: 0.875rem;">
              Date: ${formatDate(sale.saleDate)}
            </p>
          </div>
        </div>

        <!-- Meta -->
        <div class="meta-grid">
          <div class="meta-box">
            <h3>Billed To</h3>
            <p>${client.name} ${client.surname}</p>
            ${client.address ? `<div class="sub-text">${client.address}<br>${client.city} ${client.zipCode}</div>` : ''}
            ${client.email ? `<div class="sub-text">${client.email}</div>` : ''}
            ${client.phone ? `<div class="sub-text">${client.phone}</div>` : ''}
          </div>
          <div class="meta-box">
            <h3>References</h3>
            <p><strong>Quote:</strong> ${quote.quoteNumber}</p>
            <div class="sub-text"><strong>Lead:</strong> ${lead.name} (${lead.leadNumber})</div>
          </div>
        </div>

        <!-- Line Items -->
        <table>
          <thead>
            <tr>
              <th>Item / Description</th>
              <th class="right">Qty</th>
              <th class="right">Unit Price</th>
              <th class="right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map(item => `
              <tr>
                <td>
                  <div class="product-name">${item.product.name}</div>
                  <div class="product-meta">${item.product.productGroup} / ${item.product.color || 'Standard'}</div>
                </td>
                <td class="right">${item.quantity}</td>
                <td class="right">${formatCurrency(item.unitPrice)}</td>
                <td class="right">${formatCurrency(item.lineRevenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ${taxProfile ? `
            <div class="total-row">
              <span>Tax (${taxProfile.name})</span>
              <span>${formatCurrency(taxAmount)}</span>
            </div>
          ` : ''}
          <div class="total-row grand">
            <span>Total USD</span>
            <span>${formatCurrency(total)}</span>
          </div>
        </div>
        
        <div class="footer">
          Thank you for your business. Prepared via Costerra ERP.
        </div>
      </div>
    </body>
    </html>
  `
}
