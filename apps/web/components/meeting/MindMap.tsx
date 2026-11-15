import type { AgendaItem, Member } from "@/lib/types";
import { ZoomPane } from "./ZoomPane";

// 안건/의견/결정 데이터로부터 좌표를 계산해 그리는 마인드맵.
// 목업의 손으로 찍은 좌표를 그대로 옮기지 않고, 안건·의견 개수가 바뀌어도 겹치지 않게 레이아웃을 계산합니다.
// 색은 흰 바탕 기준의 토큰(globals.css의 CSS 변수). 그라데이션 패널·그림자 없이 선과 단색 노드로 그림.

const W = 1180;
const PAD_Y = 12;
const ROW = 84; // 의견 노드 사이 간격
const BLOCK_GAP = 40; // 안건 블록 사이 간격

const CENTER = { x: 40, w: 170, h: 60 };
const AGENDA = { x: 330, w: 190, h: 56 };
const OPINION = { x: 620, w: 210, h: 66 };
const DECISION = { x: 930, w: 230, h: 58 };

/** 글자 폭 대략치: 한글·전각 1, 영문·숫자·기호 0.55 (SVG는 줄바꿈을 못 해서 직접 나눔) */
function width(text: string): number {
  let w = 0;
  for (const ch of text) w += /[ᄀ-ᇿ㄰-㆏가-힯　-〿＀-￯]/.test(ch) ? 1 : 0.55;
  return w;
}

/**
 * 칸 안에 들어가게 최대 maxLines 줄로 나눔. 띄어쓰기 단위로 채우고(한 단어가 너무 길면 글자 단위),
 * 그래도 넘치면 마지막 줄 끝을 "…"로. perLine은 한 줄에 들어가는 한글 글자 수
 */
function lines(text: string, perLine: number, maxLines = 2): string[] {
  const out: string[] = [];
  let cur = "";
  const push = () => {
    out.push(cur);
    cur = "";
  };
  for (const word of text.trim().split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (width(next) <= perLine) {
      cur = next;
      continue;
    }
    if (cur) push();
    // 단어 하나가 한 줄보다 길면 글자 단위로 끊음
    let rest = word;
    while (width(rest) > perLine) {
      let cut = "";
      for (const ch of rest) {
        if (width(cut + ch) > perLine) break;
        cut += ch;
      }
      out.push(cut);
      rest = rest.slice(cut.length);
    }
    cur = rest;
  }
  if (cur) push();
  if (out.length <= maxLines) return out;
  const kept = out.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && width(`${last}…`) > perLine)
    last = [...last].slice(0, -1).join("");
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

type Props = {
  meetingLabel: string;
  meetingSub: string;
  agenda: AgendaItem[];
  members: Record<string, Member>;
  /** 크기 버튼 왼쪽에 둘 범례 */
  legend?: React.ReactNode;
};

export function MindMap({ meetingLabel, meetingSub, agenda, members, legend }: Props) {
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

  // 칸 안에서 확대·축소·끌기 (components/meeting/ZoomPane.tsx). 그림은 원래 크기(W×H)로 그리고 틀이 비율을 정함
  return (
    <ZoomPane contentWidth={W} contentHeight={H} label="논의 흐름 마인드맵" aside={legend}>
      <svg
        role="img"
        aria-label={`${meetingLabel}에서 다룬 ${agenda.length}개 안건과 팀원 의견이 각 결정으로 이어지는 흐름을 보여주는 마인드맵`}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block"
      >
        <defs>
          <marker
            id="mm-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
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
              ? (opinions.length ? opinions.map((op) => op.cy) : [cy]).map(
                  (fromY, j) => (
                    <path
                      key={`e-dec-${j}`}
                      d={`M${opinions.length ? opinionRight : agendaRight},${fromY} C880,${fromY} 880,${cy} ${DECISION.x - 4},${cy}`}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={1.75}
                      markerEnd={j === 0 ? "url(#mm-arrow)" : undefined}
                    />
                  ),
                )
              : null}
          </g>
        ))}

        {/* 중심 노드 */}
        <g>
          <rect
            x={CENTER.x}
            y={centerY - CENTER.h / 2}
            width={CENTER.w}
            height={CENTER.h}
            rx={16}
            fill="var(--accent-strong)"
          />
          <text
            x={CENTER.x + CENTER.w / 2}
            y={centerY - 4}
            textAnchor="middle"
            fill="#FFFFFF"
            fontWeight={600}
            fontSize={15}
          >
            {meetingLabel}
          </text>
          <text
            x={CENTER.x + CENTER.w / 2}
            y={centerY + 16}
            textAnchor="middle"
            fill="#FFFFFF"
            fillOpacity={0.85}
            fontSize={11}
          >
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
            <circle
              cx={AGENDA.x}
              cy={cy - AGENDA.h / 2}
              r={12}
              fill="var(--accent-strong)"
            />
            <text
              x={AGENDA.x}
              y={cy - AGENDA.h / 2 + 4}
              textAnchor="middle"
              fill="#FFFFFF"
              fontWeight={600}
              fontSize={11}
            >
              {item.order}
            </text>
            {(() => {
              const ls = lines(item.shortTitle, 11);
              return (
                <text
                  x={AGENDA.x + 26}
                  y={cy + 5 - (ls.length - 1) * 8}
                  fill="var(--ink)"
                  fontWeight={600}
                  fontSize={13}
                >
                  {ls.map((l, k) => (
                    <tspan key={k} x={AGENDA.x + 26} dy={k ? 16 : 0}>
                      {l}
                    </tspan>
                  ))}
                </text>
              );
            })()}

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
                  <rect
                    x={OPINION.x + 10}
                    y={op.cy - 20}
                    width={4}
                    height={40}
                    rx={2}
                    fill={m?.color ?? "var(--ink-soft)"}
                  />
                  {(() => {
                    const ls = lines(op.gist, 16);
                    const top = op.cy - (ls.length > 1 ? 12 : 4);
                    return (
                      <>
                        <text
                          x={OPINION.x + 24}
                          y={top}
                          fill="var(--ink)"
                          fontWeight={600}
                          fontSize={12.5}
                        >
                          {m?.name ?? "알 수 없음"}
                        </text>
                        <text
                          x={OPINION.x + 24}
                          y={top + 18}
                          fill="var(--ink-soft)"
                          fontSize={11}
                        >
                          {ls.map((l, k) => (
                            <tspan key={k} x={OPINION.x + 24} dy={k ? 15 : 0}>
                              {l}
                            </tspan>
                          ))}
                        </text>
                      </>
                    );
                  })()}
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
                {(() => {
                  const ls = lines(`✓ ${item.decision.short}`, 15);
                  return (
                    <text
                      x={DECISION.x + DECISION.w / 2}
                      y={cy + 5 - (ls.length - 1) * 8}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontWeight={600}
                      fontSize={13}
                    >
                      {ls.map((l, k) => (
                        <tspan
                          key={k}
                          x={DECISION.x + DECISION.w / 2}
                          dy={k ? 16 : 0}
                        >
                          {l}
                        </tspan>
                      ))}
                    </text>
                  );
                })()}
              </g>
            ) : null}
          </g>
        ))}
      </svg>
    </ZoomPane>
  );
}
