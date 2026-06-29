"use client";

import { motion } from "framer-motion";
import { Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import OathSeal from "@/components/oath/OathSeal";
import ExplorerLink from "@/components/oath/ExplorerLink";
import { formatIsoDate, shortAddr } from "@/lib/utils";
import { getExplorerTxUrl } from "@/lib/genlayer/client";
import type { VerdictReceipt as VerdictReceiptType, Oath } from "@/lib/genlayer/types";

interface Props {
  verdict: VerdictReceiptType;
  oath: Oath;
  txHash?: string;
}

export default function VerdictReceipt({ verdict, oath, txHash }: Props) {
  const [copied, setCopied] = useState(false);

  const receiptText = `OATH RECEIPT
────────────────────────────────────
Oath #${oath.oath_id}: ${oath.title}
Status: ${verdict.status.toUpperCase()}
Confidence: ${verdict.confidence}%
Source Alignment: ${verdict.source_alignment}
Winning Side: ${verdict.winning_side}
Reason: ${verdict.short_reason}
Resolved: ${formatIsoDate(verdict.resolved_at)}
Resolver: ${shortAddr(verdict.resolver)}
────────────────────────────────────
Powered by GenLayer · StudioNet`;

  const copy = async () => {
    await navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confidenceColor =
    verdict.confidence >= 80
      ? "#19C37D"
      : verdict.confidence >= 60
      ? "#D6A84F"
      : "#EF4444";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl overflow-hidden"
    >
      {/* Header band */}
      <div className="bg-court-slate/60 px-6 py-3 flex items-center justify-between border-b border-glass-line">
        <span className="font-mono text-xs text-ink-grey uppercase tracking-widest">
          Oath Receipt · #{oath.oath_id}
        </span>
        <button onClick={copy} className="flex items-center gap-1.5 text-ink-grey hover:text-ivory-record transition-colors">
          {copied ? <CheckCircle size={14} className="text-verdict-green" /> : <Copy size={14} />}
          <span className="font-mono text-xs">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Seal + Title */}
        <div className="flex items-center gap-6">
          <OathSeal status={verdict.status} size={80} />
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-xl text-ivory-record leading-tight">{oath.title}</h3>
            <p className="font-mono text-xs text-ink-grey mt-1">
              Created by {shortAddr(oath.creator)}
            </p>
          </div>
        </div>

        {/* Verdict grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-court-slate/40 rounded-lg p-3">
            <p className="font-mono text-xs text-ink-grey mb-1">Confidence</p>
            <p className="font-mono text-lg font-medium" style={{ color: confidenceColor }}>
              {verdict.confidence}%
            </p>
          </div>
          <div className="bg-court-slate/40 rounded-lg p-3">
            <p className="font-mono text-xs text-ink-grey mb-1">Source Alignment</p>
            <p className="font-mono text-lg font-medium text-ivory-record capitalize">
              {verdict.source_alignment}
            </p>
          </div>
          <div className="bg-court-slate/40 rounded-lg p-3">
            <p className="font-mono text-xs text-ink-grey mb-1">Winning Side</p>
            <p className="font-mono text-lg font-medium text-ivory-record capitalize">
              {verdict.winning_side}
            </p>
          </div>
          <div className="bg-court-slate/40 rounded-lg p-3">
            <p className="font-mono text-xs text-ink-grey mb-1">Resolved</p>
            <p className="font-mono text-sm font-medium text-ivory-record">
              {formatIsoDate(verdict.resolved_at)}
            </p>
          </div>
        </div>

        {/* Reason */}
        <div className="border border-glass-line rounded-lg p-4">
          <p className="font-mono text-xs text-ink-grey mb-2 uppercase tracking-widest">Verdict Reason</p>
          <p className="text-ivory-record text-sm leading-relaxed">{verdict.short_reason}</p>
        </div>

        {/* Explorer */}
        <div className="flex items-center justify-between pt-2 border-t border-glass-line">
          <span className="font-mono text-xs text-ink-grey">
            Resolver: {shortAddr(verdict.resolver)}
          </span>
          {txHash && (
            <ExplorerLink href={getExplorerTxUrl(txHash)} label="View Transaction" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
