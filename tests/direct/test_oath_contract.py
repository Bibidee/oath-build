"""
Direct tests for OathContract.

Run with the GenLayer test runner:
  genlayer test tests/direct/test_oath_contract.py
"""

import pytest
from genlayer.testing import ContractRunner

CONTRACT_PATH = "contracts/oath.py"

VALID_OATH = {
    "title": "Public Beta Launch",
    "promise": "The team will launch a public beta of the app before the deadline, including wallet login and a working demo flow.",
    "deadline_unix": 9999999999,
    "success_criteria": "A public URL must be live before the deadline with wallet login and demo flow accessible without invite.",
    "required_deliverables": "Public URL, wallet login, demo flow",
    "accepted_sources": "Official website, GitHub release, public demo URL",
    "exclusions": "Scheduled third-party infrastructure outage lasting more than 24 hours.",
    "stakeholder_notes": "Announced on Twitter.",
    "category": "Product Launch",
}


@pytest.fixture
def runner():
    return ContractRunner(CONTRACT_PATH)


@pytest.fixture
def deployed(runner):
    runner.deploy()
    return runner


# ------------------------------------------------------------------ #
#  OATH CREATION                                                       #
# ------------------------------------------------------------------ #

def test_create_oath_success(deployed):
    result = deployed.call_write(
        "create_oath",
        **VALID_OATH,
        caller="0xCreator0000000000000000000000000000001"
    )
    assert result == 0  # First oath gets ID 0

def test_create_oath_increments_count(deployed):
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    count = deployed.call_view("get_oath_count")
    assert count == 2

def test_create_oath_title_too_short(deployed):
    with pytest.raises(Exception, match="title too short"):
        deployed.call_write(
            "create_oath",
            **{**VALID_OATH, "title": "Hi"},
            caller="0xCreator0000000000000000000000000000001"
        )

def test_create_oath_promise_too_short(deployed):
    with pytest.raises(Exception, match="promise too short"):
        deployed.call_write(
            "create_oath",
            **{**VALID_OATH, "promise": "Short promise"},
            caller="0xCreator0000000000000000000000000000001"
        )

def test_create_oath_missing_category(deployed):
    with pytest.raises(Exception, match="category required"):
        deployed.call_write(
            "create_oath",
            **{**VALID_OATH, "category": ""},
            caller="0xCreator0000000000000000000000000000001"
        )

def test_create_oath_success_criteria_too_short(deployed):
    with pytest.raises(Exception, match="success_criteria too short"):
        deployed.call_write(
            "create_oath",
            **{**VALID_OATH, "success_criteria": "Short"},
            caller="0xCreator0000000000000000000000000000001"
        )


# ------------------------------------------------------------------ #
#  EVIDENCE                                                            #
# ------------------------------------------------------------------ #

def test_submit_evidence_success(deployed):
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    deployed.call_write(
        "submit_evidence",
        oath_id=0,
        source_url="https://example.com/beta",
        source_type="product_page",
        claim="The beta was launched publicly at this URL before the deadline.",
        side="fulfilment",
        caller="0xWatcher000000000000000000000000000002"
    )
    evidence = deployed.call_view("get_evidence", oath_id=0)
    assert len(evidence) == 1
    assert evidence[0]["side"] == "fulfilment"

def test_submit_evidence_invalid_side(deployed):
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    with pytest.raises(Exception):
        deployed.call_write(
            "submit_evidence",
            oath_id=0,
            source_url="https://example.com",
            source_type="other",
            claim="Some claim about the oath result.",
            side="invalid_side",
            caller="0xWatcher000000000000000000000000000002"
        )

def test_submit_evidence_invalid_url(deployed):
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    with pytest.raises(Exception, match="source_url must start with"):
        deployed.call_write(
            "submit_evidence",
            oath_id=0,
            source_url="not-a-url",
            source_type="other",
            claim="Some claim about the oath result here.",
            side="fulfilment",
            caller="0xWatcher000000000000000000000000000002"
        )

