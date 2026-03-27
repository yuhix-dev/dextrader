/**
 * J-Quants V2 — 日足株価（OHLCV + 調整済み終値）
 * GET /v2/equities/bars/daily
 *
 * 銘柄コードと期間を指定して日足データを取得する。
 * リアルタイム補完が必要な場合は yfinance_prices.ts を参照。
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../../types.js';
import { jQuantsGet } from './jquants_api.js';

const DailyPricesInputSchema = z.object({
  code: z
    .string()
    .describe(
      '銘柄コード（4桁または5桁末尾0付き）。例: トヨタ="72030", ソニー="69580"'
    ),
  date: z
    .string()
    .optional()
    .describe('特定日のデータを取得する場合に指定（YYYYMMDD形式）。省略時は最新データ。'),
  from: z
    .string()
    .optional()
    .describe('取得開始日（YYYYMMDD形式）。date指定時は無視。'),
  to: z
    .string()
    .optional()
    .describe('取得終了日（YYYYMMDD形式）。date指定時は無視。'),
});

export const getJapanDailyPrices = new DynamicStructuredTool({
  name: 'get_japan_daily_prices',
  description:
    '日本株の日足OHLCV（始値・高値・安値・終値・出来高）と調整済み終値を取得する。J-Quants V2を使用。リアルタイム株価が必要な場合は get_japan_realtime_price を使用すること。',
  schema: DailyPricesInputSchema,
  func: async (input) => {
    // 4桁コードを5桁に正規化
    const code = input.code.length === 4 ? `${input.code}0` : input.code;

    const params: Record<string, string | undefined> = { code };
    if (input.date) {
      params.date = input.date;
    } else {
      if (input.from) params.from = input.from;
      if (input.to) params.to = input.to;
    }

    // 過去日付のみの場合は永続キャッシュ
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const isPastOnly = !!(
      input.date
        ? input.date < today
        : input.to && input.to < today && input.from && input.from < today
    );

    const { data, url } = await jQuantsGet('/v2/equities/bars/daily', params, 'daily_bars', isPastOnly);
    return formatToolResult(data, [url]);
  },
});
