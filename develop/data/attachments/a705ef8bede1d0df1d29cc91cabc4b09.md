# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/shell.spec.ts >> shell navigation >> layout matches the viewport
- Location: tests/e2e/shell.spec.ts:41:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=11486
[pid=11486][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=11486
  - [pid=11486][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=11486] <gracefully close start>
  - [pid=11486] <kill>
  - [pid=11486] <will force kill>
  - [pid=11486] exception while trying to kill process: Error: kill ESRCH
  - [pid=11486] <process did exit: exitCode=127, signal=null>
  - [pid=11486] starting temporary directories cleanup
  - [pid=11486] finished temporary directories cleanup
  - [pid=11486] <gracefully close end>

```