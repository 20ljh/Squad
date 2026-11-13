import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { JoinRequestForm, ProfileForm } from "@/components/join/JoinForms";
import { pageTitle } from "@/lib/brand";
import { getCurrentUser } from "@/lib/auth/session";
import { findMembership, loginPath } from "@/lib/auth/access";
import { latestRequest, normalizeCode, projectByCode, unlinkedMembers } from "@/lib/join";
import { projectPath } from "@/lib/paths";

export const metadata: Metadata = { title: pageTitle("프로젝트 참여") };

type Params = { params: { code: string } };

function Card({ title, description, children }: { title: string; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="flex animate-fade-up flex-col gap-6 rounded-lg border border-line bg-white p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[24px] font-bold leading-[1.3] sm:text-[26px]">{title}</h1>
        {description ? <div className="m-0 text-base leading-[1.6] text-ink-soft">{description}</div> : null}
      </div>
      {children}
    </section>
  );
}

// 참여(/join/[code]) — 로그인 → 확인 메시지 보내기 → 승인 대기(자동 새로고침) → 이름·역할 고르기 → 팀 대시보드
export default async function JoinPage({ params }: Params) {
  const here = `/join/${encodeURIComponent(params.code)}`;
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(here));

  const code = normalizeCode(params.code);
  const project = code ? await projectByCode(code) : null;

  let body: React.ReactNode;
  if (!code || !project) {
    body = (
      <Card title="초대 코드가 맞지 않아요" description="코드를 잘못 입력했거나, 팀장이 새 코드를 만들어 이전 코드가 더 이상 쓰이지 않아요. 팀장에게 새 초대 링크를 받아 주세요.">
        <Link href="/" className="self-start text-[15px] font-semibold text-accent-strong underline">
          메인으로
        </Link>
      </Card>
    );
  } else {
    if (await findMembership(project.id, user.id)) redirect(projectPath(project.id));
    const req = await latestRequest(project.id, user.id);
    const projectLine = project.course ? `${project.name} · ${project.course}` : project.name;

    if (req?.status === "approved") {
      const names = await unlinkedMembers(project.id);
      body = (
        <Card title="수락됐어요" description={<>팀장이 참여를 수락했어요. <strong className="text-ink">{projectLine}</strong>에서 쓸 내 이름을 골라 주세요.</>}>
          <ProfileForm requestId={req.id} names={names} defaultName={user.name} />
        </Card>
      );
    } else if (req?.status === "pending") {
      body = (
        <Card
          title="팀장의 수락을 기다리고 있어요"
          description={
            <>
              <strong className="text-ink">{projectLine}</strong>에 참여 요청을 보냈어요. 팀장이 수락하면 이 화면이 바로 바뀌어요.
            </>
          }
        >
          <AutoRefresh ms={4000} />
          <p className="m-0 rounded-sm bg-surface-alt px-4 py-3 text-[15px]">보낸 메시지: &ldquo;{req.message}&rdquo;</p>
        </Card>
      );
    } else {
      body = (
        <Card
          title="프로젝트에 참여하기"
          description={
            <>
              <strong className="text-ink">{projectLine}</strong>에 초대받았어요.
              {req?.status === "rejected" ? " 이전 요청은 팀장이 거절했어요. 메시지를 고쳐 다시 보낼 수 있어요." : ""}
            </>
          }
        >
          <JoinRequestForm code={code} defaultName={user.name} />
        </Card>
      );
    }
  }

  return (
    <div className="min-h-screen break-keep bg-surface-alt [overflow-wrap:anywhere]">
      <SiteHeader context="프로젝트 참여" nav={{ href: "/", label: "메인으로", icon: "back" }} />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-5 pb-16 pt-10 sm:pt-16">{body}</main>
    </div>
  );
}
