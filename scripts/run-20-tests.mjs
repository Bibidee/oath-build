// Runs 20 real, detailed oath lifecycles against the deployed contract,
// STRICTLY sequentially: each write only fires after the previous one has
// reached FINALIZED status. Nothing is queued or parallelized - test N+2's
// transactions do not exist on-chain until test N+1 is fully resolved.
//
// Run: node scripts/run-20-tests.mjs

import { createClient, createAccount, chains } from "genlayer-js";
import fs from "fs";

const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS || "0x87d7DcE1E3932a2b6c57278802A14e00a2fA20E4";

const testAccounts = JSON.parse(fs.readFileSync("scripts/.test-accounts.json", "utf8"));
const byLabel = Object.fromEntries(testAccounts.map((a) => [a.label, createAccount(a.privateKey)]));

function clientFor(label) {
  return createClient({ chain: chains.studionet, endpoint: RPC_URL, account: byLabel[label] });
}

// Sequential by construction: this function does not return until the
// transaction it submitted has reached FINALIZED on-chain, so the caller's
// next `write()` call cannot fire until this one is done.
async function write(label, functionName, args) {
  const client = clientFor(label);
  const txHash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName, args, value: 0n });
  console.log(`   tx ${txHash} submitted, waiting for FINALIZED...`);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash, status: "FINALIZED", interval: 5000, retries: 60 });
  const execResult = receipt?.consensus_data?.leader_receipt?.[0]?.execution_result;
  console.log(`   -> FINALIZED: ${execResult ?? "UNKNOWN"}`);
  if (execResult !== "SUCCESS") {
    console.log("   genvm_result:", JSON.stringify(receipt?.consensus_data?.leader_receipt?.[0]?.genvm_result, null, 2));
  }
  return { txHash, execResult };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

