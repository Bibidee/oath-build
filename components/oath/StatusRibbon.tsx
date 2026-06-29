"use client";

import type { OathStatus } from "@/lib/genlayer/types";

const LABEL: Record<string, string> = {
  active: "Active", fulfilled: "Fulfilled", partial: "Partial", missed: "Missed",
  unverifiable: "Unverifiable", invalid_oath: "Invalid", not_due: "Not Due",
  excluded: "Excluded", needs_more_evidence: "Needs Evidence",
};

const COLOR: Record<string, string> = {
  active: "#4A9EDB", fulfilled: "var(--verdict-green)", partial: "var(--verdict-gold)",
  missed: "var(--breach-red)", needs_more_evidence: "var(--verdict-gold)",
  unverifiable: "var(--ash)", invalid_oath: "var(--ash)",
  excluded: "var(--ash)", not_due: "#4A9EDB",
};

const SIZE = { sm: "text-[10px] px-2 py-0.5", md: "text-xs px-2.5 py-1", lg: "text-xs px-3 py-1.5" };

export default function StatusRibbon({ status, size = "md" }: { status: OathStatus | string; size?: "sm" | "md" | "lg" }) {
  const c = COLOR[status] || "var(--ash)";
  return (
    <span
      className={`inline-flex items-center border rounded font-mono uppercase tracking-widest font-medium ${SIZE[size]}`}
      style={{ color: c, borderColor: `${c}40`, background: `${c}10` }}
    >
      {LABEL[status] || status}
    </span>
  );
}
