#!/usr/bin/env python3
"""Check OpenCode 2's skill API in an isolated, authenticated local server."""

import argparse
import base64
import json
import os
import re
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path

from validate_skills import frontmatter, skill_files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--opencode", default="opencode")
    parser.add_argument("--location", choices=["agents", "native"], default="agents")
    args = parser.parse_args()
    binary = shutil.which(args.opencode)
    if not binary:
        parser.error("OpenCode 2 is not installed")
    source = Path(__file__).resolve().parents[1] / "skills"
    expected = {frontmatter(p)["name"]: frontmatter(p).get("metadata", {}).get("opencode/autoinvoke") in (False, "false")
                for p in skill_files(source)}
    with tempfile.TemporaryDirectory(prefix="mako-opencode-") as temp:
        root = Path(temp)
        home, project = root / "home", root / "project"
        project.mkdir()
        install = home / (".agents/skills" if args.location == "agents" else ".config/opencode/skills")
        install.mkdir(parents=True)
        (install / "reese").symlink_to(source, target_is_directory=True)
        env = {"PATH": os.environ["PATH"], "HOME": str(home), "LANG": "C.UTF-8",
               "XDG_CONFIG_HOME": str(home / ".config"), "XDG_DATA_HOME": str(home / ".local/share"),
               "XDG_STATE_HOME": str(home / ".local/state"), "XDG_CACHE_HOME": str(home / ".cache")}
        log_path = root / "server.log"
        with log_path.open("wb") as log:
            process = subprocess.Popen([binary, "serve", "--hostname", "127.0.0.1", "--port", "0"],
                                       cwd=project, env=env, stdout=log, stderr=log, start_new_session=True)
            try:
                deadline = time.monotonic() + 30
                found = {}
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                while time.monotonic() < deadline:
                    if process.poll() is not None:
                        raise RuntimeError(f"OpenCode server exited: {process.returncode}")
                    text = log_path.read_text()
                    address = re.search(r"server listening on (http://127\.0\.0\.1:\d+)", text)
                    password = re.search(r"server password (\S+)", text)
                    if address and password:
                        token = base64.b64encode(("opencode:" + password[1]).encode()).decode()
                        url = address[1] + "/api/skill?" + urllib.parse.urlencode({"directory": str(project)})
                        request = urllib.request.Request(url, headers={"Authorization": "Basic " + token})
                        with opener.open(request, timeout=10) as response:
                            payload = json.load(response)
                        rows = payload.get("data", []) if isinstance(payload, dict) else payload
                        found = {row["id"]: row for row in rows if row["id"] in expected}
                        if found.keys() == expected.keys():
                            break
                    # The API is available before configuration plugins finish.
                    # Await that startup boundary rather than treating [] as final.
                    time.sleep(0.1)
                assert found.keys() == expected.keys(), {"missing": expected.keys() - found.keys()}
                for name, hidden in expected.items():
                    assert (found[name].get("autoinvoke") is False) == hidden, name
                    path = Path(found[name]["path"])
                    assert path.resolve().is_relative_to(source), path
                    assert path.is_file(), path
                mako = Path(found["mako"]["path"])
                for dependency in ["../architect/SKILL.md", "../writing/SKILL.md",
                                   "../principle-model-the-domain/SKILL.md"]:
                    assert (mako.parent / dependency).read_text()
            finally:
                if process.poll() is None:
                    os.killpg(process.pid, signal.SIGTERM)
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        process.wait()
        print(f"PASS: {len(expected)} skills discovered through {args.location} bundle symlink; {sum(expected.values())} explicit-only autoinvoke flags and dependency reads verified.")
        print("No model turn requested. Prompt-filter implementation was inspected separately; UI and model compliance are not tested here.")


if __name__ == "__main__":
    main()
