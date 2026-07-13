"""
Direct tests for OathContract, run against a live GenLayer Studio simulator.

Run with:
  genlayer test tests/direct/test_oath_contract.py
(requires a running GenLayer Studio simulator - see docs.genlayer.com)

This uses the real `gltest` testing framework (package `genlayer-test`).
There is no mocking hook for gl.eq_principle nondeterministic calls: the
verdict/appeal tests below exercise the actual LLM judgment against real,
stable, unambiguous public evidence so the outcome is reliable.
"""

import time

from gltest import get_contract_factory, accounts
from gltest.assertions import tx_execution_succeeded

CREATOR = accounts[0]
WATCHER = accounts[1]
RESOLVER = accounts[2]
APPELLANT = accounts[3]

TERMINAL_STATUSES = {"fulfilled", "partial", "missed", "excluded", "invalid_oath"}

OATH_FIELD_ORDER = [
    "title", "promise", "deadline_unix", "success_criteria",
    "required_deliverables", "accepted_sources", "exclusions",
    "stakeholder_notes", "category",
]

VALID_OATH = {
    "title": "Public Beta Launch",
    "promise": "The team will launch a public beta of the app before the deadline, including wallet login and a working demo flow.",
    "deadline_unix": 9999999999,
    "success_criteria": "A public URL must be live before the deadline with wallet login and demo flow accessible without invite.",
    "required_deliverables": "Public URL, wallet login, demo flow",
    "accepted_sources": "Official website (example.com), GitHub release, public demo URL",
    "exclusions": "Scheduled third-party infrastructure outage lasting more than 24 hours.",
    "stakeholder_notes": "Announced on Twitter.",
    "category": "Product Launch",
}

# A promise whose fulfilment is an undisputed, permanently documented public
# fact, so the real validator LLM reaches a reliable, stable verdict.
SETTLEABLE_OATH = {
    "title": "Bitcoin Genesis Block Mined",
    "promise": "The Bitcoin genesis block (block 0) will have been mined by Satoshi Nakamoto before the deadline, marking the launch of the Bitcoin network.",
    "deadline_unix": 1230940800,  # 2009-01-03T00:00:00Z, already in the past
    "success_criteria": "The Bitcoin genesis block must be publicly documented as mined on or before 2009-01-03.",
    "required_deliverables": "A mined and publicly recorded genesis block",
    "accepted_sources": "en.wikipedia.org, bitcoin.org",
    "exclusions": "None.",
    "stakeholder_notes": "Historical, well-documented event.",
    "category": "History",
}


def oath_args(oath):
    return [oath[k] for k in OATH_FIELD_ORDER]


def deploy_contract():
    factory = get_contract_factory("OathContract")
    return factory.deploy(account=CREATOR)


def _settle_oath_with_evidence(contract, oath):
    create_result = contract.create_oath(args=oath_args(oath))
    assert tx_execution_succeeded(create_result)

    oath_id = 0
    watcher_contract = contract.connect(WATCHER)
    evidence_result = watcher_contract.submit_evidence(
        args=[
            oath_id,
            "https://en.wikipedia.org/wiki/Genesis_block",
            "encyclopedia_article",
            "Wikipedia documents the Bitcoin genesis block as mined by Satoshi Nakamoto on January 3, 2009.",
            "fulfilment",
        ]
    )
    assert tx_execution_succeeded(evidence_result)

    resolver_contract = contract.connect(RESOLVER)
    verdict_result = resolver_contract.request_verdict(args=[oath_id])
    assert tx_execution_succeeded(verdict_result)
    return oath_id


# ------------------------------------------------------------------ #
#  OATH CREATION                                                       #
# ------------------------------------------------------------------ #

def test_create_oath_success():
    contract = deploy_contract()
    result = contract.create_oath(args=oath_args(VALID_OATH))
    assert tx_execution_succeeded(result)
    assert contract.get_oath_count(args=[]) == 1


