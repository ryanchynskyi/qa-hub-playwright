# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/daily.spec.ts >> Daily tasks (UI) >> Count chosen on an untouched guest set applies at once
- Location: tests/e2e/daily.spec.ts:90:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=7837
[pid=7837][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=7837
  - [pid=7837][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=7837] <gracefully close start>
  - [pid=7837] <kill>
  - [pid=7837] <will force kill>
  - [pid=7837] <process did exit: exitCode=127, signal=null>
  - [pid=7837] starting temporary directories cleanup
  - [pid=7837] finished temporary directories cleanup
  - [pid=7837] <gracefully close end>

```