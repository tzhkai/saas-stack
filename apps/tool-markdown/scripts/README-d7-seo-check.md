# D+7 SEO 复查脚本

`d7-seo-check.mjs` 是一个**只读、一次性可重复执行**的发布后检查器。它核对生产页面与 sitemap 的可达性，再从 Google Search Console 提取目标 URL 的聚合搜索表现；可选地从 GA4 Data API 读取 `markdown_tool_action` 的按日聚合总量。

它不会提交 sitemap、请求索引、变更 Search Console/GA4 配置、写入 Google，或请求用户级数据。脚本也不会读取 Markdown、表格单元格、文件名、文档标题、URL query 或生成结果。

## 两种运行方式

| 方式 | 适用场景 | 取舍 | 推荐程度 |
|---|---|---|---|
| **D+7手动运行** | 当前只需在发布后第7天、14天、28天、56天复查。 | 只需临时令牌；没有持续运行服务或额外维护。 | **当前推荐。** |
| **每日后台运行** | 未来需要同时追踪多工具、多URL或定期交付汇总报告。 | 需要保存授权、定义报告接收位置与运行环境；不应把令牌写入仓库。 | 规模扩大后再启用。 |

当前 v1.5 建议保留手动运行。D+7 的目标是确认“Google 是否开始发现/归因该 URL”和“同意后固定事件是否开始入库”，不是高频告警；分钟级或小时级轮询既没有决策价值，也会不必要地增加维护成本。

## 最小授权与运行

先准备一个**短期、只读 OAuth access token**。基础检查需要 Search Console 读取权限；增加 `--ga4` 时，该令牌还需要同一 Google 账号对 GA4 Property `534945179` 的 Analytics Data API 读取权限。不要把 token 放到 `.env`、命令历史、报告或 Git 提交中。

```bash
cd apps/tool-markdown
GOOGLE_OAUTH_TOKEN='短期只读令牌' \
  pnpm check:d7-seo -- \
  --start 2026-08-22 \
  --end 2026-08-28 \
  --ga4 \
  --out reports/d7-seo-2026-08-28.md
```

若只检查 Search Console 与生产发现性，不调用 GA4：

```bash
GOOGLE_OAUTH_TOKEN='短期只读令牌' \
  pnpm check:d7-seo -- \
  --start 2026-08-22 \
  --end 2026-08-28 \
  --out reports/d7-seo-2026-08-28.md
```

本地测试不需要 token，也不调用 Google：

```bash
pnpm test:d7-seo-check
```

`reports/` 被忽略，生成的报告只留在本地。不要将 OAuth token、原始API响应或含用户数据的导出文件写入这个仓库。

## D+7 指标与判读顺序

| 层级 | 指标 | D+7用途 | 保护规则 |
|---|---|---|---|
| 发现性 | `/tools/markdown-table-generator/` 和对比文章的HTTP状态、sitemap存在性、HTML缓存策略。 | 先排除页面不可达、缺 sitemap 或错误缓存。 | sitemap缺URL时优先修发现路径；不对普通URL反复请求索引。 |
| URL表现 | 目标URL的点击、展示、CTR、加权平均排名。 | 确认升级后的既有URL是否开始获得Google展示。 | 0展示是发现信号，不是内容质量结论。 |
| 表格查询 | `markdown table(s)`、`table generator`、`csv/tsv to markdown`、`gfm table` 的固定正则匹配。 | 判断展示是否开始归因到本工具的预期搜索意图。 | 少于20次相关展示只标为“方向性观察”。 |
| 页面点击吸引力 | 相关查询CTR。 | 仅在已有足量、排名靠前的展示后复核标题/描述。 | 相关展示≥20且平均排名≤20、CTR仍为0，才建立人工SERP审查事项。 |
| 同意后工具行为 | `markdown_tool_action` 总量；GA4中注册后可按固定 `tool`、`action`、`source` 分解。 | 验证事件管道已入库，随后看Table解析→预览→复制/交接路径。 | 事件仅代表已同意分析的会话；相关会话<20不做产品删改判断。 |

## D+7 人工复查清单

脚本输出完成后，在 Search Console 和 GA4 做最后的人工核验。Search Console 需要查看 URL Inspection 的抓取与规范化状态，以及页面过滤下的表格意图查询；GA4 需要确认自定义维度只包含固定的 `tool`、`action`、`source`。这些检查不能通过脚本替代，因为它们涉及索引诊断和事件配置状态，而不是单纯的数值。

D+7不应启动新的近似工具页、购买链接、批量目录提交、互换链接或普通页面的 Indexing API。只有当技术发现性被证实有问题时，才先修复站内规范化、sitemap或内链；若只是样本少，则继续到D+14和D+28观察。
