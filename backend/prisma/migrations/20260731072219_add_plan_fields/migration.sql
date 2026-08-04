-- AlterTable
ALTER TABLE "Institute" ADD COLUMN     "planName" TEXT NOT NULL DEFAULT 'Starter',
ADD COLUMN     "planUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "studentLimit" INTEGER,
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
