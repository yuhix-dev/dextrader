/**
 * EDINET API 認証ヘルパー
 * 環境変数 EDINET_API_KEY を読み込む。
 */

export function getEdinetApiKey(): string {
  const key = process.env.EDINET_API_KEY;
  if (!key) {
    throw new Error('[EDINET] EDINET_API_KEY が設定されていません');
  }
  return key;
}