def test_create_oath_title_too_short():
    contract = deploy_contract()
    bad_oath = {**VALID_OATH, "title": "Hi"}
    result = contract.create_oath(args=oath_args(bad_oath))
    assert not tx_execution_succeeded(result)


# ------------------------------------------------------------------ #
#  EVIDENCE                                                            #
# ------------------------------------------------------------------ #

def test_submit_evidence_success():
    contract = deploy_contract()
    contract.create_oath(args=oath_args(VALID_OATH))

    watcher_contract = contract.connect(WATCHER)
    result = watcher_contract.submit_evidence(
        args=[0, "https://example.com/beta", "product_page",
              "The beta was launched publicly at this URL before the deadline.",
              "fulfilment"]
    )
    assert tx_execution_succeeded(result)
    evidence = contract.get_evidence(args=[0])
    assert len(evidence) == 1
    assert evidence[0]["side"] == "fulfilment"


def test_submit_evidence_source_not_permitted():
    contract = deploy_contract()
    contract.create_oath(args=oath_args(VALID_OATH))

    watcher_contract = contract.connect(WATCHER)
    result = watcher_contract.submit_evidence(
        args=[0, "https://not-an-accepted-source.test/page", "other",
              "Some claim about the oath result here.", "fulfilment"]
    )
    assert not tx_execution_succeeded(result)


def test_submit_evidence_invalid_url():
    contract = deploy_contract()
    contract.create_oath(args=oath_args(VALID_OATH))

    watcher_contract = contract.connect(WATCHER)
    result = watcher_contract.submit_evidence(
        args=[0, "not-a-url", "other", "Some claim about the oath result here.", "fulfilment"]
    )
    assert not tx_execution_succeeded(result)


# ------------------------------------------------------------------ #
#  REQUEST VERDICT                                                     #
# ------------------------------------------------------------------ #

def test_request_verdict_no_evidence():
    contract = deploy_contract()
    contract.create_oath(args=oath_args(VALID_OATH))

    resolver_contract = contract.connect(RESOLVER)
    result = resolver_contract.request_verdict(args=[0])
    assert not tx_execution_succeeded(result)


def test_request_verdict_not_due():
    """Deterministic path: a future deadline must settle as not_due without an LLM call."""
    contract = deploy_contract()
    future_oath = {**VALID_OATH, "deadline_unix": int(time.time()) + 3600}
    contract.create_oath(args=oath_args(future_oath))

    watcher_contract = contract.connect(WATCHER)
    watcher_contract.submit_evidence(
        args=[0, "https://example.com/beta", "product_page",
              "The beta was launched publicly at this URL before the deadline.",
              "fulfilment"]
    )

    resolver_contract = contract.connect(RESOLVER)
    result = resolver_contract.request_verdict(args=[0])
    assert tx_execution_succeeded(result)

    verdict = contract.get_verdict(args=[0])
    assert verdict["status"] == "not_due"

    oath = contract.get_oath(args=[0])
    assert oath["settled"] is False


# ------------------------------------------------------------------ #
#  END-TO-END SETTLED VERDICT + APPEAL                                 #
# ------------------------------------------------------------------ #

