# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/recall.spec.ts >> Recall: reveal >> Space shows the answer
- Location: tests/e2e/recall.spec.ts:72:5

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=10742
[pid=10742][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=10742
  - [pid=10742][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=10742] <gracefully close start>
  - [pid=10742] <kill>
  - [pid=10742] <will force kill>
  - [pid=10742] exception while trying to kill process: Error: kill ESRCH
  - [pid=10742] <process did exit: exitCode=127, signal=null>
  - [pid=10742] starting temporary directories cleanup
  - [pid=10742] finished temporary directories cleanup
  - [pid=10742] <gracefully close end>

```