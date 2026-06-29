"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, Scale } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { createOath, getExplorerTxUrl } from "@/lib/genlayer/client";
import JudgeabilityMeter from "@/components/oath/JudgeabilityMeter";
import ExplorerLink from "@/components/oath/ExplorerLink";
import { useRouter } from "next/navigation";

const schema = z.object({
  title: z.string().min(4, "Title must be more than 3 characters"),
  promise: z.string().min(21, "Promise must be more than 20 characters"),
  deadline: z.string().min(1, "Deadline is required"),
  success_criteria: z.string().min(21, "Success criteria must be more than 20 characters"),
  required_deliverables: z.string().optional().default(""),
  accepted_sources: z.string().min(6, "Accepted sources must be more than 5 characters"),
  exclusions: z.string().optional().default(""),
  stakeholder_notes: z.string().optional().default(""),
  category: z.string().min(1, "Category is required"),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  "Product Launch", "Grant", "Research", "Partnership", "Community",
  "DAO Proposal", "Creator Delivery", "Agent Task", "Other"
];

const STEPS = [
  { label: "Promise",          sub: "Swear the oath" },
  { label: "Deadline",         sub: "Set the deadline" },
  { label: "Success Criteria", sub: "Define fulfillment" },
  { label: "Evidence Sources", sub: "Allowable witnesses" },
  { label: "Exclusions",       sub: "Void conditions" },
  { label: "Review & Seal",    sub: "Commit to chain" },
];

export default function CreatePage() {
  const router = useRouter();
  const { account, isConnected, connect } = useWallet();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;

  const {
    register, watch, handleSubmit, trigger,
    formState: { errors },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<FormData>({ resolver: zodResolver(schema) as any });

  const watched = watch();

  const next = async () => {
    const fieldMap: (keyof FormData)[][] = [
      ["title", "promise", "category"],
      ["deadline"],
      ["success_criteria", "required_deliverables"],
      ["accepted_sources"],
      ["exclusions", "stakeholder_notes"],
      [],
    ];
    const ok = await trigger(fieldMap[step]);
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = async (data: FormData) => {
    if (!isConnected) { connect(); return; }
    if (!hasContract) { setError("Contract address not configured."); return; }
    setLoading(true); setError(null);
    try {
      const deadline_unix = Math.floor(new Date(data.deadline).getTime() / 1000);
      const hash = await createOath({
        title: data.title, promise: data.promise, deadline_unix,
        success_criteria: data.success_criteria,
        required_deliverables: data.required_deliverables || "",
        accepted_sources: data.accepted_sources,
        exclusions: data.exclusions || "",
        stakeholder_notes: data.stakeholder_notes || "",
        category: data.category,
      }, account!);
      setTxHash(hash);
      setTimeout(() => router.push("/oaths"), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  const judgeData = {
    deadline_unix: watched.deadline ? Math.floor(new Date(watched.deadline).getTime() / 1000) : undefined,
    success_criteria: watched.success_criteria,
    required_deliverables: watched.required_deliverables,
    accepted_sources: watched.accepted_sources,
    exclusions: watched.exclusions,
    promise: watched.promise,
  };

  return (
    <div className="min-h-screen ledger-bg">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Chamber header */}
        <div className="mb-8 flex items-center gap-3">
          <Scale size={20} className="text-ash" />
          <div>
            <p className="font-mono text-[10px] text-ash uppercase tracking-[0.25em]">Promise Chamber</p>
            <h1 className="font-display text-2xl text-parchment">Draft an Oath</h1>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1 flex-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] transition-all shrink-0"
                style={{
                  background: i < step ? "var(--verdict-green)" : i === step ? "var(--seal-red)" : "transparent",
                  border: `1px solid ${i < step ? "var(--verdict-green)" : i === step ? "var(--seal-red)" : "var(--rule-line)"}`,
                  color: i <= step ? "var(--parchment)" : "var(--ash)",
                }}
              >
                {i < step ? <CheckCircle size={10} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-px flex-1"
                     style={{ background: i < step ? "var(--verdict-green)" : "var(--rule-line)" }} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <div className="court-paper border border-[var(--rule-line)] rounded overflow-hidden mb-5">
              {/* Step header */}
              <div className="px-5 py-3 border-b border-[var(--rule-line)]"
                   style={{ background: "var(--court-brown)" }}>
                <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em]">
                  Step {step + 1} of {STEPS.length} · {STEPS[step].sub}
                </p>
                <h2 className="font-display text-xl text-parchment mt-0.5">{STEPS[step].label}</h2>
              </div>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <form onSubmit={handleSubmit(onSubmit as any)} className="p-5 space-y-5">

                {step === 0 && (
                  <>
                    <Field label="Oath Title" error={errors.title?.message}>
                      <input {...register("title")} placeholder="e.g. Public Beta Launch by Q3" className="court-input" />
                    </Field>
                    <Field label="Sworn Promise" error={errors.promise?.message}>
                      <textarea {...register("promise")} rows={5}
                        placeholder="State your commitment in clear, plain language. Be specific enough for an AI to verify it."
                        className="court-input resize-none" />
                    </Field>
                    <Field label="Category" error={errors.category?.message}>
                      <select {...register("category")} className="court-input">
                        <option value="">Select a category</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </>
                )}

                {step === 1 && (
                  <Field label="Deadline" error={errors.deadline?.message}>
                    <input {...register("deadline")} type="datetime-local" className="court-input" />
                    <p className="font-mono text-[10px] text-ash mt-1.5">
                      Evidence may be submitted after this date. Judgment can be requested any time.
                    </p>
                  </Field>
                )}

                {step === 2 && (
                  <>
                    <Field label="Success Criteria" error={errors.success_criteria?.message}>
                      <textarea {...register("success_criteria")} rows={4}
                        placeholder="What specific, verifiable outcome constitutes fulfillment?"
                        className="court-input resize-none" />
                    </Field>
                    <Field label="Required Deliverables (optional)" error={errors.required_deliverables?.message}>
                      <input {...register("required_deliverables")}
                        placeholder="e.g. GitHub repo, deployed URL, published report"
                        className="court-input" />
                    </Field>
                  </>
                )}

                {step === 3 && (
                  <Field label="Accepted Public Evidence Sources" error={errors.accepted_sources?.message}>
                    <textarea {...register("accepted_sources")} rows={3}
                      placeholder="e.g. Official website, GitHub release page, public announcement post"
                      className="court-input resize-none" />
                    <p className="font-mono text-[10px] text-ash mt-1.5">
                      List public sources GenLayer validators may consult when judging this oath.
                    </p>
                  </Field>
                )}

                {step === 4 && (
                  <>
                    <Field label="Exclusions (optional)" error={errors.exclusions?.message}>
                      <textarea {...register("exclusions")} rows={3}
                        placeholder="e.g. Force majeure, scheduled outage over 48 hours, regulatory block"
                        className="court-input resize-none" />
                    </Field>
                    <Field label="Stakeholder Notes (optional)" error={errors.stakeholder_notes?.message}>
                      <input {...register("stakeholder_notes")}
                        placeholder="Additional context for watchers and witnesses"
                        className="court-input" />
                    </Field>
                  </>
                )}

                {step === 5 && (
                  <div className="space-y-5">
                    {/* Preview */}
                    <div className="space-y-3 border border-[var(--rule-line)] rounded divide-y divide-[var(--rule-line)]">
                      <div className="p-4">
                        <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] mb-1">Oath Title</p>
                        <p className="font-display text-lg text-parchment">{watched.title || "—"}</p>
                      </div>
                      <div className="p-4">
                        <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] mb-1.5">Sworn Promise</p>
                        <p className="text-sm text-parchment-dim leading-relaxed">{watched.promise || "—"}</p>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-[var(--rule-line)]">
                        <div className="p-4">
                          <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] mb-1">Deadline</p>
                          <p className="font-mono text-xs text-parchment-dim">{watched.deadline || "—"}</p>
                        </div>
                        <div className="p-4">
                          <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] mb-1">Category</p>
                          <p className="font-mono text-xs text-parchment-dim">{watched.category || "—"}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] mb-1">Success Criteria</p>
                        <p className="text-sm text-parchment-dim">{watched.success_criteria || "—"}</p>
                      </div>
                      <div className="p-4">
                        <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] mb-1">Accepted Sources</p>
                        <p className="text-sm text-parchment-dim">{watched.accepted_sources || "—"}</p>
                      </div>
                      {watched.exclusions && (
                        <div className="p-4">
                          <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] mb-1">Exclusions</p>
                          <p className="text-sm text-parchment-dim">{watched.exclusions}</p>
                        </div>
                      )}
                    </div>

                    <JudgeabilityMeter data={judgeData} />

                    {!hasContract && (
                      <div className="border border-verdict-gold/30 bg-verdict-gold/5 rounded p-3">
                        <p className="font-mono text-[10px] text-verdict-gold">
                          No contract address configured. Set NEXT_PUBLIC_OATH_CONTRACT_ADDRESS to submit on-chain.
                        </p>
                      </div>
                    )}

                    {error && <p className="font-mono text-xs text-breach-red">{error}</p>}
                    {txHash && (
                      <div className="border border-verdict-gold/30 bg-verdict-gold/5 rounded p-3 space-y-1.5">
                        <p className="font-mono text-xs text-verdict-gold">Oath sealed on-chain.</p>
                        <ExplorerLink href={getExplorerTxUrl(txHash)} label="View on chain →" />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !!txHash}
                      className="w-full py-3 border border-seal-red/50 text-seal-red-bright hover:bg-seal-red/10 transition-all font-mono text-xs uppercase tracking-wider rounded flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading && <Loader2 size={13} className="animate-spin" />}
                      {!isConnected ? "Connect Wallet to Seal" : txHash ? "Oath Sealed" : "Seal Oath on StudioNet"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < 5 && (
          <div className="flex justify-between">
            <button
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 border border-[var(--rule-line)] text-ash hover:text-parchment-dim hover:border-[var(--rule-line-strong)] transition-all font-mono text-xs rounded uppercase tracking-wider disabled:opacity-30"
            >
              <ArrowLeft size={13} /> Back
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 px-4 py-2 border border-witness-blue/50 text-[#4A9EDB] hover:bg-witness-blue/10 transition-all font-mono text-xs rounded uppercase tracking-wider"
            >
              Next <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .court-input {
          width: 100%;
          background: transparent;
          border: 1px solid var(--rule-line);
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          color: var(--parchment-dim);
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.75rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .court-input:focus { border-color: var(--rule-line-strong); }
        .court-input::placeholder { color: var(--ash); opacity: 0.6; }
        .court-input option { background: #1A0F07; color: var(--parchment-dim); }
      `}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] block">{label}</label>
      {children}
      {error && <p className="font-mono text-[10px] text-breach-red mt-0.5">{error}</p>}
    </div>
  );
}
