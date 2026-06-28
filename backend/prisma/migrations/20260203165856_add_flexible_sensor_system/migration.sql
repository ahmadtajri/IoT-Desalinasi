-- CreateTable
CREATE TABLE `sensor_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(50) NULL,
    `color` VARCHAR(20) NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT '',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sensor_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sensor_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sensorId` VARCHAR(20) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `sensorType` VARCHAR(20) NOT NULL,
    `categoryId` INTEGER NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT '',
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `isConfigured` BOOLEAN NOT NULL DEFAULT false,
    `minValue` DOUBLE NULL,
    `maxValue` DOUBLE NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `description` VARCHAR(255) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sensor_configs_sensorId_key`(`sensorId`),
    INDEX `sensor_configs_sensorType_idx`(`sensorType`),
    INDEX `sensor_configs_isEnabled_idx`(`isEnabled`),
    INDEX `sensor_configs_categoryId_idx`(`categoryId`),
    INDEX `sensor_configs_isConfigured_idx`(`isConfigured`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sensor_configs` ADD CONSTRAINT `sensor_configs_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `sensor_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
