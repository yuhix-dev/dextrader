---
name: release-checklist
description: |
  リリース前チェックを標準化する手順。
  ユーザーが「リリース前確認」「最終チェック」を依頼した時に使う。
---

# Release Checklist

## Checklist
1. `bun run typecheck`
2. `bun test`
3. docs更新有無の確認（`README.md`, `src/` 配下に関連する docs）
4. 機密情報混入チェック

## Output
- PASS/FAIL の一覧
- FAIL がある場合はブロック理由と修正案
