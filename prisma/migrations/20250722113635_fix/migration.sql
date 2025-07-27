/*
  Warnings:

  - You are about to drop the column `allowNegative` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `trackInventory` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "allowNegative",
DROP COLUMN "trackInventory";