const TESTS = [
  {
    name: "1. Public API v3 Launch",
    oath: ["Public API v3 Launch", "The engineering team will publish the v3 REST API with full backward compatibility documentation before the deadline, including migration guides for all breaking changes from v2.", 1230940800, "A public changelog or release notes page must be reachable and describe the v3 API release.", "Public changelog, migration guide", "github.com", "None.", "Tracked via GitHub releases.", "Product Launch"],
    evidence: [["https://github.com", "changelog", "GitHub hosts the project's release notes and changelog history for the v3 API launch.", "fulfilment"]],
  },
  {
    name: "2. Genesis Block Historical Record",
    oath: ["Bitcoin Genesis Block Historical Record", "Public sources will document that the Bitcoin genesis block was mined by Satoshi Nakamoto, establishing the network's launch.", 1230940800, "A public reference must describe the genesis block and attribute it to Satoshi Nakamoto.", "Public documentation of the genesis block", "en.wikipedia.org", "None.", "Historical accountability test.", "History"],
    evidence: [["https://en.wikipedia.org/wiki/Genesis_block", "encyclopedia_article", "Wikipedia's Genesis block article documents the block's creation and attribution to Satoshi Nakamoto.", "fulfilment"]],
  },
  {
    name: "3. Bitcoin Project Official Presence",
    oath: ["Bitcoin Project Maintains Official Web Presence", "The Bitcoin project will maintain a live, official website describing the protocol and providing onboarding resources.", 1230940800, "The official site must be reachable and describe Bitcoin as a peer-to-peer electronic cash system or similar.", "A live official website", "bitcoin.org", "None.", "Infrastructure accountability test.", "History"],
    evidence: [["https://bitcoin.org/en/", "official_project_site", "bitcoin.org is the long-standing official project site describing the Bitcoin protocol.", "fulfilment"]],
  },
  {
    name: "4. GitHub Platform Availability",
    oath: ["GitHub Platform Remains Publicly Available", "GitHub will remain publicly reachable as a hosting platform for open source repositories through the deadline.", 1230940800, "github.com must be reachable and present itself as a code hosting/collaboration platform.", "A live, reachable platform homepage", "github.com", "None.", "Platform uptime accountability test.", "Product Launch"],
    evidence: [["https://github.com", "platform_homepage", "github.com loads and presents itself as a software development and hosting platform.", "fulfilment"]],
  },
  {
    name: "5. Example.com Reserved Domain Notice",
    oath: ["Example.com Displays Reserved Domain Notice", "The example.com domain will continue to display a notice that it is reserved for use in illustrative documentation examples.", 1230940800, "The homepage must explicitly state it is reserved for documentation/illustrative examples.", "Live notice on the homepage", "example.com", "None.", "Baseline reliability test.", "History"],
    evidence: [["https://example.com", "reference_page", "example.com's homepage states it is reserved for use in documentation examples without needing permission.", "fulfilment"]],
  },
  {
    name: "6. Example.com E-Commerce Checkout",
    oath: ["Example.com Provides E-Commerce Checkout", "The example.com domain will host a working shopping cart and checkout flow with payment processing before the deadline.", 1230940800, "The fetched page must show a shopping cart, product listings, and a checkout/payment flow.", "Live shopping cart and checkout flow", "example.com", "None.", "Deliberate mismatch test case.", "Product Launch"],
    evidence: [["https://example.com", "reference_page", "Checking whether example.com hosts an e-commerce checkout flow as promised.", "fulfilment"]],
  },
  {
    name: "7. GitHub Hosts Issue Tracker",
    oath: ["GitHub Hosts a Public Issue Tracker", "GitHub will continue to provide public issue tracking functionality for open source projects through the deadline.", 1230940800, "github.com must be reachable and its platform description must reference collaboration or project management features.", "Reachable platform confirming issue tracking capability", "github.com", "None.", "Feature-presence accountability test.", "Product Launch"],
    evidence: [["https://github.com", "platform_homepage", "github.com's homepage describes collaboration and project features consistent with issue tracking.", "context"]],
  },
  {
    name: "8. Wikipedia Genesis Block Exact Date",
    oath: ["Bitcoin Genesis Block Mined Exactly January 3 2009", "Public sources will explicitly state, in unambiguous terms, that the Bitcoin genesis block was mined on the specific calendar date January 3, 2009.", 1230940800, "The fetched source text must explicitly contain the date January 3, 2009 in connection with the genesis block.", "Explicit dated confirmation", "en.wikipedia.org", "None.", "Strict-evidence precision test.", "History"],
    evidence: [["https://en.wikipedia.org/wiki/Genesis_block", "encyclopedia_article", "Requesting a strict check of whether the fetched Wikipedia content explicitly states the January 3, 2009 date.", "fulfilment"]],
  },
  {
    name: "9. Bitcoin.org Peer-to-Peer Description",
    oath: ["Bitcoin.org Describes Peer-to-Peer Design", "bitcoin.org will describe Bitcoin using peer-to-peer or decentralized terminology consistent with its original design goals.", 1230940800, "The fetched page content must reference peer-to-peer, decentralized, or trustless properties of the network.", "Live description referencing the P2P design", "bitcoin.org", "None.", "Design-description accountability test.", "History"],
    evidence: [["https://bitcoin.org/en/", "official_project_site", "bitcoin.org describes Bitcoin's peer-to-peer, decentralized electronic cash design.", "fulfilment"]],
  },
  {
    name: "10. Example.com Excluded as Documentation Domain",
    oath: ["Example.com Operates as a Real Business", "example.com will operate as a genuine, revenue-generating commercial business with real customers before the deadline.", 1230940800, "The fetched page must show evidence of real commercial operations, products, or customers.", "Evidence of genuine commercial activity", "example.com", "Any domain whose own homepage explicitly self-identifies as reserved for documentation or illustrative examples is excluded from being judged a real business.", "Exclusion-clause accountability test.", "Product Launch"],
    evidence: [["https://example.com", "reference_page", "example.com's own homepage explicitly states it is reserved for documentation examples, triggering the stated exclusion.", "exclusion"]],
  },
  {
    name: "11. Overly Vague Success Promise",
    oath: ["General Success Will Be Achieved", "The initiative will succeed and produce a positive outcome for everyone involved, in whatever way that ends up mattering most.", 1230940800, "Success is whatever feels right given the circumstances at the time of judgment.", "n/a", "example.com", "None.", "Vagueness/invalid_oath accountability test.", "History"],
    evidence: [["https://example.com", "reference_page", "Placeholder evidence submitted against a deliberately unjudgeable, vague oath.", "context"]],
  },
  {
    name: "12. GitHub Two-Part Deliverable",
    oath: ["GitHub Hosts Repository AND Public Roadmap", "Before the deadline, the project will (a) maintain a public GitHub repository, and (b) publish a public roadmap document listing upcoming milestones.", 1230940800, "The fetched page must confirm BOTH a public repository presence AND a visible roadmap document.", "Repository presence AND a published roadmap", "github.com", "None.", "Multi-deliverable partial-credit test.", "Product Launch"],
    evidence: [["https://github.com", "platform_homepage", "github.com confirms the platform hosts public repositories, but no roadmap document is visible on this page.", "fulfilment"]],
  },
  {
    name: "13. Wikipedia Cites Primary Source",
    oath: ["Wikipedia Genesis Block Article Cites a Primary Source", "The Wikipedia Genesis block article will cite at least one primary or contemporaneous source supporting its claims about the block's creation.", 1230940800, "The fetched article content must reference citations, references, or sourced claims about the genesis block.", "Visible citation or reference markers", "en.wikipedia.org", "None.", "Source-quality accountability test.", "History"],
    evidence: [["https://en.wikipedia.org/wiki/Genesis_block", "encyclopedia_article", "Checking whether the fetched Wikipedia article content shows citation or reference markers for its claims.", "fulfilment"]],
  },
  {
    name: "14. Bitcoin.org Provides Wallet Downloads",
    oath: ["Bitcoin.org Provides Wallet Software Downloads", "bitcoin.org will provide links or guidance for downloading Bitcoin wallet software before the deadline.", 1230940800, "The fetched page must reference wallet software, downloads, or getting started with a Bitcoin client.", "Live wallet download guidance", "bitcoin.org", "None.", "Onboarding-resource accountability test.", "Product Launch"],
    evidence: [["https://bitcoin.org/en/", "official_project_site", "bitcoin.org's homepage provides guidance toward getting a Bitcoin wallet.", "fulfilment"]],
  },
  {
    name: "15. Example.com Multi-Language Support",
    oath: ["Example.com Offers Multi-Language Content", "example.com will present its content in multiple languages before the deadline, serving an international audience.", 1230940800, "The fetched page must show visible content or navigation in more than one language.", "Multi-language homepage content", "example.com", "None.", "Localization mismatch test.", "Product Launch"],
    evidence: [["https://example.com", "reference_page", "Checking whether example.com's homepage content is presented in more than one language.", "fulfilment"]],
  },
  {
    name: "16. GitHub Supports Open Source Licensing",
    oath: ["GitHub Platform Supports Open Source Licensing Workflows", "GitHub will continue to support open source project workflows, including public repository hosting relevant to open licensing.", 1230940800, "The fetched homepage must be reachable and consistent with hosting open source software projects.", "Reachable platform consistent with open source hosting", "github.com", "None.", "Ecosystem-support accountability test.", "Product Launch"],
    evidence: [["https://github.com", "platform_homepage", "github.com is reachable and consistent with widely known open source hosting use.", "context"]],
  },
  {
    name: "17. Genesis Block Predates Bitcoin.org Domain",
    oath: ["Genesis Block Creation Predates Public Bitcoin.org Presence", "The Bitcoin genesis block will be documented as having been created before bitcoin.org's public project presence was well established.", 1230940800, "Both fetched sources together must support a timeline where the genesis block predates general public project presence.", "Consistent cross-source timeline", "en.wikipedia.org, bitcoin.org", "None.", "Cross-source timeline consistency test.", "History"],
    evidence: [
      ["https://en.wikipedia.org/wiki/Genesis_block", "encyclopedia_article", "Wikipedia documents the genesis block's creation date and early network history.", "fulfilment"],
      ["https://bitcoin.org/en/", "official_project_site", "bitcoin.org represents the established public project presence to compare against the genesis block timeline.", "context"],
    ],
  },
  {
    name: "18. Example.com Zero Third-Party Trackers",
    oath: ["Example.com Loads Without Third-Party Advertising", "example.com will remain a minimal reference page without third-party advertising or tracking clutter, as historically documented.", 1230940800, "The fetched page content must appear minimal and free of advertising or promotional content.", "Minimal, ad-free homepage content", "example.com", "None.", "Minimalism-consistency accountability test.", "History"],
    evidence: [["https://example.com", "reference_page", "example.com's fetched content is minimal reference text without advertising or promotional material.", "fulfilment"]],
  },
  {
    name: "19. GitHub Excluded as Non-Retail Platform",
    oath: ["GitHub Operates as a Retail Storefront", "GitHub will operate as a retail e-commerce storefront selling physical goods before the deadline.", 1230940800, "The fetched page must show product listings, pricing, and a purchase flow for physical goods.", "Live retail storefront", "github.com", "Any platform whose own homepage identifies itself as a software development/hosting platform rather than a retail storefront is excluded from being judged a retail business.", "Exclusion-clause accountability test.", "Product Launch"],
    evidence: [["https://github.com", "platform_homepage", "github.com self-identifies as a software development platform, matching the stated exclusion for retail storefront claims.", "exclusion"]],
  },
  {
    name: "20. Full Cross-Source Accountability Review",
    oath: ["Full Cross-Source Project History Review", "Across example.com, GitHub, Wikipedia, and bitcoin.org, the combined public record will support a coherent, cross-referenced account of internet infrastructure and open project history relevant to this review.", 1230940800, "At least three of the four listed sources must be reachable and each must contribute relevant, on-topic content to the review.", "Coherent cross-referenced account from at least 3 sources", "example.com, github.com, en.wikipedia.org, bitcoin.org", "None.", "Final comprehensive cross-source test.", "History"],
    evidence: [
      ["https://example.com", "reference_page", "example.com contributes as a baseline reference/documentation example domain.", "context"],
      ["https://github.com", "platform_homepage", "github.com contributes as a live open source hosting platform.", "context"],
      ["https://en.wikipedia.org/wiki/Genesis_block", "encyclopedia_article", "Wikipedia contributes historical documentation of the Bitcoin genesis block.", "context"],
    ],
  },
];

