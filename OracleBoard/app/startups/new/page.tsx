"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { createStartupDossier } from "@/lib/oracleboard/contract";
import { saveTx, saveRecentStartup, saveDraft, getDraft, clearDraft } from "@/lib/oracleboard/tx";
import { useWallet } from "@/lib/context/WalletContext";
import { DEMO_STARTUP } from "@/lib/oracleboard/seed";
import { AlertCircle, Loader2, ChevronRight } from "lucide-react";

const DRAFT_KEY = "new-startup";

interface FormData {
  startup_name: string;
  one_liner: string;
  sector: string;
  stage: string;
  founder_name: string;
  website: string;
  pitch_deck_ref: string;
  pitch_deck_hash: string;
  metrics_summary: string;
  roadmap_summary: string;
  market_summary: string;
  competitor_summary: string;
  funding_ask: string;
  round_type: string;
  use_of_funds: string;
  risk_disclosures: string;
}

const EMPTY: FormData = {
  startup_name: "",
  one_liner: "",
  sector: "",
  stage: "",
  founder_name: "",
  website: "",
  pitch_deck_ref: "",
  pitch_deck_hash: "",
  metrics_summary: "",
  roadmap_summary: "",
  market_summary: "",
  competitor_summary: "",
  funding_ask: "",
  round_type: "",
  use_of_funds: "",
  risk_disclosures: "",
};

const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Growth", "Late Stage"];
const ROUND_TYPES = ["SAFE", "Convertible Note", "Priced Round", "Grant", "Other"];

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  textarea,
  required,
}: {
  label: string;
  name: keyof FormData;
  value: string;
  onChange: (name: keyof FormData, val: string) => void;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  const baseClass =
    "w-full bg-navy border border-border rounded px-3 py-2 text-sm text-memo font-body placeholder:text-slate focus:outline-none focus:border-gold transition-colors";

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono text-slate uppercase tracking-wide">
        {label}
        {required && <span className="text-gold ml-1">*</span>}
      </label>
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`${baseClass} resize-y`}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  name: keyof FormData;
  value: string;
  options: string[];
  onChange: (name: keyof FormData, val: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono text-slate uppercase tracking-wide">
        {label}
        {required && <span className="text-gold ml-1">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full bg-navy border border-border rounded px-3 py-2 text-sm text-memo font-body focus:outline-none focus:border-gold transition-colors"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="pt-4 pb-2 border-b border-border">
      <h2 className="text-sm font-heading font-semibold text-memo">{title}</h2>
      {description && <p className="text-xs text-slate mt-0.5 font-body">{description}</p>}
    </div>
  );
}

