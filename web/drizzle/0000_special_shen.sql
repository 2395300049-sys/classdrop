CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`student_id` text NOT NULL,
	`name` text NOT NULL,
	`receipt_hash` text NOT NULL,
	`files` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_student_unique` ON `submissions` (`task_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`course` text NOT NULL,
	`description` text NOT NULL,
	`expected` integer NOT NULL,
	`deadline` text NOT NULL,
	`roster` text NOT NULL,
	`closed` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL
);
