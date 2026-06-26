interface ScoreGaugeProps {
  /** 0..1 fraction; null renders an empty track. */
  fraction: number | null;
  label: string;
  caption?: string;
  size?: number;
  stroke?: number;
}

/**
 * Circular score ring for the (red) detail panel. White-on-red so it reads on
 * the brand-red background. Matches the gauge in the Figma "MacBook Pro 16 - 51".
 */
export function ScoreGauge({
  fraction,
  label,
  caption,
  size = 150,
  stroke = 16,
}: ScoreGaugeProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = fraction === null ? 0 : fraction;
  const dash = c * pct;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#ffffff"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none text-white">
        <span className="font-sans text-3xl font-bold tracking-tight">{label}</span>
        {caption && (
          <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-white/70">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
