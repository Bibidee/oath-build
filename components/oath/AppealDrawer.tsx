"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { submitAppeal, getExplorerTxUrl } from "@/lib/genlayer/client";
import ExplorerLink from "./ExplorerLink";
import type { AppealBasis } from "@/lib/genlayer/types";

const APPEAL_BASES: { value: AppealBasis; label: string }[] = [
  { value: "new_evidence",                label: "New Evidence" },
  { value: "wrong_source_interpretation", label: "Wrong Source Interpretation" },
  { value: "deadline_misread",            label: "Deadline Misread" },
  { value: "exclusion_misapplied",        label: "Exclusion Misapplied" },
  { value: "fake_or_misleading_evidence", label: "Fake or Misleading Evidence" },
  { value: "promise_meaning_misread",     label: "Promise Meaning Misread" },
];

interface Props {
  oathId: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AppealDrawer({ oathId, open, onClose, onSuccess }: Props) {
  const { account, connect, isConnected } = useWallet();
  const [basis, setBasis] = useState<AppealBasis>("new_evidence");
  const [newEvidenceUrl, setNewEvidenceUrl] = useState("");
  const [argument, setArgument] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!account) { connect(); return; }
    if (argument.length <= 20) { setError("Argument must be more than 20 characters."); return; }
    setLoading(true); setError(null);
    try {
      const hash = await submitAppeal(
        { oath_id: oathId, basis, new_evidence_url: newEvidenceUrl, argument },
        account
      );
      setTxHash(hash);
      onSuccess?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="court-paper border border-verdict-gold/30 rounded w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-verdict-gold/20"
                 style={{ background: "color-mix(in srgb, var(--verdict-gold) 6%, var(--court-brown))" }}>
              <div>
                <p className="font-mono text-[10px] text-ash uppercase tracking-[0.25em]">Appeal Chamber</p>
                <h3 className="font-display text-base text-parchment mt-0.5">File an Appeal</h3>
              </div>
              <button onClick={onClose} className="text-ash hover:text-parchment transition-colors p-1">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Basis */}
              <div>
                <label className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] block mb-1.5">
                  Grounds for Appeal
                </label>
                <select
                  value={basis}
                  onChange={(e) => setBasis(e.target.value as AppealBasis)}
                  className="w-full bg-court-brown border border-[var(--rule-line)] rounded px-3 py-2 text-parchment-dim font-mono text-xs focus:outline-none focus:border-verdict-gold/50"
                >
                  {APPEAL_BASES.map((b) => (
                    <option key={b.value} value={b.value} className="bg-court-brown">{b.label}</option>
                  ))}
                </select>
              </div>

              {/* New evidence URL */}
              <div>
                <label className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] block mb-1.5">
                  New Evidence URL <span className="normal-case">(optional)</span>
                </label>
                <input
                  type="url"
                  value={newEvidenceUrl}
                  onChange={(e) => setNewEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-transparent border border-[var(--rule-line)] rounded px-3 py-2 text-parchment-dim font-mono text-xs focus:outline-none focus:border-verdict-gold/50 placeholder:text-ash"
                />
              </div>

              {/* Argument */}
              <div>
                <label className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] block mb-1.5">
                  Appeal Argument
                </label>
                <textarea
                  value={argument}
                  onChange={(e) => setArgument(e.target.value)}
                  rows={4}
                  placeholder="Explain why the verdict should be reconsidered..."
                  className="w-full bg-transparent border border-[var(--rule-line)] rounded px-3 py-2 text-parchment-dim font-mono text-xs focus:outline-none focus:border-verdict-gold/50 placeholder:text-ash resize-none"
                />
                <p className="font-mono text-[10px] text-ash text-right mt-0.5">{argument.length} chars</p>
              </div>

              {error && <p className="font-mono text-xs text-breach-red">{error}</p>}
              {txHash && <ExplorerLink href={getExplorerTxUrl(txHash)} label="Appeal filed on chain →" />}

              <button
                onClick={handleSubmit}
                disabled={loading || !!txHash}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-verdict-gold/40 rounded font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                style={{ color: "var(--verdict-gold)" }}
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                {isConnected ? (txHash ? "Appeal Submitted" : "Submit Appeal") : "Connect Wallet to Appeal"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
