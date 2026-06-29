"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { createOath } from "@/lib/genlayer/client";
import { getExplorerTxUrl } from "@/lib/genlayer/client";
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

const STEPS = ["Promise", "Deadline", "Success Criteria", "Evidence Sources", "Exclusions", "Preview"];

export default function CreatePage() {
  const router = useRouter();
  const { account, isConnected, connect } = useWallet();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;

  const {
    register,
    watch,
    handleSubmit,
    trigger,
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
    if (!hasContract) { setError("Contract address not configured. Set NEXT_PUBLIC_OATH_CONTRACT_ADDRESS."); return; }
    setLoading(true);
    setError(null);
    try {
      const deadline_unix = Math.floor(new Date(data.deadline).getTime() / 1000);
      const hash = await createOath(
        {
          title: data.title,
          promise: data.promise,
          deadline_unix,
          success_criteria: data.success_criteria,
          required_deliverables: data.required_deliverables || "",
          accepted_sources: data.accepted_sources,
          exclusions: data.exclusions || "",
          stakeholder_notes: data.stakeholder_notes || "",
          category: data.category,
        },
        account!
      );
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
    <div className="min-h-screen ledger-grid">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs transition-all ${
                  i < step
                    ? "bg-verdict-green text-oath-black"
                    : i === step
                    ? "bg-signal-cyan/20 border border-signal-cyan text-signal-cyan"
                    : "bg-court-slate border border-glass-line text-ink-grey"
                }`}
              >
                {i < step ? <CheckCircle size={12} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 ${i < step ? "bg-verdict-green/40" : "bg-glass-line"}`} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <p className="font-mono text-xs text-ink-grey uppercase tracking-widest mb-2">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="font-serif text-3xl text-ivory-record mb-8">{STEPS[step]}</h2>

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
              {step === 0 && (
                <>
                  <Field label="Title" error={errors.title?.message}>
                    <input
                      {...register("title")}
                      placeholder="Public Beta Launch"
                      className="input-base"
                    />
                  </Field>
                  <Field label="Promise" error={errors.promise?.message}>
                    <textarea
                      {...register("promise")}
                      rows={5}
                      placeholder="Describe your commitment in plain English..."
                      className="input-base resize-none"
                    />
                  </Field>
                  <Field label="Category" error={errors.category?.message}>
                    <select {...register("category")} className="input-base">
                      <option value="">Select category</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                </>
              )}

              {step === 1 && (
                <Field label="Deadline" error={errors.deadline?.message}>
                  <input
                    {...register("deadline")}
                    type="datetime-local"
                    className="input-base"
                  />
                </Field>
              )}

              {step === 2 && (
                <>
                  <Field label="Success Criteria" error={errors.success_criteria?.message}>
                    <textarea
                      {...register("success_criteria")}
                      rows={4}
                      placeholder="What does fulfilment look like? Be specific and measurable."
                      className="input-base resize-none"
                    />
                  </Field>
                  <Field label="Required Deliverables (optional)" error={errors.required_deliverables?.message}>
                    <input
                      {...register("required_deliverables")}
                      placeholder="e.g. GitHub repo, deployed URL, report"
                      className="input-base"
                    />
                  </Field>
                </>
              )}

              {step === 3 && (
                <Field label="Accepted Public Evidence Sources" error={errors.accepted_sources?.message}>
                  <textarea
                    {...register("accepted_sources")}
                    rows={3}
                    placeholder="e.g. Official website, GitHub release, public announcement post"
                    className="input-base resize-none"
                  />
                  <p className="font-mono text-xs text-ink-grey mt-2">
                    List public URL sources that validators may use to verify the promise.
                  </p>
                </Field>
              )}

              {step === 4 && (
                <>
                  <Field label="Exclusions (optional)" error={errors.exclusions?.message}>
                    <textarea
                      {...register("exclusions")}
                      rows={3}
                      placeholder="e.g. Force majeure, scheduled third-party outage over 24 hours"
                      className="input-base resize-none"
                    />
                  </Field>
                  <Field label="Stakeholder Notes (optional)" error={errors.stakeholder_notes?.message}>
                    <input
                      {...register("stakeholder_notes")}
                      placeholder="Any additional context for watchers"
                      className="input-base"
                    />
                  </Field>
                </>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div className="glass rounded-xl p-5 space-y-3">
                    <h3 className="font-serif text-lg text-ivory-record">{watched.title || "—"}</h3>
                    <p className="text-sm text-ivory-record/80 leading-relaxed">{watched.promise || "—"}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-mono text-xs text-ink-grey">Deadline</p>
                        <p className="text-ivory-record">{watched.deadline || "—"}</p>
                      </div>
                      <div>
                        <p className="font-mono text-xs text-ink-grey">Category</p>
                        <p className="text-ivory-record">{watched.category || "—"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-ink-grey mb-1">Success Criteria</p>
                      <p className="text-sm text-ivory-record/80">{watched.success_criteria || "—"}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-ink-grey mb-1">Accepted Sources</p>
                      <p className="text-sm text-ivory-record/80">{watched.accepted_sources || "—"}</p>
                    </div>
                    {watched.exclusions && (
                      <div>
                        <p className="font-mono text-xs text-ink-grey mb-1">Exclusions</p>
                        <p className="text-sm text-ivory-record/80">{watched.exclusions}</p>
                      </div>
                    )}
                  </div>

                  <JudgeabilityMeter data={judgeData} />

                  {!hasContract && (
                    <div className="border border-partial-amber/40 bg-partial-amber/10 rounded-lg p-3">
                      <p className="font-mono text-xs text-partial-amber">
                        No contract address set. Deploy the contract and set NEXT_PUBLIC_OATH_CONTRACT_ADDRESS to submit oaths on-chain.
                      </p>
                    </div>
                  )}

                  {error && <p className="font-mono text-xs text-breach-red">{error}</p>}
                  {txHash && (
                    <div className="border border-verdict-green/30 bg-verdict-green/10 rounded-lg p-3 space-y-1">
                      <p className="font-mono text-xs text-verdict-green">Oath created on-chain!</p>
                      <ExplorerLink href={getExplorerTxUrl(txHash)} label="View transaction" />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !!txHash}
                    className="w-full py-3 rounded-lg bg-witness-gold/10 border border-witness-gold/40 text-witness-gold hover:bg-witness-gold/20 transition-all font-mono text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {!isConnected ? "Connect Wallet to Create" : txHash ? "Oath Created" : "Create Oath on StudioNet"}
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons */}
        {step < 5 && (
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-glass-line text-ink-grey hover:text-ivory-record transition-all font-mono text-sm disabled:opacity-30"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-signal-cyan/10 border border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/20 transition-all font-mono text-sm"
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .input-base {
          width: 100%;
          background: rgba(17, 24, 39, 0.7);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 0.5rem;
          padding: 0.625rem 0.875rem;
          color: #F8F3E7;
          font-family: "IBM Plex Mono", monospace;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-base:focus {
          border-color: rgba(40, 215, 255, 0.5);
        }
        .input-base::placeholder {
          color: rgba(138, 147, 165, 0.5);
        }
        .input-base option {
          background: #111827;
          color: #F8F3E7;
        }
      `}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-xs text-ink-grey uppercase tracking-widest">{label}</label>
      {children}
      {error && <p className="font-mono text-xs text-breach-red">{error}</p>}
    </div>
  );
}
