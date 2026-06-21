export type DossierStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVIEW_READY"
  | "UNDER_REVIEW"
  | "MEMO_ISSUED"
  | "WATCHLISTED"
  | "PASSED"
  | "INVESTMENT_RECOMMENDED"
  | "MORE_DILIGENCE_REQUIRED"
  | "ARCHIVED";

export type ReviewStatus = "NOT_STARTED" | "CONSENSUS_PENDING" | "MEMO_READY" | "FAILED";

export type ReReviewStatus =
  | "NO_REVIEW_REQUEST"
  | "UPDATE_SUBMITTED"
  | "REREVIEW_PENDING"
  | "REREVIEW_READY"
  | "REREVIEW_REJECTED";

export type Recommendation =
  | "STRONG_INVEST"
  | "INVEST"
  | "WATCHLIST"
  | "MORE_DILIGENCE"
  | "PASS"
  | "HIGH_RISK_PASS"
  | "UNREVIEWED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

export type Confidence = "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";

export type ScoreBand = "WEAK" | "DEVELOPING" | "PROMISING" | "STRONG";

export interface StartupDossier {
  startup_id: string;
  startup_name: string;
  one_liner: string;
  sector: string;
  stage: string;
  founder_name: string;
  founder_wallet: string;
  website: string;
  pitch_deck_ref: string;
  pitch_deck_hash: string;
  metrics_summary: string;
  roadmap_summary: string;
  market_summary: string;
  competitor_summary: string;
  funding_ask: string;
  round_type: string;
  use_of_funds: string;
  risk_disclosures: string;
  dossier_status: DossierStatus;
  review_status: ReviewStatus;
  final_recommendation: Recommendation;
  created_at: string;
  updated_at: string;
  latest_update_id?: string;
}

export interface EvaluationResult {
  startup_id: string;
  market_score: number;
  founder_score: number;
  execution_score: number;
  traction_score: number;
  business_model_score: number;
  defensibility_score: number;
  investment_score: number;
  risk_level: RiskLevel;
  recommendation: Recommendation;
  confidence: Confidence;
  recommended_next_step: string;
  memo_summary: string;
  market_thesis: string;
  founder_assessment: string;
  execution_assessment: string;
  traction_assessment: string;
  risk_summary: string;
  red_flags: string;
  re_review_conditions: string;
  market_band: ScoreBand;
  founder_band: ScoreBand;
  execution_band: ScoreBand;
  traction_band: ScoreBand;
  investment_band: ScoreBand;
}

export interface RoundUpdate {
  update_id: string;
  startup_id: string;
  submitted_by: string;
  update_type: string;
  new_metrics: string;
  new_milestones: string;
  new_evidence_ref: string;
  founder_response: string;
  requested_review_reason: string;
  rereview_status: ReReviewStatus;
  rereview_result: string;
  submitted_at: string;
}

export interface ReReviewResult extends EvaluationResult {
  original_recommendation: Recommendation;
  rereview_status: ReReviewStatus;
  update_id: string;
  reviewed_at: string;
}

export interface StartupRecord {
  dossier: StartupDossier;
  evaluation: EvaluationResult | null;
  rereview_result: ReReviewResult | null;
}

export interface StartupSummary {
  startup_id: string;
  startup_name: string;
  sector: string;
  stage: string;
  dossier_status: DossierStatus;
  review_status: ReviewStatus;
  final_recommendation: Recommendation;
  updated_at: string;
  investment_score: number;
  risk_level: RiskLevel;
  has_evaluation: boolean;
  rereview_status: ReReviewStatus;
}

export interface OverviewStats {
  total: number;
  underReview: number;
  investmentRecommended: number;
  watchlisted: number;
  passed: number;
  rereviewRequests: number;
  averageScore: number;
  highRisk: number;
}
