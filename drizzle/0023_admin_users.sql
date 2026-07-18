CREATE TABLE IF NOT EXISTS `adminUsers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `email` varchar(320) NOT NULL,
  `name` varchar(200),
  `mobile` varchar(15),
  `passwordHash` varchar(200) NOT NULL,
  `adminRole` enum('owner','admin','manager') NOT NULL DEFAULT 'admin',
  `resetToken` varchar(128),
  `resetTokenExp` timestamp,
  `lastLoginAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `adminUsers_id` PRIMARY KEY(`id`),
  CONSTRAINT `adminUsers_email_unique` UNIQUE(`email`)
);
