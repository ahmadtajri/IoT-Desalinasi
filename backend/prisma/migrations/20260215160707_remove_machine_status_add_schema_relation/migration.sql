/*
  Warnings:

  - You are about to drop the `machine_status` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `machine_status`;

-- CreateIndex
CREATE INDEX `desalination_schemas_uploadedBy_idx` ON `desalination_schemas`(`uploadedBy`);

-- AddForeignKey
ALTER TABLE `desalination_schemas` ADD CONSTRAINT `desalination_schemas_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
