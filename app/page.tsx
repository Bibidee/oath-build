"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getOathCount } from "@/lib/genlayer/client";
import { getExplorerContractUrl } from "@/lib/genlayer/client";
import { DEMO_OATHS, formatDeadline, formatIsoDate, shortAddr } from "@/lib/utils";
import ExplorerLink from "@/components/oath/ExplorerLink";

const lifecycle = [
  { step: "I", label: "Promise", desc: "A plain-English commitment locked on-chain with a deadline, success criteria, and accepted evidence sources." },
  { step: "II", label: "Evidence", desc: "Anyone may submit public URLs that support or challenge fulfilment. The record is open to all witnesses." },
  { step: "III", label: "Judgment", desc: "GenLayer validators independently inspect the oath and evidence, then reach consensus on a verdict." },
  { step: "IV", label: "Receipt", desc: "A permanent on-chain receipt records the verdict, confidence score, and reasoning — public forever." },
];

const sampleVerdict = {
  confidence: 86,
  source_alignment: "strong",
  short_reason: "Public sources confirm beta shipped before deadline with wallet login, dashboard, and demo flow.",
  resolved_at: new Date(Date.now() - 86400000).toISOString(),
  resolver: "0xabc123def456000000000000000000000000cafe",
};

export default function Home() {
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;

  const { data: oathCount } = useQuery({
    queryKey: ["oath-count"],
    queryFn: getOathCount,
    enabled: hasContract,
  });

  return (
    <div className="min-h-screen ledger-bg">

      {/* === COURT ENTRANCE HERO === */}
      <section className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">

        {!hasContract && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-verdict-gold/30 bg-verdict-gold/05 font-mono text-xs text-verdict-gold mb-10">
            Demo mode — contract not yet wired
          </div>
        )}

        {/* Court seal emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex justify-center mb-10"
        >
          <div className="relative glow-seal">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="58" stroke="var(--seal-red)" strokeWidth="1.5"/>
              <circle cx="60" cy="60" r="50" stroke="var(--seal-red)" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.6"/>
              <circle cx="60" cy="60" r="42" stroke="var(--seal-red)" strokeWidth="0.5" opacity="0.3"/>
              {/* Scales of justice */}
              <line x1="60" y1="28" x2="60" y2="80" stroke="var(--seal-red)" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="38" y1="42" x2="82" y2="42" stroke="var(--seal-red)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M38 42 L32 58 L44 58 Z" stroke="var(--seal-red)" strokeWidth="1" fill="var(--seal-red)" fillOpacity="0.15"/>
              <path d="M82 42 L76 58 L88 58 Z" stroke="var(--seal-red)" strokeWidth="1" fill="var(--seal-red)" fillOpacity="0.15"/>
              <line x1="54" y1="80" x2="66" y2="80" stroke="var(--seal-red)" strokeWidth="1.5" strokeLinecap="round"/>
              {/* Ring text marks */}
              {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => (
                <circle
                  key={i}
                  cx={60 + 54 * Math.cos((a - 90) * Math.PI / 180)}
                  cy={60 + 54 * Math.sin((a - 90) * Math.PI / 180)}
                  r="1.5"
                  fill="var(--seal-red)"
                  opacity="0.5"
                />
              ))}
            </svg>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="font-mono text-xs text-ash uppercase tracking-[0.3em] mb-4">The Ledger Court</p>
          <h1 className="font-display text-6xl md:text-8xl text-parchment leading-[0.9] mb-6">
            Promises with<br />
            <em className="text-seal-red-bright not-italic">consequences.</em>
          </h1>
          <p className="text-ash-light text-lg max-w-xl mx-auto leading-relaxed mb-12">
            Oath is a public accountability layer. Lock plain-English commitments on-chain.
            GenLayer&apos;s decentralised AI validators judge whether the promise was kept —
            based only on public evidence.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/create"
              className="px-8 py-3 bg-seal-red hover:bg-seal-red-bright transition-colors font-mono text-xs text-parchment uppercase tracking-widest rounded"
            >
              Draft an Oath
            </Link>
            <Link
              href="/oaths"
              className="px-8 py-3 border border-[var(--rule-line-strong)] hover:border-parchment-dim/40 transition-colors font-mono text-xs text-ash-light uppercase tracking-widest rounded"
            >
              Enter the Ledger
            </Link>
          </div>
        </motion.div>

        {hasContract && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-14 flex items-center justify-center gap-10"
          >
            <div className="text-center">
              <p className="font-display text-4xl text-parchment">{oathCount ?? "—"}</p>
              <p className="font-mono text-xs text-ash mt-1 uppercase tracking-widest">Oaths on-chain</p>
            </div>
            <div className="h-10 w-px bg-[var(--rule-line)]" />
            <div className="text-center">
              <ExplorerLink href={getExplorerContractUrl()} label="View Contract" />
              <p className="font-mono text-xs text-ash mt-1 uppercase tracking-widest">GenLayer StudioNet</p>
            </div>
          </motion.div>
        )}
      </section>

      {/* === LIFECYCLE === */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <hr className="divider-rule mb-16" />
        <p className="font-mono text-xs text-ash uppercase tracking-[0.3em] text-center mb-12">The Oath Lifecycle</p>
        <div className="grid md:grid-cols-4 gap-px bg-[var(--rule-line)]">
          {lifecycle.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="court-paper p-6 space-y-3"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-display text-3xl text-seal-red opacity-60">{l.step}</span>
                <span className="font-mono text-xs text-verdict-gold uppercase tracking-widest">{l.label}</span>
              </div>
              <p className="text-ash-light text-sm leading-relaxed">{l.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* === SAMPLE RECEIPT === */}
      <section className="max-w-xl mx-auto px-6 pb-24">
        <p className="font-mono text-xs text-ash uppercase tracking-[0.3em] text-center mb-8">Sample Verdict Receipt</p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="parchment-panel rounded overflow-hidden glow-gold"
        >
          {/* Receipt header */}
          <div className="bg-verdict-gold/10 border-b border-[var(--rule-line-strong)] px-6 py-3 flex items-center justify-between">
            <span className="font-mono text-xs text-ash uppercase tracking-widest">Oath Receipt · Demo</span>
            <span className="font-mono text-xs px-2 py-0.5 border border-verdict-green/40 text-verdict-green rounded uppercase tracking-widest">Fulfilled</span>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <p className="font-mono text-xs text-ash mb-1 uppercase tracking-widest">Promise</p>
              <p className="font-display text-xl text-parchment">Public Beta Launch</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-[var(--rule-line)] p-3 rounded">
                <p className="font-mono text-xs text-ash mb-1">Confidence</p>
                <p className="font-display text-2xl text-verdict-gold">{sampleVerdict.confidence}%</p>
              </div>
              <div className="border border-[var(--rule-line)] p-3 rounded">
                <p className="font-mono text-xs text-ash mb-1">Alignment</p>
                <p className="font-display text-2xl text-parchment capitalize">{sampleVerdict.source_alignment}</p>
              </div>
            </div>
            <div className="border-l-2 border-verdict-gold/40 pl-4">
              <p className="text-parchment-dim text-sm italic leading-relaxed">&ldquo;{sampleVerdict.short_reason}&rdquo;</p>
            </div>
            <p className="font-mono text-xs text-ash">
              Resolved by {shortAddr(sampleVerdict.resolver)} · {formatIsoDate(sampleVerdict.resolved_at)}
            </p>
          </div>
        </motion.div>
      </section>

      {/* === DEMO OATHS === */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <p className="font-mono text-xs text-ash uppercase tracking-[0.3em] text-center mb-8">Example Oaths</p>
        <div className="grid md:grid-cols-3 gap-px bg-[var(--rule-line)]">
          {DEMO_OATHS.map((o) => (
            <div key={o.oath_id} className="court-paper p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg text-parchment leading-tight">{o.title}</p>
                <span className="font-mono text-[10px] text-verdict-gold border border-verdict-gold/30 px-1.5 py-0.5 rounded uppercase shrink-0">{o.status}</span>
              </div>
              <p className="text-ash-light text-sm leading-relaxed line-clamp-3">{o.promise}</p>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--rule-line)]">
                <span className="font-mono text-xs text-ash">{o.category}</span>
                <span className="font-mono text-xs text-ash">{formatDeadline(o.deadline_unix)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
