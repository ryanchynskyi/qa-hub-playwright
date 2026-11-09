# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: seed-new.spec.ts >> seed new visitor
- Location: tests/seed-new.spec.ts:9:1

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=11251
[pid=11251][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=11251
  - [pid=11251][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=11251] <gracefully close start>
  - [pid=11251] <kill>
  - [pid=11251] <will force kill>
  - [pid=11251] exception while trying to kill process: Error: kill ESRCH
  - [pid=11251] <process did exit: exitCode=127, signal=null>
  - [pid=11251] starting temporary directories cleanup
  - [pid=11251] finished temporary directories cleanup
  - [pid=11251] <gracefully close end>

```