import { clsx } from "clsx";
import type { Recommendation, RiskLevel, ReviewStatus, ReReviewStatus } from "@/lib/genlayer/types";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "signal" | "risk" | "slate" | "navy" | "outline";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "slate", size = "sm", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-mono font-medium tracking-wide uppercase",
        size === "sm" ? "text-[10px] px-2 py-0.5 rounded" : "text-xs px-3 py-1 rounded-md",
        variant === "gold" && "bg-[rgba(214,178,94,0.15)] text-gold border border-[rgba(214,178,94,0.3)]",
        variant === "signal" && "bg-[rgba(86,243,154,0.12)] text-signal border border-[rgba(86,243,154,0.25)]",
        variant === "risk" && "bg-[rgba(255,92,92,0.12)] text-risk border border-[rgba(255,92,92,0.25)]",
        variant === "slate" && "bg-[rgba(139,147,167,0.12)] text-slate border border-[rgba(139,147,167,0.2)]",
        variant === "navy" && "bg-navy text-slate border border-border",
        variant === "outline" && "bg-transparent text-memo border border-border-bright",
        className
      )}
    >
      {children}
    </span>
  );
}

export function RecommendationBadge({ rec }: { rec: Recommendation }) {
  const config: Record<Recommendation, { label: string; variant: BadgeProps["variant"] }> = {
    STRONG_INVEST: { label: "Strong Invest", variant: "signal" },
    INVEST: { label: "Invest", variant: "signal" },
    WATCHLIST: { label: "Watchlist", variant: "gold" },
    MORE_DILIGENCE: { label: "More Diligence", variant: "gold" },
    PASS: { label: "Pass", variant: "slate" },
    HIGH_RISK_PASS: { label: "High Risk Pass", variant: "risk" },
    UNREVIEWED: { label: "Unreviewed", variant: "navy" },
  };
  const { label, variant } = config[rec] ?? { label: rec, variant: "slate" as const };
  return <Badge variant={variant} size="md">{label}</Badge>;
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const config: Record<RiskLevel, { label: string; variant: BadgeProps["variant"] }> = {
    LOW: { label: "Low Risk", variant: "signal" },
    MEDIUM: { label: "Medium Risk", variant: "gold" },
    HIGH: { label: "High Risk", variant: "risk" },
    CRITICAL: { label: "Critical Risk", variant: "risk" },
    UNKNOWN: { label: "Unknown", variant: "slate" },
  };
  const { label, variant } = config[level] ?? { label: level, variant: "slate" as const };
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const config: Record<ReviewStatus, { label: string; variant: BadgeProps["variant"] }> = {
    NOT_STARTED: { label: "Not Started", variant: "slate" },
    CONSENSUS_PENDING: { label: "Under Review", variant: "gold" },
    MEMO_READY: { label: "Memo Ready", variant: "signal" },
    FAILED: { label: "Failed", variant: "risk" },
  };
  const { label, variant } = config[status] ?? { label: status, variant: "slate" as const };
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

export function ReReviewStatusBadge({ status }: { status: ReReviewStatus }) {
  const config: Record<ReReviewStatus, { label: string; variant: BadgeProps["variant"] }> = {
    NO_REVIEW_REQUEST: { label: "No Re-review", variant: "slate" },
    UPDATE_SUBMITTED: { label: "Update Submitted", variant: "gold" },
    REREVIEW_PENDING: { label: "Re-review Pending", variant: "gold" },
    REREVIEW_READY: { label: "Re-reviewed", variant: "signal" },
    REREVIEW_REJECTED: { label: "Re-review Failed", variant: "risk" },
  };
  const { label, variant } = config[status] ?? { label: status, variant: "slate" as const };
  return <Badge variant={variant} size="sm">{label}</Badge>;
}
