# Agent Development Notes

## Parallel worktrees

Run each worktree's local web server on its own port so browser tabs and test streams stay isolated.

| Worktree | Port |
| --- | ---: |
| Main checkout | 8080 |
| `.worktrees/custom-layout-frame` | 8081 |
| `.worktrees/advanced-2d-background` | 8082 |

Start a server from the worktree being tested:

```powershell
python -m http.server <assigned-port> --bind 127.0.0.1
```

Assign and record an unused port before launching another concurrent worktree. Use the matching `http://127.0.0.1:<port>/` URL for browser verification.
