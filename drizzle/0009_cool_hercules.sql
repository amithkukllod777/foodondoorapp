ALTER TABLE `blogPosts` MODIFY COLUMN `content` longtext;--> statement-breakpoint
ALTER TABLE `blogPosts` MODIFY COLUMN `published` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `blogPosts` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `blogPosts` ADD `author` varchar(255) DEFAULT 'Nutriwow Team';--> statement-breakpoint
ALTER TABLE `blogPosts` ADD `seoTitle` varchar(500);--> statement-breakpoint
ALTER TABLE `blogPosts` ADD `seoDescription` text;--> statement-breakpoint
ALTER TABLE `blogPosts` ADD `status` varchar(20) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `blogPosts` ADD `publishedAt` timestamp;