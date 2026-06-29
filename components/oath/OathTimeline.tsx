"use client";

import { motion } from "framer-motion";
import { formatDeadline, isPastDeadline } from "@/lib/utils";
import type { Oath } from "@/lib/genlayer/types";

interface Props {
  oath: Oath;
}

type Stage = "created" | "evidence" | "verdict" | "settled";

function getStage(oath: Oath): Stage {
  if (oath.settled) return "settled";
  if (oath.status !== "active") return "verdict";
  if (isPastDeadline(oath.deadline_unix)) return "evidence";
  return "created";
}

const stages: { key: Stage; label: string; desc: string }[] = [
  { key: "created", label: "Oath Created", desc: "Promise locked on-chain" },
  { key: "evidence", label: "Evidence Window", desc: "Submit public proof" },
  { key: "verdict", label: "Verdict Requested", desc: "GenLayer judges" },
  { key: "settled", label: "Settled", desc: "Final verdict on record" },
];

const stageOrder: Stage[] = ["created", "evidence", "verdict", "settled"];

export default function OathTimeline({ oath }: Props) {
  const current = getStage(oath);
  const currentIdx = stageOrder.indexOf(current);

  return (
    <div className="space-y-1">
      <p className="font-mono text-xs text-ink-grey uppercase tracking-widest mb-3">Timeline</p>
      {stages.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <motion.div
                className={`w-2.5 h-2.5 rounded-full mt-0.5 ${
                  done
                    ? "bg-verdict-green"
                    : active
                    ? "bg-signal-cyan"
                    : "bg-court-slate border border-glass-line"
                }`}
                animate={active ? { scale: [1, 1.3, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              {i < stages.length - 1 && (
                <div
                  className={`w-px h-6 mt-1 ${done ? "bg-verdict-green/40" : "bg-glass-line"}`}
                />
              )}
            </div>
            <div className="pb-2">
              <p
                className={`text-xs font-medium ${
                  active ? "text-signal-cyan" : done ? "text-ivory-record" : "text-ink-grey"
                }`}
              >
                {s.label}
              </p>
              <p className="text-xs text-ink-grey">{s.desc}</p>
              {s.key === "evidence" && (
                <p className="text-xs text-ink-grey mt-0.5 font-mono">
                  Deadline: {formatDeadline(oath.deadline_unix)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
