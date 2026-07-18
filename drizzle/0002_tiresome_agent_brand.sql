CREATE TABLE `blogPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(500) NOT NULL,
	`excerpt` text,
	`content` text,
	`coverImage` text,
	`category` varchar(100),
	`published` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogPosts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogPosts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `productReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`customerId` int NOT NULL DEFAULT 0,
	`customerName` varchar(255) NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(255),
	`body` text,
	`verified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappSubscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(15) NOT NULL,
	`name` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappSubscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsappSubscribers_phone_unique` UNIQUE(`phone`)
);
