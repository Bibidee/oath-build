"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getAllOathSummaries } from "@/lib/genlayer/client";
import { DEMO_OATHS, formatDeadline, shortAddr } from "@/lib/utils";
import type { OathStatus } from "@/lib/genlayer/types";

const STATUS_LABEL: Record<string, string> = {
  active: "Active", fulfilled: "Fulfilled", partial: "Partial", missed: "Missed",
  unverifiable: "Unverifiable", excluded: "Excluded", invalid_oath: "Invalid",
  needs_more_evidence: "Needs Evidence", not_due: "Not Due",
};

const FILTERS = [
  { key: "all", label: "All" }, { key: "active", label: "Active" },
  { key: "fulfilled", label: "Fulfilled" }, { key: "partial", label: "Partial" },
  { key: "missed", label: "Missed" }, { key: "settled", label: "Settled" },
  { key: "needs_more_evidence", label: "Needs Evidence" },
];

const statusClass: Record<string, string> = {
  active: "text-[#4A9EDB] border-[#4A9EDB]/30",
  fulfilled: "text-verdict-green border-verdict-green/30",
  partial: "text-verdict-gold border-verdict-gold/30",
  missed: "text-breach-red border-breach-red/30",
  needs_more_evidence: "text-verdict-gold border-verdict-gold/30",
};

export default function OathsPage() {
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: oaths, isLoading } = useQuery({
    queryKey: ["all-oaths"],
    queryFn: getAllOathSummaries,
    enabled: hasContract,
  });

  const displayOaths = hasContract
    ? (oaths ?? [])
    : DEMO_OATHS.map((o) => ({
        oath_id: o.oath_id, title: o.title, creator: o.creator,
        deadline_unix: o.deadline_unix, status: o.status, settled: o.settled,
        category: o.category, evidence_count: 0, appeal_count: 0,
        verdict_status: "", verdict_confidence: 0,
      }));

  const filtered = displayOaths.filter((o) => {
    const matchFilter = filter === "all" || (filter === "settled" ? o.settled : o.status === filter);
    const matchSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.creator.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="min-h-screen ledger-bg">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10 border-b border-[var(--rule-line)] pb-6">
          <p className="font-mono text-xs text-ash uppercase tracking-[0.3em] mb-2">Public Record</p>
          <h1 className="font-display text-5xl text-parchment">The Oath Ledger</h1>
          {!hasContract && (
            <p className="font-mono text-xs text-verdict-gold mt-2">Demo mode — showing placeholder oaths</p>
          )}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the ledger by title or address…"
          className="w-full mb-5 bg-court-brown-mid border border-[var(--rule-line)] rounded px-4 py-2.5 text-parchment font-mono text-sm focus:outline-none focus:border-verdict-gold/40 placeholder:text-ash"
        />

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-8">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded font-mono text-xs transition-all border uppercase tracking-wider ${
                filter === f.key
                  ? "border-verdict-gold/50 text-verdict-gold bg-verdict-gold/05"
                  : "border-[var(--rule-line)] text-ash hover:text-parchment-dim hover:border-[var(--rule-line-strong)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Oath list */}
        {isLoading ? (
          <div className="text-center py-24 font-mono text-ash">Consulting the ledger…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 font-mono text-ash">No oaths found in the record.</div>
        ) : (
          <div className="space-y-px">
            {/* Column header */}
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto] gap-6 px-5 pb-2 border-b border-[var(--rule-line)]">
              <span className="font-mono text-xs text-ash uppercase tracking-widest w-8">No.</span>
              <span className="font-mono text-xs text-ash uppercase tracking-widest">Title</span>
              <span className="font-mono text-xs text-ash uppercase tracking-widest">Deadline</span>
              <span className="font-mono text-xs text-ash uppercase tracking-widest">Status</span>
            </div>

            {filtered.map((o, i) => {
              const sc = statusClass[o.status] || "text-ash border-ash/30";
              return (
                <motion.div
                  key={o.oath_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.025 }}
                >
                  <Link
                    href={o.oath_id < 0 ? "#" : `/oaths/${o.oath_id}`}
                    className="group flex items-center gap-6 px-5 py-4 border-b border-[var(--rule-line)] hover:bg-court-brown-mid transition-colors"
                  >
                    <span className="font-mono text-xs text-ash w-8 shrink-0">
                      {o.oath_id >= 0 ? `#${o.oath_id}` : "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-lg text-parchment group-hover:text-verdict-gold-light transition-colors leading-tight truncate">
                        {o.title}
                      </p>
                      <p className="font-mono text-xs text-ash mt-0.5">
                        {shortAddr(o.creator)} · {o.category}
                        {o.evidence_count > 0 && (
                          <span className="ml-3 text-ash">{o.evidence_count} witness{o.evidence_count !== 1 ? "es" : ""}</span>
                        )}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-ash shrink-0 hidden md:block">
                      {formatDeadline(o.deadline_unix)}
                    </span>
                    <span className={`font-mono text-[10px] border px-2 py-0.5 rounded uppercase tracking-widest shrink-0 ${sc}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
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
