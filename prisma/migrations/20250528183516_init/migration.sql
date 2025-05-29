/*
  Warnings:

  - You are about to drop the `buisnesses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "buisnesses";

-- CreateTable
CREATE TABLE "Businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Businesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Businesses_userId_key" ON "Businesses"("userId");
