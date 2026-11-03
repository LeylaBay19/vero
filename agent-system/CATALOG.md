# Полный состав библиотеки 1.3.0

13 ролей и 48 навыков. Исходные Исследователь, Автор и Рецензент сохранены как analyst, documentation-author и review.

## Все роли

| Роль | Ответственность | Базовые навыки |
|---|---|---|
| [analyst](agents/analyst.toml) | Исследует существующий продукт до изменений: восстанавливает устройство системы, собирает свидетельства и определяет влияние требования. | working-copy-safety-inspection; repository-topology-discovery; snapshot-evidence-capture; requirement-impact-mapping; analysis-report-assembly |
| [design](agents/design.toml) | Проектирует технический способ реализации поведенческой спецификации в существующей архитектуре, определяет границы изменений, риски и проверки без реализации кода. | architecture-aligned-solution-design; change-scope-and-test-planning; design-contract-validation |
| [documentation-author](agents/documentation-author.toml) | С раннего этапа организует и пишет единый читательский PRODUCT.md: связывает бизнес-смысл, процессы, сценарии, требования и UX с источниками, сохраняя неизвестное и расхождения. | product-documentation-methodology; product-information-architecture; product-documentation-assembly; plain-language-editing |
| [implementation](agents/implementation.toml) | Реализует утверждённый технический дизайн в коде при отдельном поручении на разработку, сохраняя границы задачи и передавая новые продуктовые вопросы человеку. | implementation-readiness-check; approved-design-implementation; implementation-report-assembly |
| [orchestrator](agents/orchestrator.toml) | Координатор выбранного пакета: организует роли, версии входов, передачу результатов, проверки готовности и решения человека. | workflow-orchestration |
| [platform-consistency-steward](agents/platform-consistency-steward.toml) | Ведёт версионированные продуктовые паттерны, проверяет их применимость к услугам, выявляет неконсистентность логики и UX и оценивает исключения и влияние изменений. | product-pattern-discovery; pattern-applicability-assessment; cross-service-consistency-audit; pattern-exception-governance; pattern-change-impact-analysis |
| [regulatory-analyst](agents/regulatory-analyst.toml) | Проверяет происхождение и применимость нормативных оснований, извлекает обязательства и связывает их с проектами требований и пробелами свидетельств. | regulatory-source-validation; obligation-to-requirement-mapping; regulatory-gap-analysis |
| [review](agents/review.toml) | Даёт независимую оценку изменения и тестов после реализации: ищет дефекты, пропуски, лишнюю сложность, отклонения от дизайна и слабые проверки. | independent-solution-review; test-adequacy-review |
| [source-reconciler](agents/source-reconciler.toml) | Сопоставляет атомарные утверждения разных источников, классифицирует расхождения и ведёт решения человека с сохранением происхождения и области применимости. | claims-alignment; conflict-classification; resolution-tracking |
| [specification](agents/specification.toml) | Формализует утверждённые требования и результаты анализа в проверяемое ожидаемое поведение без преждевременного технического решения. | approved-behavior-source-catalog; behavioral-specification-drafting; specification-contract-validation |
| [testing](agents/testing.toml) | Проверяет изменение и затронутые соседние функции, запускает применимые автоматические и интерфейсные проверки и фиксирует фактические результаты. | risk-based-test-selection; automated-and-ui-test-execution; test-result-evidence-assembly |
| [ux-analyst](agents/ux-analyst.toml) | Исследует предоставленные макеты и экспорты интерфейса, описывает наблюдаемые экраны, состояния и переходы и связывает их с требованиями без проектирования нового UX. | product-documentation-methodology; snapshot-evidence-capture; figma-flow-extraction; screen-state-specification; ux-requirement-traceability |
| [verification](agents/verification.toml) | Сопоставляет фактический результат с каждым исходным критерием приёмки по всей цепочке требований, спецификации, дизайна, реализации и проверок. | acceptance-chain-verification; verification-verdict-assembly |

## Пакеты и дополнительные назначения

### platform-consistency

[Маршрут](packs/platform-consistency/WORKFLOW.md). Роли: orchestrator, analyst, ux-analyst, regulatory-analyst, source-reconciler, platform-consistency-steward, specification, documentation-author, testing, review, verification.

Этапы: analyst → documentation-author → ux-analyst → regulatory-analyst → source-reconciler → platform-consistency-steward → specification → analyst → documentation-author → testing → review → verification.

