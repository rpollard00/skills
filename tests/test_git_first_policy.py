import re
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

from link_skills import apply, installed_skills, plan
from validate_skills import frontmatter

import yaml


class VcsGuidanceTests(unittest.TestCase):
    def assert_no_vcs_selection_policy(self, root):
        for path in root.rglob('*'):
            if 'jj' not in path.relative_to(root).parts and path.is_file() and path.suffix in {'.md', '.yaml'}:
                with self.subTest(path=path):
                    self.assertIsNone(re.search(r'\bjj\b|jujutsu|git.first|use git by default',
                                                path.read_text(), re.IGNORECASE))

    def test_other_workflows_omit_jj_guidance(self):
        self.assert_no_vcs_selection_policy(ROOT / 'skills')

    def test_installed_bundle_and_claude_adapter_keep_jj_explicit_only(self):
        with tempfile.TemporaryDirectory() as temp:
            home = Path(temp)
            discovery = home / '.agents/skills'
            claude = home / '.claude/skills'
            apply(*plan(ROOT, home, discovery, False, claude))
            for root in (discovery, claude):
                names = {frontmatter(p)['name'] for p in installed_skills(root, set())}
                self.assertIn('jj', names)
                self.assertEqual(len(names), 58)
            for root in (ROOT / 'skills', claude / '.reese-adapter/skills'):
                metadata = frontmatter(root / 'jj/SKILL.md')
                self.assertTrue(metadata['disable-model-invocation'])
                self.assertEqual(metadata['metadata']['opencode/autoinvoke'], 'false')
                codex = yaml.safe_load((root / 'jj/agents/openai.yaml').read_text())
                self.assertFalse(codex['policy']['allow_implicit_invocation'])
            self.assert_no_vcs_selection_policy(claude / '.reese-adapter/skills')

    def test_shared_contract_preserves_worktree_safety(self):
        text = (ROOT / 'skills/mako/references/execution.md').read_text()
        for invariant in ('git worktree list --porcelain',
                          'Do not absorb pre-existing staged changes',
                          'detached worktree is valid', 'matching abort command',
                          '--force-with-lease=<ref>:<expected-sha>'):
            self.assertIn(invariant, text)


if __name__ == '__main__':
    unittest.main()
