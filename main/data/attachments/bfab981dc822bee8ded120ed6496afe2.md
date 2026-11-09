# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/bug-dialog.spec.ts >> Bug report dialog >> send needs 5 characters: 4 keeps it disabled, 5 enables it
- Location: tests/e2e/bug-dialog.spec.ts:59:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=6985
[pid=6985][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=6985
  - [pid=6985][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=6985] <gracefully close start>
  - [pid=6985] <kill>
  - [pid=6985] <will force kill>
  - [pid=6985] exception while trying to kill process: Error: kill ESRCH
  - [pid=6985] <process did exit: exitCode=127, signal=null>
  - [pid=6985] starting temporary directories cleanup
  - [pid=6985] finished temporary directories cleanup
  - [pid=6985] <gracefully close end>

```