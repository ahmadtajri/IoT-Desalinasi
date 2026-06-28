-- CreateTable
CREATE TABLE `daily_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `userId` INTEGER NULL,
    `userName` VARCHAR(50) NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `csvContent` LONGTEXT NOT NULL,
    `recordCount` INTEGER NOT NULL DEFAULT 0,
    `fileSize` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `daily_logs_date_idx`(`date`),
    INDEX `daily_logs_userId_idx`(`userId`),
    UNIQUE INDEX `daily_logs_date_userId_key`(`date`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `daily_logs` ADD CONSTRAINT `daily_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
