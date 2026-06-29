"use client";

import { motion } from "framer-motion";
import type { OathStatus } from "@/lib/genlayer/types";

interface Props {
  status: OathStatus | string;
  size?: number;
  animate?: boolean;
}

const sealConfig: Record<string, { color: string; bg: string; symbol: string; label: string }> = {
  fulfilled: { color: "#19C37D", bg: "rgba(25,195,125,0.1)", symbol: "✓", label: "FULFILLED" },
  partial: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", symbol: "◑", label: "PARTIAL" },
  missed: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", symbol: "✗", label: "MISSED" },
  unverifiable: { color: "#8A93A5", bg: "rgba(138,147,165,0.1)", symbol: "?", label: "UNVERIFIABLE" },
  excluded: { color: "#28D7FF", bg: "rgba(40,215,255,0.1)", symbol: "⊘", label: "EXCLUDED" },
  invalid_oath: { color: "#8A93A5", bg: "rgba(138,147,165,0.1)", symbol: "∅", label: "INVALID" },
  needs_more_evidence: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", symbol: "…", label: "PENDING" },
  not_due: { color: "#D6A84F", bg: "rgba(214,168,79,0.1)", symbol: "⏳", label: "NOT DUE" },
  active: { color: "#28D7FF", bg: "rgba(40,215,255,0.1)", symbol: "◎", label: "ACTIVE" },
};

export default function OathSeal({ status, size = 80, animate = true }: Props) {
  const cfg = sealConfig[status] || sealConfig.active;
  const r = size * 0.45;
  const cx = size / 2;

  return (
    <motion.div
      initial={animate ? { scale: 0.5, opacity: 0, rotate: -20 } : false}
      animate={animate ? { scale: 1, opacity: 1, rotate: 0 } : false}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      className="flex flex-col items-center gap-1"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill={cfg.bg} stroke={cfg.color} strokeWidth={1.5} />
        <circle cx={cx} cy={cx} r={r - 6} fill="none" stroke={cfg.color} strokeWidth={0.5} strokeDasharray="3 3" />
        <text
          x={cx}
          y={cx + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={cfg.color}
          fontSize={size * 0.28}
          fontFamily="IBM Plex Mono"
        >
          {cfg.symbol}
        </text>
      </svg>
      <span
        className="font-mono text-center"
        style={{ fontSize: size * 0.11, color: cfg.color, letterSpacing: "0.15em" }}
      >
        {cfg.label}
      </span>
    </motion.div>
  );
}
