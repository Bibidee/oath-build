"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { RecommendationBadge, RiskBadge, ReviewStatusBadge, Badge } from "@/components/ui/Badge";
import { InvestmentMemo } from "@/components/evaluation/InvestmentMemo";
import { ScoreDashboard } from "@/components/evaluation/ScoreDashboard";
import { Timeline } from "@/components/startup/Timeline";
import { getStartup, startConsensusEvaluation } from "@/lib/oracleboard/contract";
import { getTx, saveTx, saveRecentStartup } from "@/lib/oracleboard/tx";
import type { StartupRecord } from "@/lib/genlayer/types";
import { clsx } from "clsx";
import {
  RefreshCw, Play, Loader2, ExternalLink, AlertCircle, ChevronRight, FileText,
  Search, BarChart3, Clock, GitCommit, RotateCcw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Tab = "dossier" | "diligence" | "memo" | "scores" | "updates" | "trail";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dossier", label: "Dossier", icon: <FileText size={13} /> },
  { id: "diligence", label: "Due Diligence Room", icon: <Search size={13} /> },
  { id: "memo", label: "Consensus Memo", icon: <GitCommit size={13} /> },
  { id: "scores", label: "Score Dashboard", icon: <BarChart3 size={13} /> },
  { id: "updates", label: "Round Updates", icon: <RotateCcw size={13} /> },
  { id: "trail", label: "Transaction Trail", icon: <Clock size={13} /> },
];

function DiligenceSection({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div className="card p-5 space-y-2">
      <h3 className="text-xs font-mono text-slate uppercase tracking-widest">{title}</h3>
      <p className="text-sm text-memo font-body leading-relaxed">{content}</p>
    </div>
  );
}

