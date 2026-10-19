"""Regression guard for the experimental workflow's explicit-only jj boundary."""
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


class GitFirstPolicyTests(unittest.TestCase):
    def test_jj_is_explicit_only_in_all_discovery_metadata(self):
        source = (ROOT / 'skills/jj/SKILL.md').read_text()
        metadata = yaml.safe_load(source.split('---', 2)[1])
        self.assertTrue(metadata['disable-model-invocation'])
        self.assertEqual(metadata['metadata']['opencode/autoinvoke'], 'false')
        codex = yaml.safe_load((ROOT / 'skills/jj/agents/openai.yaml').read_text())
        self.assertFalse(codex['policy']['allow_implicit_invocation'])
        self.assertNotIn('Use whenever a repository contains .jj', metadata['description'])

    def test_no_automatic_jj_routes_in_engineering_skills(self):
        old_routes = ('When `.jj` exists, use `jj`', 'use jj when present',
                      'Use the jj skill when `.jj` exists',
                      'jj root || git rev-parse')
        for path in (ROOT / 'skills').rglob('*.md'):
            if 'jj' in path.relative_to(ROOT / 'skills').parts:
                continue
            with self.subTest(path=path):
                for route in old_routes:
                    self.assertNotIn(route, path.read_text())

    def test_shared_contract_covers_native_git_worktree_safety(self):
        text = (ROOT / 'skills/mako/references/execution.md').read_text()
        for invariant in ('Use Git by default', 'git worktree list --porcelain',
                          'Do not absorb pre-existing staged changes',
                          'detached worktree is valid', 'matching abort command',
                          '--force-with-lease=<ref>:<expected-sha>'):
            self.assertIn(invariant, text)
