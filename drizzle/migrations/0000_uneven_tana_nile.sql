CREATE TABLE `BackupLog` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`filePath` text NOT NULL,
	`sizeBytes` integer NOT NULL,
	`isAutomatic` integer DEFAULT false NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ClientHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clientId` integer NOT NULL,
	`fieldName` text NOT NULL,
	`oldValue` text NOT NULL,
	`newValue` text NOT NULL,
	`changedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ClientHistory_clientId_idx` ON `ClientHistory` (`clientId`);--> statement-breakpoint
CREATE TABLE `Client` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clientNumber` text NOT NULL,
	`name` text NOT NULL,
	`surname` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`zipCode` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Client_clientNumber_unique` ON `Client` (`clientNumber`);--> statement-breakpoint
CREATE TABLE `CreditNote` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creditNoteNumber` text NOT NULL,
	`returnId` integer NOT NULL,
	`amount` real NOT NULL,
	`issuedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`returnId`) REFERENCES `Return`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `CreditNote_creditNoteNumber_unique` ON `CreditNote` (`creditNoteNumber`);--> statement-breakpoint
CREATE UNIQUE INDEX `CreditNote_returnId_unique` ON `CreditNote` (`returnId`);--> statement-breakpoint
CREATE INDEX `CreditNote_returnId_idx` ON `CreditNote` (`returnId`);--> statement-breakpoint
CREATE TABLE `InventoryBatch` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`productId` integer NOT NULL,
	`purchaseOrderItemId` integer NOT NULL,
	`initialQty` integer NOT NULL,
	`remainingQty` integer NOT NULL,
	`reservedQty` integer DEFAULT 0 NOT NULL,
	`unitCost` real NOT NULL,
	`isReturnBatch` integer DEFAULT false NOT NULL,
	`receivedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchaseOrderItemId`) REFERENCES `PurchaseOrderItem`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `InventoryBatch_productId_receivedAt_idx` ON `InventoryBatch` (`productId`,`receivedAt`);--> statement-breakpoint
CREATE INDEX `InventoryBatch_purchaseOrderItemId_idx` ON `InventoryBatch` (`purchaseOrderItemId`);--> statement-breakpoint
CREATE TABLE `ProductHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`productId` integer NOT NULL,
	`fieldName` text NOT NULL,
	`oldValue` text NOT NULL,
	`newValue` text NOT NULL,
	`changedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ProductHistory_productId_idx` ON `ProductHistory` (`productId`);--> statement-breakpoint
CREATE TABLE `Product` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`skuNumber` text NOT NULL,
	`productGroup` text NOT NULL,
	`productFamily` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`imagePath` text,
	`defaultUnitCost` real NOT NULL,
	`defaultUnitPrice` real NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Product_skuNumber_unique` ON `Product` (`skuNumber`);--> statement-breakpoint
CREATE INDEX `Product_isActive_idx` ON `Product` (`isActive`);--> statement-breakpoint
CREATE INDEX `Product_productGroup_idx` ON `Product` (`productGroup`);--> statement-breakpoint
CREATE INDEX `Product_productFamily_idx` ON `Product` (`productFamily`);--> statement-breakpoint
CREATE TABLE `PurchaseOrderItem` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchaseOrderId` integer NOT NULL,
	`productId` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unitCost` real NOT NULL,
	FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `PurchaseOrderItem_purchaseOrderId_idx` ON `PurchaseOrderItem` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `PurchaseOrderItem_productId_idx` ON `PurchaseOrderItem` (`productId`);--> statement-breakpoint
CREATE TABLE `PurchaseOrder` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`poNumber` text NOT NULL,
	`supplierId` integer NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `PurchaseOrder_poNumber_unique` ON `PurchaseOrder` (`poNumber`);--> statement-breakpoint
CREATE INDEX `PurchaseOrder_supplierId_idx` ON `PurchaseOrder` (`supplierId`);--> statement-breakpoint
CREATE INDEX `PurchaseOrder_status_idx` ON `PurchaseOrder` (`status`);--> statement-breakpoint
CREATE TABLE `QuoteLineItem` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quoteId` integer NOT NULL,
	`productId` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unitPrice` real NOT NULL,
	`unitCost` real NOT NULL,
	`lineTotal` real NOT NULL,
	FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `QuoteLineItem_quoteId_idx` ON `QuoteLineItem` (`quoteId`);--> statement-breakpoint
CREATE INDEX `QuoteLineItem_productId_idx` ON `QuoteLineItem` (`productId`);--> statement-breakpoint
CREATE TABLE `QuoteVersion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quoteId` integer NOT NULL,
	`versionNumber` integer NOT NULL,
	`snapshot` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `QuoteVersion_quoteId_idx` ON `QuoteVersion` (`quoteId`);--> statement-breakpoint
CREATE TABLE `Quote` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quoteNumber` text NOT NULL,
	`salesLeadId` integer NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`taxProfileId` integer,
	`taxAmount` real DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`salesLeadId`) REFERENCES `SalesLead`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`taxProfileId`) REFERENCES `TaxProfile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Quote_quoteNumber_unique` ON `Quote` (`quoteNumber`);--> statement-breakpoint
