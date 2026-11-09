# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/import.spec.ts >> Import of guest progress (UI) >> Importing the same data again reports Nothing new and adds no XP
- Location: tests/e2e/import.spec.ts:84:3

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=8720
[pid=8720][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=8720
  - [pid=8720][err] /home/runner/.cache/ms-playwright/webkit-2370/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=8720] <gracefully close start>
  - [pid=8720] <kill>
  - [pid=8720] <will force kill>
  - [pid=8720] <process did exit: exitCode=127, signal=null>
  - [pid=8720] starting temporary directories cleanup
  - [pid=8720] finished temporary directories cleanup
  - [pid=8720] <gracefully close end>

```