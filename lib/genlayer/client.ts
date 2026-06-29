import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type {
  Oath,
  EvidencePacket,
  VerdictReceipt,
  AppealPacket,
  OathSummary,
  CreateOathParams,
  SubmitEvidenceParams,
  SubmitAppealParams,
} from "./types";

const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

function getChain() {
  return studionet;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClient(): any {
  if (!_client) {
    _client = createClient({
      chain: getChain(),
      endpoint: RPC_URL,
    });
  }
  return _client;
}

export function getContractAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;
  if (!addr) throw new Error("NEXT_PUBLIC_OATH_CONTRACT_ADDRESS not set");
  return addr as `0x${string}`;
}

// ------------------------------------------------------------------ //
//  READ METHODS                                                       //
// ------------------------------------------------------------------ //

export async function getOath(oath_id: number): Promise<Oath> {
  const client = getClient();
  const result = await client.readContract({
    address: getContractAddress(),
    functionName: "get_oath",
    args: [oath_id],
  });
  return result as Oath;
}

export async function getOathCount(): Promise<number> {
  const client = getClient();
  const result = await client.readContract({
    address: getContractAddress(),
    functionName: "get_oath_count",
    args: [],
  });
  return result as number;
}

export async function getEvidence(oath_id: number): Promise<EvidencePacket[]> {
  const client = getClient();
  const result = await client.readContract({
    address: getContractAddress(),
    functionName: "get_evidence",
    args: [oath_id],
  });
  return (result as EvidencePacket[]) || [];
}

export async function getVerdict(oath_id: number): Promise<VerdictReceipt | null> {
  const client = getClient();
  const result = await client.readContract({
    address: getContractAddress(),
    functionName: "get_verdict",
    args: [oath_id],
  });
  const v = result as Record<string, unknown>;
  if (!v || Object.keys(v).length === 0) return null;
  return v as unknown as VerdictReceipt;
}

export async function getAppeals(oath_id: number): Promise<AppealPacket[]> {
  const client = getClient();
  const result = await client.readContract({
    address: getContractAddress(),
    functionName: "get_appeals",
    args: [oath_id],
  });
  return (result as AppealPacket[]) || [];
}

export async function getUserOaths(address: string): Promise<number[]> {
  const client = getClient();
  const result = await client.readContract({
    address: getContractAddress(),
    functionName: "get_user_oaths",
    args: [address],
  });
  return (result as number[]) || [];
}

export async function getOathSummary(oath_id: number): Promise<OathSummary> {
  const client = getClient();
  const result = await client.readContract({
    address: getContractAddress(),
    functionName: "get_oath_summary",
    args: [oath_id],
  });
  return result as OathSummary;
}

export async function getAllOathSummaries(): Promise<OathSummary[]> {
  const count = await getOathCount();
  if (count === 0) return [];
  const promises = Array.from({ length: count }, (_, i) => getOathSummary(i));
  const results = await Promise.allSettled(promises);
  return results
    .filter((r): r is PromiseFulfilledResult<OathSummary> => r.status === "fulfilled")
    .map((r) => r.value);
}

// ------------------------------------------------------------------ //
//  WRITE METHODS (provider-based signing)                             //
// ------------------------------------------------------------------ //

async function getSigningClient(account: `0x${string}`) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet detected");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient({
    chain: getChain(),
    endpoint: RPC_URL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider: window.ethereum as any,
    account,
  } as Parameters<typeof createClient>[0]);
}

export async function createOath(
  params: CreateOathParams,
  account: `0x${string}`
): Promise<`0x${string}`> {
  const client = await getSigningClient(account);
  const hash = await client.writeContract({
    address: getContractAddress(),
    functionName: "create_oath",
    args: [
      params.title,
      params.promise,
      params.deadline_unix,
      params.success_criteria,
      params.required_deliverables,
      params.accepted_sources,
      params.exclusions,
      params.stakeholder_notes,
      params.category,
    ],
    value: BigInt(0),
  });
  return hash as `0x${string}`;
}

export async function submitEvidence(
  params: SubmitEvidenceParams,
  account: `0x${string}`
): Promise<`0x${string}`> {
  const client = await getSigningClient(account);
  const hash = await client.writeContract({
    address: getContractAddress(),
    functionName: "submit_evidence",
    args: [params.oath_id, params.source_url, params.source_type, params.claim, params.side],
    value: BigInt(0),
  });
  return hash as `0x${string}`;
}

export async function requestVerdict(
  oath_id: number,
  account: `0x${string}`
): Promise<`0x${string}`> {
  const client = await getSigningClient(account);
  const hash = await client.writeContract({
    address: getContractAddress(),
    functionName: "request_verdict",
    args: [oath_id],
    value: BigInt(0),
  });
  return hash as `0x${string}`;
}

export async function submitAppeal(
  params: SubmitAppealParams,
  account: `0x${string}`
): Promise<`0x${string}`> {
  const client = await getSigningClient(account);
  const hash = await client.writeContract({
    address: getContractAddress(),
    functionName: "submit_appeal",
    args: [params.oath_id, params.basis, params.new_evidence_url, params.argument],
    value: BigInt(0),
  });
  return hash as `0x${string}`;
}

export async function requestAppealVerdict(
  oath_id: number,
  appeal_id: number,
  account: `0x${string}`
): Promise<`0x${string}`> {
  const client = await getSigningClient(account);
  const hash = await client.writeContract({
    address: getContractAddress(),
    functionName: "request_appeal_verdict",
    args: [oath_id, appeal_id],
    value: BigInt(0),
  });
  return hash as `0x${string}`;
}

export function getExplorerTxUrl(hash: string): string {
  const base =
    process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ||
    "https://explorer-studio.genlayer.com";
  return `${base}/tx/${hash}`;
}

export function getExplorerContractUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_GENLAYER_EXPLORER_URL ||
    "https://explorer-studio.genlayer.com";
  try {
    return `${base}/address/${getContractAddress()}`;
  } catch {
    return base;
  }
}
