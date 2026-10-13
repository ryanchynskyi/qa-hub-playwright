# Модуль 4. API-тестування: клієнт, контракти, security

**Після модуля ти можеш:** побудувати типізований API-клієнт на Playwright, описати контракт
схемою, яка дає і runtime-перевірку, і TS-тип, написати data-driven негативні тести і
security-інваріанти.

Файли: [src/api/client.ts](../../src/api/client.ts) · [src/api/schemas.ts](../../src/api/schemas.ts) ·
[tests/api/](../../tests/api/)

## 1. Два рівні клієнта

```ts
await api.login(user);                         // типізований: перевіряє статус, парсить схемою
await api.raw.post('auth/login', { data });    // сирий: для негативних тестів
```

- **Типізовані методи** для happy path і підготовки даних. Вони перевіряють очікуваний статус
  (`expectStatus` показує URL і тіло відповіді, а не просто «500 !== 200»), парсять тіло
  zod-схемою і повертають типізований об'єкт. Зламаний контракт падає тут, з чітким повідомленням.
- **`raw`** (`APIRequestContext`) для негативних кейсів, де треба побачити статус і тіло помилки як
  є: `400 bad_request`, `401 invalid_credentials`, `409 email_taken`.

Чому не окремий HTTP-клієнт (axios, supertest): `APIRequestContext` вже вміє baseURL, cookies,
trace і звіти. Запити видно в trace viewer поруч з UI-кроками.

## 2. Схема = тип = контракт

```ts
export const Health = z.object({ status: z.literal('ok'), db: z.literal('up'), ... });
export type Health = z.infer<typeof Health>;
```

Одне джерело правди: зміни схему, і TypeScript покаже всі місця, де тип використовується. Тест
`health` майже порожній, бо **схема і є перевіркою контракту**.

### Пастка: zod тихо відкидає зайві поля

`z.object()` за замовчуванням **стрипає** невідомі ключі. Якщо API раптом почне віддавати
`correctIndex` у питаннях, `Question.parse()` його мовчки викине, і тест «немає відповідей»
пройде. Ми на це наступили під час побудови фреймворку. Тому security-інваріанти («поля X **не
повинно бути**») перевіряються на **сирому JSON**:

```ts
const questions = (await res.json()) as Record<string, unknown>[];
expect.soft(q).not.toHaveProperty('correctIndex');
```

Альтернатива — `z.strictObject()`, що падає на будь-якому новому полі. Але тоді додавання поля в
API (зворотно сумісна зміна) ламає весь набір. Тому загальні схеми нестрогі, а заборони явні.

## 3. Data-driven тести

```ts
const badBodies = [
  { name: 'choice above 9', data: { choice: 10 } },
  { name: 'negative choice', data: { choice: -1 } },
];
for (const { name, data } of badBodies) {
  test(`${name} is 400 bad_request`, async ({ api }) => { ... });
}
```

Кожен кейс — окремий тест з власною назвою в звіті: видно, *який* саме кейс впав. Порівняй з
циклом всередині одного тесту (`questions of every section`): там ми свідомо обрали один тест з
`test.step` на секцію і `expect.soft`. Набір секцій приходить з API (`catalog`) і невідомий на
етапі збирання тестів, а `expect.soft` показує всі зламані секції одразу, а не лише першу.

**Не хардкодь обсяги контенту.** «673 питання» зміниться з першою редакторською правкою. Тест
`catalog is consistent` порівнює два джерела (`/health` і `/content/catalog`) і внутрішню
цілісність (кожне питання посилається на існуючу секцію і розділ).

## 4. Security-інваріанти

| Інваріант | Тест | Чому важливо |
|---|---|---|
| Питання без `correctIndex`/`explanation` | `content.spec.ts` | інакше відповіді видно в DevTools |
| Рейтинг без id та email | `leaderboard.spec.ts` | персональні дані в публічному API |
| Однакова помилка для «немає email» і «невірний пароль» | `auth.spec.ts` | user enumeration |
| Refresh-cookie `HttpOnly` | `auth.spec.ts` | JS (і XSS) не може її вкрасти |
| Без токена `/auth/me` дає 401 | `auth.spec.ts` | базова авторизація |

Тест рейтингу спершу **створює дані** (правильна відповідь з токеном дає XP). На порожній БД
цикл по `top` нічого б не перевірив і пройшов би. Тому в ньому є
`expect(body.top.length).toBeGreaterThan(0)`: захист від «зеленого, бо порожньо».

## Експеримент (15 хв)

1. Перевір пастку zod руками. У Node REPL або тимчасовому тесті:
   `Question.parse({ ...validQuestion, correctIndex: 0 })`. Чи є `correctIndex` у результаті?
   Тепер `Question.strict().parse(...)`. Поясни одним реченням, чому тест «немає відповідей»
   ходить у `api.raw`, а не в `api.questions()`.
2. Прибери `beforeEach` у `leaderboard.spec.ts`, запусти на свіжій БД (`npm run stack:reset`).
   Що впало і чому це добре?
3. Відкрий trace будь-якого API-тесту (`--trace on`) і знайди запити в таймлайні.

## Практика (1–1.5 год)

**Завдання A. Профіль: `PATCH /me` і `PUT /me/daily-count`.**
- [ ] Методи клієнта `updateProfile(token, patch)` і `setDailyCount(token, count)` зі схемами.
- [ ] Data-driven: `count` 3, 4, 5 дають 200; 2, 6, `"4"`, `null` дають 400 `bad_request`.
- [ ] `displayName` 1..60 символів: межі 0, 1, 60, 61.
- [ ] Без токена 401.

**Завдання B. CSRF/Origin.** Запис з чужим `Origin` дає `403 bad_origin` (docs/brief.md §7).
- [ ] Тест: `POST /auth/login` з заголовком `Origin: https://evil.example` дає 403
      `bad_origin`; без Origin проходить (чому Playwright не шле Origin за замовчуванням?).
- [ ] Не `@prod-safe`: подумай, чому, хоч це лише логін.

## Питання на співбесіді

1. Як влаштований ваш API-клієнт? Навіщо обгортка над `request`?
2. Як перевіряєте контракт відповіді? Чим schema validation краща за `toEqual` з еталонним JSON?
3. Strict чи non-strict схеми: що ламається в кожному випадку?
4. Які security-перевірки можна зробити на рівні API-тестів?
5. Як параметризуєте тести в Playwright і коли обираєте `test.step` + `expect.soft`?

Еталонні відповіді: [INTERVIEW.md](../INTERVIEW.md#модуль-4).
