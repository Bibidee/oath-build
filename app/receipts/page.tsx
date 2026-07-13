"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAllOathSummaries, getVerdict, getOath } from "@/lib/genlayer/client";
import { getExplorerContractUrl } from "@/lib/genlayer/client";
import { formatIsoDate, shortAddr } from "@/lib/utils";
import ExplorerLink from "@/components/oath/ExplorerLink";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { VerdictReceipt, Oath } from "@/lib/genlayer/types";

interface SettledOath { oath: Oath; verdict: VerdictReceipt; }

const VERDICT_STYLE: Record<string, { color: string; label: string }> = {
  fulfilled:   { color: "var(--verdict-green)",      label: "Fulfilled" },
  partial:     { color: "var(--verdict-gold)",        label: "Partial" },
  missed:      { color: "var(--breach-red)",          label: "Missed" },
  unverifiable:{ color: "var(--ash)",                 label: "Unverifiable" },
  excluded:    { color: "var(--ash)",                 label: "Excluded" },
  invalid_oath:{ color: "var(--ash)",                 label: "Invalid" },
};

export default function ReceiptsPage() {
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;
  const [receipts, setReceipts] = useState<SettledOath[]>([]);
  const [loading, setLoading] = useState(hasContract);

  const { data: summaries } = useQuery({
    queryKey: ["all-oaths"],
    queryFn: getAllOathSummaries,
    enabled: hasContract,
  });

  useEffect(() => {
    if (!summaries) return;
    const settled = summaries.filter((s) => s.settled);
    Promise.all(
      settled.map(async (s) => {
        const [oath, verdict] = await Promise.all([getOath(s.oath_id), getVerdict(s.oath_id)]);
        if (!verdict) return null;
        return { oath, verdict };
      })
    )
      .then((results) => {
        const valid = results.filter((v): v is SettledOath => v !== null);
        setReceipts(valid);
      })
      .catch(() => {
        // Keep whatever receipts are already on screen rather than clearing
        // them on a transient RPC failure - the next successful refetch
        // will correct the list.
      })
      .finally(() => setLoading(false));
  }, [summaries]);

  const demoReceipt: SettledOath = {
    oath: {
      oath_id: -1, title: "Public Beta Launch",
      creator: "0xdemo000000000000000000000000000000000001",
      status: "fulfilled" as const, settled: true,
    } as Oath,
    verdict: {
      oath_id: -1, status: "fulfilled" as const, confidence: 86,
      source_alignment: "strong" as const, winning_side: "fulfilment" as const,
      short_reason: "Public sources confirm beta shipped before deadline with required features.",
      canonical_json: "",
      resolved_at: new Date(Date.now() - 86400000).toISOString(),
      resolver: "0xabc123def456000000000000000000000000cafe",
    } as VerdictReceipt,
  };

  const displayReceipts = hasContract ? receipts : [demoReceipt];

  return (
    <div className="min-h-screen ledger-bg">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10 border-b border-[var(--rule-line)] pb-6 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs text-ash uppercase tracking-[0.3em] mb-2">Settlement Archive</p>
            <h1 className="font-display text-5xl text-parchment">Verdict Receipts</h1>
            {!hasContract && <p className="font-mono text-xs text-verdict-gold mt-2">Demo mode</p>}
          </div>
          {hasContract && <ExplorerLink href={getExplorerContractUrl()} label="View contract" />}
        </div>

        {loading ? (
          <div className="text-center py-24 font-mono text-ash">Retrieving court records…</div>
        ) : displayReceipts.length === 0 ? (
          <div className="text-center py-24 font-mono text-ash">
            The archive is empty. Create an oath and request a verdict.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {displayReceipts.map((r, i) => {
              const vs = VERDICT_STYLE[r.verdict.status] || { color: "var(--ash)", label: r.verdict.status };
              return (
                <motion.div
                  key={r.oath.oath_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link
                    href={r.oath.oath_id < 0 ? "#" : `/oaths/${r.oath.oath_id}`}
                    className="block parchment-panel rounded overflow-hidden hover:border-verdict-gold/30 transition-colors group"
                  >
                    {/* Receipt top */}
                    <div className="px-5 py-3 border-b border-[var(--rule-line)] flex items-center justify-between"
                         style={{ background: `${vs.color}10` }}>
                      <span className="font-mono text-xs text-ash">
                        {r.oath.oath_id < 0 ? "Demo" : `Oath #${r.oath.oath_id}`}
                      </span>
                      <span className="font-mono text-xs uppercase tracking-widest px-2 py-0.5 border rounded"
                            style={{ color: vs.color, borderColor: `${vs.color}40` }}>
                        {vs.label}
                      </span>
                    </div>

                    {/* Seal + title */}
                    <div className="px-5 pt-5 pb-4 flex items-start gap-4">
                      {/* Stamped seal */}
                      <div className="shrink-0 mt-1">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                          <circle cx="24" cy="24" r="22" stroke={vs.color} strokeWidth="1.5" opacity="0.7"/>
                          <circle cx="24" cy="24" r="16" stroke={vs.color} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5"/>
                          <text x="24" y="29" textAnchor="middle" fill={vs.color} fontSize="16" fontFamily="IBM Plex Mono">
                            {r.verdict.status === "fulfilled" ? "✓" : r.verdict.status === "missed" ? "✗" : r.verdict.status === "partial" ? "◑" : "?"}
                          </text>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-xl text-parchment group-hover:text-verdict-gold-light transition-colors leading-tight">
                          {r.oath.title}
                        </p>
                        <p className="font-mono text-xs text-ash mt-1">{shortAddr(r.oath.creator)}</p>
                      </div>
                    </div>

                    {/* Verdict details */}
                    <div className="px-5 pb-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="border border-[var(--rule-line)] p-3 rounded">
                          <p className="font-mono text-xs text-ash mb-1">Confidence</p>
                          <p className="font-display text-2xl" style={{ color: vs.color }}>{r.verdict.confidence}%</p>
                        </div>
                        <div className="border border-[var(--rule-line)] p-3 rounded">
                          <p className="font-mono text-xs text-ash mb-1">Alignment</p>
                          <p className="font-display text-2xl text-parchment capitalize">{r.verdict.source_alignment}</p>
                        </div>
                      </div>

                      <div className="border-l-2 pl-3" style={{ borderColor: `${vs.color}50` }}>
                        <p className="text-parchment-dim text-sm italic leading-relaxed line-clamp-2">
                          &ldquo;{r.verdict.short_reason}&rdquo;
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--rule-line)] pt-3">
                        <p className="font-mono text-xs text-ash">
                          Resolved {formatIsoDate(r.verdict.resolved_at)}
                        </p>
                        <p className="font-mono text-xs text-ash">{shortAddr(r.verdict.resolver)}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
