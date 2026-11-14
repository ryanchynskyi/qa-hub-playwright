# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api/community.spec.ts >> user text is stored verbatim >> chat message
- Location: tests/api/community.spec.ts:8:3

# Error details

```
Error: http://localhost:4273/api/chat/messages returned 404: {"error":"not_found"}

expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 404
```

# Test source

```ts
  209 |     const data = { ...UPLOAD_CONTEXT, rating };
  210 |     return this.postJson('feedback', data, FeedbackCreated, token, 201);
  211 |   }
  212 | 
  213 |   adminBugReports(adminToken: string): Promise<AdminBugReports> {
  214 |     return this.getJson('admin/bug-reports', AdminBugReports, adminToken);
  215 |   }
  216 | 
  217 |   async setBugStatus(
  218 |     adminToken: string,
  219 |     id: number,
  220 |     status: UploadStatus,
  221 |   ): Promise<z.infer<typeof AdminBugReport>> {
  222 |     const res = await this.raw.patch(`admin/bug-reports/${id}`, {
  223 |       data: { status },
  224 |       headers: bearer(adminToken),
  225 |     });
  226 |     await expectStatus(res, 200);
  227 |     return AdminBugReport.parse(await res.json());
  228 |   }
  229 | 
  230 |   adminFeedback(adminToken: string): Promise<z.infer<typeof AdminFeedback>> {
  231 |     return this.getJson('admin/feedback', AdminFeedback, adminToken);
  232 |   }
  233 | 
  234 |   async replyToFeedback(
  235 |     adminToken: string,
  236 |     id: string,
  237 |     reply: string,
  238 |   ): Promise<z.infer<typeof AdminFeedbackItem>> {
  239 |     const res = await this.raw.put(`admin/feedback/${id}/reply`, {
  240 |       data: { reply },
  241 |       headers: bearer(adminToken),
  242 |     });
  243 |     await expectStatus(res, 200);
  244 |     return AdminFeedbackItem.parse(await res.json());
  245 |   }
  246 | 
  247 |   myFeedback(token: string): Promise<z.infer<typeof MyFeedback>> {
  248 |     return this.getJson('me/feedback', MyFeedback, token);
  249 |   }
  250 | 
  251 |   async chatMessages(): Promise<ChatMessage[]> {
  252 |     return (await this.getJson('chat/messages', ChatFeed)).messages;
  253 |   }
  254 | 
  255 |   /** Comments target a question (or another `targetType`) by id. */
  256 |   async postComment(token: string, targetId: string, text: string): Promise<void> {
  257 |     const res = await this.raw.post('comments', {
  258 |       data: { targetType: 'question', targetId, text },
  259 |       headers: bearer(token),
  260 |     });
  261 |     await expectStatus(res, 201);
  262 |   }
  263 | 
  264 |   async comments(targetId: string): Promise<Comments['items']> {
  265 |     const params = new URLSearchParams({ targetType: 'question', targetId });
  266 |     return (await this.getJson(`comments?${params}`, Comments)).items;
  267 |   }
  268 | 
  269 |   /** Deletes the account the token belongs to (DELETE /me, 204). */
  270 |   async deleteAccount(token: string, email: string): Promise<void> {
  271 |     const res = await this.raw.delete('me', {
  272 |       headers: bearer(token),
  273 |       data: { confirmEmail: email },
  274 |     });
  275 |     await expectStatus(res, 204);
  276 |   }
  277 | 
  278 |   private async getJson<S extends z.ZodType>(
  279 |     path: string,
  280 |     schema: S,
  281 |     token?: string,
  282 |   ): Promise<z.infer<S>> {
  283 |     const res = await this.raw.get(path, { headers: bearer(token) });
  284 |     await expectStatus(res, 200);
  285 |     return schema.parse(await res.json());
  286 |   }
  287 | 
  288 |   private async postJson<S extends z.ZodType>(
  289 |     path: string,
  290 |     data: unknown,
  291 |     schema: S,
  292 |     token?: string,
  293 |     status = 200,
  294 |   ): Promise<z.infer<S>> {
  295 |     const res = await this.raw.post(path, { data, headers: bearer(token) });
  296 |     await expectStatus(res, status);
  297 |     return schema.parse(await res.json());
  298 |   }
  299 | }
  300 | 
  301 | export function bearer(token?: string): Record<string, string> {
  302 |   return token ? { authorization: `Bearer ${token}` } : {};
  303 | }
  304 | 
  305 | /** Status check whose failure message shows the method, URL and body, not just "500 !== 200". */
  306 | export async function expectStatus(res: APIResponse, status: number): Promise<void> {
  307 |   if (res.status() === status) return;
  308 |   const body = await res.text().catch(() => '<no body>');
> 309 |   expect(res.status(), `${res.url()} returned ${res.status()}: ${body.slice(0, 500)}`).toBe(status);
      |                                                                                        ^ Error: http://localhost:4273/api/chat/messages returned 404: {"error":"not_found"}
  310 | }
  311 | 
```