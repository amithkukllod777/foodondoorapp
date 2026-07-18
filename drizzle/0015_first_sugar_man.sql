CREATE TABLE `whatsappContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(15) NOT NULL,
	`campaignId` int NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`deliveredAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappContacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`imageUrl` text,
	`buttonText` varchar(100) NOT NULL,
	`buttonUrl` text NOT NULL,
	`metaTemplateId` varchar(255),
	`approvalStatus` varchar(20) NOT NULL DEFAULT 'pending',
	`approvalMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `whatsappCampaigns` ADD `templateId` int;--> statement-breakpoint
ALTER TABLE `whatsappCampaigns` ADD `imageUrl` text;--> statement-breakpoint
ALTER TABLE `whatsappCampaigns` ADD `buttonText` varchar(100);--> statement-breakpoint
ALTER TABLE `whatsappCampaigns` ADD `buttonUrl` text;