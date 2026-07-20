# Oath — The Ledger Court

**Promises with consequences.**

Oath is a public accountability layer on GenLayer StudioNet. Anyone can lock a plain-English promise on-chain with a deadline, success criteria, and a list of public sources validators are permitted to consult. Anyone else can submit public evidence for or against it. GenLayer's decentralized AI validators independently fetch that evidence, weigh it against the sworn terms, and reach consensus on a verdict — `fulfilled`, `partial`, `missed`, `excluded`, `invalid_oath`, `unverifiable`, or `needs_more_evidence`. Disputed verdicts can be appealed and re-judged from scratch, against the same original terms and evidence, by a fresh, independent validator round.

[**Live app** — oath-build.vercel.app](https://oath-build.vercel.app)

---

## What it is

- **Real nondeterministic judgment, not a stub.** Every verdict and every appeal makes its own explicit `gl.nondet.exec_prompt` call — visible directly in the contract source, not hidden behind a helper — and every evidence source is fetched fresh via `gl.nondet.web.render`.
- **Appeals are a genuine second opinion.** An appeal is judged against the *original* oath terms and *re-fetched* original evidence, not a summary of the prior verdict — it can't just rubber-stamp or blindly invert what came before.
- **Deterministic where it should be.** Deadlines are checked in plain code before any LLM call runs (`not_due` settles with zero model invocations), and evidence sources are validated against the oath's own allowlist before they're ever handed to a validator.
- **No off-chain state.** No database, no server-side cache of verdicts. Everything a user sees — oaths, evidence, verdicts, appeals — is read live from contract storage.
- **Honest, not a rubber stamp.** Malformed or unparseable model output is never upgraded into a false `fulfilled` — it falls back to the contract's own explicit `unverifiable` state. Across dozens of live test runs the system has correctly returned `missed`, `excluded`, `invalid_oath`, and `unverifiable` just as often as `fulfilled`.

---

## How it works

**Swearing an oath**

1. Draft a promise with a deadline, success criteria, required deliverables, and the list of public domains validators are allowed to consult
2. Optionally declare exclusions — conditions under which the promise is void even if technically unmet
3. Seal it on-chain

**Judging an oath**

1. Anyone submits public evidence — a URL, a claim, and which side it supports (`fulfilment`, `challenge`, `context`, `exclusion`) — the URL's domain must be in the oath's own accepted sources
2. Once the deadline has passed, anyone can request a verdict. GenLayer validators independently fetch every evidence URL and reach consensus on the outcome
3. If the verdict is disputed, anyone can file an appeal with a basis, an argument, and optionally new evidence
4. Requesting the appeal verdict triggers a second, independent judgment round — built from the original oath's real terms and re-fetched original evidence, not the prior verdict's summary

---

## The judgment path

This is the part most AI-on-chain projects leave opaque. In `contracts/oath.py`, both the verdict and appeal callbacks are structured so the execution path is auditable line by line:

```
construct prompt (incl. live evidence fetch via gl.nondet.web.render)
  → gl.nondet.exec_prompt(prompt)              # the actual model call, explicit
  → raw model output returned from the callback
  → gl.eq_principle.prompt_non_comparative(...)  # cross-validator consensus
  → JSON extraction + parsing (deterministic, after consensus)
  → key / enum / type validation
  → malformed output → explicit "unverifiable", never a false positive
  → settlement
```

```
$ grep -n "gl.nondet.exec_prompt" contracts/oath.py
277:            raw_model_result = gl.nondet.exec_prompt(prompt_text)   # verdict callback
467:            raw_model_result = gl.nondet.exec_prompt(prompt_text)   # appeal callback
```

Full root-cause analysis, live proof, and reviewer sign-off history for this design is in [`RESPONSE_TO_REVIEW.md`](./RESPONSE_TO_REVIEW.md).

---

## Oath lifecycle

```
active ──(deadline not yet passed)──> not_due
active ──(deadline passed, verdict requested)──> fulfilled | partial | missed |
                                                   excluded | invalid_oath |
                                                   unverifiable | needs_more_evidence
   │
   └─(terminal status ⇒ settled)──> appealable for 7 days from resolution
                                        │
                                        └──> request_appeal_verdict
                                               ├─ appeal accepted → verdict overwritten
                                               └─ appeal rejected → original verdict stands
```

`not_due`, `unverifiable`, and `needs_more_evidence` are **not** settled — they don't start the appeal clock, and an oath left in one of these states can simply have more evidence submitted and a verdict re-requested.

---

## Contract methods

| Method | Description |
|---|---|
| `create_oath` | Lock a promise on-chain with criteria, deadline, exclusions, and accepted evidence sources |
| `submit_evidence` | Submit a public URL as fulfilment, challenge, context, or exclusion evidence — rejected if its domain isn't in the oath's accepted sources |
| `request_verdict` | Deterministically settles `not_due` before the deadline; otherwise triggers a real GenLayer validator consensus round |
| `submit_appeal` | File an appeal against a settled verdict, within a 7-day window |
| `request_appeal_verdict` | Triggers a fresh, independent validator round judged against the original oath terms and re-fetched original evidence |
| `get_oath` / `get_oath_summary` / `get_evidence` / `get_verdict` / `get_appeals` / `get_user_oaths` / `get_oath_count` | Read-only views — no off-chain cache, always current contract state |

**Deployed contract:** `0x7fD41106Eb637fFa3A6F621Da897c20cae9ACAd2`

| Field | Value |
|---|---|
| Network | GenLayer StudioNet |
| Chain ID | 61999 |
| RPC | https://studio.genlayer.com/api |
| Explorer | [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com/address/0x7fD41106Eb637fFa3A6F621Da897c20cae9ACAd2) |
| Source | `contracts/oath.py` |

---

## Pages

| Route | Name | Description |
|---|---|---|
| `/` | Court Entrance | Hero + how it works |
| `/create` | Promise Chamber | 6-step guided oath builder with a judgeability pre-check |
| `/oaths` | The Oath Ledger | All oaths, filterable by status |
| `/oaths/[id]` | Oath Detail | Timeline, sworn terms, evidence wall, verdict receipt, appeals |
| `/arena` | Judgment Arena | Live status feed by stage |
| `/receipts` | Settlement Archive | Every settled oath's verdict receipt |

---

## Tech stack

| Layer | Tech |
|---|---|
| Intelligent contract | GenLayer Python — `gl.nondet.exec_prompt`, `gl.nondet.web.render`, `gl.eq_principle.prompt_non_comparative` |
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion |
| Chain interaction | `genlayer-js` |
| State | TanStack Query, with a client-side rate limiter/concurrency semaphore in front of every contract read |
| Storage | None — all state lives in GenLayer contract storage |

---

## Repository

```
contracts/
  oath.py                    GenLayer intelligent contract — all on-chain logic

app/
  page.tsx                   Court Entrance
  create/                    Promise Chamber — oath builder
  oaths/                     The Oath Ledger + oath detail pages
  arena/                     Judgment Arena
  receipts/                  Settlement Archive

lib/
  genlayer/                  Contract read/write client (lib/genlayer/client.ts)
  context/                   Shared React context

components/
  oath/                      Seal, timeline, appeal drawer, judgeability meter
  evidence/                  Evidence wall + submission modal
  verdict/                   Verdict receipt display
  shell/                     Nav and layout shell
  ui/                        Shared primitives (button, card, dialog, tabs, ...)

tests/
  direct/                    gltest-based direct contract tests

scripts/
  run-20-tests.mjs           20-case sequential real verdict/appeal suite
  run-verdict-tests.mjs      Targeted verdict-variety test cases
  seed-contract.mjs          Populates a deployed contract with example oaths
  verify-round3-fix.mjs      Verifies the appeal-consensus fix with real data

requirements-test.txt        Pinned test dependency (genlayer-test)
RESPONSE_TO_REVIEW.md        Full review history, root causes, fixes, live proof
```

---

## Getting started

```bash
npm install
cp .env.example .env.local
# Deploy contracts/oath.py to StudioNet, then set NEXT_PUBLIC_OATH_CONTRACT_ADDRESS
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying the contract

Deploy `contracts/oath.py` to StudioNet via [GenLayer Studio](https://studio.genlayer.com) or the CLI, then set `NEXT_PUBLIC_OATH_CONTRACT_ADDRESS` in `.env.local` (and in your deployment platform's environment variables) to the resulting address.

## Tests

Requires Python ≥ 3.12 (a requirement of `genlayer-test` itself).

```bash
pip install -r requirements-test.txt
genlayer test tests/direct/test_oath_contract.py
```

`requirements-test.txt` pins `genlayer-test==0.1.2` — the latest version published on PyPI as of this pin (verify with `pip index versions genlayer-test`). Tests run against a live GenLayer Studio simulator; there is no mock for `gl.eq_principle`/`gl.nondet.exec_prompt`, so `test_settled_verdict_and_appeal_flow` exercises the real contract's verdict and appeal judgment paths end-to-end, not a reimplementation of the logic.

---

## Disclaimer

Oath provides AI-consensus judgment of publicly documented claims. It is not legal adjudication, and a verdict recorded here does not constitute a binding legal or contractual determination unless independently adopted by the relevant parties.
