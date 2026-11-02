CREATE TABLE `upload_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`bytes` integer NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reservation_task` ON `upload_reservations` (`task_id`);--> statement-breakpoint
ALTER TABLE `submissions` ADD `received_at` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `expires_at` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `purged_at` text;--> statement-breakpoint
CREATE INDEX `submission_expiry` ON `submissions` (`expires_at`);