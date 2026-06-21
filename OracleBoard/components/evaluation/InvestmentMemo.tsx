import type { EvaluationResult } from "@/lib/genlayer/types";
import { RecommendationBadge, RiskBadge, Badge } from "@/components/ui/Badge";
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Target } from "lucide-react";

interface InvestmentMemoProps {
  evaluation: EvaluationResult;
  isRereview?: boolean;
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        {icon && <span className="text-slate">{icon}</span>}
        <h3 className="text-xs font-mono text-slate uppercase tracking-widest">{title}</h3>
      </div>
      <div className="text-sm text-memo leading-relaxed font-body">{children}</div>
    </div>
  );
}

export function InvestmentMemo({ evaluation, isRereview = false }: InvestmentMemoProps) {
  const rec = evaluation.recommendation;
  const isPositive = rec === "INVEST" || rec === "STRONG_INVEST";
  const isNegative = rec === "PASS" || rec === "HIGH_RISK_PASS";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {isRereview && (
              <div className="flex items-center gap-1.5 mb-2">
                <RefreshCw size={11} className="text-gold" />
                <span className="text-[10px] font-mono text-gold uppercase tracking-widest">Re-review Memo</span>
              </div>
            )}
            <h2 className="font-heading font-semibold text-memo text-lg">Committee Recommendation</h2>
            <p className="text-sm text-slate font-body">
              Confidence: <span className="text-memo font-mono">{evaluation.confidence}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <RecommendationBadge rec={rec} />
            <RiskBadge level={evaluation.risk_level} />
          </div>
        </div>

        {evaluation.memo_summary && (
          <div className="mt-4 p-4 bg-navy rounded border-l-2 border-gold">
            <p className="text-sm text-memo leading-relaxed font-body">{evaluation.memo_summary}</p>
          </div>
        )}
      </div>

      {/* Why Invest / Why Pass */}
      {(isPositive || isNegative) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isPositive && (
            <div className="card p-4 border-[rgba(86,243,154,0.2)]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-signal" />
                <span className="text-xs font-mono text-signal uppercase tracking-widest">Why Invest</span>
              </div>
              <p className="text-sm text-memo font-body leading-relaxed">
                {evaluation.traction_assessment || "Committee sees credible traction and fundable opportunity at this stage."}
              </p>
            </div>
          )}
          {isNegative && (
            <div className="card p-4 border-[rgba(255,92,92,0.2)]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={14} className="text-risk" />
                <span className="text-xs font-mono text-risk uppercase tracking-widest">Why Pass</span>
              </div>
              <p className="text-sm text-memo font-body leading-relaxed">
                {evaluation.risk_summary || "Committee does not see sufficient evidence to support a commitment at this stage."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main sections */}
      <div className="card p-6 space-y-6">
        {evaluation.market_thesis && (
          <Section title="Market Thesis" icon={<Target size={13} />}>
            {evaluation.market_thesis}
          </Section>
        )}
        {evaluation.founder_assessment && (
          <Section title="Founder Assessment">
            {evaluation.founder_assessment}
          </Section>
        )}
        {evaluation.execution_assessment && (
          <Section title="Execution Assessment">
            {evaluation.execution_assessment}
          </Section>
        )}
        {evaluation.traction_assessment && (
          <Section title="Traction Assessment">
            {evaluation.traction_assessment}
          </Section>
        )}
      </div>

      {/* Risk & Red Flags */}
      {(evaluation.risk_summary || evaluation.red_flags) && (
        <div className="card p-6 space-y-4 border-[rgba(255,92,92,0.15)]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-risk" />
            <h3 className="text-xs font-mono text-risk uppercase tracking-widest">Risk Summary & Red Flags</h3>
          </div>
          {evaluation.risk_summary && (
            <div>
              <p className="text-xs font-mono text-slate mb-1 uppercase tracking-wide">Risks</p>
              <p className="text-sm text-memo font-body leading-relaxed">{evaluation.risk_summary}</p>
            </div>
          )}
          {evaluation.red_flags && (
            <div>
              <p className="text-xs font-mono text-slate mb-1 uppercase tracking-wide">Red Flags</p>
              <p className="text-sm text-risk font-body leading-relaxed">{evaluation.red_flags}</p>
            </div>
          )}
        </div>
      )}

      {/* Recommended Next Step */}
      {(evaluation.recommended_next_step || evaluation.re_review_conditions) && (
        <div className="card p-6 space-y-4">
          <h3 className="text-xs font-mono text-slate uppercase tracking-widest">Committee Action</h3>
          {evaluation.recommended_next_step && (
            <div className="flex items-center gap-2">
              <Badge variant="gold" size="md">{evaluation.recommended_next_step.replace(/_/g, " ")}</Badge>
            </div>
          )}
          {evaluation.re_review_conditions && (
            <div>
              <p className="text-xs font-mono text-slate mb-1 uppercase tracking-wide">Re-review Conditions</p>
              <p className="text-sm text-memo font-body leading-relaxed">{evaluation.re_review_conditions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
