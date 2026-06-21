# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


# ---------------------------------------------------------------------------
# OracleBoard — GenLayer Intelligent Contract
# Decentralized startup investment committee.
#
# GenLayer validators evaluate subjective startup investment quality and
# produce structured consensus investment memos stored on-chain.
# ---------------------------------------------------------------------------


ALLOWED_RECOMMENDATIONS = {
    "STRONG_INVEST", "INVEST", "WATCHLIST",
    "MORE_DILIGENCE", "PASS", "HIGH_RISK_PASS",
}

ALLOWED_RISK_LEVELS = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

ALLOWED_CONFIDENCE = {"LOW", "MODERATE", "HIGH"}


def clamp_score(v) -> u32:
    try:
        n = int(v)
        if n < 0:
            return u32(0)
        if n > 100:
            return u32(100)
        return u32(n)
    except Exception:
        return u32(50)


def score_to_band(score: u32) -> str:
    s = int(score)
    if s >= 80:
        return "STRONG"
    elif s >= 60:
        return "PROMISING"
    elif s >= 40:
        return "DEVELOPING"
    return "WEAK"


def to_json(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def safe_loads(raw: str, fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback


class OracleBoard(gl.Contract):
    # Storage — class-level annotations, zero-initialized automatically
    startups: TreeMap[str, str]        # startup_id -> StartupDossier JSON
    evaluations: TreeMap[str, str]     # startup_id -> EvaluationResult JSON
    round_updates: TreeMap[str, str]   # update_id  -> RoundUpdate JSON
    rereview_results: TreeMap[str, str]  # startup_id -> ReReviewResult JSON
    startup_ids: DynArray[str]

    # -----------------------------------------------------------------------
    # create_startup_dossier
    # -----------------------------------------------------------------------

    @gl.public.write
    def create_startup_dossier(
        self,
        startup_id: str,
        startup_name: str,
        one_liner: str,
        sector: str,
        stage: str,
        founder_name: str,
        founder_wallet: str,
        website: str,
        pitch_deck_ref: str,
        pitch_deck_hash: str,
        metrics_summary: str,
        roadmap_summary: str,
        market_summary: str,
        competitor_summary: str,
        funding_ask: str,
        round_type: str,
        use_of_funds: str,
        risk_disclosures: str,
    ) -> None:
        assert startup_id.strip(), "startup_id must not be empty"
        assert startup_name.strip(), "startup_name must not be empty"
        assert one_liner.strip(), "one_liner must not be empty"
        assert sector.strip(), "sector must not be empty"
        assert stage.strip(), "stage must not be empty"
        assert founder_wallet.strip(), "founder_wallet must not be empty"

        dossier = {
            "startup_id": startup_id,
            "startup_name": startup_name,
            "one_liner": one_liner,
            "sector": sector,
            "stage": stage,
            "founder_name": founder_name,
            "founder_wallet": founder_wallet,
            "website": website,
            "pitch_deck_ref": pitch_deck_ref,
            "pitch_deck_hash": pitch_deck_hash,
            "metrics_summary": metrics_summary,
            "roadmap_summary": roadmap_summary,
            "market_summary": market_summary,
            "competitor_summary": competitor_summary,
            "funding_ask": funding_ask,
            "round_type": round_type,
            "use_of_funds": use_of_funds,
            "risk_disclosures": risk_disclosures,
            "dossier_status": "SUBMITTED",
            "review_status": "NOT_STARTED",
            "final_recommendation": "UNREVIEWED",
            "latest_update_id": "",
        }
        self.startups[startup_id] = to_json(dossier)
        self.startup_ids.append(startup_id)

    # -----------------------------------------------------------------------
    # get_startup
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_startup(self, startup_id: str) -> str:
        raw = self.startups.get(startup_id, "")
        if not raw:
            return to_json({"error": "not_found"})
        dossier = safe_loads(raw, {})
        evaluation = safe_loads(self.evaluations.get(startup_id, ""), None)
        rereview = safe_loads(self.rereview_results.get(startup_id, ""), None)
        return to_json({
            "dossier": dossier,
            "evaluation": evaluation,
            "rereview_result": rereview,
        })

    # -----------------------------------------------------------------------
    # list_startups
    # -----------------------------------------------------------------------

    @gl.public.view
    def list_startups(self) -> str:
        result = []
        for sid in self.startup_ids:
            raw = self.startups.get(sid, "")
            if not raw:
                continue
            d = safe_loads(raw, {})
            ev_raw = self.evaluations.get(sid, "")
            ev = safe_loads(ev_raw, None)
            rr = safe_loads(self.rereview_results.get(sid, ""), None)
            entry = {
                "startup_id": d.get("startup_id", ""),
                "startup_name": d.get("startup_name", ""),
                "sector": d.get("sector", ""),
                "stage": d.get("stage", ""),
                "dossier_status": d.get("dossier_status", ""),
                "review_status": d.get("review_status", ""),
                "final_recommendation": d.get("final_recommendation", "UNREVIEWED"),
                "updated_at": d.get("updated_at", ""),
                "investment_score": ev.get("investment_score", 0) if ev else 0,
                "risk_level": ev.get("risk_level", "UNKNOWN") if ev else "UNKNOWN",
                "has_evaluation": ev is not None,
                "rereview_status": rr.get("rereview_status", "NO_REVIEW_REQUEST") if rr else "NO_REVIEW_REQUEST",
            }
            result.append(entry)
        return to_json(result)

    # -----------------------------------------------------------------------
    # start_consensus_evaluation
    # -----------------------------------------------------------------------

    @gl.public.write
    def start_consensus_evaluation(self, startup_id: str) -> None:
        raw = self.startups.get(startup_id, "")
        assert raw, "Startup not found"

        dossier = safe_loads(raw, {})
        dossier["review_status"] = "CONSENSUS_PENDING"
        self.startups[startup_id] = to_json(dossier)

        # Copy dossier fields to local memory before the nondet block
        startup_name = dossier.get("startup_name", "")
        one_liner = dossier.get("one_liner", "")
        sector = dossier.get("sector", "")
        stage = dossier.get("stage", "")
        founder_name = dossier.get("founder_name", "")
        metrics = dossier.get("metrics_summary", "")
        roadmap = dossier.get("roadmap_summary", "")
        market = dossier.get("market_summary", "")
        competitors = dossier.get("competitor_summary", "")
        funding_ask = dossier.get("funding_ask", "")
        round_type = dossier.get("round_type", "")
        use_of_funds = dossier.get("use_of_funds", "")
        risks = dossier.get("risk_disclosures", "")

        prompt = f"""You are participating in a decentralized startup investment committee.
Evaluate the startup based on the supplied dossier.
Do not invent unavailable metrics. Do not treat marketing language as proof.
Separate evidence-backed strengths from assumptions.
Return strict JSON only — no markdown, no code fences, no explanation.

STARTUP DOSSIER:
Name: {startup_name}
One-liner: {one_liner}
Sector: {sector}
Stage: {stage}
Founder: {founder_name}
Metrics: {metrics}
Roadmap: {roadmap}
Market: {market}
Competitors: {competitors}
Funding Ask: {funding_ask}
Round Type: {round_type}
Use of Funds: {use_of_funds}
Risk Disclosures: {risks}

EVALUATION RUBRIC:
- market_score (0-100): Is the market large, urgent, growing, and accessible?
- founder_score (0-100): Does the founder show domain insight or unfair advantage?
- execution_score (0-100): Does the team have skills to build and ship?
- traction_score (0-100): Are metrics real, meaningful, and directionally strong?
- business_model_score (0-100): Is the monetization plausible and scalable?
- defensibility_score (0-100): Is this startup differentiated against alternatives?
- investment_score (0-100): Is this an interesting opportunity relative to stage, risk, and upside?

ALLOWED recommendation values: STRONG_INVEST, INVEST, WATCHLIST, MORE_DILIGENCE, PASS, HIGH_RISK_PASS
ALLOWED risk_level values: LOW, MEDIUM, HIGH, CRITICAL
ALLOWED confidence values: LOW, MODERATE, HIGH

Return JSON matching exactly this structure:
{{
  "recommendation": "WATCHLIST",
  "market_score": 72,
  "founder_score": 68,
  "execution_score": 61,
  "traction_score": 54,
  "business_model_score": 60,
  "defensibility_score": 49,
  "investment_score": 63,
  "risk_level": "MEDIUM",
  "confidence": "MODERATE",
  "recommended_next_step": "REQUEST_MORE_CUSTOMER_PROOF",
  "memo_summary": "2-3 sentence executive summary.",
  "market_thesis": "Market opportunity assessment.",
  "founder_assessment": "Founder credibility and fit.",
  "execution_assessment": "Execution capability and roadmap.",
  "traction_assessment": "Traction quality and metrics.",
  "risk_summary": "Key risks to the investment thesis.",
  "red_flags": "Specific red flags or concerns.",
  "re_review_conditions": "What evidence would upgrade the recommendation."
}}"""

        def leader_fn():
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.calldata
            if not isinstance(data, dict):
                return False
            if data.get("recommendation") not in ALLOWED_RECOMMENDATIONS:
                return False
            if data.get("risk_level") not in ALLOWED_RISK_LEVELS:
                return False
            if data.get("confidence") not in ALLOWED_CONFIDENCE:
                return False
            for key in ("market_score", "founder_score", "execution_score",
                        "traction_score", "business_model_score",
                        "defensibility_score", "investment_score"):
                v = data.get(key)
                if not isinstance(v, (int, float)):
                    return False
                if not (0 <= int(v) <= 100):
                    return False
            return True

        try:
            raw_dict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        except Exception:
            d2 = safe_loads(self.startups.get(startup_id, ""), {})
            d2["review_status"] = "FAILED"
            self.startups[startup_id] = to_json(d2)
            return

        market_score = clamp_score(raw_dict.get("market_score", 50))
        founder_score = clamp_score(raw_dict.get("founder_score", 50))
        execution_score = clamp_score(raw_dict.get("execution_score", 50))
        traction_score = clamp_score(raw_dict.get("traction_score", 50))
        business_model_score = clamp_score(raw_dict.get("business_model_score", 50))
        defensibility_score = clamp_score(raw_dict.get("defensibility_score", 50))
        investment_score = clamp_score(raw_dict.get("investment_score", 50))

        rec = str(raw_dict.get("recommendation", "PASS")).upper()
        if rec not in ALLOWED_RECOMMENDATIONS:
            rec = "PASS"
        risk = str(raw_dict.get("risk_level", "MEDIUM")).upper()
        if risk not in ALLOWED_RISK_LEVELS:
            risk = "MEDIUM"
        conf = str(raw_dict.get("confidence", "MODERATE")).upper()
        if conf not in ALLOWED_CONFIDENCE:
            conf = "MODERATE"

        evaluation = {
            "startup_id": startup_id,
            "recommendation": rec,
            "market_score": int(market_score),
            "founder_score": int(founder_score),
            "execution_score": int(execution_score),
            "traction_score": int(traction_score),
            "business_model_score": int(business_model_score),
            "defensibility_score": int(defensibility_score),
            "investment_score": int(investment_score),
            "market_band": score_to_band(market_score),
            "founder_band": score_to_band(founder_score),
            "execution_band": score_to_band(execution_score),
            "traction_band": score_to_band(traction_score),
            "investment_band": score_to_band(investment_score),
            "risk_level": risk,
            "confidence": conf,
            "recommended_next_step": str(raw_dict.get("recommended_next_step", "")),
            "memo_summary": str(raw_dict.get("memo_summary", "")),
            "market_thesis": str(raw_dict.get("market_thesis", "")),
            "founder_assessment": str(raw_dict.get("founder_assessment", "")),
            "execution_assessment": str(raw_dict.get("execution_assessment", "")),
            "traction_assessment": str(raw_dict.get("traction_assessment", "")),
            "risk_summary": str(raw_dict.get("risk_summary", "")),
            "red_flags": str(raw_dict.get("red_flags", "")),
            "re_review_conditions": str(raw_dict.get("re_review_conditions", "")),
        }
        self.evaluations[startup_id] = to_json(evaluation)

        d3 = safe_loads(self.startups.get(startup_id, ""), {})
        d3["review_status"] = "MEMO_READY"
        d3["dossier_status"] = "MEMO_ISSUED"
        d3["final_recommendation"] = rec
        self.startups[startup_id] = to_json(d3)

    # -----------------------------------------------------------------------
    # submit_round_update
    # -----------------------------------------------------------------------

    @gl.public.write
    def submit_round_update(
        self,
        startup_id: str,
        update_id: str,
        submitted_by: str,
        update_type: str,
        new_metrics: str,
        new_milestones: str,
        new_evidence_ref: str,
        founder_response: str,
        requested_review_reason: str,
    ) -> None:
        assert self.startups.get(startup_id, ""), "Startup not found"

        update = {
            "update_id": update_id,
            "startup_id": startup_id,
            "submitted_by": submitted_by,
            "update_type": update_type,
            "new_metrics": new_metrics,
            "new_milestones": new_milestones,
            "new_evidence_ref": new_evidence_ref,
            "founder_response": founder_response,
            "requested_review_reason": requested_review_reason,
            "rereview_status": "UPDATE_SUBMITTED",
            "rereview_result": "",
        }
        self.round_updates[update_id] = to_json(update)

        d = safe_loads(self.startups.get(startup_id, ""), {})
        d["latest_update_id"] = update_id
        self.startups[startup_id] = to_json(d)

    # -----------------------------------------------------------------------
    # start_rereview
    # -----------------------------------------------------------------------

    @gl.public.write
    def start_rereview(self, startup_id: str, update_id: str) -> None:
        assert self.startups.get(startup_id, ""), "Startup not found"
        assert self.round_updates.get(update_id, ""), "Update not found"

        dossier = safe_loads(self.startups.get(startup_id, ""), {})
        original_eval = safe_loads(self.evaluations.get(startup_id, ""), {})
        update = safe_loads(self.round_updates.get(update_id, ""), {})

        update["rereview_status"] = "REREVIEW_PENDING"
        self.round_updates[update_id] = to_json(update)

        # Copy to local memory before nondet block
        startup_name = dossier.get("startup_name", "")
        sector = dossier.get("sector", "")
        stage = dossier.get("stage", "")
        founder_name = dossier.get("founder_name", "")
        orig_metrics = dossier.get("metrics_summary", "")
        orig_market = dossier.get("market_summary", "")
        orig_rec = str(original_eval.get("recommendation", "UNREVIEWED"))
        orig_memo = str(original_eval.get("memo_summary", ""))
        upd_type = update.get("update_type", "")
        new_metrics = update.get("new_metrics", "")
        new_milestones = update.get("new_milestones", "")
        new_evidence = update.get("new_evidence_ref", "")
        founder_resp = update.get("founder_response", "")
        review_reason = update.get("requested_review_reason", "")

        prompt = f"""You are participating in a decentralized startup investment committee re-review.

The startup previously received recommendation: {orig_rec}
Original memo summary: {orig_memo}

The founder has submitted new information. Evaluate whether this materially changes the investment thesis.
Do not invent metrics. Do not treat marketing language as proof.
Return strict JSON only — no markdown, no code fences, no explanation.

STARTUP:
Name: {startup_name}
Sector: {sector}
Stage: {stage}
Founder: {founder_name}
Original Metrics: {orig_metrics}
Original Market: {orig_market}

NEW FOUNDER UPDATE:
Update Type: {upd_type}
New Metrics: {new_metrics}
New Milestones: {new_milestones}
New Evidence: {new_evidence}
Founder Response: {founder_resp}
Re-review Reason: {review_reason}

Has the startup de-risked sufficiently to warrant upgrading the recommendation?
Are the new metrics credible and meaningful relative to stage?

ALLOWED recommendation values: STRONG_INVEST, INVEST, WATCHLIST, MORE_DILIGENCE, PASS, HIGH_RISK_PASS
ALLOWED risk_level values: LOW, MEDIUM, HIGH, CRITICAL
ALLOWED confidence values: LOW, MODERATE, HIGH

Return JSON matching exactly this structure:
{{
  "recommendation": "INVEST",
  "market_score": 75,
  "founder_score": 70,
  "execution_score": 65,
  "traction_score": 72,
  "business_model_score": 63,
  "defensibility_score": 55,
  "investment_score": 70,
  "risk_level": "MEDIUM",
  "confidence": "MODERATE",
  "recommended_next_step": "PROCEED_TO_TERM_SHEET",
  "memo_summary": "Updated committee assessment after new evidence review.",
  "market_thesis": "Updated market view.",
  "founder_assessment": "Updated founder assessment.",
  "execution_assessment": "Updated execution assessment.",
  "traction_assessment": "Updated traction assessment with new metrics.",
  "risk_summary": "Remaining risks post-update.",
  "red_flags": "Remaining red flags or new concerns.",
  "re_review_conditions": "What further evidence would complete the diligence."
}}"""

        def leader_fn():
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.calldata
            if not isinstance(data, dict):
                return False
            if data.get("recommendation") not in ALLOWED_RECOMMENDATIONS:
                return False
            if data.get("risk_level") not in ALLOWED_RISK_LEVELS:
                return False
            return True

        try:
            raw_dict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        except Exception:
            u2 = safe_loads(self.round_updates.get(update_id, ""), {})
            u2["rereview_status"] = "REREVIEW_REJECTED"
            self.round_updates[update_id] = to_json(u2)
            return

        rec = str(raw_dict.get("recommendation", "PASS")).upper()
        if rec not in ALLOWED_RECOMMENDATIONS:
            rec = "PASS"
        risk = str(raw_dict.get("risk_level", "MEDIUM")).upper()
        if risk not in ALLOWED_RISK_LEVELS:
            risk = "MEDIUM"
        conf = str(raw_dict.get("confidence", "MODERATE")).upper()
        if conf not in ALLOWED_CONFIDENCE:
            conf = "MODERATE"

        market_score = clamp_score(raw_dict.get("market_score", 50))
        founder_score = clamp_score(raw_dict.get("founder_score", 50))
        execution_score = clamp_score(raw_dict.get("execution_score", 50))
        traction_score = clamp_score(raw_dict.get("traction_score", 50))
        business_model_score = clamp_score(raw_dict.get("business_model_score", 50))
        defensibility_score = clamp_score(raw_dict.get("defensibility_score", 50))
        investment_score = clamp_score(raw_dict.get("investment_score", 50))

        rereview_result = {
            "startup_id": startup_id,
            "update_id": update_id,
            "original_recommendation": orig_rec,
            "rereview_status": "REREVIEW_READY",
            "recommendation": rec,
            "market_score": int(market_score),
            "founder_score": int(founder_score),
            "execution_score": int(execution_score),
            "traction_score": int(traction_score),
            "business_model_score": int(business_model_score),
            "defensibility_score": int(defensibility_score),
            "investment_score": int(investment_score),
            "market_band": score_to_band(market_score),
            "founder_band": score_to_band(founder_score),
            "execution_band": score_to_band(execution_score),
            "traction_band": score_to_band(traction_score),
            "investment_band": score_to_band(investment_score),
            "risk_level": risk,
            "confidence": conf,
            "recommended_next_step": str(raw_dict.get("recommended_next_step", "")),
            "memo_summary": str(raw_dict.get("memo_summary", "")),
            "market_thesis": str(raw_dict.get("market_thesis", "")),
            "founder_assessment": str(raw_dict.get("founder_assessment", "")),
            "execution_assessment": str(raw_dict.get("execution_assessment", "")),
            "traction_assessment": str(raw_dict.get("traction_assessment", "")),
            "risk_summary": str(raw_dict.get("risk_summary", "")),
            "red_flags": str(raw_dict.get("red_flags", "")),
            "re_review_conditions": str(raw_dict.get("re_review_conditions", "")),
        }
        self.rereview_results[startup_id] = to_json(rereview_result)

        u3 = safe_loads(self.round_updates.get(update_id, ""), {})
        u3["rereview_status"] = "REREVIEW_READY"
        u3["rereview_result"] = rec
        self.round_updates[update_id] = to_json(u3)

        d2 = safe_loads(self.startups.get(startup_id, ""), {})
        d2["final_recommendation"] = rec
        self.startups[startup_id] = to_json(d2)

    # -----------------------------------------------------------------------
    # get_round_update
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_round_update(self, update_id: str) -> str:
        return self.round_updates.get(update_id, to_json({"error": "not_found"}))
