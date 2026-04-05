# CLAUDE.md

This repository uses `~/.ai-harness/CLAUDE.md` as the shared Claude-facing base.
Apply the shared harness guidance first, then treat `AGENTS.md` in this repository as the dexter-specific override.
If `.ai-harness/` exists in this repository, treat it as the local harness override layer after this file.

Before making code changes:
1. Read `AGENTS.md`
2. If a local ignored file such as `CLAUDE.dev.md` exists, read it after `AGENTS.md`
3. Never commit the contents of local-only maintainer files

Dexter-specific implementation, tool, and runtime guidance lives in `AGENTS.md`.

Harness operations in this repository:
- Rules: `.claude/rules/`
- Skills: `.claude/skills/`
- Hooks: `.claude/hooks/`
- Progress artifact: `.ai-harness/claude-progress.txt`
