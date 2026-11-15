"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 마인드맵처럼 큰 그림을 칸 안에서 확대·축소하고 끌어서 보는 틀
// - 버튼(그림 아래 오른쪽): 축소 / 비율 / 확대 / 맞춤(칸에 꽉 차게)
// - Ctrl(⌘) + 휠: 마우스 위치를 중심으로 확대·축소 (그냥 휠은 페이지 스크롤 그대로)
// - 끌기: 마우스는 언제나, 터치는 가로로 끌거나 직접 확대한 뒤에만 (세로로 쓸면 페이지가 내려감)
// - 칸 높이는 처음 보기 기준으로 고정 → 확대해도 아래 내용이 밀리지 않음
// - 확대는 그림을 늘리는(scale) 대신 SVG 크기를 바꿔 다시 그림 → 글자·선이 흐려지지 않음 (자식은 SVG 하나)

const MIN = 0.25;
const MAX = 2.5;
const STEP = 1.25;
/** 처음 보기의 최소 비율 (좁은 화면에서 글자가 너무 작아지지 않게. 넘치는 부분은 끌어서 봄) */
const READABLE = 0.62;
const MAX_HEIGHT = 640;

type View = { scale: number; x: number; y: number };

export function ZoomPane({
  contentWidth,
  contentHeight,
  label,
  aside,
  children,
}: {
  contentWidth: number;
  contentHeight: number;
  label: string;
  /** 크기 버튼 왼쪽에 나란히 둘 것 (마인드맵 범례) */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; sx: number; sy: number; x: number; y: number } | null>(null);
  const [boxW, setBoxW] = useState(0);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [zoomed, setZoomed] = useState(false); // 사용자가 직접 확대·축소했는지 (터치 끌기 허용 여부)

  const widthFit = boxW ? Math.min(1, boxW / contentWidth) : 1;
  // 처음 보기: 좁은 화면에서도 읽을 수 있는 크기, 단 세로는 칸 최대 높이 안에 다 들어오게 (아래가 잘리지 않게)
  const initial = Math.min(Math.max(widthFit, Math.min(1, READABLE)), MAX_HEIGHT / contentHeight);
  const height = Math.min(Math.round(contentHeight * initial), MAX_HEIGHT);
  // "맞춤" = 가로·세로 모두 칸 안에 다 보이는 비율
  const fit = Math.min(widthFit, height / contentHeight);

  // 그림이 칸 밖으로 너무 나가지 않게 위치를 묶음
  const clamp = useCallback(
    (v: View): View => {
      const w = contentWidth * v.scale;
      const h = contentHeight * v.scale;
      const x = w <= boxW ? (boxW - w) / 2 : Math.min(0, Math.max(boxW - w, v.x));
      const y = h <= height ? (height - h) / 2 : Math.min(0, Math.max(height - h, v.y));
      return { scale: v.scale, x, y };
    },
    [boxW, contentWidth, contentHeight, height],
  );

  // 칸 너비를 재고, 처음 보기로 맞춤 (창 크기가 바뀌어도 다시)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!boxW) return;
    setView(clamp({ scale: initial, x: 0, y: 0 }));
    setZoomed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxW]);

  /** (cx, cy) 지점을 중심으로 비율 바꾸기 */
  const zoomAt = useCallback(
    (next: number, cx = boxW / 2, cy = height / 2) => {
      setView((v) => {
        const scale = Math.min(MAX, Math.max(MIN, next));
        const k = scale / v.scale;
        return clamp({ scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
      setZoomed(true);
    },
    [boxW, height, clamp],
  );

  // Ctrl/⌘ + 휠 확대 (React onWheel은 passive라 기본 동작을 막을 수 없어서 직접 등록)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => {
        const scale = Math.min(MAX, Math.max(MIN, v.scale * Math.exp(-e.deltaY * 0.0015)));
        const k = scale / v.scale;
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        return clamp({ scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
      setZoomed(true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clamp]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: view.x, y: view.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setView(clamp({ scale: view.scale, x: d.x + (e.clientX - d.sx), y: d.y + (e.clientY - d.sy) }));
  }
  function onPointerUp(e: React.PointerEvent) {
    if (drag.current?.id === e.pointerId) drag.current = null;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "+" || e.key === "=") zoomAt(view.scale * STEP);
    else if (e.key === "-") zoomAt(view.scale / STEP);
    else if (e.key === "0") reset();
    else if (e.key.startsWith("Arrow")) {
      const dx = e.key === "ArrowLeft" ? 60 : e.key === "ArrowRight" ? -60 : 0;
      const dy = e.key === "ArrowUp" ? 60 : e.key === "ArrowDown" ? -60 : 0;
      setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
    } else return;
    e.preventDefault();
  }

  function reset() {
    setView(clamp({ scale: fit, x: 0, y: 0 }));
    setZoomed(fit !== initial);
  }

  const btn =
    "flex h-11 min-w-11 items-center justify-center rounded-sm text-ink-soft transition-colors duration-150 hover:bg-surface-alt hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    // 그림과 아래 줄 사이 16px = 아래 줄과 칸 테두리 사이 16px (회의 결과 페이지의 마인드맵 칸 pb-4)
    <div className="flex flex-col gap-4">
      <div
        ref={box}
        tabIndex={0}
        role="region"
        aria-label={`${label} (화살표로 옮기고 +, - 키로 크기 조절, 0은 맞춤)`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative cursor-grab select-none overflow-hidden rounded-sm bg-surface-alt/40 outline-none focus-visible:ring-2 focus-visible:ring-accent-strong active:cursor-grabbing"
        // 터치: 직접 확대하기 전엔 세로 스크롤을 페이지에 넘김 (가로로 끌면 그림이 움직임)
        style={{ height: boxW ? height : undefined, touchAction: zoomed ? "none" : "pan-y" }}
      >
        {/* 비율은 그림 크기 자체로 바꿈(SVG를 그 크기로 다시 그려 확대해도 선명). 위치만 translate */}
        <div
          style={{
            width: contentWidth * view.scale,
            height: contentHeight * view.scale,
            transform: `translate(${view.x}px, ${view.y}px)`,
          }}
          className="[&>svg]:h-full [&>svg]:w-full"
        >
          {children}
        </div>
      </div>
      {/* 그림 아래 한 줄: 왼쪽 범례, 오른쪽 크기 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">{aside}</div>
        <div role="group" aria-label="마인드맵 크기" className="ml-auto flex shrink-0 items-center rounded-sm border border-line bg-white">
          <button type="button" className={btn} onClick={() => zoomAt(view.scale / STEP)} disabled={view.scale <= MIN + 0.001} aria-label="축소">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="w-12 text-center text-[13px] tabular-nums text-ink" aria-live="polite">
            {Math.round(view.scale * 100)}%
          </span>
          <button type="button" className={btn} onClick={() => zoomAt(view.scale * STEP)} disabled={view.scale >= MAX - 0.001} aria-label="확대">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <span className="h-5 w-px bg-line" aria-hidden="true" />
          <button type="button" className={`${btn} px-3 text-[13px]`} onClick={reset}>
            맞춤
          </button>
        </div>
      </div>
    </div>
  );
}
