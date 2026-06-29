"use client";

import { formatDeadline, isPastDeadline } from "@/lib/utils";
import type { Oath } from "@/lib/genlayer/types";

type Stage = "created" | "evidence" | "verdict" | "settled";

function getStage(oath: Oath, evidenceCount: number): Stage {
  if (oath.settled) return "settled";
  if (oath.status !== "active") return "verdict";
  if (evidenceCount > 0 || isPastDeadline(oath.deadline_unix)) return "evidence";
  return "created";
}

const STAGES: { key: Stage; label: string; desc: string }[] = [
  { key: "created",  label: "Oath Filed",         desc: "Promise locked on-chain" },
  { key: "evidence", label: "Evidence Window",     desc: "Witnesses may come forward" },
  { key: "verdict",  label: "Judgment Requested",  desc: "GenLayer validators ruling" },
  { key: "settled",  label: "Settled",             desc: "Final verdict on record" },
];

const ORDER: Stage[] = ["created", "evidence", "verdict", "settled"];

export default function OathTimeline({ oath, evidenceCount = 0 }: { oath: Oath; evidenceCount?: number }) {
  const current = getStage(oath, evidenceCount);
  const idx = ORDER.indexOf(current);

  return (
    <div>
      <p className="font-mono text-xs text-ash uppercase tracking-[0.25em] mb-4">Timeline</p>
      <div className="space-y-0">
        {STAGES.map((s, i) => {
          const done   = i < idx;
          const active = i === idx;
          const dotColor = done ? "var(--verdict-green)" : active ? "var(--seal-red-bright)" : "var(--ash)";
          return (
            <div key={s.key} className="flex gap-3">
              {/* Spine */}
              <div className="flex flex-col items-center">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                  style={{ background: dotColor, boxShadow: active ? `0 0 8px ${dotColor}` : "none" }}
                />
                {i < STAGES.length - 1 && (
                  <div className="w-px flex-1 mt-1 mb-1 min-h-[20px]"
                       style={{ background: done ? "var(--verdict-green)" : "var(--rule-line)" }} />
                )}
              </div>

              {/* Label */}
              <div className="pb-4">
                <p className="text-xs font-medium leading-tight"
                   style={{ color: active ? "var(--parchment)" : done ? "var(--parchment-dim)" : "var(--ash)" }}>
                  {s.label}
                </p>
                <p className="text-xs text-ash mt-0.5">{s.desc}</p>
                {s.key === "evidence" && (
                  <p className="font-mono text-xs text-ash mt-0.5">
                    Due: {formatDeadline(oath.deadline_unix)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
