// Verifies the July 17 review fixes against the freshly deployed contract,
// using real (non-placeholder) data, strictly sequentially: every write
// waits for FINALIZED before the next one fires. Every settled oath also
// gets a real appeal, deliberately designed so a correct answer REQUIRES
// the appeal to actually see the original oath terms and re-fetched
// original evidence, not just the prior verdict's compact summary.
//
// Run: node scripts/verify-round3-fix.mjs

import { createClient, createAccount, chains } from "genlayer-js";
import fs from "fs";

const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS || "0x7fD41106Eb637fFa3A6F621Da897c20cae9ACAd2";

const accountsData = JSON.parse(fs.readFileSync("scripts/.review-round3-accounts.json", "utf8"));
const byLabel = Object.fromEntries(accountsData.map((a) => [a.label, createAccount(a.privateKey)]));

function clientFor(label) {
  return createClient({ chain: chains.studionet, endpoint: RPC_URL, account: byLabel[label] });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function write(label, functionName, args) {
  const client = clientFor(label);
  const txHash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName, args, value: 0n });
  console.log(`   tx ${txHash} submitted, waiting for FINALIZED...`);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: "FINALIZED", interval: 5000, retries: 60 });
  const execResult = receipt?.consensus_data?.leader_receipt?.[0]?.execution_result;
  const resultName = receipt?.result_name;
  const consensusReached = resultName ? resultName.startsWith("MAJORITY_AGREE") || resultName === "AGREE" : true;
  console.log(`   -> leader=${execResult ?? "UNKNOWN"} consensus=${resultName ?? "UNKNOWN"}`);
  if (execResult !== "SUCCESS" || !consensusReached) {
    console.log("   genvm_result:", JSON.stringify(receipt?.consensus_data?.leader_receipt?.[0]?.genvm_result, null, 2));
  }
  return { txHash, execResult, resultName, ok: execResult === "SUCCESS" && consensusReached };
}

async function writeWithConsensusRetry(label, functionName, args, maxAttempts = 3) {
  let last;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await write(label, functionName, args);
    if (last.ok) return last;
    console.log(`   consensus not reached (${last.resultName}) on attempt ${attempt}/${maxAttempts}, retrying...`);
  }
  return last;
}

async function read(functionName, args = []) {
  const client = clientFor("resolver");
  const attempts = 5;
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await client.readContract({ address: CONTRACT_ADDRESS, functionName, args });
    } catch (err) {
      lastError = err;
      console.log(`   read ${functionName} failed (attempt ${i + 1}/${attempts}), retrying...`);
      await sleep(3000 * (i + 1));
    }
  }
  throw lastError;
}

const CASES = [
  {
    name: "1. Fulfilled + appeal upheld (baseline real data)",
    oath: [
      "Bitcoin.org Peer-to-Peer Description (Round 3)",
      "bitcoin.org will describe Bitcoin using peer-to-peer or decentralized terminology consistent with its original design goals.",
      1230940800,
      "The fetched page content must reference peer-to-peer, decentralized, or trustless properties of the network.",
      "Live description referencing the P2P design",
      "bitcoin.org",
      "None.",
      "Round 3 review fix verification - baseline fulfilled case.",
      "History",
    ],
    evidence: [["https://bitcoin.org/en/", "official_project_site", "bitcoin.org describes Bitcoin's peer-to-peer, decentralized electronic cash design.", "fulfilment"]],
    appealBasis: "new_evidence",
    appealUrl: "https://bitcoin.org/en/",
    appealArgument: "Requesting a second review to confirm the appeal path independently re-fetches and re-judges bitcoin.org's peer-to-peer description rather than deferring to the prior verdict summary.",
  },
  {
    name: "2. Missed + appeal upheld (real data)",
    oath: [
      "Example.com Hosts a Login Portal (Round 3)",
      "The example.com homepage will present a working username/password login form before the deadline.",
      1230940800,
      "The fetched page must show an actual login form with username and password fields.",
      "A live login form on the homepage",
      "example.com",
      "None.",
      "Round 3 review fix verification - missed case.",
      "History",
    ],
    evidence: [["https://example.com", "reference_page", "Checking whether example.com has a login form as promised.", "fulfilment"]],
    appealBasis: "wrong_source_interpretation",
    appealUrl: "",
    appealArgument: "Requesting review of the original evidence again - the appeal must re-examine the original fetched page content, not just accept the prior verdict's short summary of it.",
  },
  {
    name: "3. Excluded + appeal upheld (real data, exclusion clause)",
    oath: [
      "Example.com Is a Production Product Site (Round 3)",
      "The example.com domain will be operating as a real production product website before the deadline.",
      1230940800,
      "The fetched page must show a real product, service, or company, not a placeholder/documentation domain.",
      "A live production product site",
      "example.com",
      "Any domain whose own content identifies itself as reserved for documentation/illustrative examples is excluded from being judged as a production product site.",
      "Round 3 review fix verification - excluded case, tests that the exclusion clause is re-read from the original oath terms during appeal.",
      "History",
    ],
    evidence: [["https://example.com", "reference_page", "example.com self-identifies as a domain reserved for documentation examples, matching the stated exclusion.", "exclusion"]],
    appealBasis: "exclusion_misapplied",
    appealUrl: "",
    appealArgument: "The appellant argues the exclusion clause was misapplied. Correctly resolving this requires the appeal to re-read the ORIGINAL oath's exclusions field verbatim, not a paraphrase from the prior verdict.",
  },
  {
    name: "4. Invalid oath + appeal upheld (real data)",
    oath: [
      "Vague Success Oath (Round 3)",
      "Things will generally go well and the outcome will be good, in some reasonable sense, eventually.",
      1230940800,
      "Success is whatever seems fine, judged however feels right at the time.",
      "n/a",
      "example.com",
      "None.",
      "Round 3 review fix verification - invalid_oath case.",
      "History",
    ],
    evidence: [["https://example.com", "reference_page", "Generic placeholder evidence for an unjudgeable oath.", "context"]],
    appealBasis: "promise_meaning_misread",
    appealUrl: "",
    appealArgument: "Appellant argues the promise's meaning was misread. Resolving this correctly requires re-reading the ORIGINAL promise and success_criteria text directly from the oath, not the verdict's short_reason.",
  },
  {
    name: "5. Not due (deterministic, no LLM call, no appeal possible)",
    oath: [
      "Future Deliverable Not Yet Due (Round 3)",
      "The team will ship a public v2 dashboard before the stated future deadline, with full analytics support.",
      Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      "A public dashboard URL must be live before the deadline with analytics visible.",
      "Public dashboard URL",
      "github.com",
      "None.",
      "Round 3 review fix verification - deterministic not_due gating still works.",
      "Product Launch",
    ],
    evidence: [["https://github.com", "product_page", "The team's GitHub repo tracks dashboard development progress.", "context"]],
    appealBasis: null, // not settled, cannot appeal
  },
  {
    name: "6. Multi-evidence oath: appeal must see ALL original evidence items",
    oath: [
      "Cross-Source Project History (Round 3)",
      "Across example.com and GitHub, the combined public record will support a coherent account of the project's public presence.",
      1230940800,
      "Both example.com and github.com must be reachable and each must contribute relevant, on-topic content.",
      "Coherent account from both sources",
      "example.com, github.com",
      "None.",
      "Round 3 review fix verification - proves multiple original evidence items are all re-fetched during appeal, not just the first.",
      "History",
    ],
    evidence: [
      ["https://example.com", "reference_page", "example.com contributes as a baseline reference/documentation example domain.", "context"],
      ["https://github.com", "platform_homepage", "github.com contributes as a live open source hosting platform.", "context"],
    ],
    appealBasis: "wrong_source_interpretation",
    appealUrl: "",
    appealArgument: "Requesting the appeal re-examine BOTH original evidence items (example.com and github.com), not just the first one, to confirm the fix correctly iterates the full original evidence list.",
  },
];

