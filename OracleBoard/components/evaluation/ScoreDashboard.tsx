import type { EvaluationResult } from "@/lib/genlayer/types";
import { ScoreBar, ScoreRing } from "@/components/ui/ScoreBar";
import { RiskBadge } from "@/components/ui/Badge";

interface ScoreDashboardProps {
  evaluation: EvaluationResult;
}

export function ScoreDashboard({ evaluation: ev }: ScoreDashboardProps) {
  const dimensions = [
    { label: "Market Quality", score: ev.market_score, band: ev.market_band },
    { label: "Founder Credibility", score: ev.founder_score, band: ev.founder_band },
    { label: "Execution Capability", score: ev.execution_score, band: ev.execution_band },
    { label: "Traction Quality", score: ev.traction_score, band: ev.traction_band },
    { label: "Business Model Strength", score: ev.business_model_score, band: ev.investment_band },
    { label: "Competitive Defensibility", score: ev.defensibility_score, band: ev.investment_band },
  ];

  return (
    <div className="space-y-6">
      {/* Investment Score Hero */}
      <div className="card p-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={ev.investment_score} band={ev.investment_band} size={80} />
          <div>
            <div className="text-xs font-mono text-slate uppercase tracking-widest mb-1">Investment Attractiveness</div>
            <div className="text-3xl font-heading font-bold text-memo">{ev.investment_score}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-mono text-slate">{ev.investment_band}</span>
              <span className="text-slate">·</span>
              <RiskBadge level={ev.risk_level} />
            </div>
          </div>
        </div>
      </div>

      {/* Score dimensions */}
      <div className="card p-6 space-y-5">
        <h3 className="text-xs font-mono text-slate uppercase tracking-widest">Score Dimensions</h3>
        {dimensions.map((dim) => (
          <ScoreBar
            key={dim.label}
            label={dim.label}
            score={dim.score}
            band={dim.band}
          />
        ))}
      </div>

      {/* Confidence */}
      <div className="card p-4 flex items-center justify-between">
        <span className="text-xs font-mono text-slate uppercase tracking-widest">Committee Confidence</span>
        <span className="text-sm font-mono text-memo">{ev.confidence}</span>
      </div>
    </div>
  );
}
