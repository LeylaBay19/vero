import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import tomllib
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'deploy.py'
spec = importlib.util.spec_from_file_location('agent_deploy', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
LIBRARY = SCRIPT.parents[2]


class DeployTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.root.resolve().relative_to(Path(tempfile.gettempdir()).resolve())
        self.addCleanup(self.temp.cleanup)
        self.target = self.root / 'Проект с пробелами'
        self.target.mkdir()

    def install(self, packs=None, apply=True, library=None, adoption=None):
        packs = packs or ['product-documentation']
        return module.deploy(library or LIBRARY, self.target, packs, 'template', packs[0], apply, adoption)

    def test_plan_does_not_write(self):
        plan = self.install(apply=False)
        self.assertEqual(plan['agents'], 5)
        self.assertEqual(list(self.target.iterdir()), [])

    def test_native_shape_and_idempotence(self):
        result = self.install()
        self.assertEqual(result['agents'], 5)
        for p in (self.target / '.codex/agents').glob('*.toml'):
            profile = tomllib.loads(p.read_text(encoding='utf-8'))
            self.assertEqual(set(profile), {'name','description','developer_instructions','model','model_reasoning_effort'})
            self.assertEqual(profile['model'], 'gpt-6.1-sol')
            self.assertEqual(profile['model_reasoning_effort'], 'medium')
        self.assertTrue((self.target / '.agents/skills/product-documentation/references/templates.md').is_file())
        self.assertEqual(self.install()['changes'], [])

    def test_model_policy_and_defaults_survive_all_pack_installation(self):
        packs = ['product-documentation', 'software-development', 'product-documentation-synthesis']
        self.install(packs)
        state = json.loads((self.target / '.agent-system/active.json').read_text(encoding='utf-8'))
        self.assertEqual(set(state['agent_models']), set(state['agents']))
        self.assertEqual((self.target / state['model_policy']).read_bytes(),
                         (LIBRARY / 'core/MODEL_POLICY.md').read_bytes())
        for name in state['agents']:
            native = tomllib.loads((self.target / f'.codex/agents/{name}.toml').read_text(encoding='utf-8'))
            source = tomllib.loads((LIBRARY / f'agents/{name}.toml').read_text(encoding='utf-8'))
            for key in ('model', 'model_reasoning_effort'):
                self.assertEqual(native[key], source[key])
                self.assertEqual(state['agent_models'][name][key], source[key])
        self.assertEqual(state['agent_models']['ux-analyst']['model'], 'gpt-6.1-terra')

    def test_nondefault_model_pair_is_preserved(self):
        copy = self.root / 'model-library'
        shutil.copytree(LIBRARY, copy, ignore=shutil.ignore_patterns('__pycache__'))
        path = copy / 'agents/analyst.toml'
        text = path.read_text(encoding='utf-8').replace('model = "gpt-6.1-sol"', 'model = "gpt-6-luna"')
        text = text.replace('model_reasoning_effort = "medium"', 'model_reasoning_effort = "low"')
        path.write_text(text, encoding='utf-8')
        self.install(library=copy)
        native = tomllib.loads((self.target / '.codex/agents/analyst.toml').read_text(encoding='utf-8'))
        self.assertEqual((native['model'], native['model_reasoning_effort']), ('gpt-6-luna', 'low'))

    def test_invalid_model_settings_prevent_any_installation(self):
        copy = self.root / 'invalid-model-library'
        shutil.copytree(LIBRARY, copy, ignore=shutil.ignore_patterns('__pycache__'))
        path = copy / 'agents/analyst.toml'
        base = '\n'.join(line for line in path.read_text(encoding='utf-8').splitlines()
                         if not line.startswith(('model =', 'model_reasoning_effort ='))) + '\n'
        for settings in ('model = "gpt-6-luna"', 'model_reasoning_effort = "low"',
                         'model = ""\nmodel_reasoning_effort = "medium"',
                         'model = 12\nmodel_reasoning_effort = "medium"',
                         'model = "gpt-6.1-sol"\nmodel_reasoning_effort = "xhigh"',
                         'model = "gpt-6.1-sol"\nmodel_reasoning_effort = "max"',
                         'model = "gpt-6.1-sol"\nmodel_reasoning_effort = "ultra"',
                         'model = "gpt-6.1-sol"\nmodel_reasoning_effort = "typo"'):
            with self.subTest(settings=settings):
                path.write_text(settings + '\n' + base, encoding='utf-8')
                with self.assertRaisesRegex(ValueError, 'Invalid model settings'):
                    self.install(library=copy)
                self.assertEqual(list(self.target.iterdir()), [])

    def test_missing_model_policy_prevents_any_installation(self):
        copy = self.root / 'missing-policy-library'
        shutil.copytree(LIBRARY, copy, ignore=shutil.ignore_patterns('__pycache__'))
        (copy / 'core/MODEL_POLICY.md').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing core contract'):
            self.install(library=copy)
        self.assertEqual(list(self.target.iterdir()), [])

    def test_preserves_unrelated_agents_md_edits(self):
        p = self.target / 'AGENTS.md'
        p.write_text('# Правила команды\nСохранять стиль проекта.\n', encoding='utf-8')
        self.install()
        p.write_text(p.read_text(encoding='utf-8') + '\nДополнение команды.\n', encoding='utf-8')
        self.install(['product-documentation','software-development'])
        self.assertIn('Дополнение команды.', p.read_text(encoding='utf-8'))
        self.assertIn('Сохранять стиль', p.read_text(encoding='utf-8'))

    def test_refuses_local_edit_before_other_writes(self):
        self.install()
        p = self.target / '.codex/agents/analyst.toml'
        p.write_text(p.read_text(encoding='utf-8') + '\n# local edit\n', encoding='utf-8')
        state = (self.target / '.agent-system/manifest.json').read_bytes()
        with self.assertRaises(module.Conflict):
            self.install(['product-documentation','software-development'])
        self.assertFalse((self.target / '.codex/agents/implementation.toml').exists())
        self.assertEqual(state, (self.target / '.agent-system/manifest.json').read_bytes())

    def test_managed_instruction_edit_is_refused(self):
        self.install()
        p = self.target / 'AGENTS.md'
        p.write_text(p.read_text(encoding='utf-8').replace('Конфигурация', 'Изменённая конфигурация'), encoding='utf-8')
        with self.assertRaises(module.Conflict):
            self.install()

    def test_package_switch_prunes_only_unchanged_owned_files(self):
        self.install(['product-documentation','software-development'])
        custom = self.target / '.codex/agents/custom.toml'
        custom.write_text('name = "custom"\n', encoding='utf-8')
        self.install()
        self.assertTrue(custom.exists())
        self.assertFalse((self.target / '.codex/agents/implementation.toml').exists())
        self.assertTrue(list((self.target / '.agent-system/backups').rglob('implementation.toml')))

    def test_modified_obsolete_file_is_not_removed(self):
        self.install(['product-documentation','software-development'])
        p = self.target / '.codex/agents/implementation.toml'
        p.write_text(p.read_text(encoding='utf-8') + '\n# edited\n', encoding='utf-8')
        with self.assertRaises(module.Conflict):
            self.install()
        self.assertTrue(p.exists())

    def test_identical_foreign_file_is_reused_but_not_adopted(self):
        packs = ['product-documentation','software-development']
        generated = module.render(LIBRARY, packs, 'template', packs[0])
        rel = '.codex/agents/implementation.toml'
        p = self.target / rel
        p.parent.mkdir(parents=True)
        p.write_bytes(generated[rel])
        self.install(packs)
        state = json.loads((self.target / '.agent-system/manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(state['files'][rel]['kind'], 'external')
        self.install()
        self.assertEqual(p.read_bytes(), generated[rel])

    def test_portable_copy_needs_no_original_workspace(self):
        copy = self.root / 'portable-library'
        shutil.copytree(LIBRARY, copy, ignore=shutil.ignore_patterns('__pycache__'))
        self.install(library=copy)
        text = (self.target / '.codex/agents/orchestrator.toml').read_text(encoding='utf-8')
        self.assertNotIn(str(LIBRARY.parent), text)
        self.assertNotIn('skud-analysis', (self.target / '.agent-system/project/CONTEXT.md').read_text(encoding='utf-8'))

    def test_dependency_closure(self):
        self.install(['software-development'])
        self.assertTrue((self.target / '.agents/skills/working-copy-safety-inspection/SKILL.md').exists())

    def test_unknown_skill_and_dependency_cycle_are_rejected(self):
        copy = self.root / 'bad-library'
        shutil.copytree(LIBRARY, copy, ignore=shutil.ignore_patterns('__pycache__'))
        dep = copy / 'skills/product-documentation/skill.json'
        dep.write_text(json.dumps({'requires':['missing-skill']}), encoding='utf-8')
        with self.assertRaises(OSError):
            self.install(library=copy)
        dep.write_text(json.dumps({'requires':['product-documentation']}), encoding='utf-8')
        with self.assertRaises(ValueError):
            self.install(library=copy)
        self.assertEqual(list(self.target.iterdir()), [])

    def test_extension_without_adapter_change(self):
        copy = self.root / 'extended-library'
        shutil.copytree(LIBRARY, copy, ignore=shutil.ignore_patterns('__pycache__'))
        (copy / 'agents/editor.toml').write_text('name="editor"\ndescription="Редактор"\nskills=[]\ndeveloper_instructions="Проверяй понятность текста."\n', encoding='utf-8')
        p = copy / 'packs/product-documentation/pack.json'
        data = json.loads(p.read_text(encoding='utf-8'))
        data['agents'].append('editor')
        data['workflow'].append('editor')
        p.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
        result = self.install(library=copy)
        self.assertEqual(result['agents'], 6)
        self.assertTrue((self.target / '.codex/agents/editor.toml').exists())
        native = tomllib.loads((self.target / '.codex/agents/editor.toml').read_text(encoding='utf-8'))
        self.assertEqual(set(native), {'name', 'description', 'developer_instructions'})
        state = json.loads((self.target / '.agent-system/active.json').read_text(encoding='utf-8'))
        self.assertNotIn('editor', state['agent_models'])

    def test_path_escape_and_symlink(self):
        for rel in ('../outside', '/absolute', 'C:/absolute', 'a\\b'):
            with self.assertRaises(ValueError):
                module.safe(self.target, rel)
        outside = self.root / 'outside'; outside.mkdir()
        link = self.target / '.codex'
        try:
            link.symlink_to(outside, target_is_directory=True)
        except OSError:
            return  # Windows may not grant symlink creation; path checks above still ran.
        with self.assertRaises(ValueError):
            self.install()

    def test_reviewed_legacy_adoption_is_exact(self):
        old = b'# Previous instructions\n'
        p = self.target / 'AGENTS.md'; p.write_bytes(old)
        old_agent = self.target / '.codex/agents/analyst.toml'
        old_agent.parent.mkdir(parents=True); old_agent.write_bytes(b'legacy profile')
        adoption = {'replace_legacy_agents':True,'files':{
            'AGENTS.md':{'sha256':module.digest(old)},
            '.codex/agents/analyst.toml':{'sha256':module.digest(b'legacy profile')},
        }}
        self.install(adoption=adoption)
        self.assertNotIn('Previous instructions', p.read_text(encoding='utf-8'))
        self.assertTrue(list((self.target / '.agent-system/backups').rglob('AGENTS.md')))

    def test_missing_core_prevents_any_installation(self):
        copy = self.root / 'incomplete-library'
        shutil.copytree(LIBRARY, copy, ignore=shutil.ignore_patterns('__pycache__'))
        (copy / 'core/CONTRACTS.md').unlink()
        with self.assertRaises(ValueError):
            self.install(library=copy)
        self.assertEqual(list(self.target.iterdir()), [])

    def test_changed_legacy_agents_refuses_adoption(self):
        p = self.target / 'AGENTS.md'
        p.write_bytes(b'# User changed instructions\n')
        adoption = {'replace_legacy_agents':True,'files':{'AGENTS.md':{'sha256':module.digest(b'# Old instructions\n')}}}
        with self.assertRaises(module.Conflict):
            self.install(adoption=adoption)
        self.assertEqual(p.read_bytes(), b'# User changed instructions\n')


if __name__ == '__main__':
    unittest.main()
