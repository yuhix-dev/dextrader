/**
 * J-Quants API V2 共通クライアント
 *
 * - x-api-key ヘッダーによる認証
 * - ページネーション（pagination_key）の自動処理
 * - HTTP 429 に対する指数バックオフ（最大3回）
 * - 当日データ: インメモリ TTL キャッシュ（1時間）
 * - 過去データ: ファイルキャッシュ（永続）
 */

import { readCache, writeCache, buildCacheKey } from '../../../utils/cache.js';
import { logger } from '../../../utils/logger.js';
import { getJQuantsHeaders } from './jquants_auth.js';

const BASE_URL = 'https://api.jquants.com';

// インメモリ TTL キャッシュ（当日データ用、1時間）
const TTL_MS = 60 * 60 * 1000;
interface TtlEntry {
  data: unknown[];
  url: string;
  expiresAt: number;
}
const ttlCache = new Map<string, TtlEntry>();

function readTtlCache(key: string): { data: unknown[]; url: string } | null {
  const entry = ttlCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    ttlCache.delete(key);
    return null;
  }
  return { data: entry.data, url: entry.url };
}

function writeTtlCache(key: string, data: unknown[], url: string): void {
  ttlCache.set(key, { data, url, expiresAt: Date.now() + TTL_MS });
}

/** パラメータが今日の日付を含むかどうか判定（当日データはTTLキャッシュ、過去は永続） */
function isTodayRequest(params: Record<string, string | undefined>): boolean {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dateParam = params.date ?? params.from ?? params.to ?? '';
  return !dateParam || dateParam >= today;
}

/** 指数バックオフつき fetch（429 対応） */
async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const resp = await fetch(url, init);
    if (resp.status !== 429) return resp;

    const waitMs = Math.pow(2, attempt) * 1000;
    logger.warn(`[J-Quants] 429 Too Many Requests — ${waitMs}ms 後に再試行 (${attempt + 1}/${retries})`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  // 最後の試み
  return fetch(url, init);
}

export interface JQuantsApiResponse {
  data: unknown[];
  url: string;
}

/**
 * J-Quants V2 GET リクエスト（ページネーション自動処理）
 *
 * @param path - エンドポイントパス（例: '/v2/equities/bars/daily'）
 * @param params - クエリパラメータ
 * @param dataKey - レスポンスの配列フィールド名（例: 'daily_bars'）
 * @param cacheable - 過去データとして永続キャッシュするか（デフォルト: false = TTLキャッシュ）
 */
export async function jQuantsGet(
  path: string,
  params: Record<string, string | undefined>,
  dataKey: string,
  cacheable = false,
): Promise<JQuantsApiResponse> {
  const label = `${path} ${JSON.stringify(params)}`;

  // キャッシュチェック
  if (cacheable) {
    // 過去データ: ファイルキャッシュ
    const fileParams = params as Record<string, string>;
    const cached = readCache(path, fileParams);
    if (cached) {
      logger.debug(`[J-Quants] ファイルキャッシュヒット: ${label}`);
      const cachedData = cached.data[dataKey];
      return { data: Array.isArray(cachedData) ? cachedData : [], url: cached.url };
    }
  } else if (isTodayRequest(params)) {
    // 当日データ: インメモリ TTL キャッシュ
    const cacheKey = buildCacheKey(path, params as Record<string, string>);
    const ttl = readTtlCache(cacheKey);
    if (ttl) {
      logger.debug(`[J-Quants] TTLキャッシュヒット: ${label}`);
      return ttl;
    }
  }

  const headers = getJQuantsHeaders();
  let allData: unknown[] = [];
  let paginationKey: string | null = null;
  let firstUrl = '';

  do {
    const urlObj = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) urlObj.searchParams.set(key, value);
    }
    if (paginationKey) urlObj.searchParams.set('pagination_key', paginationKey);

    const urlStr = urlObj.toString();
    if (!firstUrl) firstUrl = urlStr;

    const resp = await fetchWithRetry(urlStr, { headers });

    if (!resp.ok) {
      const detail = `${resp.status} ${resp.statusText}`;
      logger.error(`[J-Quants] エラー: ${label} — ${detail}`);
      throw new Error(`[J-Quants] リクエスト失敗: ${detail}`);
    }

    const json = (await resp.json()) as Record<string, unknown>;
    const page = json[dataKey];
    if (Array.isArray(page)) {
      allData = allData.concat(page);
    }
    paginationKey = typeof json.pagination_key === 'string' ? json.pagination_key : null;
  } while (paginationKey);

  // キャッシュ書き込み
  if (cacheable) {
    writeCache(path, params as Record<string, string>, { [dataKey]: allData }, firstUrl);
  } else if (isTodayRequest(params)) {
    const cacheKey = buildCacheKey(path, params as Record<string, string>);
    writeTtlCache(cacheKey, allData, firstUrl);
  }

  return { data: allData, url: firstUrl };
}