async function runTest(t) {
  console.log(`\n=== ${t.name} ===`);
  const countBefore = await read("get_oath_count");
  const id = Number(countBefore);
  console.log(`   creating oath id ${id}`);

  const create = await write("creator", "create_oath", t.oath);
  if (create.execResult !== "SUCCESS") return { name: t.name, id, error: "create_oath failed" };

  for (const ev of t.evidence) {
    const evRes = await write("watcher", "submit_evidence", [id, ...ev]);
    if (evRes.execResult !== "SUCCESS") return { name: t.name, id, error: "submit_evidence failed" };
  }

  const verdictRes = await write("resolver", "request_verdict", [id]);
  if (verdictRes.execResult !== "SUCCESS") return { name: t.name, id, error: "request_verdict failed" };

  const finalOath = await read("get_oath", [id]);
  const verdict = await read("get_verdict", [id]);
  console.log(`   RESULT: oath ${id} -> status=${finalOath.status} settled=${finalOath.settled}`);
  console.log(`   reason: ${verdict.short_reason}`);
  return { name: t.name, id, status: finalOath.status, settled: finalOath.settled, reason: verdict.short_reason };
}

async function main() {
  const resumeIndex = Number(process.env.RESUME_INDEX || 0);
  const resumeOathId = process.env.RESUME_OATH_ID !== undefined ? Number(process.env.RESUME_OATH_ID) : null;
  const results = [];

  if (resumeIndex > 0 && resumeOathId !== null) {
    console.log(`\n=== (resumed) ${TESTS[resumeIndex - 1].name} - reading already-finalized result for oath ${resumeOathId} ===`);
    const finalOath = await read("get_oath", [resumeOathId]);
    const verdict = await read("get_verdict", [resumeOathId]);
    console.log(`   RESULT: oath ${resumeOathId} -> status=${finalOath.status} settled=${finalOath.settled}`);
    results.push({
      name: TESTS[resumeIndex - 1].name,
      id: resumeOathId,
      status: finalOath.status,
      settled: finalOath.settled,
      reason: verdict.short_reason,
    });
  }

  // Strictly sequential: each test's transactions must finalize before the
  // next test's create_oath is even submitted.
  for (const t of TESTS.slice(resumeIndex)) {
    const r = await runTest(t);
    results.push(r);
  }

  console.log("\n\n=== FINAL SUMMARY ===");
  for (const r of results) {
    console.log(`${r.name}: oath ${r.id} -> ${r.error ?? r.status} (settled=${r.settled ?? "n/a"})`);
  }
}

main().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
