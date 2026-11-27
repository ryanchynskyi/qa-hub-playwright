# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/recall.spec.ts >> Recall: rating >> digit keys rate the card
- Location: tests/e2e/recall.spec.ts:118:3

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('recall-progress')
Expected: "11"
Received: "10"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" getByTestId('recall-progress') with timeout 5000ms
  - waiting for getByTestId('recall-progress')
    14 × locator resolved to <span class="qz-c" data-value="4" data-total="10" data-testid="recall-progress">4 / 10</span>
       - unexpected value "10"

```

```yaml
- text: 4 / 10
```

# Test source

```ts
  37  |       await expect(recall.back).toBeHidden();
  38  |       await expect(recall.answer).toBeHidden();
  39  |       await expect(recall.rates).toHaveCount(0);
  40  |       await expect(recall.card).not.toContainText(plainFragment(card.answer));
  41  |       await expect(recall.progress).toHaveAttribute('data-value', '1');
  42  |       await expect(recall.progress).toHaveAttribute('data-total', String(size));
  43  |     },
  44  |   );
  45  | });
  46  | 
  47  | test.describe('Recall: reveal', () => {
  48  |   test(
  49  |     'the button shows the model answer and the three rating buttons',
  50  |     { tag: ['@REQ-REC-04'] },
  51  |     async ({ recall, api }) => {
  52  |       // 1. Open /recall, click recall-start, remember the card id
  53  |       await recall.goto();
  54  |       await recall.startSession();
  55  |       const id = await recall.currentCardId();
  56  |       const card = await cardById(api, id);
  57  | 
  58  |       // 2. Click recall-reveal
  59  |       await recall.showAnswer();
  60  |       await expect(recall.answer).toBeVisible();
  61  |       await expect(recall.answer).toContainText(plainFragment(card.answer));
  62  |       await expect(recall.question).toHaveText(stripInlineCode(card.question));
  63  |       await expect(recall.rates).toHaveCount(3);
  64  |       for (const n of [1, 3, 5]) {
  65  |         await expect(recall.rate(n)).toBeEnabled();
  66  |       }
  67  |       await expect(recall.reveal).toHaveCount(0);
  68  |       await expect(recall.progress).toHaveAttribute('data-value', '1');
  69  |     },
  70  |   );
  71  | 
  72  |   for (const key of ['Space', 'Enter'] as const) {
  73  |     test(`${key} shows the answer`, { tag: ['@REQ-REC-04'] }, async ({ recall }) => {
  74  |       // 1. Open /recall, click recall-start
  75  |       await recall.goto();
  76  |       await recall.startSession();
  77  | 
  78  |       // 2. Press the key without focusing any element
  79  |       await recall.showAnswer(key);
  80  |       await expect(recall.rates).toHaveCount(3);
  81  | 
  82  |       // Negative: Space again changes nothing
  83  |       await recall.page.keyboard.press('Space');
  84  |       await expect(recall.card).toHaveAttribute('data-state', 'back');
  85  |       await expect(recall.progress).toHaveAttribute('data-value', '1');
  86  |     });
  87  |   }
  88  | });
  89  | 
  90  | test.describe('Recall: rating', () => {
  91  |   test(
  92  |     'a rating moves to the next card and the counter updates',
  93  |     { tag: ['@REQ-REC-05'] },
  94  |     async ({ page, recall }) => {
  95  |       // 1. Open /recall, click recall-start, remember card id A
  96  |       await recall.goto();
  97  |       const size = await recall.startSession();
  98  |       const a = await recall.currentCardId();
  99  | 
  100 |       // 2. Reveal and rate «Знаю» (5)
  101 |       await recall.showAnswer();
  102 |       await recall.rateCard(5);
  103 |       await expect(recall.progress).toHaveAttribute('data-value', '2');
  104 |       await expect(recall.progress).toHaveAttribute('data-total', String(size));
  105 |       await expect(recall.card).toHaveAttribute('data-state', 'front');
  106 |       await expect(recall.card).not.toHaveAttribute('data-key', a);
  107 |       await expect(recall.bar.nth(0)).toHaveAttribute('data-state', 'pass');
  108 |       await expect(recall.bar.nth(1)).toHaveAttribute('data-state', 'current');
  109 |       await expect
  110 |         .poll(async () => {
  111 |           const state = (await readGuest(page))?.cards[a];
  112 |           return state && { rating: state.rating, reviews: state.reviews };
  113 |         })
  114 |         .toEqual({ rating: 5, reviews: 1 });
  115 |     },
  116 |   );
  117 | 
  118 |   test('digit keys rate the card', { tag: ['@REQ-REC-05'] }, async ({ recall }) => {
  119 |     // 1. Open /recall, click recall-start
  120 |     await recall.goto();
  121 |     const size = await recall.startSession();
  122 |     expect(size, 'cards in the core session').toBeGreaterThanOrEqual(3);
  123 | 
  124 |     // 2. Press Space, then a digit 1-3: «Частково» (key 2), «Знаю» (3) and «Не знаю» (1)
  125 |     const digits = [
  126 |       [3, 'part'],
  127 |       [5, 'pass'],
  128 |       [1, 'fail'],
  129 |     ] as const;
  130 |     for (const [i, [rating, state]] of digits.entries()) {
  131 |       await recall.showAnswer('Space');
  132 |       await recall.rateCard(rating, true);
  133 |       await expect(recall.bar.nth(i)).toHaveAttribute('data-state', state);
  134 |     }
  135 |     await expect(recall.progress).toHaveAttribute('data-value', '4');
  136 |     // The card rated 1 was put back: one more place in the session
> 137 |     await expect(recall.progress).toHaveAttribute('data-total', String(size + 1));
      |                                   ^ Error: expect(locator).toHaveAttribute(expected) failed
  138 |   });
  139 | 
  140 |   test(
  141 |     'a card rated 1 comes back in the same session',
  142 |     { tag: ['@REQ-REC-05'] },
  143 |     async ({ recall }) => {
  144 |       // 1. Open /recall, click recall-start, remember card id A, reveal, rate 1
  145 |       await recall.goto();
  146 |       const size = await recall.startSession();
  147 |       expect(size, 'cards in the core session').toBeGreaterThanOrEqual(4);
  148 |       const a = await recall.currentCardId();
  149 |       await recall.showAnswer();
  150 |       await recall.rateCard(1);
  151 |       await expect(recall.progress).toHaveAttribute('data-value', '2');
  152 |       await expect(recall.progress).toHaveAttribute('data-total', String(size + 1));
  153 |       await expect(recall.bar.nth(0)).toHaveAttribute('data-state', 'fail');
  154 |       await expect(recall.bar).toHaveCount(size + 1);
  155 | 
  156 |       // 2. Rate the next three cards 5: the app puts a card rated 1 back three places later, once
  157 |       for (let i = 0; i < 3; i++) {
  158 |         await recall.showAnswer();
  159 |         await recall.rateCard(5);
  160 |       }
  161 |       await expect(recall.progress).toHaveAttribute('data-value', '5');
  162 |       await expect(recall.card).toHaveAttribute('data-key', a);
  163 |       await expect(recall.card).toHaveAttribute('data-state', 'front');
  164 | 
  165 |       // 3. Rate it 1 again: it does not come back a second time
  166 |       await recall.showAnswer();
  167 |       await recall.rateCard(1, false, false);
  168 |       await expect(recall.progress).toHaveAttribute('data-total', String(size + 1));
  169 |       await expect(recall.bar).toHaveCount(size + 1);
  170 |     },
  171 |   );
  172 | 
  173 |   test(
  174 |     'a signed-in rating is saved on the server and survives a reload',
  175 |     { tag: ['@REQ-REC-05'] },
  176 |     async ({ authedPage, api, user }) => {
  177 |       const recall = new RecallPage(authedPage);
  178 |       // 1. Open /recall, click recall-start, remember card A, reveal, rate 5
  179 |       await recall.goto();
  180 |       await recall.startSession();
  181 |       const a = await recall.currentCardId();
  182 |       await recall.showAnswer();
  183 |       await recall.rateCard(5);
  184 |       await expect
  185 |         .poll(async () =>
  186 |           (await api.progress(user.token)).xpLog.some(
  187 |             (e) => e.reason === 'recall' && e.refId === a,
  188 |           ),
  189 |         )
  190 |         .toBe(true);
  191 | 
  192 |       // 2. Reload the page, open /recall
  193 |       // Nothing is due but a card is reviewed: the page is the caught-up one, the setup is a click away
  194 |       await authedPage.goto('recall');
  195 |       await expect(recall.caughtUp).toBeVisible();
  196 |       await recall.caughtSetup.click();
  197 |       // A is reviewed and not due (14 days): it moved from "new" to "later" for this account.
  198 |       await expect(recall.pool).toHaveAttribute('data-later', '1');
  199 |       await expect(recall.pool).toHaveAttribute('data-due', '0');
  200 |     },
  201 |   );
  202 | });
  203 | 
```