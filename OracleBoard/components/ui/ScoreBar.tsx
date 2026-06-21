import { clsx } from "clsx";
import type { ScoreBand } from "@/lib/genlayer/types";

interface ScoreBarProps {
  label: string;
  score: number;
  band: ScoreBand;
  className?: string;
}

const BAND_COLOR: Record<ScoreBand, string> = {
  WEAK: "#FF5C5C",
  DEVELOPING: "#D6B25E",
  PROMISING: "#D6B25E",
  STRONG: "#56F39A",
};

const BAND_LABEL: Record<ScoreBand, string> = {
  WEAK: "Weak",
  DEVELOPING: "Developing",
  PROMISING: "Promising",
  STRONG: "Strong",
};

export function ScoreBar({ label, score, band, className }: ScoreBarProps) {
  const color = BAND_COLOR[band];
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate font-body">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color }}>{BAND_LABEL[band]}</span>
          <span className="text-sm font-mono text-memo">{score}</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-[#1E2530] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface ScoreRingProps {
  score: number;
  band: ScoreBand;
  size?: number;
}

export function ScoreRing({ score, band, size = 72 }: ScoreRingProps) {
  const color = BAND_COLOR[band];
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E2530" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute font-mono text-sm font-medium" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
