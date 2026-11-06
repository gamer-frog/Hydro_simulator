import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "coord.py"


class ProtocolTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "one"
        self.root.mkdir()
        shutil.copy(HERE / "seed.json", self.root / "seed.json")

    def run_cli(self, *args, root=None, ok=True):
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(root or self.root), *args],
            text=True, capture_output=True,
        )
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
        return result

    def state(self, root=None):
        return json.loads(self.run_cli("status", root=root).stdout)

    def mission(self, root=None):
        return next(x for x in self.state(root)["missions"] if x["id"] == "mission-onboarding")

    def test_registration_heartbeat_claim_release(self):
        self.run_cli("register", "worker", "--name", "Worker", "--role", "builder")
        self.run_cli("heartbeat", "worker")
        agent = next(a for a in self.state()["agents"] if a["id"] == "worker")
        self.assertIsNotNone(agent["lastHeartbeat"])
        event = json.loads(self.run_cli("claim", "worker", "mission-onboarding").stdout)
        self.assertEqual(self.mission()["claimStatus"], "claimed")
        self.run_cli("claim", "sol", "mission-onboarding", ok=False)
        self.run_cli("release", "sol", "mission-onboarding", event["id"], ok=False)
        self.run_cli("release", "worker", "mission-onboarding", event["id"])
        self.assertEqual(self.mission()["claimStatus"], "available")
        self.run_cli("release", "worker", "mission-onboarding", event["id"], ok=False)
        self.assertEqual(self.state(), json.loads((self.root / "state.json").read_text()))

    def test_divergent_claims_merge_without_picking_a_winner(self):
        other = Path(self.temp.name) / "two"
        shutil.copytree(self.root, other)
        first = json.loads(self.run_cli("claim", "luna", "mission-onboarding").stdout)
        second = json.loads(self.run_cli("claim", "sol", "mission-onboarding", root=other).stdout)
        shutil.copy(other / "events" / (second["id"] + ".json"), self.root / "events")
        self.assertEqual(self.mission()["claimStatus"], "conflict")
        self.assertEqual(len(self.mission()["claims"]), 2)
        self.run_cli("claim", "pip", "mission-onboarding", ok=False)
        self.run_cli("release", "sol", "mission-onboarding", second["id"])
        self.assertEqual(self.mission()["claimStatus"], "claimed")
        self.run_cli("release", "luna", "mission-onboarding", first["id"])
        self.assertEqual(self.mission()["claimStatus"], "available")

    def test_blocked_missions_cannot_be_claimed(self):
        state = self.state()
        demo = next(mission for mission in state["missions"] if mission["id"] == "mission-demo")
        self.assertTrue(demo["isBlocked"])
        self.assertIn("mission-onboarding", demo["blockedBy"])
        self.run_cli("claim", "luna", "mission-demo", ok=False)
        # mission-memory depends on a completed mission, so it stays claimable.
        self.run_cli("claim", "luna", "mission-memory")
        memory = next(mission for mission in self.state()["missions"] if mission["id"] == "mission-memory")
        self.assertFalse(memory["isBlocked"])
        self.assertEqual(memory["claimStatus"], "claimed")

    def test_issue_claims_support_unseeded_issues_and_share_identity_with_missions(self):
        event = json.loads(self.run_cli("claim-issue", "luna", "Gamer-Frog/PlayGround#999").stdout)
        state = self.state()
        issue_claim = next(x for x in state["issueClaims"] if x["issueRef"] == "gamer-frog/playground#999")
        self.assertEqual(issue_claim["claims"][0]["claimId"], event["id"])
        self.run_cli("claim-issue", "sol", "gamer-frog/playground#999", ok=False)
        self.run_cli("release-issue", "sol", "gamer-frog/playground#999", event["id"], ok=False)
        self.run_cli("release-issue", "luna", "gamer-frog/playground#999", event["id"])
        self.assertNotIn("gamer-frog/playground#999", [x["issueRef"] for x in self.state()["issueClaims"]])

        mission_claim = json.loads(self.run_cli("claim", "luna", "mission-onboarding").stdout)
        self.assertEqual(self.state()["issueClaims"][0]["issueRef"], "gamer-frog/playground#42")
        self.run_cli("claim-issue", "sol", "gamer-frog/PlayGround#42", ok=False)
        self.run_cli("release", "luna", "mission-onboarding", mission_claim["id"])

    def test_bad_history_fails_closed(self):
        events = self.root / "events"
        events.mkdir()
        (events / ("a" * 32 + ".json")).write_text('{"broken": true}')
        state = self.state()
        self.assertTrue(state["protocol"]["warnings"])
        self.assertTrue(all(m["claimStatus"] == "unknown" for m in state["missions"]))
        self.run_cli("claim", "luna", "mission-onboarding", ok=False)

    def test_projection_is_deterministic(self):
        self.run_cli("heartbeat", "sol")
        self.run_cli("rebuild")
        first = (self.root / "state.json").read_bytes()
        self.run_cli("rebuild")
        self.assertEqual(first, (self.root / "state.json").read_bytes())


if __name__ == "__main__":
    unittest.main()
