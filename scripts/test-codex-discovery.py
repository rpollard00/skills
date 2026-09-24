#!/usr/bin/env python3
"""Check Codex discovery and prompt filtering without requesting a model turn."""

import argparse
import json
import os
import re
import select
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

import yaml
from validate_skills import frontmatter, skill_files


def request(process, payload, pending):
    process.stdin.write((json.dumps(payload) + "\n").encode())
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        while b"\n" in pending:
            line, _, rest = pending.partition(b"\n")
            pending[:] = rest
            message = json.loads(line)
            if message.get("id") == payload["id"]:
                if "error" in message:
                    raise RuntimeError(message["error"])
                return message["result"]
        ready, _, _ = select.select([process.stdout], [], [], max(0, deadline - time.monotonic()))
        if not ready:
            break
        chunk = os.read(process.stdout.fileno(), 65536)
        if not chunk:
            break
        pending.extend(chunk)
    raise RuntimeError(f"No response to {payload['method']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex", default="codex")
    parser.add_argument("--location", choices=["agents", "native"], default="native")
    args = parser.parse_args()
    binary = shutil.which(args.codex)
    if not binary:
        parser.error("Codex CLI is not installed")
    source = Path(__file__).resolve().parents[1] / "skills"
    expected = {frontmatter(p)["name"] for p in skill_files(source)}
    hidden = set()
    for path in skill_files(source):
        metadata = path.parent / "agents/openai.yaml"
        if metadata.exists() and yaml.safe_load(metadata.read_text()).get("policy", {}).get("allow_implicit_invocation") is False:
            hidden.add(frontmatter(path)["name"])
    with tempfile.TemporaryDirectory(prefix="mako-codex-") as temp:
        root = Path(temp)
        home, project = root / "home", root / "project"
        codex_home = home / ".codex"
        codex_home.mkdir(parents=True)
        project.mkdir()
        install = (home / ".agents/skills") if args.location == "agents" else codex_home / "skills"
        install.mkdir(parents=True, exist_ok=True)
        (install / "reese").symlink_to(source, target_is_directory=True)
        env = {"PATH": os.environ["PATH"], "HOME": str(home), "CODEX_HOME": str(codex_home), "LANG": "C.UTF-8"}
        with (root / "server.log").open("wb") as log:
            process = subprocess.Popen([binary, "app-server", "--stdio"], cwd=project, env=env,
                                       stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, bufsize=0)
            try:
                pending = bytearray()
                request(process, {"id": 1, "method": "initialize", "params": {
                    "clientInfo": {"name": "mako-discovery-check", "version": "1"},
                    "capabilities": {"experimentalApi": True},
                }}, pending)
                process.stdin.write(b'{"method":"initialized"}\n')
                result = request(process, {"id": 2, "method": "skills/list", "params": {
                    "cwds": [str(project)], "forceReload": True,
                }}, pending)
                found = set()
                for entry in result["data"]:
                    assert not entry.get("errors"), entry.get("errors")
                    for skill in entry["skills"]:
                        if Path(skill["path"]).resolve().is_relative_to(source):
                            assert skill["enabled"], skill
                            found.add(skill["name"])
                assert found == expected, {"missing": expected - found, "extra": found - expected}
            finally:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                process.stdin.close()
                process.stdout.close()
        rendered = subprocess.run([binary, "debug", "prompt-input", "Explain cancellation."], cwd=project,
                                  env=env, text=True, capture_output=True, check=True, timeout=30)
        messages = json.loads(rendered.stdout)
        texts = [item["text"] for msg in messages for item in msg.get("content", [])
                 if item.get("type") == "input_text" and "<skills_instructions>" in item.get("text", "")]
        assert texts, "No skill instructions returned"
        advertised = set(re.findall(r"^- ([a-z0-9-]+):", "\n".join(texts), re.MULTILINE))
        assert not hidden & advertised, hidden & advertised
        assert expected - hidden <= advertised, expected - hidden - advertised
        print(f"PASS: {len(expected)} registered skills through {args.location} bundle symlink; {len(hidden)} explicit-only skills absent from automatic prompt.")
        print("No model turn requested. Explicit invocation UI and model compliance remain separate tests.")


if __name__ == "__main__":
    main()
