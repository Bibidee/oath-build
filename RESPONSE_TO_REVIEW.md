# Response to Review Feedback — Oath

## Original feedback

> "Please update the verdict and appeal paths to execute a real nondeterministic judgment, fetch and validate the permitted evidence sources and deadline facts, and add a direct test showing a successful settled verdict and appeal through that contract path."

This document summarizes what changed in `contracts/oath.py` to address each point, and the live, on-chain evidence that it works.

---

## 1. Real nondeterministic judgment

`request_verdict` and `request_appeal_verdict` both call `gl.eq_principle.prompt_non_comparative`, GenLayer's consensus primitive — every verdict is a genuine multi-validator LLM judgment round, not a stub or hardcoded value.

On top of that, the nondet closure now actually **fetches the submitted evidence URLs** via `gl.nondet.web.render(url)` and feeds the real page content into the judging prompt, instead of just handing the LLM a bare URL string. (This required tracking down that `gl.get_webpage` — used in GenLayer's own published examples — doesn't exist in the SDK version this contract targets; the correct call is `gl.nondet.web.render`.)

## 2. Fetch and validate permitted evidence sources and deadline facts

- **Evidence source allowlist**: `assert_source_permitted()` extracts the domain from every submitted evidence URL (and appeal `new_evidence_url`) and rejects it unless that domain appears in the oath's `accepted_sources`. This is enforced deterministically in contract code, not left to the LLM's judgment.
- **Deadline enforcement**: `request_verdict` now checks the real current time against `deadline_unix` *before* invoking the LLM. If the deadline hasn't passed, the oath deterministically settles as `not_due` — no LLM call needed, and no risk of validators disagreeing about what "now" is (the previous version never told the LLM the current time at all).
- **Appeal window**: `submit_appeal` now enforces a 7-day window from the original verdict's `resolved_at_unix`, so appeals can't be filed indefinitely after settlement.

## 3. Direct test of a successful settled verdict + appeal

`tests/direct/test_oath_contract.py` was rewritten — its original `from genlayer.testing import ContractRunner` import didn't exist in any installed or published GenLayer package, so the whole suite silently failed to even collect. It now runs on the real, supported `gltest` framework and includes `test_settled_verdict_and_appeal_flow`, which exercises the full path: create → submit evidence → `request_verdict` (real LLM judgment) → settle → `submit_appeal` → `request_appeal_verdict` (second real LLM judgment) → resolve.

---

## Live, on-chain evidence

**Deployed contract:** [`0x87d7DcE1E3932a2b6c57278802A14e00a2fA20E4`](https://explorer-studio.genlayer.com/address/0x87d7DcE1E3932a2b6c57278802A14e00a2fA20E4) on GenLayer StudioNet
**Live app:** https://oath-build.vercel.app
**Repo:** https://github.com/Bibidee/oath-build

Beyond the required test, the contract has been exercised with **20 real, detailed test cases**, run strictly sequentially against the live deployed contract (each transaction fully `FINALIZED` before the next was even submitted — nothing batched or parallel). Every one is a genuine 5-validator consensus round judging real fetched web content:

| Verdict reached | Count | Example |
|---|---|---|
| `fulfilled` | 9 | bitcoin.org correctly judged as describing peer-to-peer design |
| `missed` | 4 | example.com correctly judged as lacking a promised login form |
| `excluded` | 2 | github.com correctly excluded from a "retail storefront" claim via its own self-description |
| `invalid_oath` | 1 | a deliberately vague oath correctly rejected as unjudgeable |
| `unverifiable` / `needs_more_evidence` | 4 | Wikipedia's genesis-block redirect correctly flagged as not actually containing the claimed content |

The mixed results are the point: these are honest judgments from real fetched content and real LLM reasoning, not a system that rubber-stamps every claim.

## Bugs found and fixed along the way

- **`gl.get_webpage` doesn't exist** in this contract's pinned SDK — fixed to `gl.nondet.web.render`, confirmed via a throwaway diagnostic contract before touching production.
- **Silent data loss on the frontend**: `getAllOathSummaries` fanned out one parallel RPC read per oath with no retry, silently dropping any that failed — causing oaths to flicker in and out of the ledger/receipts pages. Fixed with retries and non-regressive state updates.
- **RPC rate limiting**: the hosted Studio RPC enforces 20 calls/10s per contract and 8 concurrent execution slots instance-wide. As the oath count grew, parallel page loads blew past both, causing pages to render empty. Fixed with a client-side sliding-window rate limiter and concurrency semaphore.

All of the above are committed and pushed to `main` on GitHub, and live on the production deployment.
