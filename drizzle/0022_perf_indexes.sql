CREATE INDEX `addresses_customerId_idx` ON `addresses` (`customerId`);
--> statement-breakpoint
CREATE INDEX `orders_customerId_createdAt_idx` ON `orders` (`customerId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `orders_phone_createdAt_idx` ON `orders` (`phone`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `orders_createdAt_idx` ON `orders` (`createdAt`);
--> statement-breakpoint
CREATE INDEX `productReviews_productId_createdAt_idx` ON `productReviews` (`productId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `blogPosts_published_createdAt_idx` ON `blogPosts` (`published`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `products_status_sortOrder_idx` ON `products` (`status`,`sortOrder`);
--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);
--> statement-breakpoint
CREATE INDEX `productImages_productId_sortOrder_idx` ON `productImages` (`productId`,`sortOrder`);
--> statement-breakpoint
CREATE INDEX `abandonedCarts_phone_idx` ON `abandonedCarts` (`phone`);
--> statement-breakpoint
CREATE INDEX `pageViews_createdAt_idx` ON `pageViews` (`createdAt`);
--> statement-breakpoint
CREATE INDEX `whatsappMessages_conversationId_sentAt_idx` ON `whatsappMessages` (`conversationId`,`sentAt`);
