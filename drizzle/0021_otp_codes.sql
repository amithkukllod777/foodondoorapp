CREATE TABLE IF NOT EXISTS `otpCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`codeHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`sendCount` int NOT NULL DEFAULT 0,
	`windowStartedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otpCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `otpCodes_phone_unique` UNIQUE(`phone`)
);
