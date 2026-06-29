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

  const receiptText = `THE LEDGER COURT — VERDICT RECEIPT
════════════════════════════════════════
Oath #${oath.oath_id}
"${oath.title}"
════════════════════════════════════════
Verdict:          ${verdict.status.toUpperCase()}
Confidence:       ${verdict.confidence}%
Source Alignment: ${verdict.source_alignment}
Winning Side:     ${verdict.winning_side}

Reason: ${verdict.short_reason}

Resolved:  ${formatIsoDate(verdict.resolved_at)}
Resolver:  ${shortAddr(verdict.resolver)}
════════════════════════════════════════
GenLayer · StudioNet`;

  const copy = async () => {
    await navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confidenceColor =
    verdict.confidence >= 80 ? "var(--verdict-green)"
    : verdict.confidence >= 60 ? "var(--verdict-gold)"
    : "var(--breach-red)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-verdict-gold/30 rounded overflow-hidden"
      style={{ background: "color-mix(in srgb, var(--verdict-gold) 4%, var(--court-brown))" }}
    >
      {/* Receipt header band */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-verdict-gold/20"
           style={{ background: "color-mix(in srgb, var(--verdict-gold) 8%, var(--ink))" }}>
        <div>
          <span className="font-mono text-[10px] text-ash uppercase tracking-[0.25em]">
            Verdict Receipt
          </span>
          <span className="font-mono text-[10px] text-verdict-gold ml-2">· #{oath.oath_id}</span>
        </div>
        <button onClick={copy} className="flex items-center gap-1.5 text-ash hover:text-verdict-gold transition-colors">
          {copied ? <CheckCircle size={13} className="text-verdict-gold" /> : <Copy size={13} />}
          <span className="font-mono text-[10px] uppercase tracking-wider">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Seal + title */}
        <div className="flex items-start gap-5">
          <OathSeal status={verdict.status} size={72} animate={false} />
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-display text-lg text-parchment leading-snug">{oath.title}</h3>
            <p className="font-mono text-xs text-ash mt-1">
              Sworn by {shortAddr(oath.creator)}
            </p>
          </div>
        </div>

        {/* Verdict fields — ledger rows */}
        <div className="border border-[var(--rule-line)] rounded divide-y divide-[var(--rule-line)]">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="font-mono text-xs text-ash uppercase tracking-wider">Confidence</span>
            <span className="font-mono text-sm font-semibold" style={{ color: confidenceColor }}>
              {verdict.confidence}%
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="font-mono text-xs text-ash uppercase tracking-wider">Source Alignment</span>
            <span className="font-mono text-xs text-parchment-dim capitalize">{verdict.source_alignment}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="font-mono text-xs text-ash uppercase tracking-wider">Winning Side</span>
            <span className="font-mono text-xs text-parchment-dim capitalize">{verdict.winning_side}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="font-mono text-xs text-ash uppercase tracking-wider">Resolved</span>
            <span className="font-mono text-xs text-parchment-dim">{formatIsoDate(verdict.resolved_at)}</span>
          </div>
        </div>

        {/* Reason block */}
        <div className="border-l-2 pl-4 py-1"
             style={{ borderColor: "var(--verdict-gold)" }}>
          <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em] mb-1.5">Verdict Reason</p>
          <p className="text-parchment-dim text-sm leading-relaxed">{verdict.short_reason}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--rule-line)]">
          <span className="font-mono text-xs text-ash">
            Resolver: {shortAddr(verdict.resolver)}
          </span>
          {txHash && (
            <ExplorerLink href={getExplorerTxUrl(txHash)} label="Chain Receipt →" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
