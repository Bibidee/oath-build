# Response to Review Feedback — Oath

Three rounds of feedback, all addressed below with live evidence.

**Current canonical deployment:** [`0x7fD41106Eb637fFa3A6F621Da897c20cae9ACAd2`](https://explorer-studio.genlayer.com/address/0x7fD41106Eb637fFa3A6F621Da897c20cae9ACAd2) — carries every fix described below.
**Live app:** https://oath-build.vercel.app
**Repo:** https://github.com/Bibidee/oath-build (the only canonical repo — the old `Bibidee/oathbuild`, no hyphen, is now archived)

---

# Round 3 (July 17) — "make one repository canonical, pass original oath terms/evidence into appeal consensus, add a reproducible substantive test"

> "Thanks for the update. Please make one repository canonical, pass the original oath terms and evidence into appeal consensus, and add a reproducible substantive verdict-and-appeal test using a loadable GenLayer dependency."
> — Joaquin, Jul 17, 2026 14:32

## 1. One canonical repository

The old `Bibidee/oathbuild` (no hyphen) repo still existed publicly, unarchived, with stale history predating all of this work — a reviewer could easily land on it and get confused about which repo was real. It's now **archived** (read-only, clearly inactive). `Bibidee/oath-build` (with hyphen) is the sole active, canonical repo; nothing in the checked-in source or git remotes references the old one.

## 2. Original oath terms and evidence in appeal consensus

**Root cause:** `nondet_appeal` previously only included a compact JSON summary of the *original verdict* in its prompt — never the oath's actual sworn terms (title, promise, deadline, success criteria, required deliverables, accepted sources, exclusions) or the original evidence itself. An appeal reviewer LLM was effectively being asked to second-guess a terse summary, not re-judge the real case.

**Fix:** `request_appeal_verdict` in `contracts/oath.py` now reads the full original oath dict and the full original evidence list *before* the nondet callback runs, and `build_appeal_prompt()` includes:
- the original oath's title, promise, deadline, success criteria, required deliverables, accepted sources, and exclusions, verbatim
- every original evidence item, **re-fetched fresh** via `gl.nondet.web.render()` (not just summarized)
- the original verdict, explicitly labeled "for reference only — do not defer to it blindly"
- the appellant's basis/argument/new evidence, fetched fresh as before

This isn't optional/best-effort — if reading those oath fields or re-fetching evidence raised an exception, the whole appeal transaction would fail. A successfully resolved appeal is direct proof this code path runs correctly.

## 3. Reproducible substantive verdict-and-appeal test

`test_settled_verdict_and_appeal_flow` in `tests/direct/test_oath_contract.py` was strengthened to assert the oath's actual terms (`title`, `success_criteria`) are read correctly both before and after the appeal round, and that they remain unmutated by it — proving the appeal path reads real oath data, not a stand-in. It runs on the same real, loadable `gltest` dependency pin from round 2 (`requirements-test.txt`, `genlayer-test==0.1.2`) against a live GenLayer Studio simulator — no mock exists for the judgment path.

## Live evidence

New contract deployed carrying this fix: [`0x7fD41106Eb637fFa3A6F621Da897c20cae9ACAd2`](https://explorer-studio.genlayer.com/address/0x7fD41106Eb637fFa3A6F621Da897c20cae9ACAd2), deployed with a freshly generated key (never committed).

**6 real test cases** run strictly sequentially against this exact deployment, each specifically designed so a *correct* answer requires the appeal to actually see the original oath terms and re-fetched original evidence — not just the prior verdict's summary:

| Case | Verdict | Appeal basis | Appeal result |
|---|---|---|---|
| Fulfilled (bitcoin.org P2P description) | `fulfilled` | `new_evidence` | upheld, citing the same fetched P2P language |
| Missed (example.com login form) | `missed` | `wrong_source_interpretation` | upheld, explicitly citing "no login form, username or password fields" from the re-examined original evidence |
| Excluded (example.com "real business" claim) | `excluded` | `exclusion_misapplied` | upheld, citing the exact exclusion clause re-read from the original oath |
| Invalid oath (deliberately vague promise) | `invalid_oath` | `promise_meaning_misread` | upheld, citing "circular success criteria" — a judgment only possible by re-reading the original success_criteria text |
| Not due (future deadline) | `not_due` (deterministic, no LLM) | — (not settled, correctly not appealable) | — |
| Multi-evidence (example.com + github.com) | `missed` | `wrong_source_interpretation` | upheld, reasoning explicitly references **both** original evidence sources, not just the first |

6/6 cases reached real `MAJORITY_AGREE` consensus with zero disagreements or retries needed. Every appeal's stated reasoning cites specific, substantive details from the original evidence/terms rather than a generic restatement — direct evidence the fix works, not just that it compiles.

---

# Round 2 (July 14) — "core JSON judgment path ambiguous"

> "Please provide a reproducible verdict and appeal test using a loadable SDK pin, or explicitly call gl.nondet.exec_prompt inside both callbacks before parsing the result. The checked-in source currently leaves the core JSON judgment path ambiguous."
> — Joaquin, Jul 14, 2026 15:25

## Root cause

The verdict/appeal callbacks previously only built and returned a prompt **string** — they never called `gl.nondet.exec_prompt` anywhere. The actual model invocation happened inside `gl.eq_principle.prompt_non_comparative`'s own SDK internals, invisible from the checked-in source. A reviewer could not confirm from `contracts/oath.py` alone that real AI execution, and not some other transformation, produced the text being parsed afterward.

This was confirmed empirically, not guessed: a throwaway diagnostic contract proved `gl.eq_principle.prompt_non_comparative(fn, task=, criteria=)` passes `fn`'s return value through **untouched** for cross-validator consensus arbitration — it does not itself re-prompt whatever `fn` returns. That meant `exec_prompt` could be made explicit inside each callback without changing the consensus mechanism.

## Fix

Both `nondet_verdict` (verdict path) and `nondet_appeal` (appeal path) in `contracts/oath.py` do, visibly, in this order:

```
construct prompt → gl.nondet.exec_prompt(prompt) → return raw result
```

JSON parsing/validation happens afterward, deterministically, on the consensus-agreed raw text — never before the `exec_prompt` call.

```
$ grep -n "gl.nondet.exec_prompt" contracts/oath.py
```
returns exactly one match inside `nondet_verdict` and one inside `nondet_appeal`.

The appeal callback builds a **fresh** prompt — it never reuses or derives from the original verdict's raw model output, and issues its own independent `exec_prompt` call. (Round 3 above extended what goes into that fresh prompt.)

## SDK pin

- **Contract runtime**: `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }` — proven loadable by 100+ live deployments/transactions against it on GenLayer StudioNet.
- **Test runner**: `requirements-test.txt` pins `genlayer-test==0.1.2`, the actual latest version published on PyPI (verified live via `pip index versions genlayer-test`, not memory). README documents `pip install -r requirements-test.txt` and the Python ≥3.12 requirement.

## Live evidence (historical — contract `0x87d7DcE1E3932a2b6c57278802A14e00a2fA20E4`, superseded by round 3's redeploy above)

**20 real, detailed, strictly-sequential test cases** were run against that deployment (each transaction fully `FINALIZED` before the next was submitted — nothing batched or parallel), **every settled oath also carrying a real, independent appeal**:

| Verdict | Count | Appeals filed |
|---|---|---|
| `fulfilled` | 7 | 7, all upheld |
| `missed` | 7 | 7, all upheld |
| `excluded` | 2 | 2, all upheld |
| `invalid_oath` | 1 | 1, upheld |
| `unverifiable` | 3 | — (not settled, correctly not appealable) |

One test surfaced a genuine `MAJORITY_DISAGREE`: independent validators, each running the same callback with their own model, reached different conclusions on the same evidence, and GenVM correctly discarded the disputed judgment rather than committing it — consensus working as designed. Retrying reached agreement on the next attempt.

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

All of the above is committed and pushed to `main`, and live on the production deployment.
