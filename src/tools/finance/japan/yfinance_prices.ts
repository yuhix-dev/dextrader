/**
 * Yahoo Finance HTTP — リアルタイム株価（当日補完用）
 *
 * J-Quants 無料プランの12週遅延を補完するためのリアルタイム株価取得。
 * 東証銘柄は {4桁コード}.T 形式で指定する。
 *
 * 注意:
 * - 当日のリアルタイム株価取得専用。ヒストリカルデータは J-Quants を使うこと。
 * - Yahoo Finance は非公式API。フォーマット変更・レート制限に注意。
 * - 取得失敗時は J-Quants の最新データ（遅延あり）にフォールバック。
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../../types.js';
import { logger } from '../../../utils/logger.js';
import { jQuantsGet } from './jquants_api.js';

const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface YahooQuote {
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  exchangeName?: string;
}

async function fetchYahooFinance(code4: string): Promise<YahooQuote | null> {
  const ticker = `${code4}.T`;
  const url = `${YAHOO_FINANCE_BASE}/${ticker}?range=1d&interval=1d`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!resp.ok) {
      logger.warn(`[Yahoo Finance] ${ticker} 取得失敗: ${resp.status}`);
      return null;
    }

    const json = (await resp.json()) as Record<string, unknown>;
    const result = (json?.chart as Record<string, unknown>)?.result;
    if (!Array.isArray(result) || result.length === 0) return null;

    const meta = (result[0] as Record<string, unknown>)?.meta as YahooQuote | undefined;
    return meta ?? null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`[Yahoo Finance] ${ticker} ネットワークエラー: ${msg}`);
    return null;
  }
}

async function fallbackToJQuants(code5: string): Promise<unknown[]> {
  try {
    const { data } = await jQuantsGet('/v2/equities/bars/daily', { code: code5 }, 'daily_bars', false);
    return data.slice(-1); // 最新1件
  } catch {
    return [];
  }
}

const RealtimePriceInputSchema = z.object({
  code: z
    .string()
    .describe('銘柄コード（4桁または5桁末尾0付き）。例: トヨタ="7203" or "72030"'),
});

export const getJapanRealtimePrice = new DynamicStructuredTool({
  name: 'get_japan_realtime_price',
  description:
    '日本株の当日リアルタイム株価を取得する（Yahoo Finance経由）。J-Quantsの遅延データを補完する用途。ヒストリカルデータには get_japan_daily_prices を使うこと。取得失敗時はJ-Quantsの最新データにフォールバックする。',
  schema: RealtimePriceInputSchema,
  func: async (input) => {
    const code4 = input.code.length >= 5 ? input.code.slice(0, 4) : input.code;
    const code5 = code4.length === 4 ? `${code4}0` : code4;

    const quote = await fetchYahooFinance(code4);

    if (quote) {
      const result = {
        code: code4,
        source: 'yahoo_finance',
        price: quote.regularMarketPrice,
        open: quote.regularMarketOpen,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        volume: quote.regularMarketVolume,
        previous_close: quote.regularMarketPreviousClose,
        change: quote.regularMarketChange,
        change_percent: quote.regularMarketChangePercent,
        currency: quote.currency ?? 'JPY',
        exchange: quote.exchangeName,
      };
      return formatToolResult(result, [`${YAHOO_FINANCE_BASE}/${code4}.T`]);
    }

    // フォールバック: J-Quants
    logger.info(`[Yahoo Finance] ${code4} フォールバック → J-Quants`);
    const fallback = await fallbackToJQuants(code5);
    return formatToolResult(
      { code: code4, source: 'jquants_fallback', data: fallback },
      []
    );
  },
});
