import { db } from "./db";
import { projectPath } from "./paths";

// 메인 화면 "내 프로젝트": 로그인한 계정이 팀원인 프로젝트 + 참여 요청 후 승인을 기다리는 프로젝트

export type MyProject = {
  id: string;
  name: string;
  /** "캡스톤디자인 · 회의 3회"처럼 이름 아래 한 줄 */
  meta: string;
  /** leader: 팀장 · member: 팀원 · pending: 참여 요청 후 승인 대기(수락됐지만 이름을 아직 안 고른 경우 포함) */
  status: "leader" | "member" | "pending";
  href: string;
};

export async function getMyProjects(userId: string): Promise<MyProject[]> {
  const [members, requests] = await Promise.all([
    db.member.findMany({
      where: { userId },
      orderBy: { project: { createdAt: "desc" } },
      select: { role: true, project: { select: { id: true, name: true, course: true, _count: { select: { meetings: true } } } } },
    }),
    db.joinRequest.findMany({
      where: { userId, status: { in: ["pending", "approved"] }, memberId: null },
      orderBy: { createdAt: "desc" },
      select: { project: { select: { id: true, name: true, course: true } } },
    }),
  ]);
  const joined = new Set(members.map((m) => m.project.id));
  const mine: MyProject[] = members.map((m) => ({
    id: m.project.id,
    name: m.project.name,
    meta: [m.project.course, `회의 ${m.project._count.meetings}회`].filter(Boolean).join(" · "),
    status: m.role === "leader" ? "leader" : "member",
    href: projectPath(m.project.id),
  }));
  // 승인 대기는 초대 코드 원문이 없어 참여 화면으로 바로 못 감 → 메인에서 상태만 보여 줌
  const waiting: MyProject[] = requests
    .filter((r) => !joined.has(r.project.id))
    .map((r) => ({ id: r.project.id, name: r.project.name, meta: r.project.course ?? "참여 요청을 보냈어요", status: "pending", href: "" }));
  return [...waiting, ...mine];
}
