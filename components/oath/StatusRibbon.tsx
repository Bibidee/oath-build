"use client";

import { statusLabel } from "@/lib/utils";
import type { OathStatus } from "@/lib/genlayer/types";

interface Props {
  status: OathStatus | string;
  size?: "sm" | "md" | "lg";
}

const colorMap: Record<string, string> = {
  active: "bg-signal-cyan/10 text-signal-cyan border-signal-cyan/30",
  fulfilled: "bg-verdict-green/10 text-verdict-green border-verdict-green/30",
  partial: "bg-partial-amber/10 text-partial-amber border-partial-amber/30",
  missed: "bg-breach-red/10 text-breach-red border-breach-red/30",
  unverifiable: "bg-ink-grey/10 text-ink-grey border-ink-grey/30",
  invalid_oath: "bg-ink-grey/10 text-ink-grey border-ink-grey/30",
  not_due: "bg-witness-gold/10 text-witness-gold border-witness-gold/30",
  excluded: "bg-signal-cyan/10 text-signal-cyan border-signal-cyan/30",
  needs_more_evidence: "bg-partial-amber/10 text-partial-amber border-partial-amber/30",
};

const sizeMap = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-3 py-1",
  lg: "text-sm px-4 py-1.5",
};

export default function StatusRibbon({ status, size = "md" }: Props) {
  const colors = colorMap[status] || "bg-ink-grey/10 text-ink-grey border-ink-grey/30";
  return (
    <span
      className={`inline-flex items-center border rounded-full font-mono uppercase tracking-widest font-medium ${colors} ${sizeMap[size]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