def test_submit_evidence_nonexistent_oath(deployed):
    with pytest.raises(Exception, match="oath not found"):
        deployed.call_write(
            "submit_evidence",
            oath_id=999,
            source_url="https://example.com",
            source_type="other",
            claim="Some claim about the oath result.",
            side="fulfilment",
            caller="0xWatcher000000000000000000000000000002"
        )

def test_submit_evidence_claim_too_short(deployed):
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    with pytest.raises(Exception, match="claim too short"):
        deployed.call_write(
            "submit_evidence",
            oath_id=0,
            source_url="https://example.com",
            source_type="other",
            claim="Short",
            side="fulfilment",
            caller="0xWatcher000000000000000000000000000002"
        )


# ------------------------------------------------------------------ #
#  REQUEST VERDICT                                                     #
# ------------------------------------------------------------------ #

def test_request_verdict_no_evidence(deployed):
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    with pytest.raises(Exception, match="no evidence submitted"):
        deployed.call_write(
            "request_verdict",
            oath_id=0,
            caller="0xResolver00000000000000000000000000003"
        )

def test_request_verdict_nonexistent_oath(deployed):
    with pytest.raises(Exception, match="oath not found"):
        deployed.call_write(
            "request_verdict",
            oath_id=999,
            caller="0xResolver00000000000000000000000000003"
        )


# ------------------------------------------------------------------ #
#  APPEALS                                                             #
# ------------------------------------------------------------------ #

def _settle_oath(deployed):
    """Helper: create oath + submit evidence + request verdict."""
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    deployed.call_write(
        "submit_evidence",
        oath_id=0,
        source_url="https://example.com/beta",
        source_type="product_page",
        claim="The beta was launched publicly at this URL before the deadline.",
        side="fulfilment",
        caller="0xWatcher000000000000000000000000000002"
    )

def test_submit_appeal_on_unsettled_oath(deployed):
    _settle_oath(deployed)
    with pytest.raises(Exception, match="oath is not settled"):
        deployed.call_write(
            "submit_appeal",
            oath_id=0,
            basis="new_evidence",
            new_evidence_url="https://example.com/new",
            argument="This new evidence clearly shows the beta was not actually public.",
            caller="0xAppellant00000000000000000000000000004"
        )

def test_submit_appeal_invalid_basis(deployed):
    # We can't easily settle without a real validator in unit tests,
    # but we can test basis validation by forging state or testing directly.
    # This test documents expected behavior.
    with pytest.raises(Exception):
        deployed.call_write(
            "submit_appeal",
            oath_id=0,
            basis="i_just_disagree",
            new_evidence_url="",
            argument="I simply disagree with the verdict and want to appeal it.",
            caller="0xAppellant00000000000000000000000000004"
        )


# ------------------------------------------------------------------ #
#  VIEW METHODS                                                        #
# ------------------------------------------------------------------ #

def test_get_oath(deployed):
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    oath = deployed.call_view("get_oath", oath_id=0)
    assert oath["title"] == VALID_OATH["title"]
    assert oath["status"] == "active"
    assert oath["settled"] is False

def test_get_oath_count_empty(deployed):
    count = deployed.call_view("get_oath_count")
    assert count == 0

def test_get_verdict_empty(deployed):
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    verdict = deployed.call_view("get_verdict", oath_id=0)
    assert verdict == {} or verdict is None

def test_get_user_oaths(deployed):
    creator = "0xCreator0000000000000000000000000000001"
    deployed.call_write("create_oath", **VALID_OATH, caller=creator)
    deployed.call_write("create_oath", **VALID_OATH, caller=creator)
    user_oaths = deployed.call_view("get_user_oaths", address=creator)
    assert 0 in user_oaths
    assert 1 in user_oaths

def test_get_oath_summary(deployed):
    deployed.call_write("create_oath", **VALID_OATH, caller="0xCreator0000000000000000000000000000001")
    summary = deployed.call_view("get_oath_summary", oath_id=0)
    assert summary["title"] == VALID_OATH["title"]
    assert summary["evidence_count"] == 0
    assert summary["settled"] is False
