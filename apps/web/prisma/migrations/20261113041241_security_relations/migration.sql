-- 보안 점검 반영 (2026-11-13): 팀원 id 칸에 외래 키, 계정 삭제 가능하게, 초대 코드 해시 유일,
-- 목소리 특징은 암호문 칸으로(빈 테이블이라 지워지는 데이터 없음), 원본 음성 삭제 예정일

-- DropForeignKey
ALTER TABLE "JoinRequest" DROP CONSTRAINT "JoinRequest_userId_fkey";

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "audioDeleteAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VoiceProfile" DROP COLUMN "embedding",
ADD COLUMN     "embeddingEnc" BYTEA NOT NULL,
ADD COLUMN     "keyVersion" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_inviteCodeHash_key" ON "Project"("inviteCodeHash");

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerLabel" ADD CONSTRAINT "SpeakerLabel_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerLabel" ADD CONSTRAINT "SpeakerLabel_suggestedMemberId_fkey" FOREIGN KEY ("suggestedMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_ownerMemberId_fkey" FOREIGN KEY ("ownerMemberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opinion" ADD CONSTRAINT "Opinion_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRead" ADD CONSTRAINT "MeetingRead_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

