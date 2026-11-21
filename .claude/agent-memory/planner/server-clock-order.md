---
name: server-clock-order
description: Server clock moves expire tokens and leave the browser on the old day; clock, then login, then data, then page.clock at the same instant
metadata:
  type: feedback
  class: auth-state
  origin: "2026-11-21 phase2-plan-clock: /me/plan failed after a clock jump (token minted before it), and the dashboard hid plan-rest while the browser stayed on the real date"
  since: 2026-11-21
---

`PUT /api/__e2e/clock` is global and moves token expiry with it; the dashboard computes "today" in the browser.
**Why:** the first probe after a jump returned an expired-token error, and the rest-day notice was missing until `window.Date` matched the server.
**How to apply:** every jump → set the clock, log in again, then create data; align the browser Date to the same instant before opening the page; end with `{ offsetMs: 0 }`.
