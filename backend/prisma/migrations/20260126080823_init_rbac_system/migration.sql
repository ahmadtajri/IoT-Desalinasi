-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` INTEGER NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_username_idx`(`username`),
    INDEX `users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logger_intervals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `intervalSeconds` INTEGER NOT NULL,
    `intervalName` VARCHAR(50) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `logger_intervals_userId_idx`(`userId`),
    INDEX `logger_intervals_userId_isActive_idx`(`userId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sensor_data` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sensorId` VARCHAR(10) NOT NULL,
    `sensorType` VARCHAR(20) NOT NULL,
    `value` DOUBLE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `intervalSeconds` INTEGER NULL,
    `userId` INTEGER NULL,

    INDEX `sensor_data_sensorId_timestamp_idx`(`sensorId`, `timestamp`),
    INDEX `sensor_data_userId_idx`(`userId`),
    INDEX `sensor_data_timestamp_idx`(`timestamp`),
    INDEX `sensor_data_sensorType_idx`(`sensorType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `machine_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isRunning` BOOLEAN NOT NULL DEFAULT false,
    `lastStartTime` DATETIME(3) NULL,
    `lastStopTime` DATETIME(3) NULL,
    `totalRuntime` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logger_intervals` ADD CONSTRAINT `logger_intervals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sensor_data` ADD CONSTRAINT `sensor_data_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
