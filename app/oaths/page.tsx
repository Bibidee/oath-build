"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAllOathSummaries } from "@/lib/genlayer/client";
import StatusRibbon from "@/components/oath/StatusRibbon";
import { DEMO_OATHS, formatDeadline, shortAddr } from "@/lib/utils";
import type { OathStatus } from "@/lib/genlayer/types";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "fulfilled", label: "Fulfilled" },
  { key: "partial", label: "Partial" },
  { key: "missed", label: "Missed" },
  { key: "unverifiable", label: "Unverifiable" },
  { key: "settled", label: "Settled" },
  { key: "needs_more_evidence", label: "Needs Evidence" },
];

export default function OathsPage() {
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: oaths, isLoading } = useQuery({
    queryKey: ["all-oaths"],
    queryFn: getAllOathSummaries,
    enabled: hasContract,
  });

  const displayOaths = hasContract ? (oaths ?? []) : DEMO_OATHS.map((o) => ({
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

  const filtered = displayOaths.filter((o) => {
    const matchFilter =
      filter === "all" ||
      (filter === "settled" ? o.settled : o.status === filter);
    const matchSearch =
      !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.creator.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="min-h-screen ledger-grid">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10">
          <p className="font-mono text-xs text-ink-grey uppercase tracking-widest mb-2">Public Ledger</p>
          <h1 className="font-serif text-4xl text-ivory-record">Oath Registry</h1>
          {!hasContract && (
            <p className="font-mono text-xs text-partial-amber mt-2">Demo mode — showing placeholder oaths</p>
          )}
        </div>

        {/* Search + filters */}
        <div className="space-y-4 mb-8">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or address..."
            className="w-full bg-court-slate/60 border border-glass-line rounded-lg px-4 py-2.5 text-ivory-record font-mono text-sm focus:outline-none focus:border-signal-cyan/50 placeholder:text-ink-grey/50"
          />
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full font-mono text-xs transition-all border ${
                  filter === f.key
                    ? "bg-signal-cyan/10 border-signal-cyan/40 text-signal-cyan"
                    : "border-glass-line text-ink-grey hover:text-ivory-record hover:border-ivory-record/30"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-20 font-mono text-ink-grey">Loading oaths from chain…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 font-mono text-ink-grey">No oaths found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o, i) => (
              <motion.div
                key={o.oath_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={o.oath_id < 0 ? "#" : `/oaths/${o.oath_id}`}
                  className="block glass rounded-xl p-5 hover:border-signal-cyan/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {o.oath_id >= 0 && (
                          <span className="font-mono text-xs text-ink-grey">#{o.oath_id}</span>
                        )}
                        <span className="font-mono text-xs text-ink-grey capitalize">{o.category}</span>
                        {o.oath_id < 0 && (
                          <span className="font-mono text-xs text-partial-amber">demo</span>
                        )}
                      </div>
                      <h3 className="font-serif text-lg text-ivory-record group-hover:text-signal-cyan transition-colors leading-tight">
                        {o.title}
                      </h3>
                      <p className="font-mono text-xs text-ink-grey mt-1">
                        {shortAddr(o.creator)} · {formatDeadline(o.deadline_unix)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusRibbon status={o.status as OathStatus} size="sm" />
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
