-- Create shows table (MySQL 9.0 compatible)
CREATE TABLE IF NOT EXISTS `shows` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `venue` VARCHAR(255) NULL DEFAULT NULL,
  `director` VARCHAR(255) NULL DEFAULT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `status` ENUM('planning', 'in-progress', 'completed', 'archived') NOT NULL DEFAULT 'planning',
  `created_by` INT NOT NULL,
  `updated_by` INT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_shows_status` (`status`),
  INDEX `idx_shows_date` (`date`),
  INDEX `idx_shows_created_by` (`created_by`),
  CONSTRAINT `fk_shows_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_shows_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create show_equipment table (MySQL 9.0 compatible)
CREATE TABLE `show_equipment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `show_id` INT NOT NULL,
  `equipment_id` INT NOT NULL,
  `quantity_needed` INT NOT NULL DEFAULT 1,
  `quantity_allocated` INT NOT NULL DEFAULT 0,
  `status` ENUM('requested', 'allocated', 'checked-out', 'in-use', 'returned') NOT NULL DEFAULT 'requested',
  `notes` TEXT,
  `checkout_date` TIMESTAMP NULL,
  `return_date` TIMESTAMP NULL,
  `checked_out_by` INT,
  `returned_by` INT,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
