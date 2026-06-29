"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Gavel, Eye, AlertTriangle, Loader2 } from "lucide-react";
import { isPastDeadline } from "@/lib/utils";
import { useWallet } from "@/lib/context/WalletContext";
import { requestVerdict } from "@/lib/genlayer/client";
import { getExplorerTxUrl } from "@/lib/genlayer/client";
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

export default function ActionDock({
  oath,
  evidenceCount,
  onSubmitEvidence,
  onViewReceipt,
  onAppeal,
  onVerdictRequested,
}: Props) {
  const { account, connect, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const past = isPastDeadline(oath.deadline_unix);
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
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass rounded-xl p-4 sticky bottom-4"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {!oath.settled && (
          <>
            <button
              onClick={() => window.navigator.clipboard.writeText(window.location.href)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-glass-line text-ink-grey hover:text-ivory-record hover:border-ivory-record/30 transition-all font-mono text-sm"
            >
              <Eye size={14} />
              Copy Link
            </button>
            <button
              onClick={isConnected ? onSubmitEvidence : connect}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/10 transition-all font-mono text-sm"
            >
              <Shield size={14} />
              Submit Evidence
            </button>
            {evidenceCount > 0 && hasContract && (
              <button
                onClick={isConnected ? handleRequestVerdict : connect}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-witness-gold/10 border border-witness-gold/40 text-witness-gold hover:bg-witness-gold/20 transition-all font-mono text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
                {isConnected ? "Request Verdict" : "Connect to Judge"}
              </button>
            )}
          </>
        )}

        {oath.settled && (
          <>
            <button
              onClick={onViewReceipt}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-verdict-green/10 border border-verdict-green/40 text-verdict-green hover:bg-verdict-green/20 transition-all font-mono text-sm"
            >
              <Eye size={14} />
              View Receipt
            </button>
            <button
              onClick={isConnected ? onAppeal : connect}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-glass-line text-ink-grey hover:text-ivory-record hover:border-ivory-record/30 transition-all font-mono text-sm"
            >
              <AlertTriangle size={14} />
              Appeal
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
            className="mt-2 text-breach-red font-mono text-xs"
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
            <ExplorerLink href={getExplorerTxUrl(txHash)} label="Transaction submitted →" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
