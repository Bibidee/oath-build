// Runs 5 real oaths through the deployed contract, each crafted to exercise
// a different verdict outcome (fulfilled, missed, excluded, invalid_oath,
// partial/needs_more_evidence). Uses the persistent accounts in
// scripts/.test-accounts.json (never committed - see .gitignore) instead of
// throwaway ones, so results are reproducible and the accounts stay usable.
//
// Run: node scripts/run-verdict-tests.mjs

import { createClient, createAccount, chains } from "genlayer-js";
import fs from "fs";

const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS || "0x87d7DcE1E3932a2b6c57278802A14e00a2fA20E4";

const testAccounts = JSON.parse(fs.readFileSync("scripts/.test-accounts.json", "utf8"));
const byLabel = Object.fromEntries(
  testAccounts.map((a) => [a.label, createAccount(a.privateKey)])
);

function clientFor(label) {
  return createClient({ chain: chains.studionet, endpoint: RPC_URL, account: byLabel[label] });
}

async function write(label, functionName, args) {
  const client = clientFor(label);
  console.log(`-> [${label}] ${functionName}(${JSON.stringify(args)})`);
  const txHash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName, args, value: 0n });
  const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: "FINALIZED", interval: 5000, retries: 40 });
  const execResult = receipt?.consensus_data?.leader_receipt?.[0]?.execution_result;
  console.log(`   -> ${execResult ?? "UNKNOWN"}`);
  if (execResult !== "SUCCESS") {
    console.log("   full receipt:", JSON.stringify(receipt?.consensus_data?.leader_receipt?.[0]?.genvm_result, null, 2));
  }
  return { receipt, execResult };
}

async function read(functionName, args = []) {
  const client = clientFor("resolver");
  return client.readContract({ address: CONTRACT_ADDRESS, functionName, args });
}

async function runCase({ name, oath, evidence }) {
  console.log(`\n=== ${name} ===`);
  const countBefore = await read("get_oath_count");
  const id = Number(countBefore);

  const { execResult: createResult } = await write("creator", "create_oath", oath);
  if (createResult !== "SUCCESS") return { name, id, error: "create_oath failed" };

  for (const ev of evidence) {
    const { execResult } = await write("watcher", "submit_evidence", [id, ...ev]);
    if (execResult !== "SUCCESS") return { name, id, error: "submit_evidence failed" };
  }

  const { execResult: verdictResult } = await write("resolver", "request_verdict", [id]);
  if (verdictResult !== "SUCCESS") return { name, id, error: "request_verdict failed" };

  const finalOath = await read("get_oath", [id]);
  const verdict = await read("get_verdict", [id]);
  console.log(`   RESULT: oath ${id} -> status=${finalOath.status} settled=${finalOath.settled}`);
  console.log(`   reason: ${verdict.short_reason}`);
  return { name, id, status: finalOath.status, settled: finalOath.settled, reason: verdict.short_reason };
}

async function main() {
  const results = [];

  // 1) FULFILLED - clear, unambiguous match between success criteria and fetched content
  results.push(await runCase({
    name: "Target: fulfilled",
    oath: [
      "Example.com Reservation Notice",
      "The example.com homepage will state that the domain is reserved for illustrative documentation examples, without requiring permission to use.",
      1230940800,
      "The fetched page must explicitly state the domain is for documentation examples and does not require permission.",
      "A live page confirming the reservation notice",
      "example.com",
      "None.",
      "Verdict test case: fulfilled.",
      "History",
    ],
    evidence: [["https://example.com", "reference_page", "The example.com homepage states it is reserved for illustrative documentation examples without needing permission.", "fulfilment"]],
  }));

  // 2) MISSED - success criteria deliberately does not match the fetched content
  results.push(await runCase({
    name: "Target: missed",
    oath: [
      "Example.com Hosts a Login Portal",
      "The example.com homepage will present a working username/password login form before the deadline.",
      1230940800,
      "The fetched page must show an actual login form with username and password fields.",
      "A live login form on the homepage",
      "example.com",
      "None.",
      "Verdict test case: missed.",
      "History",
    ],
    evidence: [["https://example.com", "reference_page", "Checking whether example.com has a login form as promised.", "fulfilment"]],
  }));

  // 3) EXCLUDED - the stated exclusion clearly applies to the fetched content
  results.push(await runCase({
    name: "Target: excluded",
    oath: [
      "Example.com Is a Production Product Site",
      "The example.com domain will be operating as a real production product website before the deadline.",
      1230940800,
      "The fetched page must show a real product, service, or company, not a placeholder/documentation domain.",
      "A live production product site",
      "example.com",
      "Any domain whose own content identifies itself as reserved for documentation/illustrative examples is excluded from being judged as a production product site.",
      "Verdict test case: excluded.",
      "History",
    ],
    evidence: [["https://example.com", "reference_page", "example.com self-identifies as a domain reserved for documentation examples, which is exactly the stated exclusion.", "exclusion"]],
  }));

  // 4) INVALID_OATH - too vague to judge against any evidence
  results.push(await runCase({
    name: "Target: invalid_oath",
    oath: [
      "Vague Success Oath",
      "Things will generally go well and the outcome will be good, in some reasonable sense, eventually.",
      1230940800,
      "Success is whatever seems fine, judged however feels right at the time.",
      "n/a",
      "example.com",
      "None.",
      "Verdict test case: invalid_oath (deliberately vague).",
      "History",
    ],
    evidence: [["https://example.com", "reference_page", "This is just a generic page submitted as a placeholder for an unjudgeable oath.", "context"]],
  }));

  // 5) PARTIAL / NEEDS_MORE_EVIDENCE - multiple deliverables, evidence covers only one
  results.push(await runCase({
    name: "Target: partial or needs_more_evidence",
    oath: [
      "Example.com Multi-Deliverable Launch",
      "Before the deadline, example.com will (a) state it is reserved for documentation examples, and (b) publish a public changelog of recent updates.",
      1230940800,
      "The fetched page must confirm BOTH the documentation-reservation notice AND a visible changelog of recent updates.",
      "Reservation notice AND a public changelog",
      "example.com",
      "None.",
      "Verdict test case: partial/needs_more_evidence (only one of two deliverables is verifiable).",
      "Product Launch",
    ],
    evidence: [["https://example.com", "reference_page", "The example.com homepage confirms the documentation-reservation notice, but no changelog is present on the page.", "fulfilment"]],
  }));

  console.log("\n\n=== SUMMARY ===");
  for (const r of results) {
    console.log(`${r.name}: oath ${r.id} -> ${r.error ?? r.status} (settled=${r.settled ?? "n/a"})`);
  }
}

main().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