async function runCase(c) {
  console.log(`\n=== ${c.name} ===`);
  const countBefore = await read("get_oath_count");
  const id = Number(countBefore);
  console.log(`   creating oath id ${id}`);

  const create = await write("creator", "create_oath", c.oath);
  if (!create.ok) return { name: c.name, id, error: "create_oath failed" };

  for (const ev of c.evidence) {
    const evRes = await write("creator", "submit_evidence", [id, ...ev]);
    if (!evRes.ok) return { name: c.name, id, error: "submit_evidence failed" };
  }

  const verdictRes = await writeWithConsensusRetry("resolver", "request_verdict", [id]);
  if (!verdictRes.ok) return { name: c.name, id, error: `request_verdict did not reach consensus (${verdictRes.resultName})` };

  const oathAfterVerdict = await read("get_oath", [id]);
  const verdict = await read("get_verdict", [id]);
  console.log(`   VERDICT: oath ${id} -> status=${oathAfterVerdict.status} settled=${oathAfterVerdict.settled}`);
  console.log(`   reason: ${verdict.short_reason}`);

  const result = {
    name: c.name,
    id,
    status: oathAfterVerdict.status,
    settled: oathAfterVerdict.settled,
    reason: verdict.short_reason,
    appeal: null,
  };

  if (!oathAfterVerdict.settled || !c.appealBasis) {
    return result;
  }

  const appealRes = await write("appellant", "submit_appeal", [id, c.appealBasis, c.appealUrl, c.appealArgument]);
  if (!appealRes.ok) {
    result.appeal = { error: "submit_appeal failed" };
    return result;
  }

  const appealsBefore = await read("get_appeals", [id]);
  const appealId = appealsBefore.length - 1;

  const appealVerdictRes = await writeWithConsensusRetry("resolver", "request_appeal_verdict", [id, appealId]);
  if (!appealVerdictRes.ok) {
    result.appeal = { error: `request_appeal_verdict did not reach consensus (${appealVerdictRes.resultName})` };
    return result;
  }

  const oathAfterAppeal = await read("get_oath", [id]);
  const verdictAfterAppeal = await read("get_verdict", [id]);
  console.log(`   APPEAL: oath ${id} appeal ${appealId} (basis=${c.appealBasis}) -> final status=${oathAfterAppeal.status}`);
  console.log(`   appeal reason: ${verdictAfterAppeal.short_reason}`);

  result.appeal = {
    appeal_id: appealId,
    basis: c.appealBasis,
    changed: verdictAfterAppeal.status !== verdict.status,
    final_status: oathAfterAppeal.status,
    reason: verdictAfterAppeal.short_reason,
  };

  return result;
}

async function main() {
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Accounts:", accountsData.map((a) => `${a.label}=${a.address}`).join(", "));

  const results = [];
  for (const c of CASES) {
    const r = await runCase(c);
    results.push(r);
  }

  console.log("\n\n=== FINAL SUMMARY ===");
  for (const r of results) {
    const appealNote = r.appeal
      ? r.appeal.error
        ? ` | appeal: ${r.appeal.error}`
        : ` | appeal ${r.appeal.appeal_id} (${r.appeal.basis}): changed=${r.appeal.changed} final=${r.appeal.final_status}`
      : "";
    console.log(`${r.name}: oath ${r.id} -> ${r.error ?? r.status} (settled=${r.settled ?? "n/a"})${appealNote}`);
  }
}

main().catch((err) => {
  console.error("Verification run failed:", err);
  process.exit(1);
});
