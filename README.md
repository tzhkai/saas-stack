# MarkdownMaster

[MarkdownMaster](https://markdownmaster.site) is a free, browser-first Markdown workspace for editing, checking, converting, and shipping Markdown documentation. It is open source, requires no account, and keeps document text on your device.

## Try it

| Task | Tool |
|---|---|
| Write and preview Markdown | [Markdown editor](https://markdownmaster.site/editor/) |
| Review Markdown before publishing | [Markdown Formatter & Linter](https://markdownmaster.site/tools/markdown-linter/) |
| Start a project README | [README generator](https://markdownmaster.site/tools/readme-generator/) |
| Build a Markdown table | [Markdown table generator](https://markdownmaster.site/tools/markdown-table-generator/) |
| Convert Markdown to HTML | [Markdown to HTML converter](https://markdownmaster.site/tools/markdown-to-html/) |
| Start with a practical structure | [Markdown templates](https://markdownmaster.site/templates/) |

## Release-day Markdown review

A preview can show whether a document reads correctly today. A release review asks a different question: can the next maintainer understand and safely change it?

The [Markdown Formatter & Linter](https://markdownmaster.site/tools/markdown-linter/) checks headings, list spacing, accidental whitespace, and code fences in the browser. It shows a diff before a user applies any deterministic formatting fix. Decisions that depend on author intent—such as heading hierarchy, code language labels, and image alt text—remain review items instead of being silently changed.

Markdown text, local file names, and diff results are not uploaded to a MarkdownMaster server. Optional anonymous analytics remain disabled unless a visitor explicitly allows them, and they never include Markdown text.

## Principles

MarkdownMaster is deliberately focused on a small set of practical documentation tasks:

- **Browser-first:** all core tools work without an account and process document text locally.
- **Review before change:** safe formatting fixes are visible in a diff and only apply after an explicit user action.
- **No AI writing assistant:** the project does not generate or rewrite a user’s prose.
- **No cloud workspace:** the project does not offer collaboration, syncing, or document storage.
- **Open source:** the site is maintained under the MIT License.

## Local development

The MarkdownMaster app is located in [`apps/tool-markdown`](./apps/tool-markdown/).

```bash
pnpm install
pnpm dev
```

To create a production build:

```bash
pnpm build
```

## Feedback

Use the [GitHub issue tracker](https://github.com/tzhkai/saas-stack/issues) for a reproducible bug report or a narrowly scoped feature request. When proposing a formatter rule, include a small Markdown input, the expected output, and whether the change is safe to apply automatically or should remain a review prompt.

## License

MIT. See the repository license for details.
