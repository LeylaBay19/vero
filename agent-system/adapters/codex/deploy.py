"""Build Codex files from a portable library. Python 3.11+, standard library only."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
import tomllib
import uuid

BEGIN = '<!-- agent-system:begin -->'
END = '<!-- agent-system:end -->'
ID = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*\Z')
STATE = '.agent-system/manifest.json'


class Conflict(ValueError):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def identifier(value: str) -> str:
    if not isinstance(value, str) or not ID.fullmatch(value):
        raise ValueError(f'Invalid module ID: {value!r}')
    return value


def safe(root: Path, relative: str) -> Path:
    rel = PurePosixPath(relative)
    if not relative or '\\' in relative or rel.is_absolute() or any(p in ('..', '') for p in rel.parts) or ':' in relative:
        raise ValueError(f'Invalid relative path: {relative}')
    candidate = root.joinpath(*rel.parts)
    candidate.resolve().relative_to(root.resolve())
    for p in [root, *[root.joinpath(*rel.parts[:n]) for n in range(1, len(rel.parts) + 1)]]:
        if p.is_symlink() or getattr(p, 'is_junction', lambda: False)():
            raise ValueError(f'Redirected path is not supported: {p}')
    return candidate


def read_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def ids(value) -> list[str]:
    if not isinstance(value, list) or any(not isinstance(x, str) for x in value):
        raise ValueError('Expected a list of module IDs')
    return list(dict.fromkeys(identifier(x) for x in value))


def managed_path(path: str) -> bool:
    return path == 'AGENTS.md' or path.startswith(('.codex/agents/', '.agents/skills/', '.agent-system/'))


def block_from(text: str) -> str | None:
    if text.count(BEGIN) != text.count(END) or text.count(BEGIN) > 1:
        raise Conflict('Malformed or duplicate managed AGENTS.md block')
    if BEGIN not in text:
        return None
    start, stop = text.index(BEGIN), text.index(END) + len(END)
    if stop < start:
        raise Conflict('Reversed AGENTS.md block markers')
    return text[start:stop]


def render(library: Path, packs: list[str], project: str, default_pack: str) -> dict[str, bytes]:
    """Validate references and render native files without touching a target."""
    packs = ids(packs)
    identifier(project)
    if not packs or default_pack not in packs:
        raise ValueError('Default pack must belong to the selected packs')
    for required in ('core/RULES.md', 'core/CONTRACTS.md', 'core/MODEL_POLICY.md'):
        if not safe(library, required).is_file():
            raise ValueError(f'Missing core contract: {required}')
    settings = read_json(safe(library, f'projects/{project}/project.json'))
    if settings.get('schema_version') != 1 or settings.get('id') != project:
        raise ValueError('Unsupported or inconsistent project profile')
    agents: set[str] = set()
    extra: dict[str, set[str]] = {}
    outputs: dict[str, bytes] = {}
    pack_data = {}
    for name in packs:
        data = read_json(safe(library, f'packs/{name}/pack.json'))
        if data.get('schema_version') != 1 or data.get('id') != name:
            raise ValueError(f'Unsupported or inconsistent pack: {name}')
        selected = ids(data['agents'])
        route = ids(data['workflow'])
        if identifier(data['coordinator']) not in selected or not set(route).issubset(selected):
            raise ValueError(f'Unknown coordinator or workflow role in {name}')
        for role, values in data.get('role_skills', {}).items():
            if role not in selected:
                raise ValueError(f'Unknown role binding: {role}')
            extra.setdefault(role, set()).update(ids(values))
        for role, artifacts in data.get('required_artifacts', {}).items():
            if role not in selected or not isinstance(artifacts, list):
                raise ValueError(f'Invalid output contract: {role}')
            for artifact in artifacts:
                safe(library, artifact)
        agents.update(selected)
        pack_data[name] = data
        for filename in ('pack.json', 'WORKFLOW.md'):
            outputs[f'.agent-system/packs/{name}/{filename}'] = safe(library, f'packs/{name}/{filename}').read_bytes()
    profiles = {}
    needed: set[str] = set()
    bindings = {}
    for name in sorted(agents):
        profile = tomllib.loads(safe(library, f'agents/{name}.toml').read_text(encoding='utf-8'))
        required = {'name', 'description', 'skills', 'developer_instructions'}
        model_fields = {'model', 'model_reasoning_effort'}
        if not required.issubset(profile) or set(profile) - required - model_fields or profile['name'] != name:
            raise ValueError(f'Invalid agent profile: {name}')
        present = set(profile) & model_fields
        if present and (present != model_fields or
                        not isinstance(profile['model'], str) or not profile['model'].strip() or
                        profile['model_reasoning_effort'] not in ('low', 'medium', 'high')):
            raise ValueError(f'Invalid model settings: {name}; supply model and low/medium/high effort together')
        if not all(isinstance(profile[k], str) and profile[k].strip() for k in ('description', 'developer_instructions')):
            raise ValueError(f'Empty agent instructions: {name}')
        bound = list(dict.fromkeys(ids(profile['skills']) + sorted(extra.get(name, set()))))
        bindings[name] = bound
        needed.update(bound)
        profiles[name] = profile
    visiting: set[str] = set()
    complete: set[str] = set()

    def skill(name: str):
        identifier(name)
        if name in visiting:
            raise ValueError(f'Cyclic skill dependency: {name}')
        if name in complete:
            return
        visiting.add(name)
        base = safe(library, f'skills/{name}')
        body = safe(library, f'skills/{name}/SKILL.md').read_text(encoding='utf-8')
        front = re.match(r'^---\n(.*?)\n---\n', body, re.S)
        if not front or f'name: {name}\n' not in front[1] + '\n' or not re.search(r'^description: .+', front[1], re.M):
            raise ValueError(f'Invalid skill manifest: {name}')
        dependencies = safe(library, f'skills/{name}/skill.json')
        for dependency in ids(read_json(dependencies).get('requires', [])) if dependencies.exists() else []:
            skill(dependency)
        for file in sorted(base.rglob('*')):
            rel = file.relative_to(library).as_posix()
            safe(library, rel)
            if file.is_file() and file.name != 'skill.json':
                outputs['.agents/' + rel] = file.read_bytes()
        visiting.remove(name)
        complete.add(name)
    for name in sorted(needed):
        skill(name)
    for name, data in profiles.items():
        prelude = ('Прочитай AGENTS.md, .agent-system/core/RULES.md и .agent-system/core/CONTRACTS.md.\n'
                   'Активный пакет и контекст указаны в .agent-system/active.json. Применяй только порученный маршрут; '
                   'прочитай его WORKFLOW.md и .agent-system/project/CONTEXT.md. '
                   'Список скиллов ниже задаёт доступные процедуры: выбирай применимые по пакету и задаче. '
                   'При назначении исполнителей применяй .agent-system/core/MODEL_POLICY.md.\n')
        instructions = prelude + '\n' + data['developer_instructions'].strip() + '\n\nНазначенные скиллы:\n'
        instructions += '\n'.join(f'- .agents/skills/{s}/SKILL.md' for s in bindings[name])
        native = {'name': name, 'description': data['description'], 'developer_instructions': instructions}
        for key in ('model', 'model_reasoning_effort'):
            if key in data:
                native[key] = data[key]
        outputs[f'.codex/agents/{name}.toml'] = ''.join(f'{key} = {json.dumps(value, ensure_ascii=False)}\n' for key, value in native.items()).encode('utf-8')
    for file in sorted(safe(library, 'core').glob('*.md')):
        outputs[f'.agent-system/core/{file.name}'] = safe(library, f'core/{file.name}').read_bytes()
    outputs['.agent-system/project/project.json'] = json_bytes(settings)
    outputs['.agent-system/project/CONTEXT.md'] = safe(library, f'projects/{project}/CONTEXT.md').read_bytes()
    outputs['.agent-system/active.json'] = json_bytes({
        'schema_version': 1, 'library_version': read_json(safe(library, 'library.json'))['version'],
        'packs': packs, 'default_pack': default_pack, 'project': project,
        'agents': sorted(agents), 'agent_skills': bindings, 'installed_skills': sorted(complete),
        'model_policy': '.agent-system/core/MODEL_POLICY.md',
        'agent_models': {name: {key: data[key] for key in ('model', 'model_reasoning_effort')}
                         for name, data in profiles.items() if 'model' in data},
    })
    block = (f'{BEGIN}\n# Подключённая агентная система\n\n'
             'Прочитай `.agent-system/core/RULES.md` и `.agent-system/core/CONTRACTS.md`.\n'
             'Выбор пакета и контекста: `.agent-system/active.json`. Маршруты и результаты задаются '
             'подключёнными `.agent-system/packs/<id>/pack.json` и `WORKFLOW.md`.\n'
             'Контекст проекта: `.agent-system/project/CONTEXT.md`. Профили: `.codex/agents`; '
             'процедуры: `.agents/skills`. Конфигурация не запускает работу сама по себе.\n'
             'При порученной командной работе используй субагентов. Если выбор профиля по имени недоступен, '
             'передай его инструкции явно; не имитируй независимые запуски.\n'
             'Редактируемый источник: `agent-system`; служебные копии обновляются адаптером Codex.\n'
             f'{END}')
    outputs['AGENTS.md'] = block.encode('utf-8')
    return outputs


def deploy(library: Path, target: Path, packs: list[str], project: str, default_pack: str,
           apply: bool = False, adoption: dict | None = None) -> dict:
    library, target = library.resolve(), target.absolute()
    if not target.is_dir():
        raise ValueError('Target project directory must already exist')
    safe(target, STATE)
    old = read_json(safe(target, STATE)) if safe(target, STATE).exists() else {'schema_version': 1, 'files': {}}
    if old.get('schema_version') != 1 or not isinstance(old.get('files'), dict):
        raise ValueError('Invalid installed manifest')
    adoption = adoption or {}
    previous = old['files'] or adoption.get('files', {})
    for rel, record in previous.items():
        if not managed_path(rel) or rel == STATE or not isinstance(record, dict) or record.get('kind', 'file') not in ('file', 'agents-block', 'external') or not re.fullmatch(r'[a-f0-9]{64}', record.get('sha256', '')):
            raise ValueError(f'Invalid ownership record: {rel}')
        safe(target, rel)
    desired = render(library, packs, project, default_pack)
    original_agents = safe(target, 'AGENTS.md').read_bytes() if safe(target, 'AGENTS.md').exists() else None
    existing_text = original_agents.decode('utf-8') if original_agents is not None else ''
    existing_block = block_from(existing_text)
    new_block = desired['AGENTS.md'].decode('utf-8')
    record = previous.get('AGENTS.md', {})
    if existing_block is None and original_agents is not None and adoption.get('replace_legacy_agents') and digest(original_agents) != record.get('sha256'):
        raise Conflict('Legacy AGENTS.md changed after migration review')
    if existing_block is not None:
        normalized_block = existing_block.replace('\r\n', '\n')
        if normalized_block != new_block and digest(normalized_block.encode('utf-8')) != record.get('sha256'):
            raise Conflict('Managed AGENTS.md block was edited; merge the changes before deployment')
        desired['AGENTS.md'] = existing_text.replace(existing_block, new_block, 1).encode('utf-8')
    elif original_agents is not None and adoption.get('replace_legacy_agents') and digest(original_agents) == record.get('sha256'):
        desired['AGENTS.md'] = (new_block + '\n').encode('utf-8')
    else:
        if original_agents is not None and record.get('kind') == 'agents-block':
            raise Conflict('Managed AGENTS.md block was removed')
        desired['AGENTS.md'] = ((existing_text.rstrip() + '\n\n' if existing_text.strip() else '') + new_block + '\n').encode('utf-8')
    operations = []
    external = set()
    for rel in sorted(set(previous) | set(desired)):
        path = safe(target, rel)
        if path.exists() and not path.is_file():
            raise Conflict(f'Not a regular file: {rel}')
        current = path.read_bytes() if path.exists() else None
        wanted = desired.get(rel)
        if rel != 'AGENTS.md' and current is not None and (rel not in previous or previous[rel].get('kind') == 'external'):
            if wanted is None:
                continue  # A previously reused external file never belongs to us.
            if current == wanted:
                external.add(rel)
                continue
            raise Conflict(f'Unmanaged or locally edited file: {rel}')
        if current == wanted:
            continue
        if rel != 'AGENTS.md' and current is not None and digest(current) != previous.get(rel, {}).get('sha256'):
            raise Conflict(f'Unmanaged or locally edited file: {rel}')
        if rel == 'AGENTS.md' and wanted is None:
            raise ValueError('AGENTS.md cannot be removed')
        operations.append((rel, current, wanted))
    manifest = {'schema_version': 1, 'files': {rel: {
        'kind': 'agents-block' if rel == 'AGENTS.md' else 'external' if rel in external else 'file',
        'sha256': digest(new_block.encode('utf-8') if rel == 'AGENTS.md' else data),
    } for rel, data in desired.items()}}
    result = {'apply': apply, 'agents': len([p for p in desired if p.startswith('.codex/agents/')]),
              'skills': len([p for p in desired if p.endswith('/SKILL.md')]),
              'changes': [{'path': r, 'action': 'remove' if n is None else 'create' if c is None else 'update'} for r, c, n in operations]}
    if not apply:
        return result
    backup_id = uuid.uuid4().hex
    for rel, before, after in operations:
        path = safe(target, rel)
        current = path.read_bytes() if path.exists() else None
        if current != before:
            raise Conflict(f'File changed after planning: {rel}')
        if before is not None:
            backup = safe(target, f'.agent-system/backups/{backup_id}/{rel}')
            backup.parent.mkdir(parents=True, exist_ok=True)
            backup.write_bytes(before)
        if after is None:
            path.unlink()  # File only, path checked; no recursive deletion.
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            temporary = safe(target, rel + '.agent-system-' + uuid.uuid4().hex + '.tmp')
            try:
                temporary.write_bytes(after)
                os.replace(temporary, path)
            finally:
                if temporary.exists():
                    temporary.unlink()
    state = safe(target, STATE)
    state.parent.mkdir(parents=True, exist_ok=True)
    state.write_bytes(json_bytes(manifest))
    result['backup'] = f'.agent-system/backups/{backup_id}' if any(c is not None for _, c, _ in operations) else None
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', type=Path, required=True)
    parser.add_argument('--pack', action='append', required=True)
    parser.add_argument('--default-pack')
    parser.add_argument('--project', default='template')
    parser.add_argument('--apply', action='store_true', help='Without this flag only print a plan')
    parser.add_argument('--adopt', type=Path, help='Reviewed hashes of this project before first migration')
    args = parser.parse_args()
    try:
        result = deploy(Path(__file__).resolve().parents[2], args.target, args.pack, args.project,
                        args.default_pack or args.pack[0], args.apply,
                        read_json(args.adopt) if args.adopt else None)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print(f'Deployment refused: {exc}', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
