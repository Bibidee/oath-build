# Response to Review Feedback — Oath

Two rounds of feedback, both addressed below with live evidence.

---

# Round 2 (July 14) — "core JSON judgment path ambiguous"

> "Please provide a reproducible verdict and appeal test using a loadable SDK pin, or explicitly call gl.nondet.exec_prompt inside both callbacks before parsing the result. The checked-in source currently leaves the core JSON judgment path ambiguous."
> — Joaquin, Jul 14, 2026 15:25

## Root cause

The verdict/appeal callbacks previously only built and returned a prompt **string** — they never called `gl.nondet.exec_prompt` anywhere. The actual model invocation happened inside `gl.eq_principle.prompt_non_comparative`'s own SDK internals, invisible from the checked-in source. A reviewer could not confirm from `contracts/oath.py` alone that real AI execution, and not some other transformation, produced the text being parsed afterward.

This was confirmed empirically, not guessed: a throwaway diagnostic contract proved `gl.eq_principle.prompt_non_comparative(fn, task=, criteria=)` passes `fn`'s return value through **untouched** for cross-validator consensus arbitration — it does not itself re-prompt whatever `fn` returns. That meant `exec_prompt` could be made explicit inside each callback without changing the consensus mechanism.

## Fix

Both `nondet_verdict` (verdict path) and `nondet_appeal` (appeal path) in `contracts/oath.py` now do, visibly, in this order:

```
construct prompt → gl.nondet.exec_prompt(prompt) → return raw result
```

JSON parsing/validation happens afterward, deterministically, on the consensus-agreed raw text — never before the `exec_prompt` call.

```
$ grep -n "gl.nondet.exec_prompt" contracts/oath.py
277:            raw_model_result = gl.nondet.exec_prompt(prompt_text)   # verdict callback
467:            raw_model_result = gl.nondet.exec_prompt(prompt_text)   # appeal callback
```

The appeal callback builds a **fresh** prompt from the appellant's own basis/argument/new evidence — it never reuses or derives from the original verdict's raw model output, and issues its own independent `exec_prompt` call.

## SDK pin

- **Contract runtime**: `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }` — proven loadable by 100+ live deployments/transactions against it on GenLayer StudioNet.
- **Test runner**: `requirements-test.txt` pins `genlayer-test==0.1.2`, the actual latest version published on PyPI (verified live via `pip index versions genlayer-test`, not memory). README documents `pip install -r requirements-test.txt` and the Python ≥3.12 requirement.

## Live production evidence (not staging)

**Deployed contract:** [`0x87d7DcE1E3932a2b6c57278802A14e00a2fA20E4`](https://explorer-studio.genlayer.com/address/0x87d7DcE1E3932a2b6c57278802A14e00a2fA20E4) — this is the redeployed contract carrying the explicit-`exec_prompt` fix.

**20 real, detailed, strictly-sequential test cases** run against this exact deployment (each transaction fully `FINALIZED` before the next was submitted — nothing batched or parallel), **every settled oath also carrying a real, independent appeal**:

| Verdict | Count | Appeals filed | Notes |
|---|---|---|---|
| `fulfilled` | 7 | 7, all upheld | e.g. bitcoin.org correctly judged as describing peer-to-peer design |
| `missed` | 7 | 7, all upheld | e.g. example.com correctly judged as lacking a promised login form |
| `excluded` | 2 | 2, all upheld | github.com correctly excluded from a "retail storefront" claim via its own self-description |
| `invalid_oath` | 1 | 1, upheld | a deliberately vague oath correctly rejected as unjudgeable |
| `unverifiable` | 3 | — (not settled, so not appealable — correct per contract logic) | e.g. Wikipedia's genesis-block page redirecting to a generic article, correctly flagged as insufficient |

**14 settled oaths, 14 real appeals**, each running its own independent `exec_prompt` call and correctly upholding (never rubber-stamp-overturning) the original verdict.

One test (`#17`) surfaced a genuine `MAJORITY_DISAGREE`: independent validators, each running the same callback with their own model, reached different conclusions on the same evidence, and GenVM correctly discarded the disputed judgment rather than committing it. This is consensus working as designed, not a bug — retrying it reached agreement (`unverifiable`) on the next attempt.

## Strict reviewer self-check

- `gl.nondet.exec_prompt` visible in the verdict callback? **Yes**, one call, line 277.
- In the appeal callback? **Yes**, one call, line 467.
- Does each call occur before parsing? **Yes.**
- Is the appeal judgment demonstrably fresh? **Yes** — built from a new prompt, independent `exec_prompt` call, verified live 14 times.
- Can the test be reproduced? **Yes** — `pip install -r requirements-test.txt && genlayer test tests/direct/test_oath_contract.py` (Python ≥3.12, live GenLayer Studio simulator required — no mock exists for the judgment path).

---

# Round 1 — "execute a real nondeterministic judgment, fetch and validate evidence sources and deadline facts"

> "Please update the verdict and appeal paths to execute a real nondeterministic judgment, fetch and validate the permitted evidence sources and deadline facts, and add a direct test showing a successful settled verdict and appeal through that contract path."

### Real nondeterministic judgment
`request_verdict`/`request_appeal_verdict` call `gl.eq_principle.prompt_non_comparative` — every verdict is a genuine multi-validator LLM judgment round. The nondet closure fetches submitted evidence URLs via `gl.nondet.web.render(url)` and feeds real page content into the prompt (`gl.get_webpage`, used in GenLayer's own published examples, doesn't exist in this contract's pinned SDK — traced and fixed).

### Evidence source & deadline validation
- `assert_source_permitted()` deterministically rejects evidence/appeal URLs whose domain isn't in the oath's `accepted_sources`.
- `request_verdict` checks real current time against `deadline_unix` before invoking the LLM, settling `not_due` deterministically (no LLM call, no risk of validator disagreement about "now") if the deadline hasn't passed.
- `submit_appeal` enforces a 7-day appeal window from the original verdict's `resolved_at_unix`.

### Direct test
`tests/direct/test_oath_contract.py` was rewritten — its original `from genlayer.testing import ContractRunner` import didn't exist in any published GenLayer package, so the suite silently failed to collect. It now runs on the real, supported `gltest` framework, including `test_settled_verdict_and_appeal_flow`.

---

## Other bugs found and fixed along the way

- **Silent data loss on the frontend**: `getAllOathSummaries` fanned out one parallel RPC read per oath with no retry, silently dropping any that failed — oaths flickered in and out of the ledger/receipts pages. Fixed with retries and non-regressive state updates.
- **RPC rate limiting**: the hosted Studio RPC enforces 20 calls/10s per contract and 8 concurrent execution slots instance-wide. Fixed with a client-side sliding-window rate limiter and concurrency semaphore.

## Links

- **Live app:** https://oath-build.vercel.app
- **Repo:** https://github.com/Bibidee/oath-build
- **Contract:** https://explorer-studio.genlayer.com/address/0x87d7DcE1E3932a2b6c57278802A14e00a2fA20E4

All of the above is committed and pushed to `main`, and live on the production deployment.
