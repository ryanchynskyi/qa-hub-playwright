#!/usr/bin/env bash
# One issue per outage (docs/WORKFLOW.md, "Prod smoke" and "Nightly"):
#   prod-alert.sh failure  opens the issue, or comments on the open one;
#   prod-alert.sh success  closes the open issue, if any.
# Needs GH_TOKEN (issues: write) and RUN_URL; ALERT_TITLE overrides the title (nightly, a dry run).
set -euo pipefail
title="${ALERT_TITLE:-Prod smoke failing}"
# No --search: the search index lags, and a second failure minutes later opened a duplicate.
number=$(gh issue list --state open --limit 500 --json number,title \
  --jq "map(select(.title == \"$title\"))[0].number // empty")

case "$1" in
  failure)
    if [ -n "$number" ]; then
      gh issue comment "$number" --body "Failed again: $RUN_URL"
    else
      gh issue create --title "$title" --body "$title: $RUN_URL

The report is attached to the run. The next green run closes this issue."
    fi ;;
  success)
    if [ -n "$number" ]; then gh issue close "$number" --comment "Green again: $RUN_URL"; fi ;;
  *) echo "usage: $0 failure|success" >&2; exit 2 ;;
esac
