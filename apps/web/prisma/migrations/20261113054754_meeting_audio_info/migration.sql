-- 받아쓰는 중 화면용: 올린 파일의 원래 이름·크기, STT 워커가 녹음을 가져간 시각

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "audioName" TEXT,
ADD COLUMN     "audioSize" INTEGER,
ADD COLUMN     "sttStartedAt" TIMESTAMP(3);