export default function NewStartupPage() {
  const router = useRouter();
  const { address } = useWallet();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = getDraft<FormData>(DRAFT_KEY);
    if (draft) setForm(draft);
  }, []);

  function handleChange(name: keyof FormData, val: string) {
    const next = { ...form, [name]: val };
    setForm(next);
    saveDraft(DRAFT_KEY, next);
  }

  function loadDemo() {
    const d: FormData = { ...EMPTY, ...DEMO_STARTUP };
    setForm(d);
    saveDraft(DRAFT_KEY, d);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) {
      setError("Please connect your wallet first.");
      return;
    }

    const required: (keyof FormData)[] = ["startup_name", "one_liner", "sector", "stage", "founder_name"];
    for (const key of required) {
      if (!form[key].trim()) {
        setError(`${key.replace(/_/g, " ")} is required.`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const startupId = `startup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const txHash = await createStartupDossier({
        startup_id: startupId,
        ...form,
        founder_wallet: address,
      });

      saveTx(startupId, "dossier", txHash);
      saveRecentStartup(startupId);
      clearDraft(DRAFT_KEY);
      router.push(`/startups/${startupId}?submitted=1&tx=${txHash}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed. Check wallet connection and contract address.");
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto p-6 pb-16 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-heading font-semibold text-memo">Submit Startup Dossier</h1>
            <p className="text-sm text-slate mt-0.5 font-body">
              All fields are committed to the GenLayer contract for consensus evaluation.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDemo}
            className="text-xs font-mono text-slate border border-border px-3 py-1.5 rounded hover:text-memo hover:border-border-bright transition-colors"
          >
            Load Demo
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-[rgba(255,92,92,0.08)] border border-[rgba(255,92,92,0.2)] rounded">
            <AlertCircle size={14} className="text-risk mt-0.5 shrink-0" />
            <p className="text-sm text-risk font-body">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <SectionHeader title="Startup Identity" description="Core identifying information about the startup." />
          <Field label="Startup Name" name="startup_name" value={form.startup_name} onChange={handleChange} required placeholder="e.g. GridPulse AI" />
          <Field label="One-liner" name="one_liner" value={form.one_liner} onChange={handleChange} required placeholder="What does the startup do in one sentence?" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sector" name="sector" value={form.sector} onChange={handleChange} required placeholder="e.g. Energy / AI Infrastructure" />
            <SelectField label="Stage" name="stage" value={form.stage} options={STAGES} onChange={handleChange} required />
          </div>

          <SectionHeader title="Founder" description="Founder identity and contact information." />
          <Field label="Founder Name" name="founder_name" value={form.founder_name} onChange={handleChange} required placeholder="Founder name or team lead" />
          <Field label="Website" name="website" value={form.website} onChange={handleChange} placeholder="https://startup.com" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pitch Deck Reference" name="pitch_deck_ref" value={form.pitch_deck_ref} onChange={handleChange} placeholder="URL or reference" />
            <Field label="Pitch Deck Hash" name="pitch_deck_hash" value={form.pitch_deck_hash} onChange={handleChange} placeholder="0x..." />
          </div>

          <SectionHeader title="Due Diligence Material" description="This is what validators will use in the consensus evaluation. Be thorough and accurate." />
          <Field label="Metrics Summary" name="metrics_summary" value={form.metrics_summary} onChange={handleChange} textarea placeholder="Revenue, users, growth rate, retention, key operational metrics..." />
          <Field label="Market Summary" name="market_summary" value={form.market_summary} onChange={handleChange} textarea placeholder="Market size, urgency, trends, customer profile..." />
          <Field label="Roadmap Summary" name="roadmap_summary" value={form.roadmap_summary} onChange={handleChange} textarea placeholder="Key milestones for the next 12-18 months..." />
          <Field label="Competitor Summary" name="competitor_summary" value={form.competitor_summary} onChange={handleChange} textarea placeholder="Main competitors and your differentiation..." />

          <SectionHeader title="Funding Round" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Funding Ask" name="funding_ask" value={form.funding_ask} onChange={handleChange} required placeholder="e.g. $500,000 pre-seed" />
            <SelectField label="Round Type" name="round_type" value={form.round_type} options={ROUND_TYPES} onChange={handleChange} />
          </div>
          <Field label="Use of Funds" name="use_of_funds" value={form.use_of_funds} onChange={handleChange} textarea placeholder="How will the capital be deployed?" />

          <SectionHeader title="Risk Disclosures" description="Required. Do not omit known risks." />
          <Field label="Risk Disclosures" name="risk_disclosures" value={form.risk_disclosures} onChange={handleChange} textarea placeholder="Known risks: customer concentration, execution risk, regulatory, competition, team gaps..." />

          <div className="pt-4">
            {!address && (
              <p className="text-xs text-slate font-mono mb-3">Connect your wallet to submit.</p>
            )}
            <button
              type="submit"
              disabled={submitting || !address}
              className="flex items-center gap-2 px-5 py-2.5 bg-gold text-obsidian text-sm font-mono font-semibold rounded hover:bg-[#C9A24D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Submitting to GenLayer...
                </>
              ) : (
                <>
                  Submit Dossier
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
