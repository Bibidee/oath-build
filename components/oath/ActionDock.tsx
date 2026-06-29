"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Gavel, Eye, AlertTriangle, Loader2, Link2 } from "lucide-react";
import { isPastDeadline } from "@/lib/utils";
import { useWallet } from "@/lib/context/WalletContext";
import { requestVerdict, getExplorerTxUrl } from "@/lib/genlayer/client";
import ExplorerLink from "./ExplorerLink";
import type { Oath } from "@/lib/genlayer/types";

interface Props {
  oath: Oath;
  evidenceCount: number;
  onSubmitEvidence: () => void;
  onViewReceipt: () => void;
  onAppeal: () => void;
  onVerdictRequested?: () => void;
}

export default function ActionDock({ oath, evidenceCount, onSubmitEvidence, onViewReceipt, onAppeal, onVerdictRequested }: Props) {
  const { account, connect, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;

  const handleRequestVerdict = async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const hash = await requestVerdict(oath.oath_id, account);
      setTxHash(hash);
      onVerdictRequested?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border border-[var(--rule-line)] rounded bg-court-brown/80 backdrop-blur-sm p-4"
    >
      <div className="flex items-center gap-2 flex-wrap">

        {/* Copy link — always visible */}
        <button
          onClick={() => window.navigator.clipboard.writeText(window.location.href)}
          className="flex items-center gap-2 px-3 py-2 border border-[var(--rule-line)] text-ash hover:text-parchment-dim hover:border-[var(--rule-line-strong)] transition-all font-mono text-xs rounded uppercase tracking-wider"
        >
          <Link2 size={13} /> Copy Link
        </button>

        {/* Submit evidence — open while unsettled */}
        {!oath.settled && (
          <button
            onClick={isConnected ? onSubmitEvidence : connect}
            className="flex items-center gap-2 px-3 py-2 border border-witness-blue/50 text-[#4A9EDB] hover:bg-witness-blue/10 transition-all font-mono text-xs rounded uppercase tracking-wider"
          >
            <Shield size={13} /> Submit Evidence
          </button>
        )}

        {/* Request verdict — needs evidence and contract */}
        {!oath.settled && evidenceCount > 0 && hasContract && (
          <button
            onClick={isConnected ? handleRequestVerdict : connect}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-seal-red/50 text-seal-red-bright hover:bg-seal-red/10 transition-all font-mono text-xs rounded uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Gavel size={13} />}
            {isConnected ? "Request Judgment" : "Connect to Judge"}
          </button>
        )}

        {/* Settled actions */}
        {oath.settled && (
          <>
            <button
              onClick={onViewReceipt}
              className="flex items-center gap-2 px-3 py-2 border border-verdict-gold/40 text-verdict-gold hover:bg-verdict-gold/10 transition-all font-mono text-xs rounded uppercase tracking-wider"
            >
              <Eye size={13} /> View Receipt
            </button>
            <button
              onClick={isConnected ? onAppeal : connect}
              className="flex items-center gap-2 px-3 py-2 border border-[var(--rule-line)] text-ash hover:text-parchment-dim hover:border-[var(--rule-line-strong)] transition-all font-mono text-xs rounded uppercase tracking-wider"
            >
              <AlertTriangle size={13} /> File Appeal
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 font-mono text-xs text-breach-red"
          >
            {error}
          </motion.p>
        )}
        {txHash && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2"
          >
            <ExplorerLink href={getExplorerTxUrl(txHash)} label="Judgment submitted to chain →" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
