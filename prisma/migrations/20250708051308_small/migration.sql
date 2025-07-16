/*
  Warnings:

  - You are about to drop the column `signIns` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `signOuts` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "signIns",
DROP COLUMN "signOuts",
ADD COLUMN     "lastLogIn" TIMESTAMP(3);
