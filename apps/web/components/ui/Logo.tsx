export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="10" cy="14" r="7" fill="#6C55E6" fillOpacity={0.92} />
      <circle cx="18" cy="14" r="7" fill="#8B7CF6" fillOpacity={0.85} />
    </svg>
  );
}
