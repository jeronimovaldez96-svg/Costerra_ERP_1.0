CREATE TABLE `SystemSettings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SystemSettings_key_unique` ON `SystemSettings` (`key`);