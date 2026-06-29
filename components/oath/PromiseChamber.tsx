"use client";

import { Calendar, Target, ListChecks, Link2, ShieldOff } from "lucide-react";
import { formatDeadline, shortAddr, isPastDeadline } from "@/lib/utils";
import StatusRibbon from "./StatusRibbon";
import type { Oath } from "@/lib/genlayer/types";

interface Props {
  oath: Oath;
}

export default function PromiseChamber({ oath }: Props) {
  const past = isPastDeadline(oath.deadline_unix);

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Top band */}
      <div className="bg-court-slate/60 px-6 py-3 border-b border-glass-line flex items-center justify-between">
        <span className="font-mono text-xs text-ink-grey uppercase tracking-widest">
          Oath #{oath.oath_id} · {oath.category}
        </span>
        <StatusRibbon status={oath.status} />
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h2 className="font-serif text-2xl text-ivory-record leading-tight mb-2">
            {oath.title}
          </h2>
          <p className="text-sm text-ink-grey font-mono">
            By {shortAddr(oath.creator)}
          </p>
        </div>

        {/* Promise text */}
        <div className="border-l-2 border-witness-gold/50 pl-4">
          <p className="text-ivory-record leading-relaxed">{oath.promise}</p>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-1 gap-4">
          <Field
            icon={<Calendar size={14} />}
            label="Deadline"
            value={
              <span className={past ? "text-partial-amber" : "text-ivory-record"}>
                {formatDeadline(oath.deadline_unix)}{" "}
                {past && <span className="text-xs text-partial-amber font-mono">(passed)</span>}
              </span>
            }
          />
          <Field
            icon={<Target size={14} />}
            label="Success Criteria"
            value={oath.success_criteria}
          />
          {oath.required_deliverables && (
            <Field
              icon={<ListChecks size={14} />}
              label="Required Deliverables"
              value={oath.required_deliverables}
            />
          )}
          <Field
            icon={<Link2 size={14} />}
            label="Accepted Sources"
            value={oath.accepted_sources}
          />
          {oath.exclusions && oath.exclusions !== "None" && (
            <Field
              icon={<ShieldOff size={14} />}
              label="Exclusions"
              value={oath.exclusions}
            />
          )}
        </div>

        {oath.stakeholder_notes && (
          <div className="bg-court-slate/40 rounded-lg px-4 py-3">
            <p className="font-mono text-xs text-ink-grey mb-1">Stakeholder Notes</p>
            <p className="text-sm text-ivory-record/80">{oath.stakeholder_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1 text-ink-grey">
        {icon}
        <span className="font-mono text-xs uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-sm text-ivory-record/90 leading-relaxed pl-5">
        {value}
      </div>
    </div>
  );
}