- orchestrator: product-documentation-methodology, raci-decision-routing, documentation-change-reconciliation.
- analyst: product-documentation, product-documentation-methodology, meeting-decision-extraction, business-process-modeling, decision-table-and-branch-coverage, nfr-elicitation, product-pattern-discovery, pattern-change-impact-analysis.
- ux-analyst: product-documentation-methodology, pattern-applicability-assessment, cross-service-consistency-audit.
- regulatory-analyst: product-documentation-methodology.
- source-reconciler: product-documentation-methodology, cross-service-consistency-audit.
- specification: product-documentation-methodology, pattern-applicability-assessment.
- documentation-author: product-documentation-methodology, documentation-change-reconciliation.
- testing: product-documentation-methodology, documentation-consistency-testing, cross-service-consistency-audit.
- review: product-documentation-methodology, cross-service-consistency-audit, pattern-exception-governance.
- verification: product-documentation-methodology, pattern-exception-governance.
- platform-consistency-steward: product-documentation-methodology, raci-decision-routing.

### product-documentation

[Маршрут](packs/product-documentation/WORKFLOW.md). Роли: orchestrator, analyst, specification, review, verification.

Этапы: analyst → review → verification.

- analyst: product-documentation.

### product-documentation-synthesis

[Маршрут](packs/product-documentation-synthesis/WORKFLOW.md). Роли: orchestrator, analyst, ux-analyst, regulatory-analyst, source-reconciler, specification, documentation-author, testing, review, verification.

Этапы: analyst → documentation-author → ux-analyst → regulatory-analyst → source-reconciler → analyst → documentation-author → testing → review → verification.

- orchestrator: product-documentation-methodology.
- analyst: product-documentation, product-documentation-methodology, meeting-decision-extraction, business-process-modeling, decision-table-and-branch-coverage, nfr-elicitation.
- ux-analyst: product-documentation-methodology.
- regulatory-analyst: product-documentation-methodology.
- source-reconciler: product-documentation-methodology.
- specification: product-documentation-methodology.
- documentation-author: product-documentation-methodology.
- testing: product-documentation-methodology, documentation-consistency-testing.
- review: product-documentation-methodology.
- verification: product-documentation-methodology.

### software-development

[Маршрут](packs/software-development/WORKFLOW.md). Роли: orchestrator, analyst, specification, design, implementation, testing, review, verification.

Этапы: analyst → specification → design → implementation → testing → review → verification.


## Все навыки

