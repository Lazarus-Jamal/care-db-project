-- ============================================================================
-- Migration: Pharmacy Inventory Count (mirrors care_wh_inventory_counts /
-- care_wh_inventory_count_items, adapted for pharmacy — no batch/location
-- tracking exists on the pharmacy side, so those columns are omitted).
--
-- Nothing in this environment can execute DDL against your live database —
-- please review and run this yourself before deploying the corresponding
-- code (models + controller + views assume these tables already exist).
-- ============================================================================

CREATE TABLE `care_pharma_inventory_counts` (
  `count_id` int NOT NULL AUTO_INCREMENT,
  `count_number` varchar(30) NOT NULL DEFAULT '',
  `count_type` varchar(20) NOT NULL DEFAULT 'full' COMMENT 'cycle_20pct | full | year_end',
  `status` varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft | in_progress | pending_approval | approved | cancelled',
  `count_date` date NOT NULL,
  `initiated_by` varchar(60) NOT NULL DEFAULT '',
  `approved_by` varchar(60) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`count_id`),
  KEY `idx_pharma_count_status` (`status`),
  KEY `idx_pharma_count_type` (`count_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `care_pharma_inventory_count_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `count_id` int NOT NULL,
  `item_id` int NOT NULL COMMENT 'FK -> care_drugsandservices.item_id',
  `system_qty` int NOT NULL DEFAULT '0' COMMENT 'care_drugsandservices.quantity at count creation — frozen, not shown until results entry',
  `counted_qty` int DEFAULT NULL COMMENT 'Physical count entered by staff (NULL = not yet counted)',
  `variance` int GENERATED ALWAYS AS ((ifnull(`counted_qty`,0) - `system_qty`)) STORED COMMENT 'counted_qty - system_qty',
  `variance_reason` text,
  `counted_by` varchar(60) DEFAULT NULL,
  `counted_at` datetime DEFAULT NULL,
  `adjustment_applied` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = stock adjustment recorded after approval',
  PRIMARY KEY (`id`),
  KEY `idx_pharma_count_item_count` (`count_id`),
  KEY `idx_pharma_count_item_item` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
