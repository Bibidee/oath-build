"use client";

import { motion } from "framer-motion";
import type { OathStatus } from "@/lib/genlayer/types";

const SEAL: Record<string, { color: string; symbol: string; label: string }> = {
  fulfilled:            { color: "var(--verdict-green)",     symbol: "✓", label: "FULFILLED" },
  partial:              { color: "var(--verdict-gold)",       symbol: "◑", label: "PARTIAL" },
  missed:               { color: "var(--breach-red)",         symbol: "✗", label: "MISSED" },
  unverifiable:         { color: "var(--ash)",                symbol: "?", label: "UNVERIFIABLE" },
  excluded:             { color: "var(--ash)",                symbol: "⊘", label: "EXCLUDED" },
  invalid_oath:         { color: "var(--ash)",                symbol: "∅", label: "INVALID" },
  needs_more_evidence:  { color: "var(--verdict-gold)",       symbol: "…", label: "NEEDS EVIDENCE" },
  not_due:              { color: "#4A9EDB",                   symbol: "⏳", label: "NOT DUE" },
  active:               { color: "#4A9EDB",                   symbol: "◎", label: "ACTIVE" },
};

export default function OathSeal({
  status,
  size = 80,
  animate = true,
}: {
  status: OathStatus | string;
  size?: number;
  animate?: boolean;
}) {
  const cfg = SEAL[status] || SEAL.active;
  const r = size * 0.44;
  const cx = size / 2;

  return (
    <motion.div
      initial={animate ? { scale: 0.6, opacity: 0, rotate: -15 } : false}
      animate={animate ? { scale: 1, opacity: 1, rotate: 0 } : false}
      transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
      className="flex flex-col items-center gap-2"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={cfg.color} strokeWidth="1.5" opacity="0.8"/>
        {/* Dashed inner ring */}
        <circle cx={cx} cy={cx} r={r - 6} fill="none" stroke={cfg.color} strokeWidth="0.5"
                strokeDasharray="2.5 2.5" opacity="0.4"/>
        {/* Dot markers */}
        {[0,45,90,135,180,225,270,315].map((a, i) => (
          <circle
            key={i}
            cx={cx + (r + 4) * Math.cos((a - 90) * Math.PI / 180)}
            cy={cx + (r + 4) * Math.sin((a - 90) * Math.PI / 180)}
            r="1.2"
            fill={cfg.color}
            opacity="0.4"
          />
        ))}
        {/* Symbol */}
        <text
          x={cx} y={cx + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={cfg.color}
          fontSize={size * 0.3}
          fontFamily="IBM Plex Mono"
        >
          {cfg.symbol}
        </text>
      </svg>
      <span
        className="font-mono text-center uppercase tracking-widest"
        style={{ fontSize: size * 0.1, color: cfg.color, letterSpacing: "0.15em" }}
      >
        {cfg.label}
      </span>
    </motion.div>
  );
}
