"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Scale, Shield, Gavel } from "lucide-react";
import OathSeal from "@/components/oath/OathSeal";
import StatusRibbon from "@/components/oath/StatusRibbon";
import ExplorerLink from "@/components/oath/ExplorerLink";
import { getExplorerContractUrl } from "@/lib/genlayer/client";
import { DEMO_OATHS, formatDeadline, shortAddr } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getOathCount } from "@/lib/genlayer/client";

const steps = [
  {
    icon: <Scale size={20} />,
    title: "Lock Your Promise",
    desc: "Write your commitment in plain English. Set a deadline, success criteria, and accepted public evidence sources.",
  },
  {
    icon: <Shield size={20} />,
    title: "Submit Evidence",
    desc: "Anyone can submit public URLs supporting or challenging fulfilment after the deadline passes.",
  },
  {
    icon: <Gavel size={20} />,
    title: "GenLayer Judges",
    desc: "Decentralized AI validators independently inspect the oath and evidence, then reach consensus on a verdict.",
  },
];

const sampleVerdict = {
  confidence: 86,
  source_alignment: "strong",
  short_reason: "Public sources confirm beta shipped before deadline with wallet login, dashboard, and demo flow.",
  resolved_at: Math.floor(Date.now() / 1000) - 86400,
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
    <div className="min-h-screen ledger-grid">
      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 pt-20 pb-16 text-center">
        {!hasContract && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-partial-amber/40 bg-partial-amber/10 font-mono text-xs text-partial-amber mb-8">
            Demo mode — deploy the contract and set NEXT_PUBLIC_OATH_CONTRACT_ADDRESS
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="font-serif text-6xl md:text-8xl text-ivory-record leading-none mb-6">
            Promises with<br />
            <span className="text-witness-gold">consequences.</span>
          </h1>
          <p className="text-ink-grey text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Oath locks plain-English commitments on-chain and lets GenLayer&apos;s decentralized AI validators judge
            whether the promise was fulfilled — based only on public evidence.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/create"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-witness-gold/10 border border-witness-gold/40 text-witness-gold hover:bg-witness-gold/20 transition-all font-mono text-sm"
            >
              Create an Oath <ArrowRight size={14} />
            </Link>
            <Link
              href="/oaths"
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-glass-line text-ink-grey hover:text-ivory-record hover:border-ivory-record/30 transition-all font-mono text-sm"
            >
              Explore Oaths
            </Link>
          </div>
        </motion.div>

        {hasContract && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 flex items-center justify-center gap-8"
          >
            <div className="text-center">
              <p className="font-mono text-3xl text-signal-cyan">{oathCount ?? "—"}</p>
              <p className="font-mono text-xs text-ink-grey mt-1">Oaths on-chain</p>
            </div>
            <div className="w-px h-10 bg-glass-line" />
            <div className="text-center">
              <ExplorerLink href={getExplorerContractUrl()} label="StudioNet Contract" />
              <p className="font-mono text-xs text-ink-grey mt-1">GenLayer StudioNet</p>
            </div>
          </motion.div>
        )}
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <p className="font-mono text-xs text-ink-grey uppercase tracking-widest text-center mb-10">
          How Settlement Works
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i }}
              className="glass rounded-xl p-6 space-y-3"
            >
              <div className="text-witness-gold">{s.icon}</div>
              <h3 className="font-serif text-lg text-ivory-record">{s.title}</h3>
              <p className="text-ink-grey text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Sample receipt */}
      <section className="max-w-xl mx-auto px-4 pb-20">
        <p className="font-mono text-xs text-ink-grey uppercase tracking-widest text-center mb-6">
          Sample Oath Receipt
        </p>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-xl overflow-hidden"
        >
          <div className="bg-court-slate/60 px-6 py-3 border-b border-glass-line flex items-center justify-between">
            <span className="font-mono text-xs text-ink-grey uppercase tracking-widest">Demo Receipt</span>
            <StatusRibbon status="fulfilled" size="sm" />
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <OathSeal status="fulfilled" size={72} animate={false} />
              <div>
                <h3 className="font-serif text-lg text-ivory-record">Public Beta Launch</h3>
                <p className="font-mono text-xs text-ink-grey">{shortAddr(DEMO_OATHS[0].creator)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-court-slate/40 rounded-lg p-3">
                <p className="font-mono text-xs text-ink-grey mb-0.5">Confidence</p>
                <p className="font-mono font-medium text-verdict-green">{sampleVerdict.confidence}%</p>
              </div>
              <div className="bg-court-slate/40 rounded-lg p-3">
                <p className="font-mono text-xs text-ink-grey mb-0.5">Alignment</p>
                <p className="font-mono font-medium text-ivory-record capitalize">{sampleVerdict.source_alignment}</p>
              </div>
            </div>
            <p className="text-sm text-ivory-record/80 italic border-l-2 border-verdict-green/40 pl-3">
              &ldquo;{sampleVerdict.short_reason}&rdquo;
            </p>
            <p className="font-mono text-xs text-ink-grey">
              Resolved by {shortAddr(sampleVerdict.resolver)} · {formatDeadline(sampleVerdict.resolved_at)}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Demo oaths */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <p className="font-mono text-xs text-ink-grey uppercase tracking-widest text-center mb-6">
          Example Oaths (Demo)
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {DEMO_OATHS.map((o) => (
            <div key={o.oath_id} className="glass rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-serif text-base text-ivory-record leading-tight">{o.title}</h4>
                <StatusRibbon status={o.status} size="sm" />
              </div>
              <p className="text-xs text-ink-grey leading-relaxed line-clamp-3">{o.promise}</p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-ink-grey">{o.category}</span>
                <span className="font-mono text-xs text-ink-grey">{formatDeadline(o.deadline_unix)}</span>
              </div>
              <div className="border-t border-glass-line pt-2">
                <span className="font-mono text-xs text-partial-amber">Demo placeholder</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
