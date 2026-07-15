# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
from datetime import datetime, timezone
from urllib.parse import urlparse


def to_json(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def safe_loads(raw, fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def now_unix() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def extract_domain(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def assert_source_permitted(source_url: str, accepted_sources: str) -> None:
    domain = extract_domain(source_url)
    assert domain, "source_url has no discernible domain"
    assert domain in accepted_sources.lower(), (
        f"source_url domain '{domain}' is not listed in this oath's accepted_sources"
    )


ALLOWED_STATUSES = {
    "fulfilled", "partial", "missed", "unverifiable",
    "invalid_oath", "not_due", "excluded", "needs_more_evidence",
}

ALLOWED_SIDES = {"fulfilment", "challenge", "context", "exclusion"}

ALLOWED_APPEAL_BASES = {
    "new_evidence", "wrong_source_interpretation", "deadline_misread",
    "exclusion_misapplied", "fake_or_misleading_evidence", "promise_meaning_misread",
}

ALLOWED_SOURCE_ALIGNMENTS = {"strong", "moderate", "weak", "conflicting", "none"}
ALLOWED_WINNING_SIDES = {"fulfilment", "challenge", "neutral"}

APPEAL_WINDOW_SECONDS = 7 * 24 * 60 * 60


class OathContract(gl.Contract):
    oaths: TreeMap[str, str]
    evidence: TreeMap[str, str]
    verdicts: TreeMap[str, str]
    appeals: TreeMap[str, str]
    user_oaths: TreeMap[str, str]
    oath_count: bigint

    def __init__(self) -> None:
        self.oaths = TreeMap()
        self.evidence = TreeMap()
        self.verdicts = TreeMap()
        self.appeals = TreeMap()
        self.user_oaths = TreeMap()
        self.oath_count = 0

    # ------------------------------------------------------------------ #
    #  WRITE METHODS                                                       #
    # ------------------------------------------------------------------ #

    @gl.public.write
    def create_oath(
        self,
        title: str,
        promise: str,
        deadline_unix: int,
        success_criteria: str,
        required_deliverables: str,
        accepted_sources: str,
        exclusions: str,
        stakeholder_notes: str,
        category: str,
    ) -> int:
        assert len(title) > 3, "title too short"
        assert len(promise) > 20, "promise too short"
        assert len(success_criteria) > 20, "success_criteria too short"
        assert len(accepted_sources) > 5, "accepted_sources required"
        assert deadline_unix > 0, "deadline_unix required"
        assert len(category) > 0, "category required"

        oath_id = int(self.oath_count)
        self.oath_count = self.oath_count + 1
        key = str(oath_id)
        creator = str(gl.message.sender_address)

        oath = {
            "oath_id": oath_id,
            "creator": creator,
            "title": title,
            "promise": promise,
            "deadline_unix": deadline_unix,
            "success_criteria": success_criteria,
            "required_deliverables": required_deliverables,
            "accepted_sources": accepted_sources,
            "exclusions": exclusions,
            "stakeholder_notes": stakeholder_notes,
            "category": category,
            "created_at": utcnow(),
            "status": "active",
            "settled": False,
            "appeal_count": 0,
        }
        self.oaths[key] = to_json(oath)
        self.evidence[key] = to_json([])

        existing = safe_loads(self.user_oaths.get(creator, "[]"), [])
        existing.append(oath_id)
        self.user_oaths[creator] = to_json(existing)

        return oath_id

    @gl.public.write
    def submit_evidence(
        self,
        oath_id: int,
        source_url: str,
        source_type: str,
        claim: str,
        side: str,
    ) -> None:
        key = str(oath_id)
        assert key in self.oaths, "oath not found"
        assert side in ALLOWED_SIDES, "invalid side"
        assert source_url.startswith("https://") or source_url.startswith("http://"), \
            "source_url must start with http:// or https://"
        assert len(claim) > 10, "claim too short"

        oath = safe_loads(self.oaths[key], {})
        assert not oath.get("settled", False), "oath is settled"
        assert_source_permitted(source_url, oath.get("accepted_sources", ""))

        ev_list = safe_loads(self.evidence.get(key, "[]"), [])
        evidence_id = len(ev_list)

        ev_list.append({
            "evidence_id": evidence_id,
            "submitter": str(gl.message.sender_address),
            "source_url": source_url,
            "source_type": source_type,
            "claim": claim,
            "side": side,
            "submitted_at": utcnow(),
        })
        self.evidence[key] = to_json(ev_list)

    @gl.public.write
    def request_verdict(self, oath_id: int) -> None:
        key = str(oath_id)
        assert key in self.oaths, "oath not found"

        oath = safe_loads(self.oaths[key], {})
        assert not oath.get("settled", False), "oath already settled"

        ev_list = safe_loads(self.evidence.get(key, "[]"), [])
        assert len(ev_list) > 0, "no evidence submitted"

        current_unix = now_unix()
        if current_unix < int(oath["deadline_unix"]):
            verdict = {
                "oath_id": oath_id,
                "status": "not_due",
                "confidence": 100,
                "source_alignment": "none",
                "winning_side": "neutral",
                "short_reason": "Deadline has not passed yet.",
                "canonical_json": to_json({
                    "status": "not_due",
                    "confidence": 100,
                    "source_alignment": "none",
                    "winning_side": "neutral",
                    "short_reason": "Deadline has not passed yet.",
                }),
                "resolved_at": utcnow(),
                "resolved_at_unix": current_unix,
                "resolver": str(gl.message.sender_address),
            }
            self.verdicts[key] = to_json(verdict)
            oath["status"] = "not_due"
            oath["settled"] = False
            self.oaths[key] = to_json(oath)
            return

        title = oath["title"]
        promise = oath["promise"]
        deadline_unix = oath["deadline_unix"]
        success_criteria = oath["success_criteria"]
        required_deliverables = oath["required_deliverables"]
        accepted_sources = oath["accepted_sources"]
        exclusions = oath["exclusions"]
        evidence_items = list(ev_list)

        MAX_FETCHED_CHARS = 3000

        # ---- STEP 1: construct the judgment prompt (deterministic string
        # building; the only nondeterministic part is the web fetch below,
        # which happens inside the nondet callback alongside exec_prompt). --
        def build_verdict_prompt() -> str:
            evidence_text = ""
            for ev in evidence_items:
                try:
                    page_content = gl.nondet.web.render(ev["source_url"])
                    page_content = page_content[:MAX_FETCHED_CHARS]
                except Exception as e:
                    page_content = f"(failed to fetch this source: {e})"
                evidence_text += (
                    f"\n- [{ev['side'].upper()}] {ev['source_type']} | {ev['source_url']}\n"
                    f"  Claim: {ev['claim']}\n"
                    f"  Fetched page content:\n{page_content}\n"
                )

            return f"""You are a GenLayer validator judging a public promise called an Oath.

Decide whether the promise was fulfilled based only on the oath text, success criteria, deadline, exclusions, accepted sources, and the fetched content of the submitted public evidence.

Rules:
- Do not reward effort unless the promised outcome was materially achieved.
- Do not invent evidence. Base your judgment strictly on the fetched page content below, not on assumptions about the URL or prior knowledge.
- Do not use private information.
- If the oath is too vague to judge, return invalid_oath.
- If a fetched source failed to load, evidence is insufficient, or evidence is contradictory, return unverifiable or needs_more_evidence.
- If a stated exclusion clearly applies, return excluded.
- Each evidence source has already been verified to fall within Accepted Sources; you do not need to re-check that.

Return ONLY a valid JSON object with exactly these keys:
- status: one of fulfilled, partial, missed, unverifiable, invalid_oath, not_due, excluded, needs_more_evidence
- confidence: integer 0-100
- source_alignment: one of strong, moderate, weak, conflicting, none
- winning_side: one of fulfilment, challenge, neutral
- short_reason: string under 220 characters

--- OATH ---
Current time (unix): {current_unix}
Title: {title}
Promise: {promise}
Deadline (unix): {deadline_unix}
Success Criteria: {success_criteria}
Required Deliverables: {required_deliverables}
Accepted Sources: {accepted_sources}
Exclusions: {exclusions}

--- EVIDENCE ---
{evidence_text}

Return ONLY the JSON object. No markdown. No explanation."""

        # ---- STEP 2: the nondeterministic judgment callback. This is the
        # single source of truth for the verdict's AI execution: it builds
        # the prompt, then EXPLICITLY calls gl.nondet.exec_prompt and
        # returns that raw model output untouched. No JSON parsing happens
        # in here - this callback's only job is to produce the raw result
        # that GenLayer validators reach consensus on. -------------------
        def nondet_verdict() -> str:
            prompt_text = build_verdict_prompt()
            raw_model_result = gl.nondet.exec_prompt(prompt_text)
            return raw_model_result

        task = "Judge the Oath based on the fetched evidence. Return only compact JSON."
        criteria = (
            "The verdict must be based solely on the oath text and the fetched content of the submitted public evidence. "
            "Return only the JSON object with keys: status, confidence, source_alignment, winning_side, short_reason."
        )

        # ---- STEP 3: consensus. gl.eq_principle.prompt_non_comparative runs
        # nondet_verdict() independently across validators (each doing its
        # own gl.nondet.exec_prompt call) and arbitrates agreement using
        # `task`/`criteria`, since independent LLM calls won't produce
        # byte-identical text even when they agree semantically. Its return
        # value is the raw, consensus-agreed model output from STEP 2 -
        # nothing has parsed or interpreted it yet. --------------------
        result_raw = gl.eq_principle.prompt_non_comparative(
            nondet_verdict,
            task=task,
            criteria=criteria,
        )

        # ---- STEP 4: extract/parse JSON from the raw consensus result.
        # This runs deterministically, after consensus, on the agreed text.
        raw = result_raw.strip() if isinstance(result_raw, str) else str(result_raw)
        parsed = safe_loads(raw, None)

        # ---- STEP 5: validate. Malformed or unparseable model output is
        # never upgraded into a false positive - it is explicitly mapped to
        # the contract's legitimate "unverifiable" state, with confidence 0
        # so it's unambiguous this was a parse failure, not a real judgment.
        if not parsed or not isinstance(parsed, dict):
            parsed = {
                "status": "unverifiable",
                "confidence": 0,
                "source_alignment": "none",
                "winning_side": "neutral",
                "short_reason": "Could not parse validator response.",
            }

        status = parsed.get("status", "unverifiable")
        if status not in ALLOWED_STATUSES:
            status = "unverifiable"

        source_alignment = parsed.get("source_alignment", "none")
        if source_alignment not in ALLOWED_SOURCE_ALIGNMENTS:
            source_alignment = "none"

        winning_side = parsed.get("winning_side", "neutral")
        if winning_side not in ALLOWED_WINNING_SIDES:
            winning_side = "neutral"

        canonical = {
            "status": status,
            "confidence": int(parsed.get("confidence", 0)),
            "source_alignment": source_alignment,
            "winning_side": winning_side,
            "short_reason": str(parsed.get("short_reason", ""))[:220],
        }

        # ---- STEP 6: settlement (deterministic, using the validated JSON). --
        terminal_statuses = {"fulfilled", "partial", "missed", "excluded", "invalid_oath"}

        verdict = {
            "oath_id": oath_id,
            "status": status,
            "confidence": canonical["confidence"],
            "source_alignment": canonical["source_alignment"],
            "winning_side": canonical["winning_side"],
            "short_reason": canonical["short_reason"],
            "canonical_json": to_json(canonical),
            "resolved_at": utcnow(),
            "resolved_at_unix": current_unix,
            "resolver": str(gl.message.sender_address),
        }
        self.verdicts[key] = to_json(verdict)

        oath["status"] = status
        oath["settled"] = status in terminal_statuses
        self.oaths[key] = to_json(oath)

    @gl.public.write
    def submit_appeal(
        self,
        oath_id: int,
        basis: str,
        new_evidence_url: str,
        argument: str,
    ) -> None:
        key = str(oath_id)
        assert key in self.oaths, "oath not found"

        oath = safe_loads(self.oaths[key], {})
        assert oath.get("settled", False), "oath is not settled"
        assert basis in ALLOWED_APPEAL_BASES, "invalid appeal basis"
        assert len(argument) > 20, "argument too short"

        verdict = safe_loads(self.verdicts.get(key, "{}"), {})
        assert verdict, "no verdict to appeal"
        appeal_deadline = int(verdict.get("resolved_at_unix", 0)) + APPEAL_WINDOW_SECONDS
        assert now_unix() <= appeal_deadline, "appeal window has closed"

        if new_evidence_url:
            assert new_evidence_url.startswith("https://") or new_evidence_url.startswith("http://"), \
                "new_evidence_url must be a valid URL"
            assert_source_permitted(new_evidence_url, oath.get("accepted_sources", ""))

        ap_list = safe_loads(self.appeals.get(key, "[]"), [])
        appeal_id = len(ap_list)

        ap_list.append({
            "appeal_id": appeal_id,
            "appellant": str(gl.message.sender_address),
            "basis": basis,
            "new_evidence_url": new_evidence_url,
            "argument": argument,
            "submitted_at": utcnow(),
            "resolved": False,
        })
        self.appeals[key] = to_json(ap_list)

        oath["appeal_count"] = oath.get("appeal_count", 0) + 1
        self.oaths[key] = to_json(oath)

    @gl.public.write
    def request_appeal_verdict(self, oath_id: int, appeal_id: int) -> None:
        key = str(oath_id)
        assert key in self.oaths, "oath not found"
        assert key in self.verdicts, "no verdict for this oath"

        ap_list = safe_loads(self.appeals.get(key, "[]"), [])
        assert appeal_id < len(ap_list), "appeal not found"

        appeal = ap_list[appeal_id]
        assert not appeal.get("resolved", False), "appeal already resolved"

        original_verdict = safe_loads(self.verdicts[key], {})
        basis = appeal["basis"]
        argument = appeal["argument"]
        new_evidence_url = appeal["new_evidence_url"]
        current_unix = now_unix()

        MAX_FETCHED_CHARS = 3000

        # ---- STEP 1: construct a FRESH appeal-review prompt. This is built
        # from the original verdict (as read-only context to review) and the
        # appellant's own basis/argument/new evidence - it does not reuse or
        # derive from the original verdict's raw model output in any way. --
        def build_appeal_prompt() -> str:
            if new_evidence_url:
                try:
                    new_evidence_content = gl.nondet.web.render(new_evidence_url)
                    new_evidence_content = new_evidence_content[:MAX_FETCHED_CHARS]
                except Exception as e:
                    new_evidence_content = f"(failed to fetch this source: {e})"
            else:
                new_evidence_content = "none"

            return f"""You are a GenLayer validator reviewing an appeal against a prior verdict on a public promise (Oath).

Current time (unix): {current_unix}

Original verdict: {to_json(original_verdict)}

Appeal basis: {basis}
Appellant argument: {argument}
New evidence URL: {new_evidence_url or 'none'}
Fetched new evidence content:
{new_evidence_content}

Decide whether the appeal materially changes the verdict. Base your decision strictly on the fetched content above, not on assumptions about the URL.

Return ONLY a valid JSON object with these keys:
- accept_appeal: true or false
- new_status: one of fulfilled, partial, missed, unverifiable, invalid_oath, excluded, needs_more_evidence
- confidence: integer 0-100
- source_alignment: one of strong, moderate, weak, conflicting, none
- winning_side: one of fulfilment, challenge, neutral
- short_reason: string under 220 characters

Return ONLY the JSON. No markdown. No explanation."""

        # ---- STEP 2: the nondeterministic appeal-judgment callback. Exactly
        # like the verdict path, this is the single source of truth for the
        # appeal's AI execution: build the fresh prompt, EXPLICITLY call
        # gl.nondet.exec_prompt (a second, independent model invocation -
        # never the verdict's cached result), and return the raw output
        # untouched. No JSON parsing happens in here. --------------------
        def nondet_appeal() -> str:
            prompt_text = build_appeal_prompt()
            raw_model_result = gl.nondet.exec_prompt(prompt_text)
            return raw_model_result

        task = "Review the appeal. Decide if it materially changes the verdict. Return only JSON."
        criteria = "Return only the JSON object with keys: accept_appeal, new_status, confidence, source_alignment, winning_side, short_reason."

        # ---- STEP 3: consensus over the fresh appeal judgment. -------------
        result_raw = gl.eq_principle.prompt_non_comparative(
            nondet_appeal,
            task=task,
            criteria=criteria,
        )

        # ---- STEP 4: extract/parse JSON from the raw consensus result
        # (deterministic, after consensus). --------------------------------
        raw = result_raw.strip() if isinstance(result_raw, str) else str(result_raw)
        parsed = safe_loads(raw, {})

        # ---- STEP 5: validate. Malformed/unparseable output safely falls
        # back to an empty dict, so `accept_appeal` reads as False below -
        # a parse failure can never be misread as an accepted appeal. -----
        accept = bool(parsed.get("accept_appeal", False))

        # ---- STEP 6: settlement (deterministic, using the validated JSON).
        if accept:
            new_status = parsed.get("new_status", original_verdict.get("status", "unverifiable"))
            if new_status not in ALLOWED_STATUSES:
                new_status = original_verdict.get("status", "unverifiable")

            source_alignment = parsed.get("source_alignment", original_verdict.get("source_alignment", "none"))
            if source_alignment not in ALLOWED_SOURCE_ALIGNMENTS:
                source_alignment = "none"

            winning_side = parsed.get("winning_side", original_verdict.get("winning_side", "neutral"))
            if winning_side not in ALLOWED_WINNING_SIDES:
                winning_side = "neutral"

            canonical = {
                "status": new_status,
                "confidence": int(parsed.get("confidence", 0)),
                "source_alignment": source_alignment,
                "winning_side": winning_side,
                "short_reason": str(parsed.get("short_reason", ""))[:220],
            }

            updated_verdict = {
                "oath_id": oath_id,
                "status": new_status,
                "confidence": canonical["confidence"],
                "source_alignment": canonical["source_alignment"],
                "winning_side": canonical["winning_side"],
                "short_reason": canonical["short_reason"],
                "canonical_json": to_json(canonical),
                "resolved_at": utcnow(),
                "resolved_at_unix": current_unix,
                "resolver": str(gl.message.sender_address),
            }
            self.verdicts[key] = to_json(updated_verdict)

            oath = safe_loads(self.oaths[key], {})
            terminal_statuses = {"fulfilled", "partial", "missed", "excluded", "invalid_oath"}
            oath["status"] = new_status
            oath["settled"] = new_status in terminal_statuses
            self.oaths[key] = to_json(oath)

        appeal["resolved"] = True
        ap_list[appeal_id] = appeal
        self.appeals[key] = to_json(ap_list)

    # ------------------------------------------------------------------ #
    #  VIEW METHODS                                                        #
    # ------------------------------------------------------------------ #

    @gl.public.view
    def get_oath(self, oath_id: int) -> dict:
        key = str(oath_id)
        assert key in self.oaths, "oath not found"
        return safe_loads(self.oaths[key], {})

    @gl.public.view
    def get_oath_count(self) -> int:
        return int(self.oath_count)

    @gl.public.view
    def get_evidence(self, oath_id: int) -> list:
        key = str(oath_id)
        return safe_loads(self.evidence.get(key, "[]"), [])

    @gl.public.view
    def get_verdict(self, oath_id: int) -> dict:
        key = str(oath_id)
        if key not in self.verdicts:
            return {}
        return safe_loads(self.verdicts[key], {})

    @gl.public.view
    def get_appeals(self, oath_id: int) -> list:
        key = str(oath_id)
        return safe_loads(self.appeals.get(key, "[]"), [])

    @gl.public.view
    def get_user_oaths(self, address: str) -> list:
        return safe_loads(self.user_oaths.get(address, "[]"), [])

    @gl.public.view
    def get_oath_summary(self, oath_id: int) -> dict:
        key = str(oath_id)
        assert key in self.oaths, "oath not found"
        oath = safe_loads(self.oaths[key], {})
        ev_list = safe_loads(self.evidence.get(key, "[]"), [])
        ap_list = safe_loads(self.appeals.get(key, "[]"), [])
        verdict = safe_loads(self.verdicts.get(key, "{}"), {})
        return {
            "oath_id": oath_id,
            "title": oath.get("title", ""),
            "creator": oath.get("creator", ""),
            "deadline_unix": oath.get("deadline_unix", 0),
            "status": oath.get("status", "active"),
            "settled": oath.get("settled", False),
            "category": oath.get("category", ""),
            "evidence_count": len(ev_list),
            "appeal_count": len(ap_list),
            "verdict_status": verdict.get("status", ""),
            "verdict_confidence": verdict.get("confidence", 0),
        }