"""Check whether the collaboration template has newer rule constraints.

The check is intentionally advisory by default. It never overwrites project
files. Use --strict in CI or a release gate when an unavailable check or a
newer policy revision should fail the command.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / ".template-source.json"


def load_config(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    required = {"schema", "source_repository", "source_branch", "policy_revision", "rule_paths", "check_command"}
    missing = sorted(required - value.keys())
    if missing:
        raise ValueError("TEMPLATE_SOURCE_CONFIG_MISSING:" + ",".join(missing))
    if value["schema"] != 1 or not isinstance(value["policy_revision"], int):
        raise ValueError("TEMPLATE_SOURCE_CONFIG_INVALID")
    if not isinstance(value["rule_paths"], list) or not value["rule_paths"]:
        raise ValueError("TEMPLATE_RULE_PATHS_REQUIRED")
    return value


def token() -> Optional[str]:
    for name in ("TEMPLATE_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"):
        if os.environ.get(name):
            return os.environ[name]
    gh = shutil.which("gh")
    if not gh:
        return None
    result = subprocess.run([gh, "auth", "token"], capture_output=True, text=True, check=False)
    return result.stdout.strip() if result.returncode == 0 else None


def fetch_source_config(config: dict) -> dict:
    repository = config["source_repository"]
    branch = config["source_branch"]
    url = f"https://api.github.com/repos/{repository}/contents/.template-source.json?ref={branch}"
    headers = {
        "Accept": "application/vnd.github.raw+json",
        "User-Agent": "dev-collaboration-template-check",
    }
    access_token = token()
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    request = Request(url, headers=headers)
    with urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict", action="store_true", help="fail when the check is unavailable or an update exists")
    parser.add_argument("--config", type=Path, default=CONFIG, help=argparse.SUPPRESS)
    parser.add_argument("--source-branch", help=argparse.SUPPRESS)
    args = parser.parse_args()

    try:
        local = load_config(args.config.resolve())
        if args.source_branch:
            local = {**local, "source_branch": args.source_branch}
        remote = fetch_source_config(local)
        remote = load_config_from_value(remote)
    except (OSError, ValueError, HTTPError, URLError, json.JSONDecodeError) as exc:
        print(f"TEMPLATE_RULE_CHECK_UNAVAILABLE: {exc}", file=sys.stderr)
        print("Review the template source or credentials, then rerun the check.", file=sys.stderr)
        return 1 if args.strict else 2

    local_revision = local["policy_revision"]
    remote_revision = remote["policy_revision"]
    if remote_revision > local_revision:
        print(f"TEMPLATE_RULE_UPDATE_AVAILABLE: local revision {local_revision}, source revision {remote_revision}")
        print(f"Review {local['source_repository']}@{local['source_branch']} and migrate applicable rule paths:")
        for path in remote["rule_paths"]:
            print(f"- {path}")
        return 1 if args.strict else 0
    if remote_revision < local_revision:
        print(f"LOCAL_TEMPLATE_RULE_REVISION_AHEAD: local revision {local_revision}, source revision {remote_revision}")
        return 1 if args.strict else 0

    print(f"Template rules up to date at revision {local_revision}.")
    return 0


def load_config_from_value(value: object) -> dict:
    if not isinstance(value, dict):
        raise ValueError("TEMPLATE_SOURCE_CONFIG_INVALID")
    required = {"schema", "source_repository", "source_branch", "policy_revision", "rule_paths", "check_command"}
    missing = sorted(required - value.keys())
    if missing:
        raise ValueError("REMOTE_TEMPLATE_SOURCE_CONFIG_MISSING:" + ",".join(missing))
    if value["schema"] != 1 or not isinstance(value["policy_revision"], int):
        raise ValueError("REMOTE_TEMPLATE_SOURCE_CONFIG_INVALID")
    if not isinstance(value["rule_paths"], list) or not value["rule_paths"]:
        raise ValueError("REMOTE_TEMPLATE_RULE_PATHS_REQUIRED")
    return value


if __name__ == "__main__":
    raise SystemExit(main())
