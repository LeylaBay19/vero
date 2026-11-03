import importlib.util
import json
from pathlib import Path
import tempfile
import tomllib
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'deploy.py'
spec = importlib.util.spec_from_file_location('synthesis_deploy', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
LIBRARY = SCRIPT.parents[2]


class SynthesisTests(unittest.TestCase):
    def test_synthesis_roles_methods_and_legacy_skill_are_bound(self):
        rendered = module.render(LIBRARY, ['product-documentation-synthesis'], 'template', 'product-documentation-synthesis')
        state = json.loads(rendered['.agent-system/active.json'])
        self.assertEqual(len(state['agents']), 10)
        self.assertNotIn('design', state['agents'])
        self.assertNotIn('implementation', state['agents'])
        for role in ('analyst','documentation-author','review','verification'):
            self.assertIn('product-documentation-methodology',state['agent_skills'][role])
        self.assertIn('product-documentation',state['agent_skills']['analyst'])
        self.assertIn('documentation-consistency-testing',state['agent_skills']['testing'])
        self.assertIn('.agents/skills/product-documentation-methodology/references/templates.md',rendered)

    def test_all_packs_preserve_original_roles_and_skills(self):
        old = module.render(LIBRARY, ['product-documentation','software-development'], 'template', 'product-documentation')
        new = module.render(LIBRARY, ['product-documentation','software-development','product-documentation-synthesis'], 'template', 'product-documentation-synthesis')
        old_state=json.loads(old['.agent-system/active.json']);new_state=json.loads(new['.agent-system/active.json'])
        self.assertTrue(set(old_state['agents']).issubset(new_state['agents']))
        self.assertTrue(set(old_state['installed_skills']).issubset(new_state['installed_skills']))
        self.assertEqual(len(new_state['agents']),12)
        self.assertEqual(len(new_state['installed_skills']),41)

    def test_synthesis_can_be_installed_and_updated_without_local_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);root.resolve().relative_to(Path(tempfile.gettempdir()).resolve())
            packs=['product-documentation-synthesis']
            result=module.deploy(LIBRARY,root,packs,'template',packs[0],True)
            self.assertEqual(result['agents'],10)
            profile=tomllib.loads((root/'.codex/agents/documentation-author.toml').read_text(encoding='utf-8'))
            self.assertEqual(set(profile),{'name','description','developer_instructions','model','model_reasoning_effort'})
            self.assertEqual(module.deploy(LIBRARY,root,packs,'template',packs[0],False)['changes'],[])
            self.assertEqual(json.loads((root/'.agent-system/project/project.json').read_text(encoding='utf-8'))['id'],'template')


if __name__ == '__main__':
    unittest.main()
