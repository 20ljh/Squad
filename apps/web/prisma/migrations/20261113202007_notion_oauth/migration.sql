-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "notionConnectedAt" TIMESTAMP(3),
ADD COLUMN     "notionPageTitle" TEXT,
ADD COLUMN     "notionTokenEnc" BYTEA,
ADD COLUMN     "notionWorkspace" TEXT;

