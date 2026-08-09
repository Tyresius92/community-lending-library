/*
  Warnings:

  - You are about to drop the column `completedLoanCount` on the `CommunityMembership` table. All the data in the column will be lost.
  - You are about to drop the column `completedLoanCount` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CommunityMembership" DROP COLUMN "completedLoanCount";

-- AlterTable
ALTER TABLE "InviteToken" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "completedLoanCount";

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
