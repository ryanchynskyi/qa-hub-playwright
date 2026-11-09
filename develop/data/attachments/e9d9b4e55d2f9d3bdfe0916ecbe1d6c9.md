# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/quiz-keyboard.spec.ts >> Quiz: keyboard >> A digit above the option count is ignored
- Location: tests/e2e/quiz-keyboard.spec.ts:56:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=10065
[pid=10065][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=10065
  - [pid=10065][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=10065] <gracefully close start>
  - [pid=10065] <kill>
  - [pid=10065] <will force kill>
  - [pid=10065] exception while trying to kill process: Error: kill ESRCH
  - [pid=10065] <process did exit: exitCode=127, signal=null>
  - [pid=10065] starting temporary directories cleanup
  - [pid=10065] finished temporary directories cleanup
  - [pid=10065] <gracefully close end>

```