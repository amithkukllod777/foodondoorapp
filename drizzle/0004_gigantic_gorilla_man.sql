CREATE TABLE `abandonedCarts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`phone` varchar(15),
	`name` varchar(255),
	`items` json NOT NULL,
	`total` int NOT NULL DEFAULT 0,
	`recovered` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `abandonedCarts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storeSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `storeSettings_key_unique` UNIQUE(`key`)
);
