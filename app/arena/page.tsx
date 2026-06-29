"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAllOathSummaries } from "@/lib/genlayer/client";
import { formatDeadline, isPastDeadline, shortAddr, DEMO_OATHS } from "@/lib/utils";

const TABS = [
  { key: "evidence_needed",  label: "Awaiting Witnesses" },
  { key: "ready_for_verdict", label: "Ready for Judgment" },
  { key: "in_dispute",       label: "Under Appeal" },
  { key: "recently_settled", label: "Recently Settled" },
];

const STATUS_COLOR: Record<string, string> = {
  active: "text-[#4A9EDB]", fulfilled: "text-verdict-green",
  partial: "text-verdict-gold", missed: "text-breach-red",
  needs_more_evidence: "text-verdict-gold",
};

export default function ArenaPage() {
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;
  const [tab, setTab] = useState("evidence_needed");

  const { data: oaths = [], isLoading } = useQuery({
    queryKey: ["all-oaths"],
    queryFn: getAllOathSummaries,
    enabled: hasContract,
  });

  const demoOaths = DEMO_OATHS.map((o) => ({
    oath_id: o.oath_id, title: o.title, creator: o.creator,
    deadline_unix: o.deadline_unix, status: o.status, settled: o.settled,
    category: o.category, evidence_count: 0, appeal_count: 0,
    verdict_status: "", verdict_confidence: 0,
  }));

  const source = hasContract ? oaths : demoOaths;

  const tabData: Record<string, typeof source> = {
    evidence_needed:   source.filter((o) => !o.settled && isPastDeadline(o.deadline_unix) && o.evidence_count === 0),
    ready_for_verdict: source.filter((o) => !o.settled && isPastDeadline(o.deadline_unix) && o.evidence_count > 0),
    in_dispute:        source.filter((o) => o.appeal_count > 0 && !o.settled),
    recently_settled:  source.filter((o) => o.settled).slice(0, 20),
  };

  const items = tabData[tab] || [];

  const emptyMsg: Record<string, string> = {
    evidence_needed: "No oaths are waiting for witnesses right now.",
    ready_for_verdict: "No oaths are ready for judgment yet.",
    in_dispute: "No oaths are currently under appeal.",
    recently_settled: "No settled oaths yet. Create one and request a verdict.",
  };

  return (
    <div className="min-h-screen ledger-bg">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10 border-b border-[var(--rule-line)] pb-6">
          <p className="font-mono text-xs text-ash uppercase tracking-[0.3em] mb-2">Action Required</p>
          <h1 className="font-display text-5xl text-parchment">Judgment Arena</h1>
          {!hasContract && <p className="font-mono text-xs text-verdict-gold mt-2">Demo mode</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-8 border border-[var(--rule-line)] rounded overflow-hidden">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors border-r border-[var(--rule-line)] last:border-r-0 ${
                tab === t.key
                  ? "bg-seal-red/10 text-seal-red-bright"
                  : "text-ash hover:text-parchment-dim hover:bg-court-brown-mid"
              }`}
            >
              {t.label}
              <span className="ml-2 text-ash opacity-60">{tabData[t.key]?.length ?? 0}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-24 font-mono text-ash">Consulting the record…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 font-mono text-ash">{emptyMsg[tab]}</div>
        ) : (
          <div className="space-y-px">
            {items.map((o, i) => (
              <motion.div
                key={o.oath_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={o.oath_id < 0 ? "#" : `/oaths/${o.oath_id}`}
                  className="group flex items-center gap-5 px-5 py-4 border-b border-[var(--rule-line)] hover:bg-court-brown-mid transition-colors"
                >
                  <span className="font-mono text-xs text-ash w-8 shrink-0">
                    {o.oath_id >= 0 ? `#${o.oath_id}` : "—"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg text-parchment group-hover:text-verdict-gold-light transition-colors leading-tight">
                      {o.title}
                    </p>
                    <p className="font-mono text-xs text-ash mt-0.5">
                      {shortAddr(o.creator)} · deadline {formatDeadline(o.deadline_unix)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono text-xs uppercase tracking-widest ${STATUS_COLOR[o.status] || "text-ash"}`}>
                      {o.status.replace(/_/g, " ")}
                    </p>
                    {o.evidence_count > 0 && (
                      <p className="font-mono text-xs text-ash mt-0.5">{o.evidence_count} witness{o.evidence_count !== 1 ? "es" : ""}</p>
                    )}
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
