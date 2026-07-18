ALTER TABLE `whatsappTemplates` MODIFY COLUMN `imageUrl` text DEFAULT (null);--> statement-breakpoint
ALTER TABLE `whatsappTemplates` MODIFY COLUMN `metaTemplateId` varchar(255) DEFAULT null;--> statement-breakpoint
ALTER TABLE `whatsappTemplates` MODIFY COLUMN `approvalMessage` text DEFAULT (null);