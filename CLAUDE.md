## Clean up after merge (standing order from Yavar, 2026-11-03)
When a PR you worked on merges or closes, remove its lane checkout in the same session. Don't leave it for later.
- From the parent repo, run `git worktree remove <lane path>` and then `git worktree prune`. Never `rm -rf` a worktree that git still tracks.
- Delete the lane's local branch if it is merged or closed (`git branch -d`).
- Delete that lane's one-off scratch and task folders, plus its build output (`node_modules`, `.next`, `target/`, `dist/`, `build/`).
- Don't remove a lane that has uncommitted changes or commits not pushed to any remote. Report it instead.
- Don't remove anything a running process is using, and don't remove another agent's lane.
- Never delete logs, .xcresult bundles, `~/.minship`, `rescue/`, TOA briefs, Mansour or divorce files, or model weights.
