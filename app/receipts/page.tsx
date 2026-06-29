"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAllOathSummaries, getVerdict, getOath } from "@/lib/genlayer/client";
import OathSeal from "@/components/oath/OathSeal";
import StatusRibbon from "@/components/oath/StatusRibbon";
import ExplorerLink from "@/components/oath/ExplorerLink";
import { getExplorerContractUrl } from "@/lib/genlayer/client";
import { formatDeadline, shortAddr } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { VerdictReceipt } from "@/lib/genlayer/types";
import type { Oath } from "@/lib/genlayer/types";

interface SettledOath {
  oath: Oath;
  verdict: VerdictReceipt;
}

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
    Promise.allSettled(
      settled.map(async (s) => {
        const [oath, verdict] = await Promise.all([getOath(s.oath_id), getVerdict(s.oath_id)]);
        if (!verdict) return null;
        return { oath, verdict };
      })
    ).then((results) => {
      const valid = results
        .filter((r): r is PromiseFulfilledResult<SettledOath | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((v): v is SettledOath => v !== null);
      setReceipts(valid);
      setLoading(false);
    });
  }, [summaries]);

  // Demo receipt
  const demoReceipt = {
    oath: {
      oath_id: -1,
      title: "Public Beta Launch",
      creator: "0xdemo000000000000000000000000000000000001",
      status: "fulfilled" as const,
      settled: true,
    } as Oath,
    verdict: {
      oath_id: -1,
      status: "fulfilled" as const,
      confidence: 86,
      source_alignment: "strong" as const,
      winning_side: "fulfilment" as const,
      short_reason: "Public sources confirm beta shipped before deadline with required features.",
      canonical_json: "",
      resolved_at: Math.floor(Date.now() / 1000) - 86400,
      resolver: "0xabc123def456000000000000000000000000cafe",
    } as VerdictReceipt,
  };

  const displayReceipts = hasContract ? receipts : [demoReceipt];

  return (
    <div className="min-h-screen ledger-grid">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs text-ink-grey uppercase tracking-widest mb-2">Settlement Gallery</p>
            <h1 className="font-serif text-4xl text-ivory-record">Oath Receipts</h1>
            {!hasContract && (
              <p className="font-mono text-xs text-partial-amber mt-2">Demo mode</p>
            )}
          </div>
          {hasContract && (
            <ExplorerLink href={getExplorerContractUrl()} label="StudioNet Contract" />
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 font-mono text-ink-grey">Loading receipts…</div>
        ) : displayReceipts.length === 0 ? (
          <div className="text-center py-20 font-mono text-ink-grey">
            No settled oaths yet. Create one and request a verdict.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {displayReceipts.map((r, i) => (
              <motion.div
                key={r.oath.oath_id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={r.oath.oath_id < 0 ? "#" : `/oaths/${r.oath.oath_id}`}
                  className="block glass rounded-xl overflow-hidden hover:border-signal-cyan/30 transition-all group"
                >
                  <div className="bg-court-slate/60 px-5 py-3 border-b border-glass-line flex items-center justify-between">
                    <span className="font-mono text-xs text-ink-grey">
                      {r.oath.oath_id < 0 ? "Demo" : `Oath #${r.oath.oath_id}`}
                    </span>
                    <StatusRibbon status={r.verdict.status} size="sm" />
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-4">
                      <OathSeal status={r.verdict.status} size={56} animate={false} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-base text-ivory-record group-hover:text-signal-cyan transition-colors leading-tight">
                          {r.oath.title}
                        </h3>
                        <p className="font-mono text-xs text-ink-grey mt-0.5">
                          {shortAddr(r.oath.creator)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-ivory-record/70 italic line-clamp-2">
                      &ldquo;{r.verdict.short_reason}&rdquo;
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-ink-grey">
                        Confidence: {r.verdict.confidence}%
                      </span>
                      <span className="font-mono text-xs text-ink-grey">
                        {formatDeadline(r.verdict.resolved_at)}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
