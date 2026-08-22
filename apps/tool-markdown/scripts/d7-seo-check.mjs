#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULTS = Object.freeze({
  site: 'sc-domain:markdownmaster.site',
  origin: 'https://markdownmaster.site',
  tablePath: '/tools/markdown-table-generator/',
  articlePath: '/blog/online-markdown-formatter-vs-markdown-linter/',
  sitemapPath: '/sitemap-0.xml',
  ga4Property: '534945179',
  timezone: 'Asia/Shanghai',
});

const TABLE_QUERY_PATTERN = /\b(markdown\s+table|markdown\s+tables|table\s+generator|csv\s+to\s+markdown|tsv\s+to\s+markdown|gfm\s+table)\b/i;

function todayInTimezone(timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--')) continue;
    const [name, inlineValue] = token.slice(2).split('=', 2);
    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined && value && !value.startsWith('--')) index += 1;
    options[name] = inlineValue ?? value ?? true;
  }
  return options;
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function markdownCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
}

function formatPercent(value) {
  return `${round(value * 100, 1)}%`;
}

function queryRowToMetric(row) {
  const clicks = asNumber(row.clicks);
  const impressions = asNumber(row.impressions);
  return Object.freeze({
    key: String(row.keys?.[0] ?? ''),
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position: round(asNumber(row.position)),
  });
}

export function summarizeSearchRows(rows, pattern = TABLE_QUERY_PATTERN) {
  const metrics = rows.map(queryRowToMetric);
  const totals = metrics.reduce((accumulator, item) => ({
    clicks: accumulator.clicks + item.clicks,
    impressions: accumulator.impressions + item.impressions,
    weightedPosition: accumulator.weightedPosition + item.position * item.impressions,
  }), { clicks: 0, impressions: 0, weightedPosition: 0 });
  const relevant = metrics.filter((item) => pattern.test(item.key));
  const relevantTotals = relevant.reduce((accumulator, item) => ({
    clicks: accumulator.clicks + item.clicks,
    impressions: accumulator.impressions + item.impressions,
    weightedPosition: accumulator.weightedPosition + item.position * item.impressions,
  }), { clicks: 0, impressions: 0, weightedPosition: 0 });
  return Object.freeze({
    total: Object.freeze({
      clicks: totals.clicks,
      impressions: totals.impressions,
      ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
      position: totals.impressions ? round(totals.weightedPosition / totals.impressions) : null,
    }),
    relevant: Object.freeze({
      clicks: relevantTotals.clicks,
      impressions: relevantTotals.impressions,
      ctr: relevantTotals.impressions ? relevantTotals.clicks / relevantTotals.impressions : 0,
      position: relevantTotals.impressions ? round(relevantTotals.weightedPosition / relevantTotals.impressions) : null,
    }),
    topRows: Object.freeze(metrics.sort((left, right) => right.impressions - left.impressions || right.clicks - left.clicks).slice(0, 10)),
    relevantRows: Object.freeze(relevant.sort((left, right) => right.impressions - left.impressions || right.clicks - left.clicks).slice(0, 10)),
  });
}

export function makeDecision(summary, pageFoundInSitemap) {
  const { total, relevant } = summary;
  if (!pageFoundInSitemap) return 'P0：sitemap 中缺少目标 URL；先修正发现路径，再观察排名。';
  if (total.impressions === 0) return 'D+7 尚无该 URL 的展示；执行一次网址检查与站内链接核对，不重复提交普通页面索引请求。';
  if (relevant.impressions === 0) return '该 URL 已有展示，但尚未归因到表格意图查询；继续观察，并优先完善与 Markdown tables 教程的语义内链。';
  if (relevant.impressions < 20) return '表格意图样本不足 20 次展示；仅作方向性观察，不据此改标题、扩页或判断产品需求。';
  if (relevant.position !== null && relevant.position <= 20 && relevant.ctr === 0) return '已有前20名展示却无点击；人工复核标题、描述、搜索意图承诺与SERP竞争页，避免仅凭单日数据改写。';
  if (relevant.position !== null && relevant.position > 20 && relevant.position <= 60) return '已有表格意图展示但位置在21–60；优先强化页面主题完整度、表格教程内链与真实示例，而非新增近似工具URL。';
  if (relevant.position !== null && relevant.position > 60) return '表格意图位置仍在60名后；保持页面稳定并积累发现信号，D+14后再评估内容扩展或原创社区介绍。';
  return '已有足够样本；与D+14/D+28趋势对比后再决定页面或分发优化。';
}

