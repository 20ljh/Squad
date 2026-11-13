-- STT 워커: 마지막 소식 시각(멈춘 작업 다시 가져가기), 처리 실패 이유

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "failReason" TEXT,
ADD COLUMN     "sttHeartbeatAt" TIMESTAMP(3);

