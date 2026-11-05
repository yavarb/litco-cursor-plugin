add your ruling to YAVAR_UI_RULES.md in litkit-app, in the same PR that implements it, then sync

## Yavar's UI/product guidelines

Read the [local copy](docs/YAVAR_UI_RULES.md). The canonical source is
[litkit-app on GitHub](https://github.com/yavarb/litkit-app/blob/main/docs/YAVAR_UI_RULES.md),
also available in a sibling checkout at [../litkit-app/docs/YAVAR_UI_RULES.md](../litkit-app/docs/YAVAR_UI_RULES.md).

These are Yavar's default calls and can be changed or traded off. A PR departing
from one says so and why in its description. Review FAILs a FIRM-tier violation;
an unexplained DEFAULT departure is flagged, but an explained one is not a FAIL.
A rationale does not waive a FIRM requirement; changing one needs Yavar's explicit
recorded ruling.

Edit only in litkit-app, then run `scripts/sync-yavar-rules.sh`. Pass a local
checkout directory explicitly for an unmerged canonical change; otherwise the
script uses `../litkit-app` if available, or GitHub's `main` copy via `gh`.
Review and commit both the copy and its `.sha256` pin.

`npm test` (also part of `npm run check`) runs
`scripts/check-yavar-rules-sync.sh`. It checks the local copy against its pin and,
when reachable via `gh` within 10 seconds, litkit-app's `origin/main` copy. Offline,
it prints a note and relies on the pin. It checks copy synchronization only, not
code compliance with the guidelines.

## Clean up after merge (standing order from Yavar, 2026-11-03)
When a PR you worked on merges or closes, remove its lane checkout in the same session. Don't leave it for later.
- From the parent repo, run `git worktree remove <lane path>` and then `git worktree prune`. Never `rm -rf` a worktree that git still tracks.
- Delete the lane's local branch if it is merged or closed (`git branch -d`).
- Delete that lane's one-off scratch and task folders, plus its build output (`node_modules`, `.next`, `target/`, `dist/`, `build/`).
- Don't remove a lane that has uncommitted changes or commits not pushed to any remote. Report it instead.
- Don't remove anything a running process is using, and don't remove another agent's lane.
- Never delete logs, .xcresult bundles, `~/.minship`, `rescue/`, TOA briefs, Mansour or divorce files, or model weights.
