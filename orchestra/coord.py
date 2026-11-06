#!/usr/bin/env python3
"""A small, offline-first Git event log for agent coordination (Python stdlib)."""

import argparse
import copy
import datetime as dt
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import uuid

ROOT = Path(__file__).resolve().parent
ID = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$")
EVENT_ID = re.compile(r"^[0-9a-f]{32}$")
ISSUE_REF = re.compile(r"^([A-Za-z0-9][A-Za-z0-9-]{0,38})/([A-Za-z0-9_.-]{1,100})#([1-9][0-9]*)$")


def normalize_issue_ref(value):
    if not isinstance(value, str):
        return None
    match = ISSUE_REF.fullmatch(value)
    if not match:
        return None
    owner, repo, number = match.groups()
    return f"{owner.lower()}/{repo.lower()}#{int(number)}"


def mission_issue_ref(mission, projects):
    number = mission.get("issue")
    project = projects.get(mission.get("projectId"))
    repo = project.get("repo") if project else None
    if not isinstance(number, int) or isinstance(number, bool) or number < 1:
        return None
    if not isinstance(repo, str) or repo.count("/") != 1:
        return None
    return normalize_issue_ref(f"{repo}#{number}")


def valid_id(value):
    return isinstance(value, str) and bool(ID.fullmatch(value))


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


