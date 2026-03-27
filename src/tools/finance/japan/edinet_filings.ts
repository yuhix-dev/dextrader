/**
 * EDINET API v2 — 有価証券報告書の検索・一覧取得
 * GET /api/v2/documents.json
 *
 * 特定日に提出された書類の一覧（メタデータ）を返す。
 * 有価証券報告書は ordinanceCode="010" && formCode="030000" で判別。
 *
 * 注意:
 * - 取得可能期間は過去10年分
 * - この API はメタデータ（docID, 書類名, 提出者等）のみ返す
 * - 本文取得（ZIP）は Phase 2 以降に対応予定
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../../types.js';
import { getEdinetApiKey } from './edinet_auth.js';
import { logger } from '../../../utils/logger.js';
import { readCache, writeCache } from '../../../utils/cache.js';

const EDINET_BASE = 'https://api.edinet-fsa.go.jp/api/v2';

// 有価証券報告書の判別条件
const ANNUAL_REPORT_ORDINANCE = '010';
const ANNUAL_REPORT_FORM = '030000';

interface EdinetDocument {
  docID: string;
  edinetCode: string;
  filerName: string;
  docTypeCode: string;
  docDescription: string;
  submitDateTime: string;
  ordinanceCode: string;
  formCode: string;
  periodStart: string;
  periodEnd: string;
  csvFlag: string;
  pdfFlag: string;
  xbrlFlag: string;
  [key: string]: unknown;
}

async function fetchEdinetDocuments(date: string): Promise<EdinetDocument[]> {
  const apiKey = getEdinetApiKey();
  const params = new URLSearchParams({
    date,
    type: '2', // 2 = 提出書類一覧及びメタデータ
    'Subscription-Key': apiKey,
  });

  const url = `${EDINET_BASE}/documents.json?${params}`;
  const cacheEndpoint = `/edinet/documents`;
  const cacheParams = { date };

  // ファイルキャッシュ（提出書類は不変）
  const cached = readCache(cacheEndpoint, cacheParams);
  if (cached) {
    const docs = cached.data.documents;
    return Array.isArray(docs) ? (docs as EdinetDocument[]) : [];
  }

  const resp = await fetch(url);
  if (!resp.ok) {
    const detail = `${resp.status} ${resp.statusText}`;
    logger.error(`[EDINET] 書類一覧取得失敗: date=${date} — ${detail}`);
    throw new Error(`[EDINET] リクエスト失敗: ${detail}`);
  }

  const json = (await resp.json()) as Record<string, unknown>;
  const results = (json.results as Record<string, unknown>)?.results;
  const docs: EdinetDocument[] = Array.isArray(results) ? (results as EdinetDocument[]) : [];

  writeCache(cacheEndpoint, cacheParams, { documents: docs }, url);
  return docs;
}

const EdinetFilingsInputSchema = z.object({
  date: z
    .string()
    .describe('書類の提出日（YYYY-MM-DD形式）。例: "2024-06-20"'),
  filer_name: z
    .string()
    .optional()
    .describe('提出者名（企業名）で絞り込む。部分一致。例: "トヨタ"'),
  annual_report_only: z
    .boolean()
    .default(false)
    .describe('true にすると有価証券報告書のみ返す（ordinanceCode=010 && formCode=030000）'),
});

export const searchEdinetFilings = new DynamicStructuredTool({
  name: 'search_edinet_filings',
  description: `EDINET（金融庁の電子開示システム）で特定日に提出された書類の一覧を検索する。
有価証券報告書・四半期報告書等のメタデータ（書類ID・提出者名・書類種別・対象期間）を返す。
本文テキストは返さない（Phase 2以降で対応予定）。
取得可能期間: 過去10年分。`,
  schema: EdinetFilingsInputSchema,
  func: async (input) => {
    const docs = await fetchEdinetDocuments(input.date);

    let filtered = docs;

    if (input.annual_report_only) {
      filtered = filtered.filter(
        (d) => d.ordinanceCode === ANNUAL_REPORT_ORDINANCE && d.formCode === ANNUAL_REPORT_FORM
      );
    }

    if (input.filer_name) {
      const query = input.filer_name.toLowerCase();
      filtered = filtered.filter((d) => d.filerName?.toLowerCase().includes(query));
    }

    // LLMに渡す情報を最小限に絞る
    const summary = filtered.map((d) => ({
      docID: d.docID,
      filerName: d.filerName,
      docDescription: d.docDescription,
      submitDateTime: d.submitDateTime,
      periodStart: d.periodStart,
      periodEnd: d.periodEnd,
      pdfAvailable: d.pdfFlag === '1',
      xbrlAvailable: d.xbrlFlag === '1',
    }));

    return formatToolResult(
      { date: input.date, total: filtered.length, filings: summary },
      [`${EDINET_BASE}/documents.json`]
    );
  },
});