CREATE INDEX `Quote_salesLeadId_idx` ON `Quote` (`salesLeadId`);--> statement-breakpoint
CREATE INDEX `Quote_status_idx` ON `Quote` (`status`);--> statement-breakpoint
CREATE TABLE `ReturnLineItem` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`returnId` integer NOT NULL,
	`saleLineItemId` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unitRefund` real NOT NULL,
	`lineRefund` real NOT NULL,
	FOREIGN KEY (`returnId`) REFERENCES `Return`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`saleLineItemId`) REFERENCES `SaleLineItem`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ReturnLineItem_returnId_idx` ON `ReturnLineItem` (`returnId`);--> statement-breakpoint
CREATE TABLE `Return` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`returnNumber` text NOT NULL,
	`saleId` integer NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`totalRefund` real DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`processedAt` text,
	FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Return_returnNumber_unique` ON `Return` (`returnNumber`);--> statement-breakpoint
CREATE INDEX `Return_saleId_idx` ON `Return` (`saleId`);--> statement-breakpoint
CREATE INDEX `Return_status_idx` ON `Return` (`status`);--> statement-breakpoint
CREATE TABLE `SaleLineItem` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`saleId` integer NOT NULL,
	`productId` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unitPrice` real NOT NULL,
	`blendedUnitCost` real NOT NULL,
	`lineRevenue` real NOT NULL,
	`lineCost` real NOT NULL,
	`lineProfit` real NOT NULL,
	FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `SaleLineItem_saleId_idx` ON `SaleLineItem` (`saleId`);--> statement-breakpoint
CREATE INDEX `SaleLineItem_productId_idx` ON `SaleLineItem` (`productId`);--> statement-breakpoint
CREATE TABLE `Sale` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`saleNumber` text NOT NULL,
	`quoteId` integer NOT NULL,
	`totalRevenue` real NOT NULL,
	`taxProfileId` integer,
	`taxAmount` real DEFAULT 0 NOT NULL,
	`totalCost` real NOT NULL,
	`profitAmount` real NOT NULL,
	`profitMargin` real NOT NULL,
	`saleDate` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`quoteId`) REFERENCES `Quote`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`taxProfileId`) REFERENCES `TaxProfile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Sale_saleNumber_unique` ON `Sale` (`saleNumber`);--> statement-breakpoint
CREATE UNIQUE INDEX `Sale_quoteId_unique` ON `Sale` (`quoteId`);--> statement-breakpoint
CREATE INDEX `Sale_saleDate_idx` ON `Sale` (`saleDate`);--> statement-breakpoint
CREATE TABLE `SalesLead` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`leadNumber` text NOT NULL,
	`clientId` integer NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SalesLead_leadNumber_unique` ON `SalesLead` (`leadNumber`);--> statement-breakpoint
CREATE INDEX `SalesLead_clientId_idx` ON `SalesLead` (`clientId`);--> statement-breakpoint
CREATE INDEX `SalesLead_status_idx` ON `SalesLead` (`status`);--> statement-breakpoint
CREATE TABLE `SupplierHistory` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplierId` integer NOT NULL,
	`fieldName` text NOT NULL,
	`oldValue` text NOT NULL,
	`newValue` text NOT NULL,
	`changedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `SupplierHistory_supplierId_idx` ON `SupplierHistory` (`supplierId`);--> statement-breakpoint
CREATE TABLE `Supplier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`contactName` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `TaxProfileComponent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`taxProfileId` integer NOT NULL,
	`name` text NOT NULL,
	`rate` real NOT NULL,
	`type` text DEFAULT 'PERCENTAGE' NOT NULL,
	FOREIGN KEY (`taxProfileId`) REFERENCES `TaxProfile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `TaxProfileComponent_taxProfileId_idx` ON `TaxProfileComponent` (`taxProfileId`);--> statement-breakpoint
CREATE TABLE `TaxProfile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `TaxProfile_name_unique` ON `TaxProfile` (`name`);