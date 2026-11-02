ALTER TABLE `submissions` ADD `contact` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `print_options` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `status` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `mode` text DEFAULT 'homework' NOT NULL;