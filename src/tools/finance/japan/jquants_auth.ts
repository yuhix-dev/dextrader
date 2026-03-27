/**
 * J-Quants API V2 認証ヘルパー
 * 環境変数 JQUANTS_API_KEY を読み込み、全リクエストに x-api-key ヘッダーを付与する。
 */

export function getJQuantsApiKey(): string {
  const key = process.env.JQUANTS_API_KEY;
  if (!key) {
    throw new Error('[J-Quants] JQUANTS_API_KEY が設定されていません');
  }
  return key;
}

export function getJQuantsHeaders(): Record<string, string> {
  return { 'x-api-key': getJQuantsApiKey() };
}
