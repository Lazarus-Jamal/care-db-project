-- Consolidated Migration Script for caredb

-- Optimization 1: Replace ENUM with TINYINT


-- Create the database
CREATE DATABASE IF NOT EXISTS caredb;

-- Select the database to use
USE caredb;

CREATE TABLE IF NOT EXISTS `care_accesslog` (
  `id` INT(11) NOT NULL AUTO_INCREMENT, -- Unique identifier for each log entry
  `datetime` DATETIME NOT NULL, -- Timestamp of when the access event occurred
  `ip` VARCHAR(45) COLLATE utf8mb4_unicode_ci NOT NULL, -- IP address of the user (supports IPv4 and IPv6)
  `lognote` TEXT COLLATE utf8mb4_unicode_ci NOT NULL, -- Description or note about the access event
  `userid` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL, -- Unique identifier of the user involved
  `username` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL, -- Username used during the access event
  `thisfile` TEXT COLLATE utf8mb4_unicode_ci NOT NULL, -- File or script that was accessed
  `fileforward` TEXT COLLATE utf8mb4_unicode_ci NOT NULL, -- File or URL the user was redirected to
  `login_success` TINYINT(1) NOT NULL DEFAULT 1, -- 1 if login was successful, 0 if failed
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS `care_address_citytown` (
  `nr` mediumint(8) unsigned NOT NULL auto_increment,
  `unece_modifier` char(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unece_locode` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `zip_code` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `iso_country_id` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `unece_locode_type` tinyint(3) unsigned DEFAULT NULL,
  `unece_coordinates` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `info_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `use_frequency` bigint(20) unsigned NOT NULL DEFAULT 0,
  `status` varchar(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `history` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` varchar(35) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `modify_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` varchar(35) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_facilities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `code` VARCHAR(10) COLLATE utf8mb4_0900_ai_ci NOT NULL UNIQUE,
  `type` ENUM('Hospital', 'Health Center', 'Clinic') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `parent_id` INT DEFAULT NULL,

  -- Director
  `director_name` VARCHAR(255) COLLATE utf8mb4_0900_ai_ci,
  `director_title` VARCHAR(100) COLLATE utf8mb4_0900_ai_ci,
  `director_phone` VARCHAR(50) COLLATE utf8mb4_0900_ai_ci,

  -- Head Nurse
  `head_nurse_name` VARCHAR(255) COLLATE utf8mb4_0900_ai_ci,
  `head_nurse_title` VARCHAR(100) COLLATE utf8mb4_0900_ai_ci,
  `head_nurse_phone` VARCHAR(50) COLLATE utf8mb4_0900_ai_ci,

  -- Finance Officer
  `finance_officer_name` VARCHAR(255) COLLATE utf8mb4_0900_ai_ci,
  `finance_officer_title` VARCHAR(100) COLLATE utf8mb4_0900_ai_ci,
  `finance_officer_phone` VARCHAR(50) COLLATE utf8mb4_0900_ai_ci,

  -- Location
  `address` TEXT COLLATE utf8mb4_0900_ai_ci,
  `city` VARCHAR(100) COLLATE utf8mb4_0900_ai_ci,
  `region` VARCHAR(100) COLLATE utf8mb4_0900_ai_ci,
  `country` VARCHAR(100) COLLATE utf8mb4_0900_ai_ci DEFAULT 'Cameroon',
  `latitude` DECIMAL(10, 8),
  `longitude` DECIMAL(11, 8),

  -- Timestamps
  `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  FOREIGN KEY (`parent_id`) REFERENCES `care_facilities`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS `care_encounter_appointment` (
  `nr` bigint(20) unsigned NOT NULL auto_increment,
  `pid` int(11) NOT NULL DEFAULT 0,
  `date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `time` time NOT NULL DEFAULT '00:00:00',
  `to_dept_id` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `to_dept_nr` smallint(5) unsigned NOT NULL DEFAULT 0,
  `to_staff_nr` int(11) NOT NULL DEFAULT 0,
  `to_staff_name` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purpose` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `urgency` tinyint(2) unsigned NOT NULL DEFAULT 0,
  `remind` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `remind_email` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `remind_mail` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `remind_phone` tinyint(1) unsigned NOT NULL DEFAULT 0,
  `appt_status` varchar(35) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `cancel_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cancel_date` date DEFAULT NULL,
  `cancel_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `encounter_class_nr` int(1) NOT NULL DEFAULT 0,
  `encounter_nr` int(11) NOT NULL DEFAULT 0,
  `status` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` varchar(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` varchar(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `pid` (`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_billing_archive` (
  `bill_no` bigint(20) NOT NULL default '0',
  `encounter_nr` int(10) NOT NULL default '0',
  `patient_name` tinytext COLLATE utf8mb4_unicode_ci NOT NULL,
  `vorname` varchar(35) COLLATE utf8mb4_unicode_ci NOT NULL default '0',
  `bill_date_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `bill_amt` double(16,4) NOT NULL default '0.0000',
  `payment_date_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_mode` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `cheque_no` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL default '0',
  `creditcard_no` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL default '0',
  `paid_by` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL default '0',
  PRIMARY KEY (`bill_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_billing_bill` (
  `bill_bill_no` bigint(20) NOT NULL default '0',
  `bill_encounter_nr` int(10) unsigned NOT NULL default '0',
  `bill_date_time` date DEFAULT NULL,
  `bill_amount` float(10,2) DEFAULT NULL,
  `bill_outstanding` float(10,2) DEFAULT NULL,
  PRIMARY KEY (`bill_bill_no`),
  KEY `index_bill_patnum` (`bill_encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;


CREATE TABLE IF NOT EXISTS `care_billing_bill_item` (
  `bill_item_id` int(11) NOT NULL auto_increment,
  `pid` int(10) NOT NULL DEFAULT 0,
  `bill_item_encounter_nr` int(10) unsigned NOT NULL default '0',
  `bill_item_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bill_item_unit_cost` float(10,2) DEFAULT '0.00',
  `bill_item_units` tinyint(4) DEFAULT NULL,
  `bill_item_amount` float(10,2) DEFAULT NULL,
  `bill_item_date` datetime DEFAULT NULL,
  `bill_item_status` TINYINT(1) DEFAULT 0,
  `bill_item_bill_no` int(11) NOT NULL default '0',
  PRIMARY KEY (`bill_item_id`),
  KEY `index_bill_item_patnum` (`bill_item_encounter_nr`),
  KEY `index_bill_item_bill_no` (`bill_item_bill_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;


CREATE TABLE IF NOT EXISTS `care_billing_final` (
  `final_id` tinyint(3) NOT NULL auto_increment,
  `final_encounter_nr` int(10) unsigned NOT NULL default '0',
  `final_bill_no` int(11) DEFAULT NULL,
  `final_date` date DEFAULT NULL,
  `final_total_bill_amount` float(10,2) DEFAULT NULL,
  `final_discount` tinyint(4) DEFAULT NULL,
  `final_total_receipt_amount` float(10,2) DEFAULT NULL,
  `final_amount_due` float(10,2) DEFAULT NULL,
  `final_amount_recieved` float(10,2) DEFAULT NULL,
  PRIMARY KEY (`final_id`),
  KEY `index_final_patnum` (`final_encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;


CREATE TABLE IF NOT EXISTS `care_billing_item` (
  `item_code` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_description` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `item_unit_cost` float(10,2) DEFAULT '0.00',
  `item_type` tinytext COLLATE utf8mb4_unicode_ci,
  `item_discount_max_allowed` tinyint(4) unsigned DEFAULT 0,
  PRIMARY KEY (`item_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;


CREATE TABLE IF NOT EXISTS `care_billing_payment` (
  `payment_id` tinyint(5) NOT NULL auto_increment,
  `payment_encounter_nr` int(10) unsigned NOT NULL default '0',
  `payment_receipt_no` int(11) NOT NULL default '0',
  `payment_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `payment_cash_amount` float(10,2) DEFAULT '0.00',
  `payment_cheque_no` int(11) DEFAULT 0,
  `payment_cheque_amount` float(10,2) DEFAULT '0.00',
  `payment_creditcard_no` int(25) DEFAULT 0,
  `payment_creditcard_amount` float(10,2) DEFAULT '0.00',
  `payment_amount_total` float(10,2) DEFAULT '0.00',
  PRIMARY KEY (`payment_id`),
  KEY `index_payment_patnum` (`payment_encounter_nr`),
  KEY `index_payment_receipt_no` (`payment_receipt_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;


CREATE TABLE IF NOT EXISTS `care_cache` (
  `id` varchar(125) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ctext` text COLLATE utf8mb4_unicode_ci,
  `cbinary` blob,
  `tstamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;


CREATE TABLE IF NOT EXISTS `care_category_diagnosis` (
  `nr` TINYINT(3) UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_code` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var_short_code` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hide_from` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_category_disease` (
  `nr` TINYINT(3) UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_nr` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  `category` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_category_procedure` (
  `nr` TINYINT(3) UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_code` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var_short_code` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hide_from` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_classif_neonatal` (
  `nr` SMALLINT(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_class_encounter` (
  `class_nr` SMALLINT(6) UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hide_from` TINYINT(4) NOT NULL DEFAULT 0,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`class_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_class_financial` (
  `class_nr` SMALLINT(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_id` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `type` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `code` VARCHAR(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `policy` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`class_nr`),
  KEY `class_2` (`class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_class_insurance` (
  `class_nr` SMALLINT(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`class_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_class_therapy` (
  `nr` SMALLINT(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_nr` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  `class` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_complication` (
  `nr` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_nr` INT(11) UNSIGNED NOT NULL DEFAULT 0,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` VARCHAR(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_config_global` (
  `type` VARCHAR(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_config_user` (
  `user_id` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serial_config_data` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_currency` (
  `item_no` SMALLINT(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `short_name` VARCHAR(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `long_name` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `info` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_no`),
  KEY `short_name` (`short_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_department` (
  `nr` MEDIUMINT(8) UNSIGNED NOT NULL AUTO_INCREMENT, -- Unique identifier for the department
  `id` VARCHAR(60) COLLATE utf8mb4_unicode_ci NOT NULL, -- Internal department code or short identifier
  `type` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL, -- Type of department (e.g., clinical, administrative)
  `name_formal` VARCHAR(60) COLLATE utf8mb4_unicode_ci NOT NULL, -- Full formal name of the department
  `name_short` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL, -- Short name or abbreviation
  `name_alternate` VARCHAR(225) COLLATE utf8mb4_unicode_ci DEFAULT NULL, -- Optional alternate name
  `LD_var` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL, -- Language-dependent variable name (for localization)
  `description` TEXT COLLATE utf8mb4_unicode_ci NOT NULL, -- Description or purpose of the department
  `admit_inpatient` BOOLEAN NOT NULL DEFAULT FALSE, -- Whether the department admits inpatients
  `admit_outpatient` BOOLEAN NOT NULL DEFAULT FALSE, -- Whether the department admits outpatients
  `has_oncall_doc` BOOLEAN NOT NULL DEFAULT TRUE, -- Whether the department has on-call doctors
  `has_oncall_nurse` BOOLEAN NOT NULL DEFAULT TRUE, -- Whether the department has on-call nurses
  `does_surgery` BOOLEAN NOT NULL DEFAULT FALSE, -- Whether the department performs surgeries
  `this_institution` BOOLEAN NOT NULL DEFAULT TRUE, -- Whether the department belongs to this institution
  `is_sub_dept` BOOLEAN NOT NULL DEFAULT FALSE, -- Whether this is a sub-department
  `parent_dept_nr` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0, -- Reference to parent department if it's a sub-department
  `work_hours` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL, -- General working hours
  `consult_hours` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL, -- Consultation hours
  `is_inactive` BOOLEAN NOT NULL DEFAULT FALSE, -- Whether the department is inactive
  `sort_order` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0, -- Order for sorting departments in UI
  `address` TEXT COLLATE utf8mb4_unicode_ci, -- Physical address of the department
  `sig_line` VARCHAR(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL, -- Signature line for official documents
  `sig_stamp` TEXT COLLATE utf8mb4_unicode_ci, -- Signature stamp or image
  `logo_mime_type` VARCHAR(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL, -- MIME type of the department logo
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL, -- Status (e.g., active, archived)
  `history` TEXT COLLATE utf8mb4_unicode_ci, -- Change history or audit trail
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL, -- User ID who last modified the record
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Last modification timestamp
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL, -- User ID who created the record
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
  `is_pharmacy` TINYINT(4) NOT NULL COMMENT 'is a pharmacy, or a normal dept ?', -- 1 if this is a pharmacy department
  `pharma_dept_nr` TINYINT(3) UNSIGNED DEFAULT 0 COMMENT 'the pharmacy to which the department is connected', -- Reference to parent pharmacy department
  PRIMARY KEY (`nr`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `care_diagnosis_localcode` (
  `localcode` VARCHAR(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `class_sub` VARCHAR(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `inclusive` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `exclusive` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `std_code` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sub_level` TINYINT(4) NOT NULL DEFAULT 0,
  `remarks` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `extra_codes` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `extra_subclass` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `search_keys` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `use_frequency` INT(11) NOT NULL DEFAULT 0,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`localcode`),
  KEY `diagnosis_code` (`localcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_drg_quicklist` (
  `nr` INT(11) NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_parent` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dept_nr` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 0,
  `qlist_type` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `rank` INT(11) NOT NULL DEFAULT 0,
  `status` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_drg_related_codes` (
  `nr` INT(11) NOT NULL AUTO_INCREMENT,
  `group_nr` INT(11) UNSIGNED NOT NULL DEFAULT 0,
  `code` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_parent` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_type` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rank` INT(11) NOT NULL DEFAULT 0,
  `status` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_dutyplan_oncall` (
  `nr` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `dept_nr` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  `role_nr` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  `year` YEAR(4) NOT NULL,
  `month` CHAR(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duty_1_txt` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `duty_2_txt` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `duty_1_pnr` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `duty_2_pnr` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `dept_nr` (`dept_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_effective_day` (
  `eff_day_nr` TINYINT(4) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`eff_day_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter` (
  `encounter_nr` BIGINT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `pid` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  `encounter_date` DATETIME DEFAULT NULL,
  `encounter_class_nr` SMALLINT(5) UNSIGNED DEFAULT 0,
  `encounter_type` VARCHAR(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `encounter_status` VARCHAR(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referrer_diagnosis` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referrer_recom_therapy` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referrer_dr` VARCHAR(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referrer_dept` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referrer_institution` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referrer_notes` TEXT COLLATE utf8mb4_unicode_ci,
  `regional_code` VARCHAR(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `triage` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT 'white',
  `admit_type` INT(10) DEFAULT 0,
  `financial_class_nr` TINYINT(3) UNSIGNED DEFAULT 0,
  `insurance_nr` VARCHAR(25) COLLATE utf8mb4_unicode_ci DEFAULT 0,
  `insurance_firm_id` VARCHAR(25) COLLATE utf8mb4_unicode_ci DEFAULT 0,
  `insurance_class_nr` TINYINT(3) UNSIGNED DEFAULT 0,
  `insurance_2_nr` VARCHAR(25) COLLATE utf8mb4_unicode_ci DEFAULT 0,
  `insurance_2_firm_id` VARCHAR(25) COLLATE utf8mb4_unicode_ci DEFAULT 0,
  `guarantor_pid` INT(11) DEFAULT 0,
  `contact_pid` INT(11) DEFAULT 0,
  `contact_relation` VARCHAR(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_ward_nr` SMALLINT(3) UNSIGNED DEFAULT 0,
  `current_room_nr` SMALLINT(5) UNSIGNED DEFAULT 0,
  `in_ward` BOOLEAN DEFAULT FALSE,
  `current_dept_nr` SMALLINT(3) UNSIGNED DEFAULT 0,
  `in_dept` BOOLEAN DEFAULT FALSE,
  `current_firm_nr` SMALLINT(5) UNSIGNED DEFAULT 0,
  `current_att_dr_nr` INT(10) DEFAULT 0,
  `consulting_dr` VARCHAR(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra_service` VARCHAR(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_discharged` TINYINT(1) UNSIGNED DEFAULT 0,
  `discharge_date` DATE DEFAULT NULL,
  `discharge_time` TIME DEFAULT NULL,
  `followup_date` DATE DEFAULT NULL,
  `followup_responsibility` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `post_encounter_notes` TEXT COLLATE utf8mb4_unicode_ci,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`encounter_nr`),
  KEY `pid` (`pid`),
  KEY `encounter_date` (`encounter_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_diagnosis` (
  `diagnosis_nr` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT(11) UNSIGNED NOT NULL DEFAULT 0,
  `op_nr` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `code` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_parent` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_nr` MEDIUMINT(8) UNSIGNED NOT NULL DEFAULT 0,
  `code_version` TINYINT(4) NOT NULL DEFAULT 0,
  `localcode` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_nr` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  `type` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `localization` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagnosing_clinician` VARCHAR(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagnosing_dept_nr` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`diagnosis_nr`),
  KEY `encounter_nr` (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_diagnostics_report` (
  `item_nr` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `report_nr` INT(11) UNSIGNED NOT NULL DEFAULT 0,
  `reporting_dept_nr` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 0,
  `reporting_dept` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_date` DATE NOT NULL,
  `report_time` TIME NOT NULL,
  `encounter_nr` INT(10) UNSIGNED NOT NULL DEFAULT 0,
  `script_call` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_nr`, `report_nr`),
  KEY `report_nr` (`report_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_event_signaller` (
  `encounter_nr` INT UNSIGNED NOT NULL,
  `yellow` BOOLEAN NOT NULL DEFAULT FALSE,
  `black` BOOLEAN NOT NULL DEFAULT FALSE,
  `blue_pale` BOOLEAN NOT NULL DEFAULT FALSE,
  `brown` BOOLEAN NOT NULL DEFAULT FALSE,
  `pink` BOOLEAN NOT NULL DEFAULT FALSE,
  `yellow_pale` BOOLEAN NOT NULL DEFAULT FALSE,
  `red` BOOLEAN NOT NULL DEFAULT FALSE,
  `green_pale` BOOLEAN NOT NULL DEFAULT FALSE,
  `violet` BOOLEAN NOT NULL DEFAULT FALSE,
  `blue` BOOLEAN NOT NULL DEFAULT FALSE,
  `biege` BOOLEAN NOT NULL DEFAULT FALSE,
  `orange` BOOLEAN NOT NULL DEFAULT FALSE,
  `green_1` BOOLEAN NOT NULL DEFAULT FALSE,
  `green_2` BOOLEAN NOT NULL DEFAULT FALSE,
  `green_3` BOOLEAN NOT NULL DEFAULT FALSE,
  `green_4` BOOLEAN NOT NULL DEFAULT FALSE,
  `green_5` BOOLEAN NOT NULL DEFAULT FALSE,
  `green_6` BOOLEAN NOT NULL DEFAULT FALSE,
  `green_7` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_1` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_2` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_3` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_4` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_5` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_6` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_7` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_8` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_9` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_10` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_11` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_12` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_13` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_14` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_15` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_16` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_17` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_18` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_19` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_20` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_21` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_22` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_23` BOOLEAN NOT NULL DEFAULT FALSE,
  `rose_24` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_image` (
  `nr` BIGINT NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT NOT NULL,
  `shot_date` DATE NOT NULL,
  `shot_nr` SMALLINT NOT NULL DEFAULT 0,
  `mime_type` VARCHAR(10) NOT NULL,
  `upload_date` DATE NOT NULL,
  `notes` TEXT NOT NULL,
  `graphic_script` TEXT NOT NULL,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `encounter_nr` (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_immunization` (
  `nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT NOT NULL,
  `date` DATE NOT NULL,
  `type` VARCHAR(60) NOT NULL,
  `medicine` VARCHAR(60) NOT NULL,
  `dosage` VARCHAR(60),
  `application_type_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `application_by` VARCHAR(60),
  `titer` VARCHAR(15),
  `refresh_date` DATE DEFAULT NULL,
  `notes` TEXT,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_location` (
  `nr` INT NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT UNSIGNED NOT NULL,
  `type_nr` SMALLINT UNSIGNED NOT NULL,
  `location_nr` SMALLINT UNSIGNED NOT NULL,
  `group_nr` SMALLINT UNSIGNED NOT NULL,
  `date_from` DATE NOT NULL,
  `date_to` DATE NOT NULL,
  `time_from` TIME DEFAULT '00:00:00',
  `time_to` TIME DEFAULT NULL,
  `discharge_type_nr` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`, `location_nr`),
  KEY `type` (`type_nr`),
  KEY `location_id` (`location_nr`),
  KEY `encounter_nr` (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_measurement` (
  `nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `msr_date` DATE NOT NULL,
  `msr_time` TIME NOT NULL,
  `encounter_nr` INT UNSIGNED NOT NULL,
  `msr_type_nr` TINYINT UNSIGNED NOT NULL,
  `value` VARCHAR(255),
  `unit_nr` SMALLINT UNSIGNED DEFAULT NULL,
  `unit_type_nr` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `notes` VARCHAR(255),
  `measured_by` VARCHAR(35) NOT NULL,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `type` (`msr_type_nr`),
  KEY `encounter_nr` (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_notes` (
  `nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT UNSIGNED NOT NULL,
  `type_nr` SMALLINT UNSIGNED NOT NULL,
  `notes` TEXT NOT NULL,
  `short_notes` VARCHAR(25) DEFAULT NULL,
  `aux_notes` VARCHAR(255) DEFAULT NULL,
  `ref_notes_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `staff_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `staff_name` VARCHAR(60) NOT NULL,
  `send_to_pid` INT NOT NULL DEFAULT 0,
  `send_to_name` VARCHAR(60) DEFAULT NULL,
  `date` DATE DEFAULT NULL,
  `time` TIME DEFAULT NULL,
  `location_type` VARCHAR(35) DEFAULT NULL,
  `location_type_nr` TINYINT NOT NULL DEFAULT 0,
  `location_nr` MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
  `location_id` VARCHAR(60) DEFAULT NULL,
  `ack_short_id` VARCHAR(10) NOT NULL,
  `date_ack` DATETIME DEFAULT NULL,
  `date_checked` DATETIME DEFAULT NULL,
  `date_printed` DATETIME DEFAULT NULL,
  `send_by_mail` BOOLEAN DEFAULT NULL,
  `send_by_email` BOOLEAN DEFAULT NULL,
  `send_by_fax` BOOLEAN DEFAULT NULL,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `encounter_nr` (`encounter_nr`),
  KEY `type_nr` (`type_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_obstetric` (
  `encounter_nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pregnancy_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `hospital_adm_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `patient_class` VARCHAR(60) NOT NULL,
  `is_discharged_not_in_labour` BOOLEAN DEFAULT NULL,
  `is_re_admission` BOOLEAN DEFAULT NULL,
  `referral_status` VARCHAR(60) DEFAULT NULL,
  `referral_reason` TEXT,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`encounter_nr`),
  KEY `pregnancy_nr` (`pregnancy_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_op` (
  `nr` INT NOT NULL AUTO_INCREMENT,
  `year` CHAR(4) NOT NULL DEFAULT 0,
  `dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `op_room` VARCHAR(10) NOT NULL DEFAULT 0,
  `op_nr` MEDIUMINT NOT NULL DEFAULT 0,
  `op_date` DATE NOT NULL,
  `op_src_date` CHAR(8) NOT NULL,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `diagnosis` TEXT NOT NULL,
  `operator` TEXT NOT NULL,
  `assistant` TEXT NOT NULL,
  `scrub_nurse` TEXT NOT NULL,
  `rotating_nurse` TEXT NOT NULL,
  `anesthesia` VARCHAR(30) NOT NULL,
  `an_doctor` TEXT NOT NULL,
  `op_therapy` TEXT NOT NULL,
  `result_info` TEXT NOT NULL,
  `entry_time` CHAR(5) NOT NULL,
  `cut_time` CHAR(5) NOT NULL,
  `close_time` CHAR(5) NOT NULL,
  `exit_time` CHAR(5) NOT NULL,
  `entry_out` TEXT NOT NULL,
  `cut_close` TEXT NOT NULL,
  `wait_time` TEXT NOT NULL,
  `bandage_time` TEXT NOT NULL,
  `repos_time` TEXT NOT NULL,
  `encoding` LONGTEXT NOT NULL,
  `doc_date` CHAR(10) NOT NULL,
  `doc_time` CHAR(5) NOT NULL,
  `duty_type` VARCHAR(15) NOT NULL,
  `material_codedlist` TEXT NOT NULL,
  `container_codedlist` TEXT NOT NULL,
  `icd_code` TEXT NOT NULL,
  `ops_code` TEXT NOT NULL,
  `ops_intern_code` TEXT NOT NULL,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `dept` (`dept_nr`),
  KEY `op_room` (`op_room`),
  KEY `op_date` (`op_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_prescription` (
  `nr` INT NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT UNSIGNED NOT NULL,
  `prescribe_date` DATE DEFAULT NULL,
  `notes` TEXT,
  `status` VARCHAR(25) NOT NULL,
  `prescriber` VARCHAR(60) NOT NULL,
  `dept_nr` INT NOT NULL DEFAULT 0 COMMENT 'the dept from which the prescription is being made',
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `encounter_nr` (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_prescription_notes` (
  `nr` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `prescription_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `notes` VARCHAR(35) DEFAULT NULL,
  `short_notes` VARCHAR(25) DEFAULT NULL,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_encounter_procedure` (
  `procedure_nr` INT NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT NOT NULL DEFAULT 0,
  `op_nr` INT NOT NULL DEFAULT 0,
  `date` DATETIME NOT NULL,
  `code` VARCHAR(25) NOT NULL,
  `code_parent` VARCHAR(25) NOT NULL,
  `group_nr` MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
  `code_version` TINYINT NOT NULL DEFAULT 0,
  `localcode` VARCHAR(35) NOT NULL,
  `category_nr` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `localization` VARCHAR(35) NOT NULL,
  `responsible_clinician` VARCHAR(60) NOT NULL,
  `responsible_dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`procedure_nr`),
  KEY `encounter_nr` (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_insurance_firm` (
  `firm_id` VARCHAR(40) NOT NULL,
  `name` VARCHAR(60) NOT NULL,
  `iso_country_id` CHAR(3) NOT NULL,
  `sub_area` VARCHAR(60) NOT NULL,
  `type_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `addr` VARCHAR(255) DEFAULT NULL,
  `addr_mail` VARCHAR(200) DEFAULT NULL,
  `addr_billing` VARCHAR(200) DEFAULT NULL,
  `addr_email` VARCHAR(60) DEFAULT NULL,
  `phone_main` VARCHAR(35) DEFAULT NULL,
  `phone_aux` VARCHAR(35) DEFAULT NULL,
  `fax_main` VARCHAR(35) DEFAULT NULL,
  `fax_aux` VARCHAR(35) DEFAULT NULL,
  `contact_person` VARCHAR(60) DEFAULT NULL,
  `contact_phone` VARCHAR(35) DEFAULT NULL,
  `contact_fax` VARCHAR(35) DEFAULT NULL,
  `contact_email` VARCHAR(60) DEFAULT NULL,
  `use_frequency` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`firm_id`),
  KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_mail_private` (
  `recipient` VARCHAR(60) NOT NULL,
  `sender` VARCHAR(60) NOT NULL,
  `sender_ip` VARCHAR(60) NOT NULL,
  `cc` VARCHAR(255) NOT NULL,
  `bcc` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `sign` VARCHAR(255) NOT NULL,
  `ask4ack` BOOLEAN NOT NULL DEFAULT FALSE,
  `reply2` VARCHAR(255) NOT NULL,
  `attachment` VARCHAR(255) NOT NULL,
  `attach_type` VARCHAR(30) NOT NULL,
  `read_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `mailgroup` VARCHAR(60) NOT NULL,
  `maildir` VARCHAR(60) NOT NULL,
  `exec_level` TINYINT NOT NULL DEFAULT 0,
  `exclude_addr` TEXT NOT NULL,
  `send_dt` DATETIME NOT NULL,
  `send_stamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `uid` VARCHAR(255) NOT NULL,
  KEY `recipient` (`recipient`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_mail_private_users` (
  `user_name` VARCHAR(60) NOT NULL,
  `email` VARCHAR(60) NOT NULL,
  `alias` VARCHAR(60) NOT NULL,
  `pw` VARCHAR(255) NOT NULL,
  `inbox` LONGTEXT NOT NULL,
  `sent` LONGTEXT NOT NULL,
  `drafts` LONGTEXT NOT NULL,
  `trash` LONGTEXT NOT NULL,
  `lastcheck` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lock_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `addr_book` TEXT NOT NULL,
  `addr_quick` TINYTEXT NOT NULL,
  `secret_q` TINYTEXT NOT NULL,
  `secret_q_ans` TINYTEXT NOT NULL,
  `public` BOOLEAN NOT NULL DEFAULT FALSE,
  `sig` TINYTEXT NOT NULL,
  `append_sig` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_med_ordercatalog` (
  `item_no` INT NOT NULL AUTO_INCREMENT,
  `dept_nr` INT NOT NULL DEFAULT 0,
  `hit` INT NOT NULL DEFAULT 0,
  `artikelname` TINYTEXT NOT NULL,
  `bestellnum` VARCHAR(20) NOT NULL,
  `minorder` INT NOT NULL DEFAULT 0,
  `maxorder` INT NOT NULL DEFAULT 0,
  `proorder` TINYTEXT NOT NULL,
  `dose` TINYTEXT,
  `packing` TINYTEXT,
  PRIMARY KEY (`item_no`),
  KEY `item_no` (`item_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_med_orderlist` (
  `order_nr` INT NOT NULL AUTO_INCREMENT,
  `dept_nr` INT NOT NULL DEFAULT 0,
  `order_date` DATE NOT NULL,
  `order_time` TIME NOT NULL,
  `articles` TEXT NOT NULL,
  `extra1` TINYTEXT NOT NULL,
  `extra2` TEXT NOT NULL,
  `validator` TINYTEXT NOT NULL,
  `ip_addr` TINYTEXT NOT NULL,
  `priority` TINYTEXT NOT NULL,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_datetime` DATETIME NOT NULL,
  `process_datetime` DATETIME NOT NULL,
  PRIMARY KEY (`order_nr`),
  KEY `item_nr` (`order_nr`),
  KEY `dept` (`dept_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_med_products_main` (
  `bestellnum` VARCHAR(25) NOT NULL,
  `artikelnum` TINYTEXT NOT NULL,
  `industrynum` TINYTEXT NOT NULL,
  `artikelname` TINYTEXT NOT NULL,
  `generic` TINYTEXT NOT NULL,
  `description` TEXT NOT NULL,
  `packing` TINYTEXT NOT NULL,
  `dose` TINYTEXT,
  `minorder` INT NOT NULL DEFAULT 0,
  `maxorder` INT NOT NULL DEFAULT 0,
  `proorder` TINYTEXT NOT NULL,
  `picfile` TINYTEXT NOT NULL,
  `encoder` TINYTEXT NOT NULL,
  `enc_date` TINYTEXT NOT NULL,
  `enc_time` TINYTEXT NOT NULL,
  `lock_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `medgroup` TEXT NOT NULL,
  `cave` TINYTEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `depot` TINYTEXT,
  `minpcs` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`bestellnum`),
  KEY `bestellnum` (`bestellnum`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_mode_delivery` (
  `nr` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_nr` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `mode` VARCHAR(35) NOT NULL,
  `name` VARCHAR(35) NOT NULL,
  `LD_var` VARCHAR(35) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(25) NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_neonatal` (
  `nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pid` INT UNSIGNED NOT NULL DEFAULT 0,
  `delivery_date` DATE NOT NULL,
  `parent_encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `delivery_nr` TINYINT NOT NULL DEFAULT 0,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `delivery_place` VARCHAR(60) NOT NULL,
  `delivery_mode` TINYINT NOT NULL DEFAULT 0,
  `c_s_reason` TEXT,
  `born_before_arrival` BOOLEAN DEFAULT FALSE,
  `face_presentation` BOOLEAN NOT NULL DEFAULT FALSE,
  `posterio_occipital_position` BOOLEAN NOT NULL DEFAULT FALSE,
  `delivery_rank` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `apgar_1_min` TINYINT NOT NULL DEFAULT 0,
  `apgar_5_min` TINYINT NOT NULL DEFAULT 0,
  `apgar_10_min` TINYINT NOT NULL DEFAULT 0,
  `time_to_spont_resp` TINYINT DEFAULT NULL,
  `condition` VARCHAR(60) DEFAULT 0,
  `weight` FLOAT(8,2) UNSIGNED DEFAULT NULL,
  `length` FLOAT(8,2) UNSIGNED DEFAULT NULL,
  `head_circumference` FLOAT(8,2) UNSIGNED DEFAULT NULL,
  `scored_gestational_age` FLOAT(4,2) UNSIGNED DEFAULT NULL,
  `feeding` TINYINT NOT NULL DEFAULT 0,
  `congenital_abnormality` VARCHAR(125) NOT NULL,
  `classification` VARCHAR(255) NOT NULL DEFAULT 0,
  `disease_category` TINYINT NOT NULL DEFAULT 0,
  `outcome` TINYINT NOT NULL DEFAULT 0,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `pid` (`pid`),
  KEY `pregnancy_nr` (`parent_encounter_nr`),
  KEY `encounter_nr` (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_person` (
  `pid` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `hospital_file_nr` VARCHAR(50) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL COMMENT 'placeholder for existing individual hospital file number system',
  `date_reg` DATETIME DEFAULT NULL,
  `name_first` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `name_2` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `name_3` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `name_middle` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `name_last` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `name_maiden` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `name_others` TEXT CHARACTER SET latin1 COLLATE latin1_general_ci,
  `date_birth` DATE DEFAULT NULL,
  `blood_group` CHAR(2) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `addr_str` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `addr_str_nr` VARCHAR(10) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `addr_zip` VARCHAR(15) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `addr_citytown_nr` MEDIUMINT UNSIGNED DEFAULT 0,
  `addr_is_valid` BOOLEAN DEFAULT FALSE,
  `citizenship` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `phone_1_code` VARCHAR(15) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT 0,
  `phone_1_nr` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `phone_2_code` VARCHAR(15) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT 0,
  `phone_2_nr` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `cellphone_1_nr` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `cellphone_2_nr` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `fax` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `email` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `civil_status` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `sex` CHAR(1) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `title` VARCHAR(25) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `photo` BLOB,
  `photo_filename` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `ethnic_orig` MEDIUMINT UNSIGNED DEFAULT NULL,
  `org_id` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `sss_nr` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `nat_id_nr` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `religion` VARCHAR(125) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `mother_pid` INT UNSIGNED DEFAULT 0,
  `father_pid` INT UNSIGNED DEFAULT 0,
  `contact_person` VARCHAR(255) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `contact_pid` INT UNSIGNED DEFAULT 0,
  `contact_relation` VARCHAR(25) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT 0,
  `death_date` DATE DEFAULT NULL,
  `death_encounter_nr` INT UNSIGNED DEFAULT 0,
  `death_cause` VARCHAR(255) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `death_cause_code` VARCHAR(15) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `date_update` DATETIME DEFAULT NULL,
  `status` VARCHAR(20) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `history` TEXT CHARACTER SET latin1 COLLATE latin1_general_ci,
  `modify_id` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `relative_name_first` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `relative_name_last` VARCHAR(60) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `relative_phone` VARCHAR(35) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  PRIMARY KEY (`pid`),
  KEY `name_last` (`name_last`),
  KEY `name_first` (`name_first`),
  KEY `date_reg` (`date_reg`),
  KEY `date_birth` (`date_birth`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_staff` (
  `nr` INT NOT NULL AUTO_INCREMENT, -- Unique identifier for the staff record
  `short_id` VARCHAR(10) DEFAULT NULL, -- Optional short identifier or badge number
  `pid` INT NOT NULL DEFAULT 0, -- Person ID (likely references a person table)
  `job_type_nr` INT NOT NULL DEFAULT 0, -- Job type reference number (e.g., doctor, nurse)
  `job_function_title` VARCHAR(60) DEFAULT NULL, -- Job title or function (e.g., "Surgeon")
  `date_join` DATE DEFAULT NULL, -- Date the staff member joined
  `date_exit` DATE DEFAULT NULL, -- Date the staff member exited
  `contract_class` VARCHAR(35) NOT NULL DEFAULT 0, -- Type or class of contract
  `contract_start` DATE DEFAULT NULL, -- Contract start date
  `contract_end` DATE DEFAULT NULL, -- Contract end date
  `is_discharged` BOOLEAN NOT NULL DEFAULT FALSE, -- Whether the staff member has been discharged
  `pay_class` VARCHAR(25) NOT NULL, -- Pay classification
  `pay_class_sub` VARCHAR(25) NOT NULL, -- Sub-classification of pay
  `local_premium_id` VARCHAR(5) NOT NULL, -- Local premium identifier
  `tax_account_nr` VARCHAR(60) NOT NULL, -- Tax account number
  `ir_code` VARCHAR(25) NOT NULL, -- Internal revenue or tax code
  `nr_workday` TINYINT NOT NULL DEFAULT 0, -- Number of workdays per week
  `nr_weekhour` FLOAT(10,2) NOT NULL DEFAULT 0.00, -- Number of work hours per week
  `nr_vacation_day` TINYINT NOT NULL DEFAULT 0, -- Number of vacation days
  `multiple_employer` BOOLEAN NOT NULL DEFAULT FALSE, -- Whether the staff works for multiple employers
  `nr_dependent` TINYINT UNSIGNED NOT NULL DEFAULT 0, -- Number of dependents
  `status` VARCHAR(25) NOT NULL, -- Employment status (e.g., active, suspended)
  `history` TEXT NOT NULL, -- Change history or audit trail
  `modify_id` VARCHAR(35) NOT NULL, -- User ID who last modified the record
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Last modification timestamp
  `create_id` VARCHAR(35) NOT NULL, -- User ID who created the record
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
  PRIMARY KEY (`nr`, `pid`, `job_type_nr`), -- Composite primary key
  KEY `pid` (`pid`) -- Index on person ID
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `care_person_insurance` (
  `item_nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pid` INT UNSIGNED NOT NULL DEFAULT 0,
  `type` VARCHAR(60) NOT NULL,
  `insurance_nr` VARCHAR(50) NOT NULL DEFAULT '0',
  `firm_id` VARCHAR(60) NOT NULL,
  `class_nr` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `is_void` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` VARCHAR(25) NOT NULL,
  `history` TEXT NOT NULL,
  `modify_id` VARCHAR(35) NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE IF NOT EXISTS `care_staff_assignment` (
  `nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `staff_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `role_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `location_type_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `location_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `date_start` DATE DEFAULT NULL,
  `date_end` DATE DEFAULT NULL,
  `is_temporary` BOOLEAN DEFAULT NULL,
  `list_frequency` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`, `staff_nr`, `role_nr`, `location_type_nr`, `location_nr`),
  KEY `staff_nr` (`staff_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_pharma_ordercatalog` (
  `item_no` INT NOT NULL AUTO_INCREMENT,
  `dept_nr` INT NOT NULL DEFAULT 0,
  `hit` INT NOT NULL DEFAULT 0,
  `artikelname` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `bestellnum` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minorder` INT NOT NULL DEFAULT 0,
  `maxorder` INT NOT NULL DEFAULT 0,
  `proorder` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `dose` TINYTEXT COLLATE utf8mb4_unicode_ci,
  `packing` TINYTEXT COLLATE utf8mb4_unicode_ci,
  `quantity` DOUBLE NOT NULL DEFAULT 0,
  PRIMARY KEY (`item_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_pharma_orderlist` (
  `order_nr` INT NOT NULL AUTO_INCREMENT,
  `dept_nr` INT NOT NULL DEFAULT 0,
  `order_date` DATE DEFAULT NULL,
  `order_time` TIME DEFAULT NULL,
  `articles` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `extra1` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `extra2` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `validator` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_addr` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_datetime` DATETIME DEFAULT NULL,
  `process_datetime` DATETIME DEFAULT NULL,
  PRIMARY KEY (`order_nr`, `dept_nr`),
  KEY `dept` (`dept_nr`),
  KEY `order_nr` (`order_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_pharma_products_main` (
  `bestellnum` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_sub` INT NOT NULL COMMENT 'connection with the product under card',
  `artikelnum` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `industrynum` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `artikelname` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `generic` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `packing` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `dose` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `minorder` INT NOT NULL DEFAULT 0,
  `maxorder` INT NOT NULL DEFAULT 0,
  `proorder` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `picfile` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `encoder` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `enc_date` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `enc_time` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `lock_flag` BOOLEAN NOT NULL DEFAULT FALSE,
  `medgroup` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `cave` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `minpcs` INT UNSIGNED NOT NULL DEFAULT 0,
  `depot` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bestellnum`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_pregnancy` (
  `nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `this_pregnancy_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `delivery_date` DATE DEFAULT NULL,
  `delivery_time` TIME DEFAULT NULL,
  `gravida` TINYINT UNSIGNED DEFAULT NULL,
  `para` TINYINT UNSIGNED DEFAULT NULL,
  `pregnancy_gestational_age` TINYINT UNSIGNED DEFAULT NULL,
  `nr_of_fetuses` TINYINT UNSIGNED DEFAULT NULL,
  `child_encounter_nr` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_booked` BOOLEAN NOT NULL DEFAULT FALSE,
  `vdrl` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rh` TINYINT DEFAULT NULL,
  `delivery_mode` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `delivery_by` VARCHAR(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bp_systolic_high` SMALLINT UNSIGNED DEFAULT NULL,
  `bp_diastolic_high` SMALLINT UNSIGNED DEFAULT NULL,
  `proteinuria` TINYINT DEFAULT NULL,
  `labour_duration` SMALLINT UNSIGNED DEFAULT NULL,
  `induction_method` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `induction_indication` VARCHAR(125) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `anaesth_type_nr` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `is_epidural` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complications` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `perineum` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `blood_loss` FLOAT(8,2) UNSIGNED DEFAULT NULL,
  `blood_loss_unit` VARCHAR(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_retained_placenta` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_labour_condition` VARCHAR(35) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `outcome` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`, `encounter_nr`),
  KEY `encounter_nr` (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_role_person` (
  `nr` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_nr` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `role` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`, `group_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_room` (
  `nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type_nr` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `date_create` DATE DEFAULT NULL,
  `date_close` DATE DEFAULT NULL,
  `is_temp_closed` BOOLEAN DEFAULT FALSE,
  `room_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `ward_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `nr_of_beds` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `closed_beds` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `info` VARCHAR(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`, `type_nr`, `ward_nr`, `dept_nr`),
  KEY `room_nr` (`room_nr`),
  KEY `ward_nr` (`ward_nr`),
  KEY `dept_nr` (`dept_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_sessions` (
  `SESSKEY` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `EXPIRY` INT UNSIGNED NOT NULL DEFAULT 0,
  `expireref` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `DATA` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`SESSKEY`),
  KEY `EXPIRY` (`EXPIRY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_standby_duty_report` (
  `report_nr` INT NOT NULL AUTO_INCREMENT,
  `dept` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` DATE DEFAULT NULL,
  `standby_name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `standby_start` TIME DEFAULT NULL,
  `standby_end` TIME DEFAULT NULL,
  `oncall_name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `oncall_start` TIME DEFAULT NULL,
  `oncall_end` TIME DEFAULT NULL,
  `op_room` CHAR(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagnosis_therapy` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `encoding` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_nr`),
  KEY `report_nr` (`report_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_tech_questions` (
  `batch_nr` INT NOT NULL AUTO_INCREMENT,
  `dept` VARCHAR(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `query` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `inquirer` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tphone` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tdate` DATE DEFAULT NULL,
  `ttime` TIME DEFAULT NULL,
  `tid` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `reply` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `answered` BOOLEAN NOT NULL DEFAULT FALSE,
  `ansby` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `astamp` VARCHAR(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `archive` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_tech_repair_done` (
  `batch_nr` INT NOT NULL AUTO_INCREMENT,
  `dept` VARCHAR(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_nr` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `job_id` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `job` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporter` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tdate` DATE DEFAULT NULL,
  `ttime` TIME DEFAULT NULL,
  `tid` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `seen` BOOLEAN NOT NULL DEFAULT FALSE,
  `d_idx` VARCHAR(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_nr`, `dept_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_tech_repair_job` (
  `batch_nr` TINYINT NOT NULL AUTO_INCREMENT,
  `dept` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `reporter` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tphone` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tdate` DATE DEFAULT NULL,
  `ttime` TIME DEFAULT NULL,
  `tid` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `done` BOOLEAN NOT NULL DEFAULT FALSE,
  `seen` BOOLEAN NOT NULL DEFAULT FALSE,
  `seenby` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sstamp` VARCHAR(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `doneby` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dstamp` VARCHAR(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `d_idx` VARCHAR(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `archive` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_test_findings_chemlab` (
  `batch_nr` INT NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT NOT NULL DEFAULT 0,
  `job_id` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `test_date` DATE DEFAULT NULL,
  `test_time` TIME DEFAULT NULL,
  `group_id` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serial_value` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `validator` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `validate_dt` DATETIME DEFAULT NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_nr`, `encounter_nr`, `job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_test_findings_patho` (
  `batch_nr` INT NOT NULL DEFAULT 0,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `room_nr` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `material` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `macro` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `micro` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `findings` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagnosis` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `doctor_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `findings_date` DATE DEFAULT NULL,
  `findings_time` TIME DEFAULT NULL,
  `status` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_nr`, `encounter_nr`, `room_nr`, `dept_nr`),
  KEY `send_date` (`findings_date`),
  KEY `findings_date` (`findings_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_test_findings_radio` (
  `batch_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `room_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `findings` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagnosis` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `doctor_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `findings_date` DATE DEFAULT NULL,
  `findings_time` TIME DEFAULT NULL,
  `status` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_nr`, `encounter_nr`),
  KEY `send_date` (`findings_date`),
  KEY `findings_date` (`findings_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_test_param` (
  `nr` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_nr` TINYINT NOT NULL DEFAULT 0,
  `msr_unit` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `median` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_bound` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_bound` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_critical` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_critical` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_toxic` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_toxic` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `median_f` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_bound_f` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_bound_f` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_critical_f` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_critical_f` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_toxic_f` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_toxic_f` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `median_n` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_bound_n` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_bound_n` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_critical_n` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_critical_n` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_toxic_n` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_toxic_n` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `median_y` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_bound_y` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_bound_y` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_critical_y` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_critical_y` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_toxic_y` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_toxic_y` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `median_c` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_bound_c` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_bound_c` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_critical_c` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_critical_c` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `hi_toxic_c` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `lo_toxic_c` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `method` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT ' ',
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`, `group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_test_request_blood` (
  `batch_nr` INT NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `blood_group` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rh_factor` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kell` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_protoc_nr` VARCHAR(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pure_blood` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `red_blood` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `leukoless_blood` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `washed_blood` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prp_blood` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thrombo_con` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ffp_plasma` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transfusion_dev` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `match_sample` BOOLEAN NOT NULL DEFAULT FALSE,
  `transfusion_date` DATE DEFAULT NULL,
  `diagnosis` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `send_date` DATE DEFAULT NULL,
  `doctor` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_nr` VARCHAR(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `blood_pb` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `blood_rb` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `blood_llrb` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `blood_wrb` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `blood_prp` TINYBLOB NOT NULL,
  `blood_tc` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `blood_ffp` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `b_group_count` MEDIUMINT NOT NULL DEFAULT 0,
  `b_group_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `a_subgroup_count` MEDIUMINT NOT NULL DEFAULT 0,
  `a_subgroup_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `extra_factors_count` MEDIUMINT NOT NULL DEFAULT 0,
  `extra_factors_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `coombs_count` MEDIUMINT NOT NULL DEFAULT 0,
  `coombs_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `ab_test_count` MEDIUMINT NOT NULL DEFAULT 0,
  `ab_test_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `crosstest_count` MEDIUMINT NOT NULL DEFAULT 0,
  `crosstest_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `ab_diff_count` MEDIUMINT NOT NULL DEFAULT 0,
  `ab_diff_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `x_test_1_code` MEDIUMINT NOT NULL DEFAULT 0,
  `x_test_1_name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `x_test_1_count` MEDIUMINT NOT NULL DEFAULT 0,
  `x_test_1_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `x_test_2_code` MEDIUMINT NOT NULL DEFAULT 0,
  `x_test_2_name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `x_test_2_count` MEDIUMINT NOT NULL DEFAULT 0,
  `x_test_2_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `x_test_3_code` MEDIUMINT NOT NULL DEFAULT 0,
  `x_test_3_name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `x_test_3_count` MEDIUMINT NOT NULL DEFAULT 0,
  `x_test_3_price` FLOAT(10,2) NOT NULL DEFAULT 0.00,
  `lab_stamp` DATETIME DEFAULT NULL,
  `release_via` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receipt_ack` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mainlog_nr` VARCHAR(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lab_nr` VARCHAR(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mainlog_date` DATE DEFAULT NULL,
  `lab_date` DATE DEFAULT NULL,
  `mainlog_sign` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lab_sign` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_nr`),
  KEY `send_date` (`send_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_test_request_chemlabor` (
  `batch_nr` INT NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `room_nr` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `parameters` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `doctor_sign` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `highrisk` BOOLEAN NOT NULL DEFAULT FALSE,
  `notes` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `send_date` DATETIME DEFAULT NULL,
  `sample_time` TIME DEFAULT NULL,
  `urgent` BOOLEAN NOT NULL DEFAULT FALSE,
  `sample_weekday` SMALLINT NOT NULL DEFAULT 0,
  `status` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_nr`),
  KEY `encounter_nr` (`encounter_nr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_test_request_generic` (
  `batch_nr` INT NOT NULL DEFAULT 0,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `testing_dept` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `visit` BOOLEAN NOT NULL DEFAULT FALSE,
  `order_patient` BOOLEAN NOT NULL DEFAULT FALSE,
  `diagnosis_quiry` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `send_date` DATE DEFAULT NULL,
  `send_doctor` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `result` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `result_date` DATE DEFAULT NULL,
  `result_doctor` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`batch_nr`),
  KEY `batch_nr` (`batch_nr`, `encounter_nr`),
  KEY `send_date` (`send_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_test_request_patho` (
  `batch_nr` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `quick_cut` TINYINT NOT NULL DEFAULT 0,
  `qc_phone` VARCHAR(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quick_diagnosis` TINYINT NOT NULL DEFAULT 0,
  `qd_phone` VARCHAR(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_type` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_desc` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `localization` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `clinical_note` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `extra_note` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `repeat_note` TINYTEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `gyn_last_period` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gyn_period_type` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gyn_gravida` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gyn_menopause_since` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `gyn_hysterectomy` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `gyn_contraceptive` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `gyn_iud` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gyn_hormone_therapy` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `doctor_sign` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `op_date` DATE DEFAULT NULL,
  `send_date` DATETIME DEFAULT NULL,
  `status` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entry_date` DATE DEFAULT NULL,
  `journal_nr` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `blocks_nr` INT NOT NULL DEFAULT 0,
  `deep_cuts` INT NOT NULL DEFAULT 0,
  `special_dye` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `immune_histochem` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hormone_receptors` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `specials` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT NULL,
  `process_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `process_time` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`batch_nr`),
  KEY `encounter_nr` (`encounter_nr`),
  KEY `send_date` (`send_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_test_request_radio` (
  `batch_nr` INT NOT NULL,
  `encounter_nr` INT UNSIGNED NOT NULL DEFAULT 0,
  `dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `xray` BOOLEAN NOT NULL DEFAULT 0,
  `ct` BOOLEAN NOT NULL DEFAULT 0,
  `sono` BOOLEAN NOT NULL DEFAULT 0,
  `mammograph` BOOLEAN NOT NULL DEFAULT 0,
  `mrt` BOOLEAN NOT NULL DEFAULT 0,
  `nuclear` BOOLEAN NOT NULL DEFAULT 0,
  `if_patmobile` BOOLEAN NOT NULL DEFAULT 0,
  `if_allergy` BOOLEAN NOT NULL DEFAULT 0,
  `if_hyperten` BOOLEAN NOT NULL DEFAULT 0,
  `if_pregnant` BOOLEAN NOT NULL DEFAULT 0,
  `clinical_info` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `test_request` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `send_date` DATE DEFAULT NULL,
  `send_doctor` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `xray_nr` VARCHAR(9) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 0,
  `r_cm_2` VARCHAR(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mtr` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `xray_date` DATE DEFAULT NULL,
  `xray_time` TIME DEFAULT NULL,
  `results` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `results_date` DATE DEFAULT NULL,
  `results_doctor` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `history` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT NULL,
  `process_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `process_time` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`batch_nr`),
  UNIQUE KEY `batch_nr_2` (`batch_nr`),
  KEY `batch_nr` (`batch_nr`, `encounter_nr`),
  KEY `send_date` (`xray_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_type_anaesthesia` (
  `nr` SMALLINT(2) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`nr`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_type_cause_opdelay` (
  `type_nr` SMALLINT(5) UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cause` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `LD_var` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) COLLATE utf8mb4_unicode_ci NOT NULL,
  `create_time` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`type_nr`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ;

CREATE TABLE IF NOT EXISTS `care_status_type` (
  `status_code` VARCHAR(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  `description` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `care_type_immunization` (
  `nr` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Immunization type',
  `name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `LD_var` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `period` SMALLINT DEFAULT 0 CHECK (`period` >= 0),
  `tolerance` TINYINT DEFAULT 0 CHECK (`tolerance` >= 0),
  `dosage` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `medicine` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `titer` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `note` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `application` TINYINT DEFAULT 0 COMMENT 'From care_type_application',
  `status` VARCHAR(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `history` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `modify_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  FOREIGN KEY (`status`) REFERENCES `care_status_type`(`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `care_type_insurance` (
  `type_nr` INT NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name` VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `LD_var` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `status` VARCHAR(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `history` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `modify_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`type_nr`),
  KEY `type` (`type`),
  FOREIGN KEY (`status`) REFERENCES `care_status_type`(`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `care_type_location` (
  `nr` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `LD_var` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `status` VARCHAR(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `modify_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  FOREIGN KEY (`status`) REFERENCES `care_status_type`(`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `care_user_roles` (
  `id` INT NOT NULL AUTO_INCREMENT, -- Unique identifier for each role
  `role_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'no_name', -- Name of the role (e.g., admin, doctor)
  `permission` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci, -- Optional permissions or rules associated with the role
  `history` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci, -- Optional change history or notes
  `modify_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL, -- User ID who last modified the role
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Last modification timestamp
  `create_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL, -- User ID who created the role
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE care_staff ADD UNIQUE (`nr`);

CREATE TABLE IF NOT EXISTS `care_users` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT, -- Unique identifier for each user
  `username` VARCHAR(50) NOT NULL UNIQUE, -- Unique username used for login
  `email` VARCHAR(100) DEFAULT NULL, -- Optional email address of the user
  `password_hash` VARCHAR(255) NOT NULL, -- Securely hashed password
  `role_id` INT NOT NULL, -- Foreign key referencing care_user_roles(id)
  `permissions` JSON DEFAULT NULL, -- Optional custom permissions in JSON format
  `dept_nr` MEDIUMINT UNSIGNED DEFAULT NULL, -- Foreign key referencing care_department(nr)
  `staff_nr` INT DEFAULT NULL, -- Foreign key referencing care_staff(nr)
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE, -- Indicates if the user account is active
  `last_login` DATETIME DEFAULT NULL, -- Timestamp of the user's last login
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the user was created
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Timestamp of the last update to the user record
  PRIMARY KEY (`user_id`),
  FOREIGN KEY (`role_id`) REFERENCES `care_user_roles`(`id`) ON DELETE RESTRICT, -- Role reference
  FOREIGN KEY (`dept_nr`) REFERENCES `care_department`(`nr`) ON DELETE SET NULL, -- Department reference
  FOREIGN KEY (`staff_nr`) REFERENCES `care_staff`(`nr`) ON DELETE SET NULL -- Staff profile reference
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


//care users Role
CREATE TABLE IF NOT EXISTS `care_users_roles` (
    `id` INT NOT NULL AUTO_INCREMENT, -- Unique identifier for each role
    `role_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'no_name', -- Name of the role (e.g., admin, doctor)
    `permission` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci, -- Permissions for the role (e.g., JSON or comma-separated list)
    `history` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci, -- Optional change history or notes
    `modify_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL, -- User ID who last modified the role
    `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Last modification timestamp
    `create_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL, -- User ID who created the role
    `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
    PRIMARY KEY (`id`),
    UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE `care_users` ADD CONSTRAINT `fk_care_users_role_id` FOREIGN KEY (`role_id`) REFERENCES `care_users_roles` (`id`);

//Insert Permissions
-- Insert statements for care_users_roles table

-- System Administrator Role
INSERT INTO `care_users_roles` (`role_name`, `permission`, `history`, `modify_id`, `modify_time`, `create_id`, `create_time`) VALUES
('System Administrator', JSON_ARRAY(
    'Admin.Create.User',
    'Admin.Update.User',
    'Admin.Assign.Role',
    'Admin.Create.Role',
    'Admin.Audit.Logs',
    'Admin.Create.Facility',
    'Admin.Update.Facility',
    'Admin.Manage.PharmacyConfig',
    'Admin.Manage.LabConfig',
    'Admin.Manage.ServicesConfig',
    'Admin.Manage.ReportsConfig',
    'Admin.Manage.StatsConfig',
    'Admin.Manage.Notifications',
    'Patient.Read.PatientRecord',
    'MedicalRecord.Read.ClinicalData',
    'Appointment.Read.Appointment',
    'Billing.Read.Invoice',
    'Pharmacy.Read.MedicationOrder',
    'Inventory.Read.Stock',
    'Reports.Read.All',
	'Admin.Manage.Users'
), 'Initial creation', 'system_init', NOW(), 'system_init', NOW());

-- Doctor Role
INSERT INTO `care_users_roles` (`role_name`, `permission`, `history`, `modify_id`, `modify_time`, `create_id`, `create_time`) VALUES
('Doctor', JSON_ARRAY(
    'Patient.Read.PatientRecord',
    'MedicalRecord.Read.ClinicalData',
    'MedicalRecord.Create.Note',
    'MedicalRecord.Update.Note',
    'MedicalRecord.Create.Diagnosis',
    'Pharmacy.Create.Prescription',
    'Appointment.Read.Appointment',
    'Appointment.Create.Appointment',
    'Lab.Send.TestRequest',
    'Lab.Read.TestResult',
    'Imaging.Send.TestRequest',
    'Imaging.Read.TestResult'
), 'Initial creation', 'system_init', NOW(), 'system_init', NOW());

-- Nurse Role
INSERT INTO `care_users_roles` (`role_name`, `permission`, `history`, `modify_id`, `modify_time`, `create_id`, `create_time`) VALUES
('Nurse', JSON_ARRAY(
    'Patient.Read.PatientRecord',
    'Patient.Create.PatientRecord',
    'Patient.Update.PatientRecord',
    'Patient.Transfer.Ward',
    'Patient.Admit.Inpatient',
    'Patient.Release.Inpatient',
    'MedicalRecord.Read.ClinicalData',
    'MedicalRecord.Create.Note',
    'Appointment.Read.Appointment',
    'Lab.Send.TestRequest',
    'Lab.Read.TestResult',
    'Imaging.Send.TestRequest',
    'Imaging.Read.TestResult'
), 'Initial creation', 'system_init', NOW(), 'system_init', NOW());

-- Receptionist Role
INSERT INTO `care_users_roles` (`role_name`, `permission`, `history`, `modify_id`, `modify_time`, `create_id`, `create_time`) VALUES
('Receptionist', JSON_ARRAY(
    'Patient.Create.PatientRecord',
    'Patient.Read.PatientRecord',
    'Patient.Update.PatientRecord',
    'Appointment.Create.Appointment',
    'Appointment.Read.Appointment',
    'Appointment.Update.Appointment',
    'Appointment.Cancel.Appointment'
), 'Initial creation', 'system_init', NOW(), 'system_init', NOW());

-- Billing Clerk Role
INSERT INTO `care_users_roles` (`role_name`, `permission`, `history`, `modify_id`, `modify_time`, `create_id`, `create_time`) VALUES
('Billing Clerk', JSON_ARRAY(
    'Billing.Create.Invoice',
    'Billing.Read.Invoice',
    'Billing.Update.Payment',
    'Billing.Read.InsuranceInfo',
    'Billing.Submit.Claim',
    'Patient.Read.PatientRecord'
), 'Initial creation', 'system_init', NOW(), 'system_init', NOW());

-- Pharmacist Role
INSERT INTO `care_users_roles` (`role_name`, `permission`, `history`, `modify_id`, `modify_time`, `create_id`, `create_time`) VALUES
('Pharmacist', JSON_ARRAY(
    'Pharmacy.Read.MedicationOrder',
    'Pharmacy.Dispense.Medication',
    'Inventory.Read.Stock',
    'Inventory.Update.Stock',
    'Inventory.Order.Drugs',
    'Inventory.Receive.Orders',
    'Reports.Generate.PharmacyData',
    'MedicalRecord.Read.Prescription'
), 'Initial creation', 'system_init', NOW(), 'system_init', NOW());

-- Lab Technician Role
INSERT INTO `care_users_roles` (`role_name`, `permission`, `history`, `modify_id`, `modify_time`, `create_id`, `create_time`) VALUES
('Lab Technician', JSON_ARRAY(
    'Lab.View.SentTests',
    'Lab.Enter.Results',
    'MedicalRecord.Read.ClinicalData'
), 'Initial creation', 'system_init', NOW(), 'system_init', NOW());

-- Imaging Technician Role
INSERT INTO `care_users_roles` (`role_name`, `permission`, `history`, `modify_id`, `modify_time`, `create_id`, `create_time`) VALUES
('Imaging Technician', JSON_ARRAY(
    'Imaging.View.SentTests',
    'Imaging.Enter.Results',
    'MedicalRecord.Read.ClinicalData'
), 'Initial creation', 'system_init', NOW(), 'system_init', NOW());

-- Statistician Role
INSERT INTO `care_users_roles` (`role_name`, `permission`, `history`, `modify_id`, `modify_time`, `create_id`, `create_time`) VALUES
('Statistician', JSON_ARRAY(
    'Reports.Generate.ClinicalData',
    'Reports.Generate.FinancialData',
    'Reports.Generate.OperationalData',
    'Reports.Read.All',
    'Reports.Export.Data'
), 'Initial creation', 'system_init', NOW(), 'system_init', NOW());

CREATE TABLE IF NOT EXISTS `care_version` (
  `name` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `type` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `number` VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `build` VARCHAR(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `date` DATE DEFAULT NULL,
  `time` TIME DEFAULT NULL,
  `releaser` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `care_ward` (
  `nr` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ward_id` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name` VARCHAR(35) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `is_temp_closed` BOOLEAN NOT NULL DEFAULT 0 CHECK (`is_temp_closed` IN (0,1)),
  `date_create` DATE DEFAULT NULL,
  `date_close` DATE DEFAULT NULL,
  `description` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `info` TINYTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `dept_nr` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `room_nr_start` SMALLINT NOT NULL DEFAULT 0,
  `room_nr_end` SMALLINT NOT NULL DEFAULT 0,
  `roomprefix` VARCHAR(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` VARCHAR(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `history` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `modify_id` VARCHAR(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 0,
  `modify_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `create_id` VARCHAR(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 0,
  `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nr`),
  KEY `ward_id` (`ward_id`),
  FOREIGN KEY (`status`) REFERENCES `care_status_type`(`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- 1. Replace ENUM('0','1') with TINYINT(1)
ALTER TABLE care_billing_bill_item MODIFY bill_item_status TINYINT(1) DEFAULT 0;

-- Foreign key constraints

ALTER TABLE care_encounter
  ADD CONSTRAINT fk_encounter_pid FOREIGN KEY (pid) REFERENCES care_person(pid);

ALTER TABLE care_encounter_appointment
  ADD CONSTRAINT fk_appointment_pid FOREIGN KEY (pid) REFERENCES care_person(pid),
  ADD CONSTRAINT fk_appointment_encounter FOREIGN KEY (encounter_nr) REFERENCES care_encounter(encounter_nr);

ALTER TABLE care_encounter_diagnosis
  ADD CONSTRAINT fk_diagnosis_encounter FOREIGN KEY (encounter_nr) REFERENCES care_encounter(encounter_nr);

ALTER TABLE care_encounter_notes
  ADD CONSTRAINT fk_notes_encounter FOREIGN KEY (encounter_nr) REFERENCES care_encounter(encounter_nr);

ALTER TABLE care_encounter_prescription
  ADD CONSTRAINT fk_prescription_encounter FOREIGN KEY (encounter_nr) REFERENCES care_encounter(encounter_nr);

ALTER TABLE care_encounter_event_signaller
  ADD CONSTRAINT fk_event_encounter FOREIGN KEY (encounter_nr) REFERENCES care_encounter(encounter_nr);

ALTER TABLE care_encounter_procedure
  ADD CONSTRAINT fk_procedure_encounter FOREIGN KEY (encounter_nr) REFERENCES care_encounter(encounter_nr);

ALTER TABLE care_person_insurance
  ADD CONSTRAINT fk_insurance_pid FOREIGN KEY (pid) REFERENCES care_person(pid);

-- Fulltext indexes
ALTER TABLE care_encounter_notes ADD FULLTEXT(notes);
ALTER TABLE care_accesslog ADD FULLTEXT(lognote);
ALTER TABLE care_encounter ADD FULLTEXT(post_encounter_notes);
ALTER TABLE care_billing_archive ADD FULLTEXT(patient_name);
ALTER TABLE care_billing_bill_item ADD FULLTEXT(bill_item_code);
ALTER TABLE care_diagnosis_localcode ADD FULLTEXT(description);
ALTER TABLE care_category_diagnosis ADD FULLTEXT(description);

-- Optimization 3: Add Composite Indexes

-- Composite indexes
CREATE INDEX idx_encounter_date_pid ON care_encounter(encounter_date, pid);
CREATE INDEX idx_appointment_date_pid ON care_encounter_appointment(date, pid);
CREATE INDEX idx_encounter_pid_class ON care_encounter(pid, encounter_class_nr);
CREATE INDEX idx_notes_encounter_type ON care_encounter_notes(encounter_nr, type_nr);
CREATE INDEX idx_prescription_encounter_dept ON care_encounter_prescription(encounter_nr, dept_nr);

-- Remove old ENUM column if it exists
ALTER TABLE care_users DROP COLUMN role;

-- Add new foreign key columns
ALTER TABLE care_users
  ADD COLUMN role_id INT NOT NULL,
  ADD COLUMN dept_nr MEDIUMINT UNSIGNED DEFAULT NULL,
  ADD COLUMN staff_nr INT DEFAULT NULL;
ALTER TABLE care_users
	ADD COLUMN created_by INT;

-- Add foreign key constraints
ALTER TABLE care_users
  ADD CONSTRAINT fk_role_id FOREIGN KEY (role_id) REFERENCES care_user_roles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_dept_nr FOREIGN KEY (dept_nr) REFERENCES care_department(nr) ON DELETE SET NULL,
  ADD CONSTRAINT fk_staff_nr FOREIGN KEY (staff_nr) REFERENCES care_staff(nr) ON DELETE SET NULL;

ALTER TABLE `care_users` ADD COLUMN `facility_id` INT DEFAULT NULL AFTER `role_id`;
ALTER TABLE `care_users` ADD CONSTRAINT `fk_care_users_facility_id` FOREIGN KEY (`facility_id`) REFERENCES `care_facilities` (`id`) ON DELETE SET NULL;