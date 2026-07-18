CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(15) NOT NULL,
	`flat` text NOT NULL,
	`area` text,
	`city` varchar(100) NOT NULL,
	`state` varchar(100) NOT NULL DEFAULT '',
	`pincode` varchar(10) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(15) NOT NULL,
	`name` text,
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `customerProfiles_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(20) NOT NULL,
	`customerId` int NOT NULL DEFAULT 0,
	`customerName` varchar(255) NOT NULL,
	`phone` varchar(15) NOT NULL,
	`email` varchar(320) DEFAULT '',
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`state` varchar(100) NOT NULL DEFAULT '',
	`pincode` varchar(10) NOT NULL,
	`items` json NOT NULL,
	`subtotal` int NOT NULL,
	`couponCode` varchar(50),
	`couponDiscount` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`paymentMethod` enum('COD','UPI','Card','Advance') NOT NULL,
	`paymentPlan` enum('full','advance30','cod') NOT NULL DEFAULT 'cod',
	`amountPaid` int NOT NULL DEFAULT 0,
	`status` enum('placed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'placed',
	`awbCode` varchar(100),
	`trackingUrl` text,
	`shippingProvider` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
