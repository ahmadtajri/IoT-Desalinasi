-- AlterTable
ALTER TABLE `sensor_categories` ADD COLUMN `createdById` INTEGER NULL;

-- AlterTable
ALTER TABLE `sensor_configs` ADD COLUMN `configuredById` INTEGER NULL;

-- AlterTable
ALTER TABLE `valve_config` ADD COLUMN `updatedById` INTEGER NULL;

-- CreateIndex
CREATE INDEX `sensor_categories_createdById_idx` ON `sensor_categories`(`createdById`);

-- CreateIndex
CREATE INDEX `sensor_configs_configuredById_idx` ON `sensor_configs`(`configuredById`);

-- CreateIndex
CREATE INDEX `valve_config_updatedById_idx` ON `valve_config`(`updatedById`);

-- AddForeignKey
ALTER TABLE `sensor_categories` ADD CONSTRAINT `sensor_categories_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sensor_configs` ADD CONSTRAINT `sensor_configs_configuredById_fkey` FOREIGN KEY (`configuredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `valve_config` ADD CONSTRAINT `valve_config_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
