/**
 * J-Quants V2 — 決算サマリー（財務サマリー）
 * GET /v2/fins/summary
 *
 * 売上高・営業利益・経常利益・当期純利益・EPS等の決算サマリーを取得する。
 * 日本の会計基準（JGAAP/IFRS/US-GAAP）に対応。
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../../types.js';
import { jQuantsGet } from './jquants_api.js';

const StatementsInputSchema = z.object({
  code: z
    .string()
    .describe('銘柄コード（4桁または5桁末尾0付き）。例: トヨタ="72030"'),
  date: z
    .string()
    .optional()
    .describe('特定の決算発表日（YYYY-MM-DD形式）。省略時は全期間。'),
});

export const getJapanFinancialSummary = new DynamicStructuredTool({
  name: 'get_japan_financial_summary',
  description: `日本株の決算サマリーを取得する。売上高・営業利益・経常利益・当期純利益・EPS（1株当たり利益）等を含む。J-Quants V2 /v2/fins/summary を使用。
対象: JGAAP（日本基準）・IFRS・US-GAAP対応。
用途: PER/PBR計算、利益率分析、決算トレンド把握。`,
  schema: StatementsInputSchema,
  func: async (input) => {
    const code = input.code.length === 4 ? `${input.code}0` : input.code;
    const params: Record<string, string | undefined> = { code };
    if (input.date) params.date = input.date;

    // 決算データは過去分は変わらないため永続キャッシュ
    const { data, url } = await jQuantsGet('/v2/fins/summary', params, 'summary', true);
    return formatToolResult(data, [url]);
  },
});
