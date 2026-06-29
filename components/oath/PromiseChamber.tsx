"use client";

import { Calendar, Target, ListChecks, Link2, ShieldOff } from "lucide-react";
import { formatDeadline, isPastDeadline, shortAddr } from "@/lib/utils";
import type { Oath } from "@/lib/genlayer/types";

const STATUS_LABEL: Record<string, string> = {
  active: "Active", fulfilled: "Fulfilled", partial: "Partial", missed: "Missed",
  unverifiable: "Unverifiable", excluded: "Excluded", invalid_oath: "Invalid",
  needs_more_evidence: "Needs Evidence", not_due: "Not Due",
};

const STATUS_COLOR: Record<string, string> = {
  active: "#4A9EDB", fulfilled: "var(--verdict-green)", partial: "var(--verdict-gold)",
  missed: "var(--breach-red)", needs_more_evidence: "var(--verdict-gold)",
  unverifiable: "var(--ash)", excluded: "var(--ash)", invalid_oath: "var(--ash)",
};

export default function PromiseChamber({ oath }: { oath: Oath }) {
  const past = isPastDeadline(oath.deadline_unix);
  const sc = STATUS_COLOR[oath.status] || "var(--ash)";

  return (
    <div className="parchment-panel rounded overflow-hidden">
      {/* Header band */}
      <div className="px-6 py-3 border-b border-[var(--rule-line)] flex items-center justify-between"
           style={{ background: `${sc}08` }}>
        <span className="font-mono text-xs text-ash uppercase tracking-widest">
          Oath #{oath.oath_id} · {oath.category}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 rounded"
          style={{ color: sc, borderColor: `${sc}40` }}
        >
          {STATUS_LABEL[oath.status] || oath.status}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Title + creator */}
        <div>
          <h2 className="font-display text-3xl text-parchment leading-tight mb-2">{oath.title}</h2>
          <p className="font-mono text-xs text-ash">By {shortAddr(oath.creator)}</p>
        </div>

        {/* Promise text — styled as a court record */}
        <div className="court-paper rounded p-5 border-l-2" style={{ borderLeftColor: sc }}>
          <p className="font-mono text-xs text-ash uppercase tracking-widest mb-3">Sworn Promise</p>
          <p className="font-display text-lg text-parchment leading-relaxed italic">{oath.promise}</p>
        </div>

        {/* Meta fields */}
        <div className="space-y-4">
          <Field icon={<Calendar size={13} />} label="Deadline">
            <span style={{ color: past ? "var(--verdict-gold)" : "var(--parchment)" }}>
              {formatDeadline(oath.deadline_unix)}
              {past && <span className="font-mono text-xs ml-2" style={{ color: "var(--verdict-gold)" }}>(passed)</span>}
            </span>
          </Field>

          <Field icon={<Target size={13} />} label="Success Criteria">
            {oath.success_criteria}
          </Field>

          {oath.required_deliverables && (
            <Field icon={<ListChecks size={13} />} label="Required Deliverables">
              {oath.required_deliverables}
            </Field>
          )}

          <Field icon={<Link2 size={13} />} label="Accepted Sources">
            {oath.accepted_sources}
          </Field>

          {oath.exclusions && oath.exclusions !== "None" && (
            <Field icon={<ShieldOff size={13} />} label="Exclusions">
              {oath.exclusions}
            </Field>
          )}
        </div>

        {oath.stakeholder_notes && (
          <div className="border border-[var(--rule-line)] rounded p-4">
            <p className="font-mono text-xs text-ash uppercase tracking-widest mb-2">Stakeholder Notes</p>
            <p className="text-parchment-dim text-sm leading-relaxed">{oath.stakeholder_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--rule-line)] pb-4 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-1.5 mb-1.5 text-ash">
        {icon}
        <span className="font-mono text-xs uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-parchment-dim text-sm leading-relaxed pl-5">{children}</div>
    </div>
  );
}
