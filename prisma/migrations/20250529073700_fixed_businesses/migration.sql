/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Businesses` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Businesses_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Businesses_id_key" ON "Businesses"("id");
