CREATE TABLE `homepageSections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionType` varchar(50) NOT NULL,
	`productId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `homepageSections_id` PRIMARY KEY(`id`)
);
