"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAllOathSummaries } from "@/lib/genlayer/client";
import StatusRibbon from "@/components/oath/StatusRibbon";
import { formatDeadline, isPastDeadline, shortAddr, DEMO_OATHS } from "@/lib/utils";

const TABS = [
  { key: "evidence_needed", label: "Evidence Needed" },
  { key: "ready_for_verdict", label: "Ready for Verdict" },
  { key: "in_dispute", label: "In Dispute" },
  { key: "recently_settled", label: "Recently Settled" },
];

export default function ArenaPage() {
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;
  const [tab, setTab] = useState("evidence_needed");

  const { data: oaths = [], isLoading } = useQuery({
    queryKey: ["all-oaths"],
    queryFn: getAllOathSummaries,
    enabled: hasContract,
  });

  const demoOaths = DEMO_OATHS.map((o) => ({
    oath_id: o.oath_id,
    title: o.title,
    creator: o.creator,
    deadline_unix: o.deadline_unix,
    status: o.status,
    settled: o.settled,
    category: o.category,
    evidence_count: 0,
    appeal_count: 0,
    verdict_status: "",
    verdict_confidence: 0,
  }));

  const source = hasContract ? oaths : demoOaths;

  const tabData: Record<string, typeof source> = {
    evidence_needed: source.filter(
      (o) => !o.settled && isPastDeadline(o.deadline_unix) && o.evidence_count === 0
    ),
    ready_for_verdict: source.filter(
      (o) => !o.settled && isPastDeadline(o.deadline_unix) && o.evidence_count > 0
    ),
    in_dispute: source.filter((o) => o.appeal_count > 0 && !o.settled),
    recently_settled: source.filter((o) => o.settled).slice(0, 20),
  };

  const items = tabData[tab] || [];

  return (
    <div className="min-h-screen ledger-grid">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <p className="font-mono text-xs text-ink-grey uppercase tracking-widest mb-2">Oath Arena</p>
          <h1 className="font-serif text-4xl text-ivory-record">Oaths Needing Action</h1>
          {!hasContract && (
            <p className="font-mono text-xs text-partial-amber mt-2">Demo mode</p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap mb-8">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg font-mono text-sm transition-all border ${
                tab === t.key
                  ? "bg-signal-cyan/10 border-signal-cyan/40 text-signal-cyan"
                  : "border-glass-line text-ink-grey hover:text-ivory-record hover:border-ivory-record/30"
              }`}
            >
              {t.label}
              <span className="ml-2 opacity-60">
                {tabData[t.key]?.length ?? 0}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-20 font-mono text-ink-grey">Loading from chain…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 font-mono text-ink-grey">
            Nothing here yet.
            {tab === "evidence_needed" && " Oaths past their deadline with no evidence will appear here."}
            {tab === "ready_for_verdict" && " Oaths with evidence ready for GenLayer judgment will appear here."}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((o, i) => (
              <motion.div
                key={o.oath_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={o.oath_id < 0 ? "#" : `/oaths/${o.oath_id}`}
                  className="block glass rounded-xl p-5 hover:border-signal-cyan/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-lg text-ivory-record group-hover:text-signal-cyan transition-colors">
                        {o.title}
                      </h3>
                      <p className="font-mono text-xs text-ink-grey mt-1">
                        {shortAddr(o.creator)} · deadline {formatDeadline(o.deadline_unix)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusRibbon status={o.status} size="sm" />
                      <span className="font-mono text-xs text-ink-grey">
                        {o.evidence_count} evidence
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
