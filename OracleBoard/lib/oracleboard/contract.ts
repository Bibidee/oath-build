"use client";

import { getClient } from "@/lib/genlayer/client";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import type { StartupRecord, StartupSummary } from "@/lib/genlayer/types";

function contractAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!addr) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS not set");
  return addr as `0x${string}`;
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function createStartupDossier(params: {
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
}): Promise<`0x${string}`> {
  const client = getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txHash = await (client as any).writeContract({
    address: contractAddress(),
    functionName: "create_startup_dossier",
    args: [
      params.startup_id,
      params.startup_name,
      params.one_liner,
      params.sector,
      params.stage,
      params.founder_name,
      params.founder_wallet,
      params.website,
      params.pitch_deck_ref,
      params.pitch_deck_hash,
      params.metrics_summary,
      params.roadmap_summary,
      params.market_summary,
      params.competitor_summary,
      params.funding_ask,
      params.round_type,
      params.use_of_funds,
      params.risk_disclosures,
    ],
  });
  await waitForTxFinality(txHash);
  return txHash;
}

export async function getStartup(startupId: string): Promise<StartupRecord | null> {
  const client = getClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await (client as any).readContract({
      address: contractAddress(),
      functionName: "get_startup",
      args: [startupId],
    });
    const result = safeJson<{ dossier?: unknown; evaluation?: unknown; rereview_result?: unknown; error?: string }>(
      typeof raw === "string" ? raw : JSON.stringify(raw),
      {}
    );
    if (result.error === "not_found") return null;
    return result as StartupRecord;
  } catch {
    return null;
  }
}

export async function listStartups(): Promise<StartupSummary[]> {
  const client = getClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await (client as any).readContract({
      address: contractAddress(),
      functionName: "list_startups",
      args: [],
    });
    return safeJson<StartupSummary[]>(
      typeof raw === "string" ? raw : JSON.stringify(raw),
      []
    );
  } catch {
    return [];
  }
}

export async function startConsensusEvaluation(startupId: string): Promise<`0x${string}`> {
  const client = getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txHash = await (client as any).writeContract({
    address: contractAddress(),
    functionName: "start_consensus_evaluation",
    args: [startupId],
  });
  await waitForTxFinality(txHash);
  return txHash;
}

export async function submitRoundUpdate(params: {
  startup_id: string;
  update_id: string;
  submitted_by: string;
  update_type: string;
  new_metrics: string;
  new_milestones: string;
  new_evidence_ref: string;
  founder_response: string;
  requested_review_reason: string;
}): Promise<`0x${string}`> {
  const client = getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txHash = await (client as any).writeContract({
    address: contractAddress(),
    functionName: "submit_round_update",
    args: [
      params.startup_id,
      params.update_id,
      params.submitted_by,
      params.update_type,
      params.new_metrics,
      params.new_milestones,
      params.new_evidence_ref,
      params.founder_response,
      params.requested_review_reason,
    ],
  });
  await waitForTxFinality(txHash);
  return txHash;
}

export async function startRereview(startupId: string, updateId: string): Promise<`0x${string}`> {
  const client = getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txHash = await (client as any).writeContract({
    address: contractAddress(),
    functionName: "start_rereview",
    args: [startupId, updateId],
  });
  await waitForTxFinality(txHash);
  return txHash;
}
