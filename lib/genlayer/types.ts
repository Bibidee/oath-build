export type OathStatus =
  | "active"
  | "fulfilled"
  | "partial"
  | "missed"
  | "unverifiable"
  | "invalid_oath"
  | "not_due"
  | "excluded"
  | "needs_more_evidence";

export type EvidenceSide = "fulfilment" | "challenge" | "context" | "exclusion";

export type SourceAlignment = "strong" | "moderate" | "weak" | "conflicting" | "none";

export type WinningSide = "fulfilment" | "challenge" | "neutral";

export type AppealBasis =
  | "new_evidence"
  | "wrong_source_interpretation"
  | "deadline_misread"
  | "exclusion_misapplied"
  | "fake_or_misleading_evidence"
  | "promise_meaning_misread";

export interface Oath {
  oath_id: number;
  creator: string;
  title: string;
  promise: string;
  deadline_unix: number;
  success_criteria: string;
  required_deliverables: string;
  accepted_sources: string;
  exclusions: string;
  stakeholder_notes: string;
  category: string;
  created_at: number;
  status: OathStatus;
  settled: boolean;
  appeal_count: number;
}

export interface EvidencePacket {
  evidence_id: number;
  submitter: string;
  source_url: string;
  source_type: string;
  claim: string;
  side: EvidenceSide;
  submitted_at: number;
}

export interface VerdictReceipt {
  oath_id: number;
  status: OathStatus;
  confidence: number;
  source_alignment: SourceAlignment;
  winning_side: WinningSide;
  short_reason: string;
  canonical_json: string;
  resolved_at: number;
  resolver: string;
}

export interface AppealPacket {
  appeal_id: number;
  appellant: string;
  basis: AppealBasis;
  new_evidence_url: string;
  argument: string;
  submitted_at: number;
  resolved: boolean;
}

export interface OathSummary {
  oath_id: number;
  title: string;
  creator: string;
  deadline_unix: number;
  status: OathStatus;
  settled: boolean;
  category: string;
  evidence_count: number;
  appeal_count: number;
  verdict_status: string;
  verdict_confidence: number;
}

export interface CreateOathParams {
  title: string;
  promise: string;
  deadline_unix: number;
  success_criteria: string;
  required_deliverables: string;
  accepted_sources: string;
  exclusions: string;
  stakeholder_notes: string;
  category: string;
}

export interface SubmitEvidenceParams {
  oath_id: number;
  source_url: string;
  source_type: string;
  claim: string;
  side: EvidenceSide;
}

export interface SubmitAppealParams {
  oath_id: number;
  basis: AppealBasis;
  new_evidence_url: string;
  argument: string;
}
