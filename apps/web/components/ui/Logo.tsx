// 로고 마크: 두 사람(팀)이 겹친 모양. 반투명·그라데이션 없이 단색 원 + 선 원
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="10" cy="14" r="7" className="fill-accent-strong" />
      <circle cx="18" cy="14" r="6.25" fill="none" strokeWidth="1.5" className="stroke-ink" />
    </svg>
  );
}
