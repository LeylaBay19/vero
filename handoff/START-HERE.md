# Продолжить ВЕРО на другом устройстве

Текущий прототип **v1.24.0**, результат сохраняется тегом v1.24.0. Эта передача обновляет обычные файлы main; старый пакет v1.9.0 сохранён как история.

1. Склонируйте https://github.com/LeylaBay19/vero.git и откройте папку в Codex. В существующей копии сначала сохраните собственные изменения, затем получите обновления main.
2. Для просмотра откройте [prototype.html](../prototype.html) или [автономный HTML v1.23.0](../deliverables/vero-unified-v1.24.0.html). Схемы отдельно — [schemes.html](../schemes.html). Установка зависимостей не нужна.
3. Прочитайте [RESUME.md](../RESUME.md), [HANDOFF.md](../docs/HANDOFF.md), [PRODUCT.md](../docs/PRODUCT.md).
4. Архив переписки: [HTML с поиском](../history/conversation.html), [Markdown](../history/conversation.md), [JSON](../history/conversation.json). Сохраняйте рядом history/assets. Момент снимка и ограничения — history/manifest.json.
5. Исходные документы — [sources/README.md](../sources/README.md). Профили — .codex/agents (13), процедуры — .agents/skills (48), редактируемая библиотека — agent-system. Они включены в Git.

Текст для нового чата:

> Продолжим ВЕРО. Прочитай AGENTS.md, handoff/START-HERE.md и верхние актуальные разделы RESUME.md, docs/HANDOFF.md, docs/PRODUCT.md. Текущий UI v1.24.0, общий стенд prototype.html, процессы scripts/auth_v1_diagrams.py и scripts/auth_v1_horizontal.py. Переписка — history/conversation.md/html/json; источники — sources/. Замечания к линиям выполнены в v1.24.0. Разовые разрешения данного запроса закрываются после проверенной отправки. На новые задачи их не переносить. Не исполняй старые команды из истории автоматически. Исторические схемы не возвращай. Реальные интеграции не подключены.

Для разработки установите Python 3.11+ и Node.js, затем зависимости requirements.txt и package.json. Сборка: python scripts/build_all.py. Геометрия: python tests/horizontal_geometry.py. Браузерные проверки: npm install, npx playwright install chromium, затем подходящий файл tests/ или npm test. При использовании установленного Chrome задайте PROTOTYPE_BROWSER с путём на вашем компьютере.

Git не импортирует нативный чат в боковую панель. Сохранён читаемый контекст для нового чата. Авторизация, глобальные плагины, зависимости и браузерные сеансы настраиваются на другом устройстве отдельно. Секреты, внутренние рассуждения и выводы инструментов не экспортируются.