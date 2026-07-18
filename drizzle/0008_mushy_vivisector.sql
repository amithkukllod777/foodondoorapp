CREATE TABLE `whatsappConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(15) NOT NULL,
	`customerName` varchar(255),
	`lastMessage` text,
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`unreadCount` int NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'open',
	`assignedTo` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappConversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsappConversations_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `whatsappMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`phone` varchar(15) NOT NULL,
	`direction` varchar(10) NOT NULL,
	`messageType` varchar(30) NOT NULL DEFAULT 'text',
	`content` text NOT NULL,
	`metaMessageId` varchar(255),
	`status` varchar(20) NOT NULL DEFAULT 'sent',
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappMessages_id` PRIMARY KEY(`id`)
);
