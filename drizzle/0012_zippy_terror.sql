CREATE TABLE `pageViews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(500) NOT NULL,
	`referrer` varchar(500),
	`country` varchar(100),
	`city` varchar(100),
	`device` varchar(20),
	`browser` varchar(50),
	`os` varchar(50),
	`sessionId` varchar(64),
	`customerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pageViews_id` PRIMARY KEY(`id`)
);
