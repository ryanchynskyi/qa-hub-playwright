---
name: boundary-needs-scenario
description: A boundary or branch of the requirement gets a scenario, not a line in Ideas or Ambiguity
metadata:
  type: feedback
  class: weak-assert
  origin: '2026-11-02: mutants AUTH-06-2, QUIZ-10-2, REC-05-2, REC-05-3 survived; their cases were in Ideas or Ambiguity of the plans or in no scenario'
  since: 2026-11-02
---

Плани описували межі вимог (цифра понад кількість варіантів, картка повертається лише раз, крайні
клавіші 1 і 5, fallback токена без cookie), але лишали їх в Ideas чи Ambiguity. Сценаріїв не було,
тож зламана межа не валила жоден тест.

**Why:** 4 з 5 мутантів, що вижили в повному прогоні II-2, ламали саме такі межі.
**How to apply:** діапазон, «лише раз», fallback чи інша гілка, яку називає вимога або видно в коді,
отримує сценарій чи крок у сценарії. В Ideas лишається тільки те, що не входить у вимогу.
