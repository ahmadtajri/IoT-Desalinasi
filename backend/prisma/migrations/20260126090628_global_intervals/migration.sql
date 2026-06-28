/*
  Warnings:

  - You are about to drop the column `isActive` on the `logger_intervals` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `logger_intervals` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[intervalSeconds]` on the table `logger_intervals` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `logger_intervals` DROP FOREIGN KEY `logger_intervals_userId_fkey`;

-- DropIndex
DROP INDEX `logger_intervals_userId_isActive_idx` ON `logger_intervals`;

-- AlterTable
ALTER TABLE `logger_intervals` DROP COLUMN `isActive`,
    DROP COLUMN `userId`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `activeIntervalId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `logger_intervals_intervalSeconds_key` ON `logger_intervals`(`intervalSeconds`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_activeIntervalId_fkey` FOREIGN KEY (`activeIntervalId`) REFERENCES `logger_intervals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
