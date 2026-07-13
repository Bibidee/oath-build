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

// The hosted Studio RPC enforces "max 20 gen_call/sim_call requests per 10s
// per contract address". Pages like the ledger/receipts fan out one read per
// oath in parallel, which blows straight past that limit as the oath count
// grows. This sliding-window limiter keeps this tab's own call rate under
// the server cap (with margin) instead of firing everything at once and
// hoping retries save it.
class SlidingWindowRateLimiter {
  private timestamps: number[] = [];
  constructor(private maxCalls: number, private windowMs: number) {}

  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
      if (this.timestamps.length < this.maxCalls) {
        this.timestamps.push(now);
        return;
      }
      const oldest = this.timestamps[0];
      await sleep(this.windowMs - (now - oldest) + 50);
    }
  }
}

const rpcRateLimiter = new SlidingWindowRateLimiter(8, 10_000);

// The Studio instance also enforces a global "8 execution slots" concurrency
// cap across ALL contracts/users, separate from the per-contract rate limit
// above. The rate limiter alone still lets many calls be in-flight at once;
// this semaphore caps how many of THIS tab's reads are actually outstanding
// at any moment, well under that shared ceiling.
class Semaphore {
  private available: number;
  private waiters: Array<() => void> = [];
  constructor(concurrency: number) {
    this.available = concurrency;
  }
  async acquire(): Promise<() => void> {
    if (this.available > 0) {
      this.available--;
      return () => this.release();
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.available--;
    return () => this.release();
  }
  private release() {
    this.available++;
    const next = this.waiters.shift();
    if (next) next();
  }
}

const rpcConcurrencyLimiter = new Semaphore(3);

// The hosted Studio RPC occasionally drops an individual read under
// concurrent load (many oaths fetched in parallel). Retrying a couple of
// times keeps a transient blip from silently vanishing a row in the UI.
async function readContract(functionName: string, args: unknown[]): Promise<unknown> {
  const client = getClient();
  const attempts = 4;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    await rpcRateLimiter.acquire();
    const release = await rpcConcurrencyLimiter.acquire();
    try {
      return await client.readContract({
        address: getContractAddress(),
        functionName,
        args,
      });
    } catch (err) {
      lastError = err;
      if (attempt < attempts - 1) await sleep(600 * (attempt + 1));
    } finally {
      release();
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
