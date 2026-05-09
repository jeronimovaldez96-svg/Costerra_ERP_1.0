import { app, BrowserWindow, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs/promises'
import { getQuote } from './quote.service'
import { getSalesLead } from './sales-lead.service'
import { getClient } from './client.service'
import { getSale } from './sale.service'
import { generateQuoteHtml, type QuoteTemplateData } from '../templates/quote.template'
import { generateSaleHtml, type SaleTemplateData } from '../templates/sale.template'

/**
 * Highly controlled internal headless browser for rendering PDF buffers natively.
 */
async function generatePdfBufferFromHtml(htmlContent: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Hidden window logic
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    win.webContents.on('did-finish-load', () => {
      void (async () => {
        try {
          const pdfBuffer = await win.webContents.printToPDF({
            printBackground: true,
            margins: { marginType: 'none' }, // CSS handles padding
            pageSize: 'A4'
          })
          win.destroy()
          resolve(pdfBuffer)
        } catch (error) {
          win.destroy()
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      })()
    })

    win.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
      win.destroy()
      reject(new Error(`Headless render failed: ${errorDescription} (${errorCode.toString()})`))
    })

    // Encode to data URL to avoid writing temp HTML files
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    void win.loadURL(dataUrl)
  })
}

/**
 * Utility to write buffer to system Temp directory explicitly.
 */
async function writeBufferToTemp(filename: string, buffer: Buffer): Promise<string> {
  const tempDir = app.getPath('temp')
  const savePath = path.join(tempDir, filename)
  await fs.writeFile(savePath, buffer)
  return savePath
}

export async function generateQuotePdf(quoteId: number): Promise<string> {
  const quoteData = getQuote(quoteId)
  const leadData = getSalesLead(quoteData.salesLeadId)
  const clientData = getClient(leadData.clientId)

  const templateData: QuoteTemplateData = {
    quote: quoteData,
    lineItems: quoteData.lineItems,
    taxProfile: quoteData.taxProfile,
    lead: leadData,
    client: clientData
  }

  const rawHtml = generateQuoteHtml(templateData)
  const buffer = await generatePdfBufferFromHtml(rawHtml)
  
  return writeBufferToTemp(`Quote_${quoteData.quoteNumber}.pdf`, buffer)
}

export async function generateSalePdf(saleId: number): Promise<string> {
  const saleData = getSale(saleId)
  const quoteData = getQuote(saleData.quoteId)
  const leadData = getSalesLead(quoteData.salesLeadId)
  const clientData = getClient(leadData.clientId)

  const templateData: SaleTemplateData = {
    sale: saleData,
    lineItems: saleData.lineItems,
    quote: quoteData,
    taxProfile: quoteData.taxProfile,
    lead: leadData,
    client: clientData
  }

  const rawHtml = generateSaleHtml(templateData)
  const buffer = await generatePdfBufferFromHtml(rawHtml)

  return writeBufferToTemp(`Invoice_${saleData.saleNumber}.pdf`, buffer)
}

/**
 * Utility exclusively executing the Electron native 'Save As' Dialog sequentially from an IPC call.
 */
export async function promptSaveTemporaryPdf(tempPath: string, defaultName: string) {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save PDF Document',
    defaultPath: defaultName,
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
  })

  if (canceled || !filePath) return null

  // Copy temp file to target
  await fs.copyFile(tempPath, filePath)
  return filePath
}
