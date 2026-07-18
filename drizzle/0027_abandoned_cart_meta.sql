-- Abandoned cart metadata: channel (app/web), IP-derived location, and an
-- anonymous session id so guest carts dedup to one row instead of many.
-- Safe to run once against the live DB (TiDB/MySQL). The app code writes these
-- columns best-effort, so it works before AND after this migration is applied.
ALTER TABLE `abandonedCarts` ADD COLUMN `source` varchar(10);
ALTER TABLE `abandonedCarts` ADD COLUMN `location` varchar(160);
ALTER TABLE `abandonedCarts` ADD COLUMN `sessionId` varchar(64);
CREATE INDEX `abandonedCarts_session_idx` ON `abandonedCarts` (`sessionId`);
