/*
  Warnings:

  - You are about to drop the column `logo` on the `Institute` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Institute" DROP COLUMN "logo",
ADD COLUMN     "logoUrl" TEXT;
