// Populates the deployed OathContract with a few example oaths, evidence,
// verdicts, and an appeal so the live app has real data to show.
//
// Run: node scripts/seed-contract.mjs

import { createClient, createAccount, chains } from "genlayer-js";

const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS || "0x87d7DcE1E3932a2b6c57278802A14e00a2fA20E4";

const account = createAccount();
console.log(`Using throwaway account: ${account.address}`);

const client = createClient({
  chain: chains.studionet,
  endpoint: RPC_URL,
  account,
});

async function write(functionName, args) {
  console.log(`-> ${functionName}(${JSON.stringify(args)})`);
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: 0n,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: "FINALIZED",
    interval: 5000,
    retries: 40,
  });
  const execResult = receipt?.consensus_data?.leader_receipt?.[0]?.execution_result;
  console.log(`   tx ${txHash} -> ${execResult ?? "UNKNOWN"}`);
  if (execResult !== "SUCCESS") {
    console.log("   full receipt:", JSON.stringify(receipt, null, 2));
    throw new Error(`${functionName} failed: ${execResult}`);
  }
  return receipt;
}

async function read(functionName, args = []) {
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  });
}

async function main() {
  const countBefore = await read("get_oath_count");
  console.log(`Existing oath count: ${countBefore}`);

  // --- Oath 1: settled + appealed, full lifecycle demo ---
  await write("create_oath", [
    "Bitcoin Genesis Block Mined",
    "The Bitcoin genesis block (block 0) will have been mined by Satoshi Nakamoto before the deadline, marking the launch of the Bitcoin network.",
    1230940800, // 2009-01-03T00:00:00Z, already in the past
    "The Bitcoin genesis block must be publicly documented as mined on or before 2009-01-03.",
    "A mined and publicly recorded genesis block",
    "en.wikipedia.org, bitcoin.org",
    "None.",
    "Historical, well-documented event.",
    "History",
  ]);
  const oath1Id = Number(countBefore);

  await write("submit_evidence", [
    oath1Id,
    "https://en.wikipedia.org/wiki/Genesis_block",
    "encyclopedia_article",
    "Wikipedia documents the Bitcoin genesis block as mined by Satoshi Nakamoto on January 3, 2009.",
    "fulfilment",
  ]);

  await write("request_verdict", [oath1Id]);

  const oath1AfterVerdict = await read("get_oath", [oath1Id]);
  if (oath1AfterVerdict.settled) {
    await write("submit_appeal", [
      oath1Id,
      "new_evidence",
      "https://bitcoin.org/en/",
      "The genesis block timestamp deserves a second look against the official bitcoin.org project history.",
    ]);
    await write("request_appeal_verdict", [oath1Id, 0]);
  } else {
    console.log(`   oath ${oath1Id} did not settle (status=${oath1AfterVerdict.status}), skipping appeal`);
  }

  // --- Oath 2: active, evidence submitted, verdict not yet requested ---
  await write("create_oath", [
    "Public Beta Launch",
    "The team will launch a public beta of the app before the deadline, including wallet login and a working demo flow.",
    9999999999,
    "A public URL must be live before the deadline with wallet login and demo flow accessible without invite.",
    "Public URL, wallet login, demo flow",
    "Official website (github.com), GitHub release",
    "Scheduled third-party infrastructure outage lasting more than 24 hours.",
    "Announced on Twitter.",
    "Product Launch",
  ]);
  const oath2Id = oath1Id + 1;

  await write("submit_evidence", [
    oath2Id,
    "https://github.com",
    "product_page",
    "The team has an active GitHub presence documenting beta progress.",
    "context",
  ]);

  // --- Oath 3: not yet due, exercises deterministic not_due gating ---
  const futureDeadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days out
  await write("create_oath", [
    "Ship v2 Documentation",
    "The maintainers will ship complete v2 API documentation before the deadline.",
    futureDeadline,
    "Public docs site must cover every v2 endpoint before the deadline.",
    "Published docs site",
    "github.com, readthedocs.org",
    "None.",
    "Tracked internally.",
    "Product Launch",
  ]);
  const oath3Id = oath2Id + 1;

  await write("submit_evidence", [
    oath3Id,
    "https://github.com",
    "product_page",
    "Documentation work is tracked publicly in the GitHub repo.",
    "fulfilment",
  ]);

  await write("request_verdict", [oath3Id]);

  const countAfter = await read("get_oath_count");
  console.log(`\nDone. Oath count now: ${countAfter}`);
  console.log(`Oath IDs created: ${oath1Id}, ${oath2Id}, ${oath3Id}`);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
