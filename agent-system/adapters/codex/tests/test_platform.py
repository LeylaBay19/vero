import importlib.util
import json
from pathlib import Path
import tempfile
import tomllib
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'deploy.py'
spec = importlib.util.spec_from_file_location('platform_deploy', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
LIBRARY = SCRIPT.parents[2]
OLD = ['product-documentation', 'software-development', 'product-documentation-synthesis']
ALL = OLD + ['platform-consistency']


class PlatformTests(unittest.TestCase):
    def test_additive_role_and_skill_bindings(self):
        before = json.loads(module.render(LIBRARY, OLD, 'template', OLD[-1])['.agent-system/active.json'])
        after = json.loads(module.render(LIBRARY, ALL, 'template', ALL[-1])['.agent-system/active.json'])
        self.assertEqual(set(after['agents']) - set(before['agents']), {'platform-consistency-steward'})
        self.assertEqual(len(after['agents']), 13)
        self.assertEqual(len(after['installed_skills']), 48)
        for role, skills in before['agent_skills'].items():
            self.assertTrue(set(skills).issubset(after['agent_skills'][role]), role)
            self.assertEqual(before['agent_models'][role], after['agent_models'][role])
        self.assertIn('raci-decision-routing', after['agent_skills']['orchestrator'])
        self.assertIn('documentation-change-reconciliation', after['agent_skills']['documentation-author'])

    def test_standalone_document_pack_and_native_profile(self):
        files = module.render(LIBRARY, ['platform-consistency'], 'template', 'platform-consistency')
        state = json.loads(files['.agent-system/active.json'])
        self.assertEqual(len(state['agents']), 11)
        self.assertNotIn('implementation', state['agents'])
        self.assertNotIn('design', state['agents'])
        for role in ('analyst', 'documentation-author', 'review', 'verification'):
            self.assertIn('product-documentation-methodology', state['agent_skills'][role])
        profile = tomllib.loads(files['.codex/agents/platform-consistency-steward.toml'].decode('utf-8'))
        self.assertEqual(profile['model'], 'gpt-6.1-sol')
        self.assertEqual(profile['model_reasoning_effort'], 'medium')
        self.assertIn('.agents/skills/cross-service-consistency-audit/SKILL.md', files)

    def test_upgrade_is_idempotent_and_preserves_unmanaged_work(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            module.deploy(LIBRARY, root, OLD, 'template', OLD[-1], True)
            note = root / 'human-notes.md'
            note.write_text('manual text', encoding='utf-8')
            instructions = root / 'AGENTS.md'
            instructions.write_text(instructions.read_text(encoding='utf-8') + '\nHuman instructions remain.\n', encoding='utf-8')
            module.deploy(LIBRARY, root, ALL, 'template', ALL[-1], True)
            self.assertEqual(note.read_text(encoding='utf-8'), 'manual text')
            self.assertIn('Human instructions remain.', instructions.read_text(encoding='utf-8'))
            self.assertEqual(module.deploy(LIBRARY, root, ALL, 'template', ALL[-1], False)['changes'], [])


if __name__ == '__main__':
    unittest.main()
