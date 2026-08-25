---
description: Run the CI gates locally against what's currently staged (or a named repo)
---

Run the same gates GitHub Actions runs, without committing anything.

`$ARGUMENTS` may name a repo directory (e.g. `LAD_backend`). If it's empty, use the
repo containing the files changed in this session.

Steps:

1. Stage nothing and change nothing. Build a throwaway index so the user's real
   staging area is untouched, and point the gate at it:

   ```bash
   export GIT_INDEX_FILE=$(mktemp -t lad-ci-index)
   git -C <repo> read-tree HEAD
   git -C <repo> add <the files that changed>
   echo '{"tool_name":"Bash","tool_input":{"command":"cd <repo> && git commit"}}' \
     | CLAUDE_PROJECT_DIR="$PWD" bash .claude/hooks/ci-gate.sh
   unset GIT_INDEX_FILE
   ```

2. Report the result exactly as the gate gives it - which gates ran, which passed,
   which would block. Do not soften a blocker into a suggestion.

3. If a gate is red, fix the underlying problem. If a gate could not run at all
   (missing tool, broken `node_modules`, unreadable config), say so plainly - a gate
   that didn't run is not a gate that passed.

Never use `LAD_SKIP_CI_GATE=1` on the user's behalf.
