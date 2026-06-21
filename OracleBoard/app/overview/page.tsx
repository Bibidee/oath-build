"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { RecommendationBadge, RiskBadge, ReviewStatusBadge } from "@/components/ui/Badge";
import { listStartups } from "@/lib/oracleboard/contract";
import type { StartupSummary, OverviewStats } from "@/lib/genlayer/types";
import { RefreshCw, TrendingUp, Clock, Eye, AlertTriangle, BarChart3, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function computeStats(startups: StartupSummary[]): OverviewStats {
  const scored = startups.filter((s) => s.has_evaluation);
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((acc, s) => acc + s.investment_score, 0) / scored.length)
      : 0;

  return {
    total: startups.length,
    underReview: startups.filter((s) => s.review_status === "CONSENSUS_PENDING").length,
    investmentRecommended: startups.filter(
      (s) => s.final_recommendation === "INVEST" || s.final_recommendation === "STRONG_INVEST"
    ).length,
    watchlisted: startups.filter((s) => s.final_recommendation === "WATCHLIST").length,
    passed: startups.filter(
      (s) => s.final_recommendation === "PASS" || s.final_recommendation === "HIGH_RISK_PASS"
    ).length,
    rereviewRequests: startups.filter(
      (s) => s.rereview_status === "UPDATE_SUBMITTED" || s.rereview_status === "REREVIEW_PENDING"
    ).length,
    averageScore: avgScore,
    highRisk: startups.filter((s) => s.risk_level === "HIGH" || s.risk_level === "CRITICAL").length,
  };
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: "gold" | "signal" | "risk" | "default";
}

function StatCard({ label, value, icon, accent = "default" }: StatCardProps) {
  const accentColor = {
    gold: "text-gold",
    signal: "text-signal",
    risk: "text-risk",
    default: "text-memo",
  }[accent];

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate uppercase tracking-widest">{label}</span>
        <span className="text-slate">{icon}</span>
      </div>
      <div className={`text-2xl font-heading font-bold ${accentColor}`}>{value}</div>
    </div>
  );
}

export default function OverviewPage() {
  const router = useRouter();
  const [startups, setStartups] = useState<StartupSummary[]>([]);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStartups();
      setStartups(data);
      setStats(computeStats(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load startups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-heading font-semibold text-memo">Investment Pipeline</h1>
            <p className="text-sm text-slate mt-0.5 font-body">Live committee dashboard from GenLayer contract state.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate hover:text-memo border border-border hover:border-border-bright rounded transition-colors disabled:opacity-40"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/startups/new"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-gold bg-[rgba(214,178,94,0.1)] border border-[rgba(214,178,94,0.25)] rounded hover:bg-[rgba(214,178,94,0.18)] transition-colors"
            >
              <Plus size={11} />
              Submit Dossier
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[rgba(255,92,92,0.08)] border border-[rgba(255,92,92,0.2)] rounded text-sm text-risk font-mono">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Startups" value={stats.total} icon={<BarChart3 size={13} />} />
            <StatCard label="Under Review" value={stats.underReview} icon={<Clock size={13} />} accent="gold" />
            <StatCard label="Investment Rec." value={stats.investmentRecommended} icon={<TrendingUp size={13} />} accent="signal" />
            <StatCard label="Watchlisted" value={stats.watchlisted} icon={<Eye size={13} />} accent="gold" />
            <StatCard label="Passed" value={stats.passed} icon={<AlertTriangle size={13} />} />
            <StatCard label="Re-review Requests" value={stats.rereviewRequests} icon={<RefreshCw size={13} />} accent="gold" />
            <StatCard label="Avg. Score" value={stats.averageScore || "—"} icon={<BarChart3 size={13} />} />
            <StatCard label="High Risk Deals" value={stats.highRisk} icon={<AlertTriangle size={13} />} accent="risk" />
          </div>
        )}

        {/* Pipeline Table */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-mono text-slate uppercase tracking-widest">Live Pipeline</h2>
            <span className="text-xs font-mono text-slate">{startups.length} startups</span>
          </div>

          {loading && (
            <div className="p-8 text-center text-sm text-slate font-mono">
              Loading pipeline from contract...
            </div>
          )}

          {!loading && startups.length === 0 && (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-slate font-body">No startups submitted yet.</p>
              <Link
                href="/startups/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-gold bg-[rgba(214,178,94,0.1)] border border-[rgba(214,178,94,0.25)] rounded hover:bg-[rgba(214,178,94,0.18)] transition-colors"
              >
                <Plus size={11} />
                Submit First Dossier
              </Link>
            </div>
          )}

          {!loading && startups.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Startup", "Sector", "Stage", "Status", "Recommendation", "Score", "Risk", "Updated"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-mono text-slate uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {startups.map((s) => (
                    <tr
                      key={s.startup_id}
                      onClick={() => router.push(`/startups/${s.startup_id}`)}
                      className="border-b border-border last:border-0 hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/startups/${s.startup_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-memo font-body hover:text-gold transition-colors"
                        >
                          {s.startup_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate font-body">{s.sector}</td>
                      <td className="px-4 py-3 text-slate font-mono text-xs">{s.stage}</td>
                      <td className="px-4 py-3"><ReviewStatusBadge status={s.review_status} /></td>
                      <td className="px-4 py-3"><RecommendationBadge rec={s.final_recommendation} /></td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-memo">
                          {s.has_evaluation ? s.investment_score : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3"><RiskBadge level={s.risk_level} /></td>
                      <td className="px-4 py-3 text-xs text-slate font-mono whitespace-nowrap">
                        {s.updated_at
                          ? formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