export default function StartupProfilePage({ params }: { params: Promise<{ startupId: string }> }) {
  const { startupId } = use(params);
  const searchParams = useSearchParams();
  const isNewSubmission = searchParams.get("submitted") === "1";
  const submittedTx = searchParams.get("tx");
  const [record, setRecord] = useState<StartupRecord | null>(null);
  const [tab, setTab] = useState<Tab>(isNewSubmission ? "trail" : "dossier");
  const [successDismissed, setSuccessDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState({
    dossier: null as string | null,
    review: null as string | null,
    roundUpdate: null as string | null,
    rereview: null as string | null,
  });

  const loadTxHashes = useCallback(() => {
    setTxHashes({
      dossier: getTx(startupId, "dossier"),
      review: getTx(startupId, "review"),
      roundUpdate: getTx(startupId, "roundUpdate"),
      rereview: getTx(startupId, "rereview"),
    });
  }, [startupId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStartup(startupId);
      setRecord(data);
      saveRecentStartup(startupId);
      if (data?.evaluation) setTab("memo");
      else if (!isNewSubmission) setTab("dossier");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load startup");
    } finally {
      setLoading(false);
    }
  }, [startupId]);

  useEffect(() => {
    load();
    loadTxHashes();
  }, [load, loadTxHashes]);

  // Poll while under review
  useEffect(() => {
    if (!record) return;
    const status = record.dossier.review_status;
    if (status !== "CONSENSUS_PENDING") return;

    const interval = setInterval(async () => {
      const data = await getStartup(startupId);
      if (data) {
        setRecord(data);
        if (data.dossier.review_status !== "CONSENSUS_PENDING") {
          clearInterval(interval);
          if (data.evaluation) setTab("memo");
        }
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [record?.dossier.review_status, startupId]);

  async function handleStartEvaluation() {
    setEvaluating(true);
    setError(null);
    try {
      const txHash = await startConsensusEvaluation(startupId);
      saveTx(startupId, "review", txHash);
      loadTxHashes();
      const data = await getStartup(startupId);
      if (data) setRecord(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed to start");
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-slate font-mono text-sm">
            <Loader2 size={14} className="animate-spin" />
            Loading startup from contract...
          </div>
        </div>
      </Shell>
    );
  }

  if (!record) {
    return (
      <Shell>
        <div className="p-6 space-y-4">
          <p className="text-sm text-risk font-mono">Startup not found: {startupId}</p>
          <Link href="/overview" className="text-xs text-gold font-mono hover:underline">
            ← Back to Overview
          </Link>
        </div>
      </Shell>
    );
  }

  const { dossier, evaluation, rereview_result } = record;
  const reviewStatus = dossier.review_status;

  return (
    <Shell>
      <div className="p-6 space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate">
          <Link href="/overview" className="hover:text-memo transition-colors">Overview</Link>
          <ChevronRight size={10} />
          <span className="text-memo">{dossier.startup_name}</span>
        </div>

        {/* Post-submission success banner */}
        {isNewSubmission && !successDismissed && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[rgba(86,243,154,0.06)] border border-[rgba(86,243,154,0.2)] rounded">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2 h-2 rounded-full bg-signal shrink-0" />
              <span className="text-sm text-signal font-body">Dossier submitted to GenLayer contract.</span>
              {submittedTx && (
                <a
                  href={`https://explorer-studio.genlayer.com/tx/${submittedTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono text-slate hover:text-gold transition-colors shrink-0"
                >
                  {submittedTx.slice(0, 8)}...{submittedTx.slice(-6)}
                  <ExternalLink size={9} />
                </a>
              )}
            </div>
            <button onClick={() => setSuccessDismissed(true)} className="text-slate hover:text-memo text-xs font-mono shrink-0">✕</button>
          </div>
        )}

        {/* Hero */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl font-heading font-bold text-memo">{dossier.startup_name}</h1>
              <p className="text-sm text-slate font-body">{dossier.one_liner}</p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Badge variant="navy" size="sm">{dossier.sector}</Badge>
                <Badge variant="navy" size="sm">{dossier.stage}</Badge>
                {dossier.founder_name && <span className="text-xs text-slate font-mono">{dossier.founder_name}</span>}
                {dossier.website && (
                  <a
                    href={dossier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-xs text-slate hover:text-gold font-mono transition-colors"
                  >
                    {dossier.website.replace(/^https?:\/\//, "")}
                    <ExternalLink size={9} />
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <RecommendationBadge rec={dossier.final_recommendation} />
              {evaluation && <RiskBadge level={evaluation.risk_level} />}
              <ReviewStatusBadge status={reviewStatus} />
            </div>
          </div>

          {/* Updated at */}
          {dossier.updated_at && (
            <div className="mt-3 text-xs text-slate font-mono">
              Last updated {formatDistanceToNow(new Date(dossier.updated_at), { addSuffix: true })}
            </div>
          )}
        </div>

        {/* Evaluation controls */}
        {reviewStatus === "NOT_STARTED" && (
          <div className="card p-5 flex items-center justify-between gap-4 border-[rgba(214,178,94,0.2)]">
            <div>
              <div className="text-sm font-body text-memo font-semibold">Ready for Consensus Evaluation</div>
              <div className="text-xs text-slate font-body mt-0.5">
                Start GenLayer validator evaluation to produce an investment memo.
              </div>
            </div>
            <button
              onClick={handleStartEvaluation}
              disabled={evaluating}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-obsidian text-xs font-mono font-semibold rounded hover:bg-[#C9A24D] transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {evaluating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              {evaluating ? "Starting..." : "Start Evaluation"}
            </button>
          </div>
        )}

        {reviewStatus === "CONSENSUS_PENDING" && (
          <div className="card p-5 border-[rgba(214,178,94,0.2)] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-gold blink" />
            <div>
              <div className="text-sm font-body text-gold">Consensus Evaluation in Progress</div>
              <div className="text-xs text-slate font-body mt-0.5">GenLayer validators are evaluating the dossier. Auto-refreshing every 8 seconds.</div>
            </div>
            <RefreshCw size={12} className="text-slate animate-spin ml-auto" />
          </div>
        )}

        {reviewStatus === "FAILED" && (
          <div className="card p-5 border-[rgba(255,92,92,0.2)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-risk" />
              <div className="text-sm text-risk font-body">Evaluation failed. You can retry.</div>
            </div>
            <button
              onClick={handleStartEvaluation}
              disabled={evaluating}
              className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,92,92,0.12)] text-risk border border-[rgba(255,92,92,0.25)] text-xs font-mono rounded hover:bg-[rgba(255,92,92,0.2)] transition-colors disabled:opacity-50"
            >
              {evaluating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Retry Evaluation
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-[rgba(255,92,92,0.08)] border border-[rgba(255,92,92,0.2)] rounded text-sm text-risk font-mono">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(({ id, label, icon }) => {
              const disabled = (id === "memo" || id === "scores") && !evaluation;
              return (
                <button
                  key={id}
                  onClick={() => !disabled && setTab(id)}
                  disabled={disabled}
                  className={clsx(
                    "flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono whitespace-nowrap border-b-2 transition-colors",
                    tab === id
                      ? "border-gold text-gold"
                      : disabled
                      ? "border-transparent text-[#2D3748] cursor-not-allowed"
                      : "border-transparent text-slate hover:text-memo"
                  )}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {tab === "dossier" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Funding Ask" value={dossier.funding_ask} />
                <InfoField label="Round Type" value={dossier.round_type} />
                <InfoField label="Founder Wallet" value={dossier.founder_wallet} mono />
                {dossier.created_at && <InfoField label="Created" value={new Date(dossier.created_at).toLocaleDateString()} />}
              </div>
              <InfoField label="Use of Funds" value={dossier.use_of_funds} multiline />
            </div>
          )}

          {tab === "diligence" && (
            <div className="space-y-4">
              <DiligenceSection title="Pitch Deck" content={dossier.pitch_deck_ref} />
              <DiligenceSection title="Metrics" content={dossier.metrics_summary} />
              <DiligenceSection title="Market" content={dossier.market_summary} />
              <DiligenceSection title="Roadmap" content={dossier.roadmap_summary} />
              <DiligenceSection title="Team / Founder" content={dossier.founder_name} />
              <DiligenceSection title="Competition" content={dossier.competitor_summary} />
              <DiligenceSection title="Risks" content={dossier.risk_disclosures} />
              <DiligenceSection title="Funding Ask" content={`${dossier.funding_ask} — ${dossier.round_type}`} />
            </div>
          )}

          {tab === "memo" && evaluation && (
            <div className="space-y-4">
              <InvestmentMemo evaluation={evaluation} />
              {rereview_result && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw size={12} className="text-gold" />
                    <span className="text-xs font-mono text-gold uppercase tracking-widest">Re-review Result</span>
                  </div>
                  <InvestmentMemo evaluation={rereview_result} isRereview />
                </div>
              )}
            </div>
          )}

          {tab === "scores" && evaluation && (
            <ScoreDashboard evaluation={evaluation} />
          )}

          {tab === "updates" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-heading font-semibold text-memo">Round Updates</h2>
                {evaluation && (
                  <Link
                    href={`/startups/${startupId}/rereview`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-gold bg-[rgba(214,178,94,0.1)] border border-[rgba(214,178,94,0.25)] rounded hover:bg-[rgba(214,178,94,0.18)] transition-colors"
                  >
                    <RotateCcw size={11} />
                    Submit Round Update
                  </Link>
                )}
              </div>
              {!dossier.latest_update_id ? (
                <div className="card p-6 text-center text-sm text-slate font-body">
                  No round updates submitted yet.
                  {!evaluation && (
                    <p className="text-xs mt-1 text-slate font-mono">Complete consensus evaluation first.</p>
                  )}
                </div>
              ) : (
                <div className="card p-5">
                  <div className="text-xs font-mono text-slate">Latest update: {dossier.latest_update_id}</div>
                  {rereview_result && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-xs font-mono text-signal">
                        <span>Re-review completed</span>
                        <Badge variant="signal" size="sm">{rereview_result.rereview_status}</Badge>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "trail" && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-xs font-mono text-slate uppercase tracking-widest">Transaction Trail</h2>
              </div>
              <div className="p-2">
                <Timeline record={record} txHashes={txHashes} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function InfoField({ label, value, mono, multiline }: { label: string; value: string; mono?: boolean; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div className="card p-4 space-y-1">
      <div className="text-[10px] font-mono text-slate uppercase tracking-widest">{label}</div>
      <div className={clsx("text-sm text-memo", mono ? "font-mono break-all" : "font-body", multiline && "leading-relaxed")}>
        {value}
      </div>
    </div>
  );
}
