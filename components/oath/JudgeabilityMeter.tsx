"use client";

import { motion } from "framer-motion";
import { judgeabilityScore } from "@/lib/utils";

interface Props {
  data: {
    deadline_unix?: number;
    success_criteria?: string;
    required_deliverables?: string;
    accepted_sources?: string;
    exclusions?: string;
    promise?: string;
  };
}

export default function JudgeabilityMeter({ data }: Props) {
  const score = judgeabilityScore(data);

  const label =
    score >= 80
      ? "Highly judgeable"
      : score >= 60
      ? "Likely judgeable"
      : score >= 40
      ? "Partially judgeable"
      : "Low judgeability";

  const color =
    score >= 80
      ? "#19C37D"
      : score >= 60
      ? "#D6A84F"
      : score >= 40
      ? "#F59E0B"
      : "#EF4444";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-ink-grey uppercase tracking-widest">Judgeability</span>
        <span className="font-mono text-sm font-medium" style={{ color }}>
          {score} / 100
        </span>
      </div>
      <div className="h-1.5 bg-court-slate rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <p className="font-mono text-xs" style={{ color }}>
        {label}
      </p>
    </div>
  );
}