def valid_time(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z", value):
        return False
    try:
        dt.datetime.strptime(value, "%Y-%m-%dT%H:%M:%S.%fZ")
        return True
    except ValueError:
        return False


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".state-", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def read_events(root):
    events, warnings = [], []
    directory = root / "events"
    if not directory.exists():
        return events, warnings
    for path in sorted(directory.glob("*.json")):
        try:
            event = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(event, dict):
                raise ValueError("expected an object")
            event_id = event.get("id")
            if not isinstance(event_id, str) or not EVENT_ID.fullmatch(event_id) or path.stem != event_id:
                raise ValueError("id must match filename and be a lowercase UUID hex string")
            if event.get("schemaVersion") != 1 or not valid_time(event.get("timestamp")):
                raise ValueError("invalid schemaVersion or timestamp")
            kind = event.get("type")
            if not isinstance(kind, str) or kind not in {"register", "heartbeat", "claim", "release"}:
                raise ValueError("unknown event type")
            if not valid_id(event.get("agentId")):
                raise ValueError("invalid agentId")
            if kind in {"claim", "release"}:
                mission_id = event.get("missionId")
                issue_ref = event.get("issueRef")
                if bool(mission_id) == bool(issue_ref):
                    raise ValueError("claim/release must identify exactly one missionId or issueRef")
                if mission_id is not None and not valid_id(mission_id):
                    raise ValueError("invalid missionId")
                if issue_ref is not None and normalize_issue_ref(issue_ref) != issue_ref:
                    raise ValueError("invalid or non-normalized issueRef")
            if kind == "release" and (not isinstance(event.get("claimId"), str) or not EVENT_ID.fullmatch(event["claimId"])):
                raise ValueError("invalid claimId")
            events.append(event)
        except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as exc:
            warnings.append(f"{path.name}: {exc}")
    return events, warnings


def project(root):
    """Deterministic projection: active claims are a set, never a clock-based winner."""
    state = copy.deepcopy(json.loads((root / "seed.json").read_text(encoding="utf-8")))
    if state.get("schemaVersion") != 1:
        raise ValueError("unsupported seed schemaVersion")
    events, warnings = read_events(root)
    agents = {item["id"]: item for item in state["agents"]}
    missions = {item["id"]: item for item in state["missions"]}
    if len(agents) != len(state["agents"]) or len(missions) != len(state["missions"]):
        raise ValueError("duplicate agent or mission ID in seed")

    # Registrations are resolved by event ID, not timestamps; conflicting IDs are
    # reported and never silently overwritten. Registration is not authentication.
    registrations = {}
    for event in events:
        if event["type"] != "register":
            continue
        agent_id = event["agentId"]
        if not isinstance(event.get("name"), str) or not event["name"].strip() or not isinstance(event.get("role"), str):
            warnings.append(f"{event['id']}: invalid registration")
            continue
        registrations.setdefault(agent_id, []).append(event)
    for agent_id, records in sorted(registrations.items()):
        if agent_id in agents or len(records) != 1:
            warnings.append(f"registration conflict for {agent_id}; resolve duplicate identities manually")
            continue
        event = records[0]
        agents[agent_id] = {"id": agent_id, "name": event["name"], "role": event["role"]}
        state["agents"].append(agents[agent_id])
    for agent in state["agents"]:
        agent["lastHeartbeat"] = None
    for event in events:
        if event["type"] == "heartbeat":
            agent = agents.get(event["agentId"])
            if agent is None:
                warnings.append(f"{event['id']}: heartbeat from unknown agent")
                continue
            if agent["lastHeartbeat"] is None or event["timestamp"] > agent["lastHeartbeat"]:
                agent["lastHeartbeat"] = event["timestamp"]

    claims, issue_claims = {}, {}
    for event in events:
        if event["type"] != "claim":
            continue
        if event["agentId"] not in agents:
            warnings.append(f"{event['id']}: claim references unknown agent")
            continue
        if event.get("missionId") is not None:
            if event["missionId"] not in missions:
                warnings.append(f"{event['id']}: claim references unknown mission")
                continue
            claims[event["id"]] = event
        else:
            issue_claims[event["id"]] = event
    released, released_issues = set(), set()
    for event in events:
        if event["type"] != "release":
            continue
        claim_id = event.get("claimId")
        claim = claims.get(claim_id) if isinstance(claim_id, str) else None
        if claim is not None:
            if claim["agentId"] != event["agentId"] or claim["missionId"] != event.get("missionId"):
                warnings.append(f"{event['id']}: release does not match a claim by this agent")
                continue
            released.add(claim_id)
            continue
        claim = issue_claims.get(claim_id) if isinstance(claim_id, str) else None
        if (claim is None or claim["agentId"] != event["agentId"]
                or claim.get("issueRef") != event.get("issueRef")):
            warnings.append(f"{event['id']}: release does not match an issue claim by this agent")
            continue
        released_issues.add(claim_id)
    for mission in state["missions"]:
        active = [
            {"claimId": event["id"], "agentId": event["agentId"], "timestamp": event["timestamp"]}
            for event in claims.values()
            if event["missionId"] == mission["id"] and event["id"] not in released
        ]
        active.sort(key=lambda claim: claim["claimId"])
        mission["claims"] = active
        mission["claimStatus"] = "available" if not active else "claimed" if len(active) == 1 else "conflict"

    project_map = {item["id"]: item for item in state["projects"]}
    grouped_issue_claims = {}
    for event in claims.values():
        if event["id"] in released:
            continue
        mission = missions[event["missionId"]]
        issue_ref = mission_issue_ref(mission, project_map)
        if issue_ref:
            grouped_issue_claims.setdefault(issue_ref, []).append({
                "claimId": event["id"], "agentId": event["agentId"], "timestamp": event["timestamp"],
                "missionId": event["missionId"]
            })
    for event in issue_claims.values():
        if event["id"] in released_issues:
            continue
        grouped_issue_claims.setdefault(event["issueRef"], []).append({
            "claimId": event["id"], "agentId": event["agentId"], "timestamp": event["timestamp"]
        })
    state["issueClaims"] = [
        {"issueRef": issue_ref, "claims": sorted(active, key=lambda claim: claim["claimId"]),
         "claimStatus": "claimed" if len(active) == 1 else "conflict"}
        for issue_ref, active in sorted(grouped_issue_claims.items())
    ]

    # Dependencies are seed metadata, not clock-based. A mission is blocked until
    # every mission it depends on is done (or its GitHub issue is closed).
    complete = {
        mission["id"]
        for mission in state["missions"]
        if mission.get("status") == "done" or mission.get("githubState") == "closed"
    }
    for mission in state["missions"]:
        deps = mission.get("dependsOn", [])
        if not isinstance(deps, list):
            deps = []
        mission["dependsOn"] = [dep for dep in deps if isinstance(dep, str)]
        mission["blockedBy"] = [
            dep
            for dep in mission["dependsOn"]
            if dep in missions and dep != mission["id"] and dep not in complete
        ]
        mission["isBlocked"] = bool(mission["blockedBy"]) and mission.get("status") != "done"

    # Any malformed or ambiguous history may hide a claim. Fail closed globally.
    if warnings:
        for mission in state["missions"]:
            mission["claimStatus"] = "unknown"
    state["agents"].sort(key=lambda agent: agent["id"])
    state["protocol"] = {"version": 1, "warnings": sorted(warnings)}
    return state


def append_event(root, kind, agent_id, **fields):
    if not valid_id(agent_id):
        raise ValueError("agent ID must use letters, numbers, '.', '_' or '-' (max 80)")
    directory = root / "events"
    directory.mkdir(parents=True, exist_ok=True)
    event_id = uuid.uuid4().hex
    event = {"schemaVersion": 1, "id": event_id, "type": kind, "timestamp": now(), "agentId": agent_id, **fields}
    # Publish a complete file exclusively, without a shared append file.
    fd, temp = tempfile.mkstemp(prefix=".event-", suffix=".tmp", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(event, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.link(temp, directory / f"{event_id}.json")
    finally:
        os.unlink(temp)
    return event


def find(items, item_id):
    return next((item for item in items if item["id"] == item_id), None)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT, help="directory containing seed.json and events/")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("rebuild", help="recompute state.json from seed and event files")
    commands.add_parser("status", help="print the current projection without writing it")
    register = commands.add_parser("register")
    register.add_argument("agent")
    register.add_argument("--name", required=True)
    register.add_argument("--role", default="agent")
    heartbeat = commands.add_parser("heartbeat")
    heartbeat.add_argument("agent")
    claim = commands.add_parser("claim")
    claim.add_argument("agent")
    claim.add_argument("mission")
    release = commands.add_parser("release")
    release.add_argument("agent")
    release.add_argument("mission")
    release.add_argument("claim_id", help="exact claim ID to release")
    claim_issue = commands.add_parser("claim-issue", help="claim a GitHub issue using owner/repo#number")
    claim_issue.add_argument("agent")
    claim_issue.add_argument("issue")
    release_issue = commands.add_parser("release-issue", help="release an issue claim by its exact claim ID")
    release_issue.add_argument("agent")
    release_issue.add_argument("issue")
    release_issue.add_argument("claim_id", help="exact claim ID to release")
    args = parser.parse_args(argv)
    try:
        state = project(args.root)
        if args.command == "status":
            print(json.dumps(state, ensure_ascii=False, indent=2))
            return 0
        event = None
        if args.command == "register":
            if not args.name.strip():
                raise ValueError("name cannot be empty")
            if find(state["agents"], args.agent):
                raise ValueError("agent already exists")
            event = append_event(args.root, "register", args.agent, name=args.name, role=args.role)
        elif args.command in {"heartbeat", "claim", "release", "claim-issue", "release-issue"}:
            if not find(state["agents"], args.agent):
                raise ValueError("unknown agent; register it first")
            if args.command == "heartbeat":
                event = append_event(args.root, "heartbeat", args.agent)
            elif args.command in {"claim-issue", "release-issue"}:
                issue_ref = normalize_issue_ref(args.issue)
                if not issue_ref:
                    raise ValueError("issue must be written as owner/repo#number")
                if args.command == "claim-issue":
                    if state["protocol"]["warnings"]:
                        raise ValueError("protocol warnings make claims unsafe; reconcile history first")
                    active = next((item for item in state["issueClaims"] if item["issueRef"] == issue_ref), None)
                    if active:
                        raise ValueError("issue has active claims; reconcile or release them first")
                    event = append_event(args.root, "claim", args.agent, issueRef=issue_ref)
                else:
                    active = next((item for item in state["issueClaims"] if item["issueRef"] == issue_ref), None)
                    matching = [c for c in active["claims"] if c["claimId"] == args.claim_id and c["agentId"] == args.agent] if active else []
                    if not matching:
                        raise ValueError("issue claim is not active for this agent")
                    event = append_event(args.root, "release", args.agent, issueRef=issue_ref, claimId=args.claim_id)
            else:
                mission = find(state["missions"], args.mission)
                if mission is None:
                    raise ValueError("unknown mission")
                if args.command == "claim":
                    if state["protocol"]["warnings"]:
                        raise ValueError("protocol warnings make claims unsafe; reconcile history first")
                    if mission.get("isBlocked"):
                        raise ValueError("mission is blocked by " + ", ".join(mission["blockedBy"]))
                    if mission["claims"]:
                        raise ValueError("mission has active claims; reconcile or release them first")
                    issue_ref = mission_issue_ref(mission, {item["id"]: item for item in state["projects"]})
                    active = next((item for item in state["issueClaims"] if item["issueRef"] == issue_ref), None) if issue_ref else None
                    if active:
                        raise ValueError("GitHub issue has an active claim; reconcile or release it first")
                    event = append_event(args.root, "claim", args.agent, missionId=args.mission)
                else:
                    matching = [c for c in mission["claims"] if c["claimId"] == args.claim_id and c["agentId"] == args.agent]
                    if not matching:
                        raise ValueError("claim is not active for this agent and mission")
                    event = append_event(args.root, "release", args.agent, missionId=args.mission, claimId=args.claim_id)
        state = project(args.root)
        atomic_json(args.root / "state.json", state)
        if event:
            print(json.dumps(event, ensure_ascii=False))
        else:
            print(f"Rebuilt {args.root / 'state.json'}")
        if state["protocol"]["warnings"]:
            print("Warning: projection contains protocol warnings; see state.json", file=sys.stderr)
        return 0
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
