"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Gavel, Scale } from "lucide-react";
import {
  getOath, getEvidence, getVerdict, getAppeals,
  requestAppealVerdict, getExplorerTxUrl
} from "@/lib/genlayer/client";
import PromiseChamber from "@/components/oath/PromiseChamber";
import OathTimeline from "@/components/oath/OathTimeline";
import OathSeal from "@/components/oath/OathSeal";
import EvidenceWall from "@/components/evidence/EvidenceWall";
import VerdictReceiptCard from "@/components/verdict/VerdictReceipt";
import ActionDock from "@/components/oath/ActionDock";
import AppealDrawer from "@/components/oath/AppealDrawer";
import EvidenceSubmitModal from "@/components/evidence/EvidenceSubmitModal";
import ExplorerLink from "@/components/oath/ExplorerLink";
import StatusRibbon from "@/components/oath/StatusRibbon";
import { useWallet } from "@/lib/context/WalletContext";
import { shortAddr } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default function OathDetailPage({ params }: Props) {
  const { id } = use(params);
  const oathId = parseInt(id);
  const { account, connect, isConnected } = useWallet();
  const queryClient = useQueryClient();
  const [showReceipt, setShowReceipt] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [appealVerdictLoading, setAppealVerdictLoading] = useState<number | null>(null);
  const [appealVerdictHash, setAppealVerdictHash] = useState<Record<number, string>>({});
  const [appealVerdictError, setAppealVerdictError] = useState<Record<number, string>>({});

  const handleRequestAppealVerdict = async (appealId: number) => {
    if (!account) { connect(); return; }
    setAppealVerdictLoading(appealId);
    setAppealVerdictError({});
    try {
      const hash = await requestAppealVerdict(oathId, appealId, account);
      setAppealVerdictHash((prev) => ({ ...prev, [appealId]: hash }));
      await queryClient.invalidateQueries({ queryKey: ["verdict", oathId] });
      await queryClient.invalidateQueries({ queryKey: ["appeals", oathId] });
      await queryClient.invalidateQueries({ queryKey: ["oath", oathId] });
    } catch (e: unknown) {
      setAppealVerdictError((prev) => ({ ...prev, [appealId]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setAppealVerdictLoading(null);
    }
  };

  const { data: oath, isLoading } = useQuery({
    queryKey: ["oath", oathId],
    queryFn: () => getOath(oathId),
    enabled: !isNaN(oathId),
    refetchInterval: (query) => (query.state.data?.settled ? false : 6000),
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ["evidence", oathId],
    queryFn: () => getEvidence(oathId),
    enabled: !isNaN(oathId),
    refetchInterval: oath?.settled ? false : 6000,
  });

  const { data: verdict } = useQuery({
    queryKey: ["verdict", oathId],
    queryFn: () => getVerdict(oathId),
    enabled: !isNaN(oathId),
    refetchInterval: oath?.settled ? false : 6000,
  });

  const { data: appeals = [] } = useQuery({
    queryKey: ["appeals", oathId],
    queryFn: () => getAppeals(oathId),
    enabled: !isNaN(oathId),
    refetchInterval: oath?.settled ? false : 6000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Scale size={28} className="text-ash animate-pulse" />
        <p className="font-mono text-xs text-ash uppercase tracking-[0.2em]">Consulting the ledger…</p>
      </div>
    );
  }

  if (!oath) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-2">
        <p className="font-display text-xl text-parchment-dim">Oath #{oathId} not found</p>
        <p className="font-mono text-xs text-ash">No record in the court ledger.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen ledger-bg">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Page header — oath identity */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start gap-5"
        >
          <OathSeal status={oath.status} size={64} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] text-ash uppercase tracking-[0.25em]">
                Oath #{oath.oath_id}
              </span>
              <StatusRibbon status={oath.status} size="sm" />
            </div>
            <h1 className="font-display text-2xl md:text-3xl text-parchment leading-snug">{oath.title}</h1>
            <p className="font-mono text-xs text-ash mt-1">Sworn by {shortAddr(oath.creator)}</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[200px_1fr_300px] gap-5">

          {/* Left: Timeline */}
          <div className="hidden lg:block">
            <div className="court-paper border border-[var(--rule-line)] rounded p-4 sticky top-20">
              <OathTimeline oath={oath} evidenceCount={evidence.length} />
            </div>
          </div>

          {/* Centre: Promise Chamber + Verdict + Appeals */}
          <div className="space-y-4">
            <PromiseChamber oath={oath} />

            {(showReceipt || oath.settled) && verdict && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <VerdictReceiptCard verdict={verdict} oath={oath} />
              </motion.div>
            )}

            {appeals.length > 0 && (
              <div className="court-paper border border-[var(--rule-line)] rounded overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--rule-line)]">
                  <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em]">
                    Appeals · {appeals.length}
                  </p>
                </div>
                <div className="divide-y divide-[var(--rule-line)]">
                  {appeals.map((ap) => (
                    <div key={ap.appeal_id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-verdict-gold capitalize">
                          {ap.basis.replace(/_/g, " ")}
                        </span>
                        <span className={`font-mono text-[10px] uppercase tracking-wider ${ap.resolved ? "text-verdict-green" : "text-ash"}`}>
                          {ap.resolved ? "Resolved" : "Pending"}
                        </span>
                      </div>
                      <p className="text-sm text-parchment-dim leading-relaxed break-words">{ap.argument}</p>
                      {!ap.resolved && (
                        <button
                          onClick={() => handleRequestAppealVerdict(ap.appeal_id)}
                          disabled={appealVerdictLoading === ap.appeal_id}
                          className="flex items-center gap-2 px-3 py-1.5 border border-verdict-gold/40 text-verdict-gold hover:bg-verdict-gold/10 transition-all font-mono text-xs rounded uppercase tracking-wider disabled:opacity-50"
                        >
                          {appealVerdictLoading === ap.appeal_id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Gavel size={11} />}
                          {isConnected ? "Request Appeal Verdict" : "Connect to Judge"}
                        </button>
                      )}
                      {appealVerdictHash[ap.appeal_id] && (
                        <ExplorerLink href={getExplorerTxUrl(appealVerdictHash[ap.appeal_id])} label="Appeal verdict submitted →" />
                      )}
                      {appealVerdictError[ap.appeal_id] && (
                        <p className="font-mono text-xs text-breach-red">{appealVerdictError[ap.appeal_id]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Dock */}
            <ActionDock
              oath={oath}
              evidenceCount={evidence.length}
              onSubmitEvidence={() => setShowEvidence(true)}
              onViewReceipt={() => setShowReceipt(true)}
              onAppeal={() => setShowAppeal(true)}
            />
          </div>

          {/* Right: Evidence Wall */}
          <div>
            <div className="court-paper border border-[var(--rule-line)] rounded overflow-hidden sticky top-20">
              <div className="px-4 py-2.5 border-b border-[var(--rule-line)]">
                <p className="font-mono text-[10px] text-ash uppercase tracking-[0.2em]">
                  Witness Wall · {evidence.length}
                </p>
              </div>
              <div className="p-4">
                <EvidenceWall evidence={evidence} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <EvidenceSubmitModal
        oathId={oathId}
        open={showEvidence}
        onClose={() => setShowEvidence(false)}
      />
      <AppealDrawer
        oathId={oathId}
        open={showAppeal}
        onClose={() => setShowAppeal(false)}
      />
    </div>
  );
}