def test_settled_verdict_and_appeal_flow():
    """
    Full happy path through the real nondeterministic contract logic:
    create -> submit evidence -> request_verdict settles the oath via a real
    LLM judgment -> submit_appeal -> request_appeal_verdict resolves the
    appeal via a second real LLM judgment.
    """
    contract = deploy_contract()
    oath_id = _settle_oath_with_evidence(contract, SETTLEABLE_OATH)

    oath = contract.get_oath(args=[oath_id])
    assert oath["settled"] is True
    assert oath["status"] in TERMINAL_STATUSES

    verdict = contract.get_verdict(args=[oath_id])
    assert verdict["status"] in TERMINAL_STATUSES
    assert verdict["resolved_at_unix"] > 0

    appellant_contract = contract.connect(APPELLANT)
    appeal_result = appellant_contract.submit_appeal(
        args=[
            oath_id,
            "new_evidence",
            "https://bitcoin.org/en/",
            "The genesis block timestamp deserves a second look against the official bitcoin.org project history.",
        ]
    )
    assert tx_execution_succeeded(appeal_result)

    appeals = contract.get_appeals(args=[oath_id])
    assert len(appeals) == 1
    assert appeals[0]["resolved"] is False

    resolver_contract = contract.connect(RESOLVER)
    appeal_verdict_result = resolver_contract.request_appeal_verdict(args=[oath_id, 0])
    assert tx_execution_succeeded(appeal_verdict_result)

    appeals_after = contract.get_appeals(args=[oath_id])
    assert appeals_after[0]["resolved"] is True

    final_verdict = contract.get_verdict(args=[oath_id])
    assert final_verdict["status"] in TERMINAL_STATUSES


# ------------------------------------------------------------------ #
#  APPEAL VALIDATION                                                   #
# ------------------------------------------------------------------ #

def test_submit_appeal_on_unsettled_oath():
    contract = deploy_contract()
    contract.create_oath(args=oath_args(VALID_OATH))
    watcher_contract = contract.connect(WATCHER)
    watcher_contract.submit_evidence(
        args=[0, "https://example.com/beta", "product_page",
              "The beta was launched publicly at this URL before the deadline.",
              "fulfilment"]
    )

    appellant_contract = contract.connect(APPELLANT)
    result = appellant_contract.submit_appeal(
        args=[0, "new_evidence", "https://example.com/new",
              "This new evidence clearly shows the beta was not actually public."]
    )
    assert not tx_execution_succeeded(result)


def test_submit_appeal_invalid_basis():
    contract = deploy_contract()
    oath_id = _settle_oath_with_evidence(contract, SETTLEABLE_OATH)

    appellant_contract = contract.connect(APPELLANT)
    result = appellant_contract.submit_appeal(
        args=[oath_id, "i_just_disagree", "",
              "I simply disagree with the verdict and want to appeal it."]
    )
    assert not tx_execution_succeeded(result)


def test_submit_appeal_source_not_permitted():
    contract = deploy_contract()
    oath_id = _settle_oath_with_evidence(contract, SETTLEABLE_OATH)

    appellant_contract = contract.connect(APPELLANT)
    result = appellant_contract.submit_appeal(
        args=[oath_id, "new_evidence", "https://not-an-accepted-source.test/page",
              "This new evidence should be rejected because the domain is not permitted."]
    )
    assert not tx_execution_succeeded(result)


# ------------------------------------------------------------------ #
#  VIEW METHODS                                                        #
# ------------------------------------------------------------------ #

def test_get_oath():
    contract = deploy_contract()
    contract.create_oath(args=oath_args(VALID_OATH))
    oath = contract.get_oath(args=[0])
    assert oath["title"] == VALID_OATH["title"]
    assert oath["status"] == "active"
    assert oath["settled"] is False


def test_get_verdict_empty():
    contract = deploy_contract()
    contract.create_oath(args=oath_args(VALID_OATH))
    verdict = contract.get_verdict(args=[0])
    assert verdict == {} or verdict is None


def test_get_user_oaths():
    contract = deploy_contract()
    contract.create_oath(args=oath_args(VALID_OATH))
    contract.create_oath(args=oath_args(VALID_OATH))
    user_oaths = contract.get_user_oaths(args=[str(CREATOR.address)])
    assert 0 in user_oaths
    assert 1 in user_oaths


def test_get_oath_summary():
    contract = deploy_contract()
    contract.create_oath(args=oath_args(VALID_OATH))
    summary = contract.get_oath_summary(args=[0])
    assert summary["title"] == VALID_OATH["title"]
    assert summary["evidence_count"] == 0
    assert summary["settled"] is False
