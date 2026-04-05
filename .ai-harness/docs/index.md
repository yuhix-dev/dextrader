# Project Docs Index

This repository uses the shared `~/.ai-harness` rules as the base and layers dexter-specific guidance on top.

## Read first
1. `AGENTS.md`
2. `CLAUDE.md`
3. `src/`
4. `.claude/rules/escalation.md`
5. `.ai-harness/claude-progress.txt`

## Project-specific assumptions
- CLI-based TypeScript agent built with Bun and Ink
- Prefer `bun` for install, run, typecheck, and tests
- Do not commit `.env`, `.dexter/settings.json`, or provider credentials

## Harness Ops
- Rules: `.claude/rules/`
- Skills: `.claude/skills/`
- Hooks: `.claude/hooks/`
- Roadmap status: `.ai-harness/docs/roadmap-status.md`
