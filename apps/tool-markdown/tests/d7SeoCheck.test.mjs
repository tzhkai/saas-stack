import assert from 'node:assert/strict';
import test from 'node:test';
import { makeDecision, renderReport, summarizeSearchRows } from '../scripts/d7-seo-check.mjs';

test('isolates only fixed table-intent queries and computes weighted metrics', () => {
  const summary = summarizeSearchRows([
    { keys: ['markdown table generator'], clicks: 2, impressions: 20, position: 18 },
    { keys: ['csv to markdown'], clicks: 0, impressions: 10, position: 42 },
    { keys: ['markdown editor'], clicks: 5, impressions: 50, position: 12 },
  ]);

  assert.deepEqual(summary.relevant, { clicks: 2, impressions: 30, ctr: 2 / 30, position: 26 });
  assert.equal(summary.topRows[0].key, 'markdown editor');
  assert.equal(summary.relevantRows.length, 2);
});

test('keeps low-impression table queries in the directional-observation bucket', () => {
  const summary = summarizeSearchRows([
    { keys: ['markdown tables'], clicks: 0, impressions: 19, position: 11 },
  ]);

  assert.match(makeDecision(summary, true), /样本不足 20 次展示/);
});

test('does not recommend a CTR rewrite until relevant intent has enough impressions', () => {
  const summary = summarizeSearchRows([
    { keys: ['markdown table generator'], clicks: 0, impressions: 50, position: 14 },
  ]);

  assert.match(makeDecision(summary, true), /前20名展示却无点击/);
});

test('reports a missing sitemap URL as a discovery-path issue before ranking judgement', () => {
  const summary = summarizeSearchRows([
    { keys: ['markdown table generator'], clicks: 0, impressions: 80, position: 75 },
  ]);

  assert.match(makeDecision(summary, false), /sitemap 中缺少目标 URL/);
});

test('renders a privacy-preserving report without free-form document fields', () => {
  const report = renderReport({
    generatedAt: '2026-08-29T00:00:00.000Z',
    startDate: '2026-08-22',
    endDate: '2026-08-28',
    config: {
      tableUrl: 'https://markdownmaster.site/tools/markdown-table-generator/',
      articleUrl: 'https://markdownmaster.site/blog/online-markdown-formatter-vs-markdown-linter/',
    },
    production: {
      sitemap: { status: 200, foundUrls: ['https://markdownmaster.site/tools/markdown-table-generator/', 'https://markdownmaster.site/blog/online-markdown-formatter-vs-markdown-linter/'] },
      pages: [{ url: 'https://markdownmaster.site/tools/markdown-table-generator/', status: 200, cacheControl: 'public, max-age=0, must-revalidate' }],
    },
    pageSummary: summarizeSearchRows([{ keys: ['page'], clicks: 0, impressions: 2, position: 70 }], /.*/),
    querySummary: summarizeSearchRows([{ keys: ['markdown table generator'], clicks: 0, impressions: 2, position: 70 }]),
    ga4Rows: [{ date: '20260828', eventCount: 4, users: 2 }],
    ga4Error: null,
  });

  assert.match(report, /MarkdownMaster D\+7 SEO 复查/);
  assert.match(report, /markdown_tool_action/);
  assert.match(report, /不读取Markdown、表格单元格、文件名、URL query或用户级数据/);
  assert.doesNotMatch(report, /document_text|filename|table_cell/);
});
