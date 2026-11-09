# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/onboarding.spec.ts >> short dashboard and tour >> opening quiz arms the tour on the next dashboard
- Location: tests/e2e/onboarding.spec.ts:284:5

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=9499
[pid=9499][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=9499
  - [pid=9499][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=9499] <gracefully close start>
  - [pid=9499] <kill>
  - [pid=9499] <will force kill>
  - [pid=9499] <process did exit: exitCode=127, signal=null>
  - [pid=9499] starting temporary directories cleanup
  - [pid=9499] finished temporary directories cleanup
  - [pid=9499] <gracefully close end>

```