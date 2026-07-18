CREATE TABLE `whatsappCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`targetSegment` varchar(50) NOT NULL DEFAULT 'all',
	`totalSent` int NOT NULL DEFAULT 0,
	`totalDelivered` int NOT NULL DEFAULT 0,
	`totalFailed` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `whatsappCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(15) NOT NULL,
	`customerName` varchar(255),
	`messageType` varchar(50) NOT NULL,
	`templateName` varchar(100),
	`orderId` varchar(20),
	`campaignId` int,
	`status` varchar(20) NOT NULL DEFAULT 'sent',
	`metaMessageId` varchar(255),
	`errorMessage` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappLogs_id` PRIMARY KEY(`id`)
);
