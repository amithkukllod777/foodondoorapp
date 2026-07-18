CREATE INDEX `whatsappLogs_metaMessageId_idx` ON `whatsappLogs` (`metaMessageId`);
--> statement-breakpoint
CREATE INDEX `whatsappLogs_phone_sentAt_idx` ON `whatsappLogs` (`phone`, `sentAt`);
--> statement-breakpoint
CREATE INDEX `whatsappLogs_campaignId_status_idx` ON `whatsappLogs` (`campaignId`, `status`);
--> statement-breakpoint
CREATE INDEX `emailLogs_campaignId_sentAt_idx` ON `emailLogs` (`campaignId`, `sentAt`);
--> statement-breakpoint
CREATE INDEX `stockAlerts_productId_idx` ON `stockAlerts` (`productId`);
