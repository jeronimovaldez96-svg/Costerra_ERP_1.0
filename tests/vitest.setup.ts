import { vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { initDatabase, closeDatabase, getRawSqlite } from '../src/main/database/client'

// Hard-mock Electron to prevent errors during Node execution
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/tmp/costerra-test-${name}`),
    getAppPath: vi.fn(() => process.cwd()),
    isPackaged: false
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn()
  }
}))

// Override NODE_ENV to force :memory: database
process.env.NODE_ENV = 'test'

beforeAll(() => {
  // Initializes better-sqlite3 with ':memory:' and runs migrations
  initDatabase()
})

afterAll(() => {
  closeDatabase()
})

beforeEach(() => {
  const db = getRawSqlite()
  // Clean all tables to guarantee pristine state for every test
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM SaleLineItem;
    DELETE FROM Sale;
    DELETE FROM QuoteVersion;
    DELETE FROM QuoteLineItem;
    DELETE FROM Quote;
    DELETE FROM SalesLead;
    DELETE FROM TaxProfileComponent;
    DELETE FROM TaxProfile;
    DELETE FROM InventoryBatch;
    DELETE FROM PurchaseOrderItem;
    DELETE FROM PurchaseOrder;
    DELETE FROM ProductHistory;
    DELETE FROM Product;
    DELETE FROM SupplierHistory;
    DELETE FROM Supplier;
    DELETE FROM ClientHistory;
    DELETE FROM Client;
    PRAGMA foreign_keys = ON;
  `)
})
