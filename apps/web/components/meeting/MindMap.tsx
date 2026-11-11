import type { AgendaItem, Member } from "@/lib/types";

// 안건/의견/결정 데이터로부터 좌표를 계산해 그리는 마인드맵.
// 목업의 손으로 찍은 좌표를 그대로 옮기지 않고, 안건·의견 개수가 바뀌어도 겹치지 않게 레이아웃을 계산합니다.
// 색은 흰 바탕 기준의 토큰(globals.css의 CSS 변수). 그라데이션 패널·그림자 없이 선과 단색 노드로 그림.

const W = 1180;
const PAD_Y = 12;
const ROW = 80; // 의견 노드 사이 간격
const BLOCK_GAP = 40; // 안건 블록 사이 간격

const CENTER = { x: 40, w: 170, h: 60 };
const AGENDA = { x: 330, w: 190, h: 56 };
const OPINION = { x: 620, w: 210, h: 54 };
const DECISION = { x: 930, w: 230, h: 58 };

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

type Props = {
  meetingLabel: string;
  meetingSub: string;
  agenda: AgendaItem[];
  members: Record<string, Member>;
};

export function MindMap({ meetingLabel, meetingSub, agenda, members }: Props) {
  // 1) 안건 블록별 세로 위치 계산
  let cursor = PAD_Y;
  const blocks = agenda.map((item) => {
    const rows = Math.max(item.opinions.length, 1);
    const height = rows * ROW;
    const cy = cursor + height / 2;
    const opinions = item.opinions.map((op, j) => ({
      ...op,
      cy: cy + (j - (item.opinions.length - 1) / 2) * ROW,
    }));
    cursor += height + BLOCK_GAP;
    return { item, cy, opinions };
  });
  const H = Math.max(cursor - BLOCK_GAP + PAD_Y, CENTER.h + PAD_Y * 2);
  const centerY = H / 2;

  const agendaRight = AGENDA.x + AGENDA.w;
  const opinionRight = OPINION.x + OPINION.w;

  return (
    <svg
      role="img"
      aria-label={`${meetingLabel}에서 다룬 ${agenda.length}개 안건과 팀원 의견이 각 결정으로 이어지는 흐름을 보여주는 마인드맵`}
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full min-w-[780px]"
    >
      <defs>
        <marker id="mm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
        </marker>
      </defs>

      {/* 연결선: 회의 → 안건 */}
      {blocks.map(({ item, cy }) => (
        <path
          key={`e-root-${item.id}`}
          d={`M${CENTER.x + CENTER.w},${centerY} C280,${centerY} 260,${cy} ${AGENDA.x},${cy}`}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
        />
      ))}

      {/* 연결선: 안건 → 의견, 의견 → 결정 */}
      {blocks.map(({ item, cy, opinions }) => (
        <g key={`e-${item.id}`}>
          {opinions.map((op, j) => (
            <path
              key={`e-op-${j}`}
              d={`M${agendaRight},${cy} C570,${cy} 580,${op.cy} ${OPINION.x},${op.cy}`}
              fill="none"
              stroke="var(--line)"
              strokeWidth={2}
            />
          ))}
          {item.decision
            ? (opinions.length ? opinions.map((op) => op.cy) : [cy]).map((fromY, j) => (
                <path
                  key={`e-dec-${j}`}
                  d={`M${opinions.length ? opinionRight : agendaRight},${fromY} C880,${fromY} 880,${cy} ${DECISION.x - 4},${cy}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.75}
                  markerEnd={j === 0 ? "url(#mm-arrow)" : undefined}
                />
              ))
            : null}
        </g>
      ))}

      {/* 중심 노드 */}
      <g>
        <rect x={CENTER.x} y={centerY - CENTER.h / 2} width={CENTER.w} height={CENTER.h} rx={16} fill="var(--accent-strong)" />
        <text x={CENTER.x + CENTER.w / 2} y={centerY - 4} textAnchor="middle" fill="#FFFFFF" fontWeight={700} fontSize={15}>
          {meetingLabel}
        </text>
        <text x={CENTER.x + CENTER.w / 2} y={centerY + 16} textAnchor="middle" fill="#FFFFFF" fillOpacity={0.85} fontSize={11}>
          {meetingSub}
        </text>
      </g>

      {blocks.map(({ item, cy, opinions }) => (
        <g key={`n-${item.id}`}>
          {/* 안건 노드 */}
          <rect
            x={AGENDA.x}
            y={cy - AGENDA.h / 2}
            width={AGENDA.w}
            height={AGENDA.h}
            rx={14}
            fill="#FFFFFF"
            stroke="var(--accent)"
            strokeWidth={1.5}
          >
            <title>{item.title}</title>
          </rect>
          <circle cx={AGENDA.x} cy={cy - AGENDA.h / 2} r={12} fill="var(--accent-strong)" />
          <text x={AGENDA.x} y={cy - AGENDA.h / 2 + 4} textAnchor="middle" fill="#FFFFFF" fontWeight={700} fontSize={11}>
            {item.order}
          </text>
          <text x={AGENDA.x + 26} y={cy + 5} fill="var(--ink)" fontWeight={700} fontSize={13}>
            {clip(item.shortTitle, 12)}
          </text>

          {/* 의견 노드 */}
          {opinions.map((op, j) => {
            const m = members[op.memberId];
            return (
              <g key={`op-${j}`}>
                <rect
                  x={OPINION.x}
                  y={op.cy - OPINION.h / 2}
                  width={OPINION.w}
                  height={OPINION.h}
                  rx={14}
                  fill="#FFFFFF"
                  stroke="var(--line)"
                  strokeWidth={1.5}
                >
                  <title>{`${m?.name ?? ""}: ${op.quote}`}</title>
                </rect>
                <rect x={OPINION.x + 10} y={op.cy - 15} width={4} height={30} rx={2} fill={m?.color ?? "var(--ink-soft)"} />
                <text x={OPINION.x + 24} y={op.cy - 4} fill="var(--ink)" fontWeight={700} fontSize={12.5}>
                  {m?.name ?? "알 수 없음"}
                </text>
                <text x={OPINION.x + 24} y={op.cy + 14} fill="var(--ink-soft)" fontSize={11}>
                  {clip(op.gist, 15)}
                </text>
              </g>
            );
          })}

          {/* 결정 노드 */}
          {item.decision ? (
            <g>
              <rect
                x={DECISION.x}
                y={cy - DECISION.h / 2}
                width={DECISION.w}
                height={DECISION.h}
                rx={DECISION.h / 2}
                fill="var(--accent-strong)"
              >
                <title>{item.decision.text}</title>
              </rect>
              <text x={DECISION.x + DECISION.w / 2} y={cy + 5} textAnchor="middle" fill="#FFFFFF" fontWeight={700} fontSize={13}>
                {`✓ ${clip(item.decision.short, 14)}`}
              </text>
            </g>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
