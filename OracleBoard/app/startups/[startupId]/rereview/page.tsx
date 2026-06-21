"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { submitRoundUpdate, startRereview } from "@/lib/oracleboard/contract";
import { saveTx } from "@/lib/oracleboard/tx";
import { useWallet } from "@/lib/context/WalletContext";
import { ChevronRight, Loader2, AlertCircle, RotateCcw } from "lucide-react";

const UPDATE_TYPES = [
  "New Revenue Metrics",
  "New Customer Proof",
  "New Partnership",
  "Product Milestone",
  "Team Update",
  "Market Validation",
  "Risk Clarification",
  "Other",
];

interface FormData {
  update_type: string;
  new_metrics: string;
  new_milestones: string;
  new_evidence_ref: string;
  founder_response: string;
  requested_review_reason: string;
}

const EMPTY: FormData = {
  update_type: "",
  new_metrics: "",
  new_milestones: "",
  new_evidence_ref: "",
  founder_response: "",
  requested_review_reason: "",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  textarea = true,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const cls = "w-full bg-navy border border-border rounded px-3 py-2 text-sm text-memo font-body placeholder:text-slate focus:outline-none focus:border-gold transition-colors";
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono text-slate uppercase tracking-wide">
        {label}
        {required && <span className="text-gold ml-1">*</span>}
      </label>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${cls} resize-y`} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

export default function RereviewPage({ params }: { params: Promise<{ startupId: string }> }) {
  const { startupId } = use(params);
  const router = useRouter();
  const { address } = useWallet();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [phase, setPhase] = useState<"form" | "submitting" | "submitted" | "reviewing">("form");
  const [updateId, setUpdateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(key: keyof FormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) { setError("Connect wallet first."); return; }
    if (!form.update_type) { setError("Update type is required."); return; }
    if (!form.requested_review_reason.trim()) { setError("Re-review reason is required."); return; }

    setPhase("submitting");
    setError(null);

    const uid = `update_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const txHash = await submitRoundUpdate({
        startup_id: startupId,
        update_id: uid,
        submitted_by: address,
        ...form,
      });
      saveTx(startupId, "roundUpdate", txHash);
      setUpdateId(uid);
      setPhase("submitted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setPhase("form");
    }
  }

  async function handleStartRereview() {
    if (!updateId) return;
    setPhase("reviewing");
    setError(null);
    try {
      const txHash = await startRereview(startupId, updateId);
      saveTx(startupId, "rereview", txHash);
      router.push(`/startups/${startupId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-review failed to start");
      setPhase("submitted");
    }
  }

  return (
    <Shell>
      <div className="max-w-xl mx-auto p-6 pb-16 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate">
          <Link href="/overview" className="hover:text-memo transition-colors">Overview</Link>
          <ChevronRight size={10} />
          <Link href={`/startups/${startupId}`} className="hover:text-memo transition-colors">{startupId}</Link>
          <ChevronRight size={10} />
          <span className="text-memo">Round Update</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-xl font-heading font-semibold text-memo">Submit Round Update</h1>
          <p className="text-sm text-slate mt-0.5 font-body">
            New traction, milestones, or clarification for the committee. This is not an appeal — it is an investment re-review based on changed information.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-[rgba(255,92,92,0.08)] border border-[rgba(255,92,92,0.2)] rounded">
            <AlertCircle size={14} className="text-risk mt-0.5 shrink-0" />
            <p className="text-sm text-risk font-body">{error}</p>
          </div>
        )}

        {phase === "submitted" && updateId && (
          <div className="card p-6 space-y-4 border-[rgba(86,243,154,0.2)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-signal" />
              <span className="text-sm font-body text-signal">Round update submitted to contract.</span>
            </div>
            <p className="text-xs text-slate font-mono">Update ID: {updateId}</p>
            <p className="text-sm text-memo font-body">
              Start the re-review to trigger GenLayer consensus evaluation of this new information against the original memo.
            </p>
            <button
              onClick={handleStartRereview}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian text-xs font-mono font-semibold rounded hover:bg-[#C9A24D] transition-colors"
            >
              <RotateCcw size={12} />
              Start Re-review Evaluation
            </button>
          </div>
        )}

        {phase === "reviewing" && (
          <div className="card p-6 flex items-center gap-3 border-[rgba(214,178,94,0.2)]">
            <div className="w-2 h-2 rounded-full bg-gold blink" />
            <div>
              <div className="text-sm text-gold font-body">Re-review Evaluation Starting...</div>
              <div className="text-xs text-slate font-body mt-0.5">GenLayer validators will evaluate the new information. Redirecting to startup profile.</div>
            </div>
          </div>
        )}

        {(phase === "form" || phase === "submitting") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Update type */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate uppercase tracking-wide">
                Update Type <span className="text-gold">*</span>
              </label>
              <select
                value={form.update_type}
                onChange={(e) => handleChange("update_type", e.target.value)}
                className="w-full bg-navy border border-border rounded px-3 py-2 text-sm text-memo font-body focus:outline-none focus:border-gold transition-colors"
              >
                <option value="">Select update type...</option>
                {UPDATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <Field label="New Metrics" value={form.new_metrics} onChange={(v) => handleChange("new_metrics", v)} placeholder="Updated revenue, user count, retention, growth rate..." />
            <Field label="New Milestones" value={form.new_milestones} onChange={(v) => handleChange("new_milestones", v)} placeholder="Completed milestones, partnerships, product launches..." />
            <Field label="New Evidence Reference" value={form.new_evidence_ref} onChange={(v) => handleChange("new_evidence_ref", v)} placeholder="URL, document hash, or reference to supporting evidence..." textarea={false} />
            <Field label="Founder Response to Red Flags" value={form.founder_response} onChange={(v) => handleChange("founder_response", v)} placeholder="Address specific red flags or concerns from the original memo..." />
            <Field
              label="Re-review Reason"
              value={form.requested_review_reason}
              onChange={(v) => handleChange("requested_review_reason", v)}
              placeholder="Why should the committee reconsider this startup now?"
              required
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={phase === "submitting" || !address}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold text-obsidian text-sm font-mono font-semibold rounded hover:bg-[#C9A24D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phase === "submitting" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Submitting to Contract...
                  </>
                ) : (
                  <>
                    Submit Round Update
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Shell>
  );
}
