/**
 * J-Quants V2 — 上場銘柄一覧
 * GET /v2/equities/list
 *
 * 業種・市場区分を含む全上場銘柄の一覧を返す。
 * 他ツールが銘柄コードを検索する際に使用する。
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../../types.js';
import { jQuantsGet } from './jquants_api.js';

const ListInputSchema = z.object({
  code: z
    .string()
    .optional()
    .describe('銘柄コード（4桁または5桁末尾0付き）。指定するとその銘柄のみ返す。省略時は全銘柄。'),
  market_code: z
    .string()
    .optional()
    .describe('市場区分コード。例: "0111"=プライム, "0112"=スタンダード, "0113"=グロース'),
});

export const getJapanStockList = new DynamicStructuredTool({
  name: 'get_japan_stock_list',
  description:
    '東証上場銘柄の一覧を取得する。銘柄コード・銘柄名・業種・市場区分を含む。銘柄名からコードを調べる際や、業種・市場で絞り込む際に使用する。',
  schema: ListInputSchema,
  func: async (input) => {
    const params: Record<string, string | undefined> = {};
    if (input.code) {
      // 4桁の場合は5桁（末尾0）に正規化
      params.code = input.code.length === 4 ? `${input.code}0` : input.code;
    }
    if (input.market_code) params.market_code = input.market_code;

    const { data, url } = await jQuantsGet('/v2/equities/list', params, 'info', true);
    return formatToolResult(data, [url]);
  },
});
