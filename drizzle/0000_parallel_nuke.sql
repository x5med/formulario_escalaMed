CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`crm` text,
	`specialty` text,
	`city` text,
	`clinic` text,
	`revenue_range` text,
	`team_size` text,
	`main_difficulty` text,
	`objective` text,
	`bottleneck` text,
	`consent` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`referrer` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `leads_status_created_idx` ON `leads` (`status`,`created_at`);