# dextrader

日本株に特化した自律型金融リサーチエージェント。複雑な質問を計画・実行・検証のステップに分解し、J-Quants・EDINET・Yahoo Finance のデータを組み合わせてリサーチを行う。

> [virattt/dexter](https://github.com/virattt/dexter) をフォークして日本株対応に改修。

## データソース

| ソース | 用途 |
|--------|------|
| **J-Quants API V2** | 日足OHLCV・決算サマリー・上場銘柄一覧 |
| **EDINET API v2** | 有価証券報告書・開示書類の検索 |
| **Yahoo Finance** | リアルタイム株価（J-Quants遅延補完用） |
| **Exa / Tavily** | ニュース・IR情報のWeb検索 |

## セットアップ

### 必要なもの

- [Bun](https://bun.com) v1.0 以上
- J-Quants API キー（[jpx-jquants.com](https://jpx-jquants.com/) で取得）
- LLM の API キー（OpenAI / Anthropic / Google のいずれか）
- EDINET API キー（オプション、開示書類検索用）
- Exa API キー（オプション、Web検索用）

### インストール

```bash
git clone https://github.com/yuhix-dev/dextrader.git
cd dextrader
bun install
```

### 環境変数の設定

```bash
cp .env.example .env
# .env を編集して各 API キーを入力
```

```env
# J-Quants API V2（必須）
JQUANTS_API_KEY=your-jquants-api-key

# LLM（いずれか1つ以上必須）
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# EDINET API（オプション）
EDINET_API_KEY=your-edinet-subscription-key

# Web検索（オプション）
EXASEARCH_API_KEY=your-exa-api-key
```

## 使い方

```bash
# 起動
bun start

# 開発モード（ファイル変更で自動再起動）
bun dev
```

起動後、日本語で質問できます：

```
トヨタの直近の決算を分析して
ソニーの株価推移を過去1年で教えて
2024年に提出された任天堂の有価証券報告書を探して
```

## ツール一覧

`JQUANTS_API_KEY` が設定されている場合に有効になるツール：

| ツール名 | 説明 |
|---------|------|
| `get_japan_stock_list` | 上場銘柄一覧（銘柄名→コード変換にも使用） |
| `get_japan_daily_prices` | 日足OHLCV・調整済み終値（J-Quants V2） |
| `get_japan_realtime_price` | 当日リアルタイム株価（Yahoo Finance） |
| `get_japan_financial_summary` | 決算サマリー（売上高・営業利益・EPS等） |

`EDINET_API_KEY` が設定されている場合に有効になるツール：

| ツール名 | 説明 |
|---------|------|
| `search_edinet_filings` | 有価証券報告書等の書類検索（メタデータ） |

## デバッグ

ツール呼び出しの結果はすべて `.dexter/scratchpad/` に JSONL 形式で記録される。

```
.dexter/scratchpad/
├── 2026-01-30-111400_9a8f10723f79.jsonl
└── ...
```

## ロードマップ

- [x] Phase 1: J-Quants V2・EDINET・Yahoo Finance 対応
- [ ] Phase 2: EDINET 大量保有報告書パース
- [ ] Phase 2: バックテスト機能
- [ ] Phase 3: 証券会社API連携（kabuステーション API）

## ライセンス

MIT License