async function requestJson(url, token, payload) {
  const response = await fetch(url, {
    method: payload ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 240)}`);
  }
  return response.json();
}

async function fetchSearchAnalytics({ site, startDate, endDate, dimensions, page, token }) {
  const payload = {
    startDate,
    endDate,
    type: 'web',
    dataState: 'final',
    dimensions,
    rowLimit: 25000,
    ...(page ? {
      dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'equals', expression: page }] }],
    } : {}),
  };
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const response = await requestJson(url, token, payload);
  return response.rows ?? [];
}

async function fetchGa4Events({ propertyId, startDate, endDate, token }) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
  const payload = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'markdown_tool_action' },
      },
    },
    orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
  };
  const response = await requestJson(url, token, payload);
  return (response.rows ?? []).map((row) => ({
    date: row.dimensionValues?.[0]?.value ?? '',
    eventCount: asNumber(row.metricValues?.[0]?.value),
    users: asNumber(row.metricValues?.[1]?.value),
  }));
}

async function fetchProductionChecks({ origin, sitemapPath, expectedUrls }) {
  const sitemapUrl = new URL(sitemapPath, origin).href;
  const [sitemapResponse, ...pageResponses] = await Promise.all([
    fetch(sitemapUrl),
    ...expectedUrls.map((url) => fetch(url, { method: 'HEAD' })),
  ]);
  const sitemapText = sitemapResponse.ok ? await sitemapResponse.text() : '';
  return Object.freeze({
    sitemap: Object.freeze({
      url: sitemapUrl,
      status: sitemapResponse.status,
      foundUrls: Object.freeze(expectedUrls.filter((url) => sitemapText.includes(`<loc>${url}</loc>`))),
    }),
    pages: Object.freeze(expectedUrls.map((url, index) => {
      const response = pageResponses[index];
      return Object.freeze({
        url,
        status: response.status,
        cacheControl: response.headers.get('cache-control') ?? 'missing',
        canonical: response.headers.get('link') ?? 'not checked by HEAD',
      });
    })),
  });
}

function tableRow(cells) {
  return `| ${cells.map(markdownCell).join(' | ')} |`;
}

export function renderReport({ generatedAt, startDate, endDate, config, production, pageSummary, querySummary, ga4Rows, ga4Error }) {
  const decision = makeDecision(querySummary, production.sitemap.foundUrls.includes(config.tableUrl));
  const lines = [
    '# MarkdownMaster D+7 SEO 复查',
    '',
    `- **生成时间：** ${generatedAt}`,
    `- **GSC 期间：** ${startDate} 至 ${endDate}（仅 final data）`,
    `- **目标工具：** ${config.tableUrl}`,
    `- **隐私说明：** 本报告只请求GSC聚合搜索指标与GA4聚合事件数；不读取Markdown、表格单元格、文件名、URL query或用户级数据。`,
    '',
    '## 生产发现性检查',
    '',
    '| 项目 | 结果 |',
    '| --- | --- |',
    tableRow(['sitemap', `${production.sitemap.status}; ${production.sitemap.foundUrls.length}/${production.pages.length} 个目标 URL 已找到`]),
    ...production.pages.map((item) => tableRow([new URL(item.url).pathname, `${item.status}; Cache-Control: ${item.cacheControl}`])),
    '',
    '## 目标工具页面表现',
    '',
    '| 页面 | 点击 | 展示 | CTR | 平均排名 |',
    '| --- | ---: | ---: | ---: | ---: |',
    tableRow(['Table & Style Generator', pageSummary.total.clicks, pageSummary.total.impressions, formatPercent(pageSummary.total.ctr), pageSummary.total.position ?? '—']),
    '',
    '## 表格意图查询表现',
    '',
    '| 查询 | 点击 | 展示 | CTR | 平均排名 |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...(querySummary.relevantRows.length ? querySummary.relevantRows.map((row) => tableRow([row.key, row.clicks, row.impressions, formatPercent(row.ctr), row.position])) : [tableRow(['无符合模式的查询', 0, 0, '0%', '—'])]),
    '',
    `**D+7判读：** ${decision}`,
    '',
    '## 同意后工具事件（GA4）',
    '',
  ];
  if (ga4Error) {
    lines.push(`GA4聚合事件检查未完成：${ga4Error}`);
  } else if (!ga4Rows) {
    lines.push('未提供 `--ga4`；D+7需在GA4事件报告或通过带有该参数的脚本复查 `markdown_tool_action` 是否开始入库。');
  } else if (!ga4Rows.length) {
    lines.push('此期间未返回 `markdown_tool_action` 聚合行。先确认GA4数据延迟与用户同意率；这不代表功能没有被使用。');
  } else {
    lines.push('| 日期 | markdown_tool_action 事件数 | 用户数 |');
    lines.push('| --- | ---: | ---: |');
    lines.push(...ga4Rows.map((row) => tableRow([row.date, row.eventCount, row.users])));
    lines.push('', '若需按 Table action 或 Decision Helper action 分解，必须在GA4先注册固定事件参数 `tool`、`action`、`source` 为自定义维度；不要创建任何正文或自由文本维度。');
  }
  lines.push('', '## 人工复查清单', '', '1. 在GSC URL Inspection检查目标URL的抓取/规范化状态；只诊断，不为普通工具页重复请求索引。', '2. 在GSC页面过滤下确认目标工具页是否出现展示，再看表格意图查询；不要从全站查询直接推断该工具表现。', '3. 在GA4只使用固定 `markdown_tool_action` 及允许的固定自定义维度；样本少于20个相关会话时标为方向性观察。', '4. 结合D+14、D+28趋势判断；D+7只用于验证发现、数据入库和明显技术阻断。');
  return `${lines.join('\n')}\n`;
}

function usage() {
  return `Usage:\n  GOOGLE_OAUTH_TOKEN=... node scripts/d7-seo-check.mjs --start YYYY-MM-DD --end YYYY-MM-DD [--ga4] [--out reports/d7.md]\n\nOptions:\n  --site          Search Console property, default ${DEFAULTS.site}\n  --origin        Production origin, default ${DEFAULTS.origin}\n  --table-path    Target table tool path\n  --article-path  Related article path\n  --sitemap-path  Sitemap to verify, default ${DEFAULTS.sitemapPath}\n  --ga4           Also query aggregate GA4 markdown_tool_action totals\n  --ga4-property  GA4 property id, default ${DEFAULTS.ga4Property}\n  --out           Markdown output path, default reports/d7-seo-<end>.md\n  --help          Show this help\n\nThe OAuth token must have read-only access to Search Console. With --ga4 it also needs Analytics Data API read access. The script never writes to Google, never requests user-level data, and never uploads document content.\n`;
}

export async function main(argv = process.argv.slice(2), environment = process.env) {
  const options = parseArgs(argv);
  if (options.help) return usage();
  const token = environment.GOOGLE_OAUTH_TOKEN;
  if (!token) throw new Error('Missing GOOGLE_OAUTH_TOKEN. Provide a short-lived read-only OAuth token through the environment, not a checked-in file.');
  const timezone = options.timezone ?? DEFAULTS.timezone;
  const endDate = options.end ?? todayInTimezone(timezone);
  const startDate = options.start;
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error('Use --start YYYY-MM-DD and optionally --end YYYY-MM-DD.');

  const origin = String(options.origin ?? DEFAULTS.origin).replace(/\/$/, '');
  const config = Object.freeze({
    site: String(options.site ?? DEFAULTS.site),
    origin,
    tableUrl: new URL(String(options['table-path'] ?? DEFAULTS.tablePath), `${origin}/`).href,
    articleUrl: new URL(String(options['article-path'] ?? DEFAULTS.articlePath), `${origin}/`).href,
    sitemapPath: String(options['sitemap-path'] ?? DEFAULTS.sitemapPath),
    ga4Property: String(options['ga4-property'] ?? DEFAULTS.ga4Property),
  });

  const [production, pageRows, queryRows] = await Promise.all([
    fetchProductionChecks({ origin: config.origin, sitemapPath: config.sitemapPath, expectedUrls: [config.tableUrl, config.articleUrl] }),
    fetchSearchAnalytics({ site: config.site, startDate, endDate, dimensions: ['page'], page: config.tableUrl, token }),
    fetchSearchAnalytics({ site: config.site, startDate, endDate, dimensions: ['query'], page: config.tableUrl, token }),
  ]);

  let ga4Rows = null;
  let ga4Error = null;
  if (options.ga4) {
    try {
      ga4Rows = await fetchGa4Events({ propertyId: config.ga4Property, startDate, endDate, token });
    } catch (error) {
      ga4Error = error instanceof Error ? error.message : 'Unknown GA4 Data API error';
    }
  }

  const report = renderReport({
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    config,
    production,
    pageSummary: summarizeSearchRows(pageRows, /.*/),
    querySummary: summarizeSearchRows(queryRows),
    ga4Rows,
    ga4Error,
  });
  const outputPath = resolve(String(options.out ?? `reports/d7-seo-${endDate}.md`));
  await mkdir(resolve(outputPath, '..'), { recursive: true });
  await writeFile(outputPath, report, 'utf8');
  return `Wrote ${outputPath}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then((message) => console.log(message)).catch((error) => {
    console.error(`D+7 SEO check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
