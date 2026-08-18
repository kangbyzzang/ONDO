CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`instagram` text NOT NULL,
	`locale` text DEFAULT 'ko' NOT NULL,
	`intent` text DEFAULT 'UNSURE' NOT NULL,
	`country` text DEFAULT 'OTHER' NOT NULL,
	`answers_json` text NOT NULL,
	`importance_json` text DEFAULT '{}' NOT NULL,
	`completion` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_instagram_unique` ON `submissions` (`instagram`);