| Навык | Назначение |
|---|---|
| [acceptance-chain-verification](skills/acceptance-chain-verification/SKILL.md) | Проследи каждый исходный критерий приёмки до фактического результата и актуальных доказательств через требования, спецификацию, дизайн, реализацию и проверки. |
| [analysis-report-assembly](skills/analysis-report-assembly/SKILL.md) | Собери связный отчёт о текущем состоянии продукта из карты системы, свидетельств и анализа влияния требования. Используй для передачи результатов аналитика следующему участнику без проектирования и реализации изменений. |
| [approved-behavior-source-catalog](skills/approved-behavior-source-catalog/SKILL.md) | Установи разрешённые основания будущего поведения продукта по утверждённым требованиям, критериям приёмки и решениям человека перед подготовкой спецификации. |
| [approved-design-implementation](skills/approved-design-implementation/SKILL.md) | Внеси ограниченные изменения кода по утверждённому дизайну, сохраняя смысл требований и чужие правки; новые продуктовые решения передавай человеку. |
| [architecture-aligned-solution-design](skills/architecture-aligned-solution-design/SKILL.md) | Подготовь технический подход к реализации проверенной поведенческой спецификации в существующей архитектуре, сохраняя утверждённый смысл и повторно используя подходящие компоненты. |
| [automated-and-ui-test-execution](skills/automated-and-ui-test-execution/SKILL.md) | Выполни применимые автоматические и интерфейсные проверки в разрешённой среде и зафиксируй фактические результаты для определённой версии изменения. |
| [behavioral-specification-drafting](skills/behavioral-specification-drafting/SKILL.md) | Преобразуй утверждённые основания в однозначные сценарии Дано — Когда — Тогда, правила и проверяемые функциональные и нефункциональные требования без проектирования реализации. |
| [business-process-modeling](skills/business-process-modeling/SKILL.md) | Восстанавливай бизнес-процесс по источникам через цель, роли, запуск, условия, шаги, альтернативы и результат. Используй для описания работы участников и системы; не подменяй бизнес-цели техническими реакциями. |
| [change-scope-and-test-planning](skills/change-scope-and-test-planning/SKILL.md) | Определи технические границы изменений, зависимости, риски и необходимые проверки для предложенного решения без реализации изменений и выполнения тестов. |
| [claims-alignment](skills/claims-alignment/SKILL.md) | Сопоставь атомарные утверждения из разных источников о продукте по смыслу, контексту и версии до классификации согласия или конфликта. |
| [conflict-classification](skills/conflict-classification/SKILL.md) | Классифицируй отношения сопоставленных утверждений и отдели реальное противоречие от дополнения, разных контекстов, версий, терминов и нехватки данных. |
| [cross-service-consistency-audit](skills/cross-service-consistency-audit/SKILL.md) | Сравнивай логику и UX нескольких услуг в сопоставимых контекстах с версией паттерна и друг с другом; фиксируй отклонения, допустимые различия и пробелы доказательств без реализации исправлений. |
| [decision-table-and-branch-coverage](skills/decision-table-and-branch-coverage/SKILL.md) | Строй таблицы решений и переходов статусов по известным условиям и проверяй покрытие документированных ветвей. Используй для сложных развилок; выводы о пересечениях и пробелах ограничивай установленными доменами. |
| [design-contract-validation](skills/design-contract-validation/SKILL.md) | Проверь технический проект на соответствие поведенческой спецификации, существующей архитектуре, границам изменений и плану проверок без подмены независимого ревью и согласования человеком. |
| [documentation-change-reconciliation](skills/documentation-change-reconciliation/SKILL.md) | Согласуй документацию с изменившимися версиями источников, паттернов и решений, сохраняя ручные правки и историю; автоматическое обновление выполняй только в рамках существующей явной политики публикации. |
| [documentation-consistency-testing](skills/documentation-consistency-testing/SKILL.md) | Проверяй комплект документации на целостность файлов, локальных ссылок, ID, таблиц, схем, трассировки и покрытия известных ветвей. Используй для документных проверок; результат не подтверждает код и поведение продукта. |
| [figma-flow-extraction](skills/figma-flow-extraction/SKILL.md) | Извлекай наблюдаемые пользовательские потоки, экраны и связи из предоставленных Figma-макетов или экспортов с точными локаторами; без создания нового дизайна и догадок о скрытой логике. |
| [implementation-readiness-check](skills/implementation-readiness-check/SKILL.md) | Проверь поручение на реализацию, согласование дизайна, версии входов и рабочую копию до изменения кода; выдели блокеры и границы разрешённых изменений. |
| [implementation-report-assembly](skills/implementation-report-assembly/SKILL.md) | Собери пакет передачи реализации с версией, базой сравнения, связями изменений с дизайном и реальными результатами проверок автора для дальнейшего тестирования. |
| [independent-solution-review](skills/independent-solution-review/SKILL.md) | Независимо оцени соответствие фактического изменения требованиям и дизайну, корректность, полноту, понятность и обоснованность сложности после реализации и тестирования. |
| [meeting-decision-extraction](skills/meeting-decision-extraction/SKILL.md) | Извлекай из совещаний описания, предложения, решения и поручения со спикерами, точными местами и основаниями полномочий. Используй для протоколов, записей и транскриптов, когда важно сохранить модальность и статус договорённостей. |
| [nfr-elicitation](skills/nfr-elicitation/SKILL.md) | Выявляй и уточняй нефункциональные требования через измеримые показатели, условия и методы проверки. Используй для требований к качеству и ограничениям; не превращай замеры в целевые SLA и не назначай числа без основания. |
| [obligation-to-requirement-mapping](skills/obligation-to-requirement-mapping/SKILL.md) | Свяжи извлечённые нормативные обязательства с проектами проверяемых продуктовых требований, отделяя текст нормы, объяснение и требующие решения предложения. |
| [pattern-applicability-assessment](skills/pattern-applicability-assessment/SKILL.md) | Проверяй применимость конкретной версии продуктового паттерна к услуге по контексту, условиям и ограничениям; отделяй неприменимость от исключения и нехватки свидетельств. |
| [pattern-change-impact-analysis](skills/pattern-change-impact-analysis/SKILL.md) | Оценивай последствия предлагаемой смены версии общего паттерна для услуг, исключений, UX, требований и проверок; готовь переход между версиями без скрытой правки стандарта. |
| [pattern-exception-governance](skills/pattern-exception-governance/SKILL.md) | Веди предложения и сообщённые решения об исключениях из продуктовых паттернов с областью, версиями и сроком пересмотра; не утверждай локальное отклонение автоматически. |
| [plain-language-editing](skills/plain-language-editing/SKILL.md) | Редактируй документацию продукта для понятного чтения, сохраняя точный бизнес-смысл, модальность, условия, ветви, общие ID и ссылки на источники. |
| [product-documentation](skills/product-documentation/SKILL.md) | Восстанавливай и описывай логику существующего продукта по интервью, макетам и реализации; готовь сценарии, бизнес-правила, вопросы, карту экспертов и проект RACI, проверяй описания по источникам. Используй для аналитической документации продукта, а не маркетинговых текстов. |
| [product-documentation-assembly](skills/product-documentation-assembly/SKILL.md) | Собирай и обновляй единый PRODUCT.md из исследованных источников и проверяемых результатов ролей, сохраняя бизнес-смысл, ветви, требования, UX, схемы, происхождение и открытые расхождения. |
| [product-documentation-methodology](skills/product-documentation-methodology/SKILL.md) | Применяй единую методологию продуктовой документации по макетам, совещаниям, аналитическим и нормативным источникам с проверяемыми требованиями, ветвлениями, UX, схемами и понятным изложением. |
| [product-information-architecture](skills/product-information-architecture/SKILL.md) | С начала исследования организуй структуру единого PRODUCT.md и навигацию между бизнес-смыслом, процессами, требованиями, UX, схемами и свидетельствами для разных уровней чтения. |
| [product-pattern-discovery](skills/product-pattern-discovery/SKILL.md) | Выявляй повторяющиеся продуктовые задачи и выделяй кандидатов в общие паттерны логики и UX по источникам нескольких услуг; не объявляй распространённый вариант утверждённым стандартом. |
| [raci-decision-routing](skills/raci-decision-routing/SKILL.md) | Определи маршрут конкретных продуктовых решений и проект RACI между владельцами услуг и общих паттернов; отделяй известные полномочия от предложений и передавай вопросы через пользователя. |
| [regulatory-gap-analysis](skills/regulatory-gap-analysis/SKILL.md) | Выяви пробелы между нормативными основаниями, проектами требований и свидетельствами о продукте в заданной области без заключения о юридическом соответствии. |
| [regulatory-source-validation](skills/regulatory-source-validation/SKILL.md) | Проверь происхождение, редакцию, даты и известную применимость назначенных нормативных источников перед извлечением обязательств для продукта. |
| [repository-topology-discovery](skills/repository-topology-discovery/SKILL.md) | Составь карту существующего проекта, компонентов и связей по доступным исходникам и материалам продукта. Используй для определения расположения логики, интерфейсов, данных, интеграций и тестов до изменений. |
| [requirement-impact-mapping](skills/requirement-impact-mapping/SKILL.md) | Свяжи предоставленное требование с частями существующего продукта и документированными зависимостями. Используй для анализа влияния на данные, логику, интерфейсы, интеграции и тесты до проектирования изменений. |
| [resolution-tracking](skills/resolution-tracking/SKILL.md) | Веди вопросы и сообщённые человеком решения по расхождениям источников, сохраняя область действия, историю и влияние на зависимые документы. |
| [risk-based-test-selection](skills/risk-based-test-selection/SKILL.md) | Подбери проверки нового поведения, значимых границ и затронутых соседних функций по требованиям, дизайну, diff и рискам без выдумывания ожидаемых результатов. |
| [screen-state-specification](skills/screen-state-specification/SKILL.md) | Описывай подтверждённые экраны, состояния, поля, действия и переходы интерфейса в составе документации продукта, сохраняя границы UX-свидетельств и неизвестное. |
| [snapshot-evidence-capture](skills/snapshot-evidence-capture/SKILL.md) | Зафиксируй проверяемые свидетельства выводов о продукте с точным местом, контекстом и версией источника. Используй при исследовании кода, макетов, интервью, документов и наблюдаемого поведения. |
| [specification-contract-validation](skills/specification-contract-validation/SKILL.md) | Проверь покрытие утверждённых требований поведенческой спецификацией, точность свидетельств, сохранение ограничений, проверяемость и отсутствие преждевременных технических решений. |
| [test-adequacy-review](skills/test-adequacy-review/SKILL.md) | Независимо проверь, что тесты и их утверждения действительно проверяют нужное поведение, существенные границы и регрессию, а доказательства относятся к актуальному изменению. |
| [test-result-evidence-assembly](skills/test-result-evidence-assembly/SKILL.md) | Подготовь отчёт тестирования с доказательствами по выполненным, проваленным и непроверенным сценариям и границами вывода о регрессии. |
| [ux-requirement-traceability](skills/ux-requirement-traceability/SKILL.md) | Связывай требования и сценарии с подтверждёнными UX-экранами, состояниями и переходами, показывая покрытие, расхождения и пробелы без объявления макета доказательством реализации. |
| [verification-verdict-assembly](skills/verification-verdict-assembly/SKILL.md) | Составь итог верификации по каждому критерию приёмки и не объявляй готовность при неподтверждённой обязательной части цепочки; приёмку оставь человеку. |
| [workflow-orchestration](skills/workflow-orchestration/SKILL.md) | Организуй выбранный пакет работы из подключаемых агентов и скиллов, проверь версии, готовность переходов и необходимые решения человека без привязки к конкретному продукту. |
| [working-copy-safety-inspection](skills/working-copy-safety-inspection/SKILL.md) | Проверь состояние рабочей копии перед анализом и записью результатов, чтобы сохранить чужие незавершённые изменения. Используй для проверки готовности рабочего каталога, не для аудита безопасности продукта. |
