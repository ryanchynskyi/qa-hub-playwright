# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/leaderboard.spec.ts >> Leaderboard UI >> a row shows rank, name, level and XP
- Location: tests/e2e/leaderboard.spec.ts:69:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=8973
[pid=8973][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=8973
  - [pid=8973][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=8973] <gracefully close start>
  - [pid=8973] <kill>
  - [pid=8973] <will force kill>
  - [pid=8973] <process did exit: exitCode=127, signal=null>
  - [pid=8973] starting temporary directories cleanup
  - [pid=8973] finished temporary directories cleanup
  - [pid=8973] <gracefully close end>

```