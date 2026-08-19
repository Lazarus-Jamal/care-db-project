-- ============================================================================
-- Migration: care_user_facilities (Multi-Facility Phase 1 — Foundation)
-- Database: caredb
--
-- SAFE TO RE-RUN. Creates the join table that lets a user be authorized for
-- more than one facility, then backfills every existing user's current
-- (single) facility_id as their one row, marked as their default. Nothing
-- here drops or modifies care_users/care_staff — care_users.facility_id
-- stays exactly as it is today, now meaning "home/default facility".
-- ============================================================================

USE `caredb`;

CREATE TABLE IF NOT EXISTS `care_user_facilities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `facility_id` int NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_facility` (`user_id`,`facility_id`),
  KEY `idx_user_facilities_user` (`user_id`),
  KEY `idx_user_facilities_facility` (`facility_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Backfill: every existing user with a facility_id gets exactly one row here,
-- marked as their default. Safe to re-run — INSERT IGNORE means a user who
-- already has this row (e.g. from a prior run of this script) is skipped,
-- not duplicated. Users with facility_id IS NULL (not yet assigned to any
-- facility) are deliberately left with zero rows — they'll need an admin to
-- assign at least one facility before they can log in under the new model.
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO `care_user_facilities` (`user_id`, `facility_id`, `is_default`)
SELECT `user_id`, `facility_id`, 1
FROM `care_users`
WHERE `facility_id` IS NOT NULL;
