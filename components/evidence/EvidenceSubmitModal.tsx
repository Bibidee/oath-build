"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/context/WalletContext";
import { submitEvidence } from "@/lib/genlayer/client";
import { getExplorerTxUrl } from "@/lib/genlayer/client";
import ExplorerLink from "@/components/oath/ExplorerLink";
import type { EvidenceSide } from "@/lib/genlayer/types";

const SOURCE_TYPES = [
  "tweet", "github", "docs", "product_page", "explorer",
  "blog", "public_dashboard", "video_page", "issue_tracker", "other"
];

const SIDES: { value: EvidenceSide; label: string }[] = [
  { value: "fulfilment", label: "Supports Fulfilment" },
  { value: "challenge", label: "Challenges Fulfilment" },
  { value: "context", label: "Adds Context" },
  { value: "exclusion", label: "Supports Exclusion" },
];

interface Props {
  oathId: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EvidenceSubmitModal({ oathId, open, onClose, onSuccess }: Props) {
  const { account, connect, isConnected } = useWallet();
  const queryClient = useQueryClient();
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState("other");
  const [claim, setClaim] = useState("");
  const [side, setSide] = useState<EvidenceSide>("fulfilment");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!account) { connect(); return; }
    if (!sourceUrl.startsWith("http")) { setError("Source URL must start with http:// or https://"); return; }
    if (claim.length <= 10) { setError("Claim must be more than 10 characters."); return; }
    setLoading(true);
    setError(null);
    try {
      const hash = await submitEvidence(
        { oath_id: oathId, source_url: sourceUrl, source_type: sourceType, claim, side },
        account
      );
      setTxHash(hash);
      await queryClient.invalidateQueries({ queryKey: ["evidence", oathId] });
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
              <h3 className="font-serif text-xl text-ivory-record">Submit Evidence</h3>
              <button onClick={onClose} className="text-ink-grey hover:text-ivory-record">
                <ChevronDown size={20} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-ink-grey uppercase tracking-widest">Source URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-court-slate border border-glass-line rounded-lg px-3 py-2 text-ivory-record font-mono text-sm focus:outline-none focus:border-signal-cyan/50 placeholder:text-ink-grey/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-mono text-xs text-ink-grey uppercase tracking-widest">Source Type</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full bg-court-slate border border-glass-line rounded-lg px-3 py-2 text-ivory-record font-mono text-sm focus:outline-none focus:border-signal-cyan/50"
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-court-slate">{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-xs text-ink-grey uppercase tracking-widest">Side</label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as EvidenceSide)}
                  className="w-full bg-court-slate border border-glass-line rounded-lg px-3 py-2 text-ivory-record font-mono text-sm focus:outline-none focus:border-signal-cyan/50"
                >
                  {SIDES.map((s) => (
                    <option key={s.value} value={s.value} className="bg-court-slate">{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs text-ink-grey uppercase tracking-widest">Claim</label>
              <textarea
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                rows={3}
                placeholder="What does this source prove or disprove?"
                className="w-full bg-court-slate border border-glass-line rounded-lg px-3 py-2 text-ivory-record font-mono text-sm focus:outline-none focus:border-signal-cyan/50 placeholder:text-ink-grey/50 resize-none"
              />
            </div>

            {error && <p className="font-mono text-xs text-breach-red">{error}</p>}
            {txHash && <ExplorerLink href={getExplorerTxUrl(txHash)} label="Evidence submitted →" />}

            <button
              onClick={handleSubmit}
              disabled={loading || !!txHash}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-signal-cyan/10 border border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/20 transition-all font-mono text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {isConnected ? (txHash ? "Evidence Submitted" : "Submit Evidence") : "Connect Wallet"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
