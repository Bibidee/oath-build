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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The hosted Studio RPC occasionally drops an individual read under
// concurrent load (many oaths fetched in parallel). Retrying a couple of
// times keeps a transient blip from silently vanishing a row in the UI.
async function readContract(functionName: string, args: unknown[]): Promise<unknown> {
  const client = getClient();
  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await client.readContract({
        address: getContractAddress(),
        functionName,
        args,
      });
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) await sleep(400 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function getOath(oath_id: number): Promise<Oath> {
  return (await readContract("get_oath", [oath_id])) as Oath;
}

export async function getOathCount(): Promise<number> {
  return (await readContract("get_oath_count", [])) as number;
}

export async function getEvidence(oath_id: number): Promise<EvidencePacket[]> {
  return ((await readContract("get_evidence", [oath_id])) as EvidencePacket[]) || [];
}

export async function getVerdict(oath_id: number): Promise<VerdictReceipt | null> {
  const v = (await readContract("get_verdict", [oath_id])) as Record<string, unknown>;
  if (!v || Object.keys(v).length === 0) return null;
  return v as unknown as VerdictReceipt;
}

export async function getAppeals(oath_id: number): Promise<AppealPacket[]> {
  return ((await readContract("get_appeals", [oath_id])) as AppealPacket[]) || [];
}

export async function getUserOaths(address: string): Promise<number[]> {
  return ((await readContract("get_user_oaths", [address])) as number[]) || [];
}

export async function getOathSummary(oath_id: number): Promise<OathSummary> {
  return (await readContract("get_oath_summary", [oath_id])) as OathSummary;
}

export async function getAllOathSummaries(): Promise<OathSummary[]> {
  const count = await getOathCount();
  if (count === 0) return [];
  const results = await Promise.all(
    Array.from({ length: count }, (_, i) => getOathSummary(i))
  );
  return results;
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
