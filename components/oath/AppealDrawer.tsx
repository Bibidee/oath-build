"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { submitAppeal } from "@/lib/genlayer/client";
import { getExplorerTxUrl } from "@/lib/genlayer/client";
import ExplorerLink from "./ExplorerLink";
import type { AppealBasis } from "@/lib/genlayer/types";

const APPEAL_BASES: { value: AppealBasis; label: string }[] = [
  { value: "new_evidence", label: "New Evidence" },
  { value: "wrong_source_interpretation", label: "Wrong Source Interpretation" },
  { value: "deadline_misread", label: "Deadline Misread" },
  { value: "exclusion_misapplied", label: "Exclusion Misapplied" },
  { value: "fake_or_misleading_evidence", label: "Fake or Misleading Evidence" },
  { value: "promise_meaning_misread", label: "Promise Meaning Misread" },
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
    setLoading(true);
    setError(null);
    try {
      const hash = await submitAppeal({ oath_id: oathId, basis, new_evidence_url: newEvidenceUrl, argument }, account);
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="glass rounded-xl w-full max-w-lg p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl text-ivory-record">Submit Appeal</h3>
              <button onClick={onClose} className="text-ink-grey hover:text-ivory-record">
                <ChevronDown size={20} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-ink-grey uppercase tracking-widest">Appeal Basis</label>
              <select
                value={basis}
                onChange={(e) => setBasis(e.target.value as AppealBasis)}
                className="w-full bg-court-slate border border-glass-line rounded-lg px-3 py-2 text-ivory-record font-mono text-sm focus:outline-none focus:border-signal-cyan/50"
              >
                {APPEAL_BASES.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-ink-grey uppercase tracking-widest">New Evidence URL (optional)</label>
              <input
                type="url"
                value={newEvidenceUrl}
                onChange={(e) => setNewEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-court-slate border border-glass-line rounded-lg px-3 py-2 text-ivory-record font-mono text-sm focus:outline-none focus:border-signal-cyan/50 placeholder:text-ink-grey/50"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-ink-grey uppercase tracking-widest">Argument</label>
              <textarea
                value={argument}
                onChange={(e) => setArgument(e.target.value)}
                rows={4}
                placeholder="Explain why the verdict should change..."
                className="w-full bg-court-slate border border-glass-line rounded-lg px-3 py-2 text-ivory-record font-mono text-sm focus:outline-none focus:border-signal-cyan/50 placeholder:text-ink-grey/50 resize-none"
              />
              <p className="font-mono text-xs text-ink-grey text-right">{argument.length} chars</p>
            </div>

            {error && <p className="font-mono text-xs text-breach-red">{error}</p>}
            {txHash && <ExplorerLink href={getExplorerTxUrl(txHash)} label="Appeal submitted →" />}

            <button
              onClick={handleSubmit}
              disabled={loading || !!txHash}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-witness-gold/10 border border-witness-gold/40 text-witness-gold hover:bg-witness-gold/20 transition-all font-mono text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {isConnected ? (txHash ? "Appeal Submitted" : "Submit Appeal") : "Connect Wallet to Appeal"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
