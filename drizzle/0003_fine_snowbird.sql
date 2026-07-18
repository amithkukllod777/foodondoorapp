CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` varchar(255),
	`discountType` enum('percent','flat') NOT NULL DEFAULT 'percent',
	`discountValue` int NOT NULL,
	`minOrderAmount` int NOT NULL DEFAULT 0,
	`maxUses` int NOT NULL DEFAULT 0,
	`usedCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `productStock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`stock` int NOT NULL DEFAULT 100,
	`lowStockThreshold` int NOT NULL DEFAULT 10,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productStock_id` PRIMARY KEY(`id`),
	CONSTRAINT `productStock_productId_unique` UNIQUE(`productId`)
);
