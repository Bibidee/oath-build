"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/context/WalletContext";
import { submitEvidence, getExplorerTxUrl } from "@/lib/genlayer/client";
import ExplorerLink from "@/components/oath/ExplorerLink";
import type { EvidenceSide } from "@/lib/genlayer/types";

const SOURCE_TYPES = [
  "tweet", "github", "docs", "product_page", "explorer",
  "blog", "public_dashboard", "video_page", "issue_tracker", "other"
];

const SIDES: { value: EvidenceSide; label: string; desc: string }[] = [
  { value: "fulfilment", label: "Supports Fulfilment",   desc: "Confirms the oath was kept" },
  { value: "challenge",  label: "Challenges Fulfilment", desc: "Argues the oath was broken" },
  { value: "context",    label: "Adds Context",          desc: "Neutral background information" },
  { value: "exclusion",  label: "Supports Exclusion",    desc: "Circumstances voiding the oath" },
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

  useEffect(() => {
    if (open) {
      setSourceUrl(""); setSourceType("other"); setClaim("");
      setSide("fulfilment"); setTxHash(null); setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!account) { connect(); return; }
    if (!sourceUrl.startsWith("http")) { setError("Source URL must start with http:// or https://"); return; }
    if (claim.length <= 10) { setError("Claim must be more than 10 characters."); return; }
    setLoading(true); setError(null);
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="court-paper border border-[var(--rule-line)] rounded w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--rule-line)]"
                 style={{ background: "var(--court-brown)" }}>
              <div>
                <p className="font-mono text-[10px] text-ash uppercase tracking-[0.25em]">Witness Chamber</p>
                <h3 className="font-display text-base text-parchment mt-0.5">Submit Evidence</h3>
              </div>
              <button onClick={onClose} className="text-ash hover:text-parchment transition-colors p-1">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Side selector */}
              <div>
                <label className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] block mb-2">
                  Witness Position
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SIDES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSide(s.value)}
                      className="text-left p-2.5 border rounded transition-all"
                      style={{
                        borderColor: side === s.value ? "var(--witness-blue)" : "var(--rule-line)",
                        background: side === s.value ? "rgba(74,158,219,0.08)" : "transparent",
                      }}
                    >
                      <p className="font-mono text-xs font-medium"
                         style={{ color: side === s.value ? "#4A9EDB" : "var(--parchment-dim)" }}>
                        {s.label}
                      </p>
                      <p className="font-mono text-[10px] text-ash mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source URL */}
              <div>
                <label className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] block mb-1.5">
                  Source URL
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-transparent border border-[var(--rule-line)] rounded px-3 py-2 text-parchment-dim font-mono text-xs focus:outline-none focus:border-[var(--rule-line-strong)] placeholder:text-ash"
                />
              </div>

              {/* Source type */}
              <div>
                <label className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] block mb-1.5">
                  Source Type
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full bg-court-brown border border-[var(--rule-line)] rounded px-3 py-2 text-parchment-dim font-mono text-xs focus:outline-none focus:border-[var(--rule-line-strong)]"
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-court-brown">{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              {/* Claim */}
              <div>
                <label className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] block mb-1.5">
                  Claim
                </label>
                <textarea
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  rows={3}
                  placeholder="What does this source prove or disprove about the oath?"
                  className="w-full bg-transparent border border-[var(--rule-line)] rounded px-3 py-2 text-parchment-dim font-mono text-xs focus:outline-none focus:border-[var(--rule-line-strong)] placeholder:text-ash resize-none"
                />
                <p className="font-mono text-[10px] text-ash text-right mt-0.5">{claim.length} chars</p>
              </div>

              {error && <p className="font-mono text-xs text-breach-red">{error}</p>}
              {txHash && <ExplorerLink href={getExplorerTxUrl(txHash)} label="Evidence filed on chain →" />}

              <button
                onClick={handleSubmit}
                disabled={loading || !!txHash}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-witness-blue/40 rounded font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                style={{
                  color: "#4A9EDB",
                  background: txHash ? "rgba(74,158,219,0.05)" : undefined,
                }}
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                {isConnected ? (txHash ? "Evidence Submitted" : "File Witness Statement") : "Connect Wallet"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
