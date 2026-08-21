import { type IssueTier, RULE_LABELS } from './types';

export type RuleHelp = {
  ruleId: string;
  title: string;
  tier: IssueTier;
  why: string;
  boundary: string;
  before: string;
  after?: string;
  reviewNote?: string;
};

export const RULE_HELP: Record<string, RuleHelp> = {
  MM101: {
    ruleId: 'MM101',
    title: RULE_LABELS.MM101,
    tier: 'safe',
    why: 'ATX headings are easier to read and more consistently recognized when one space follows the heading marker.',
    boundary: 'The tool only replaces whitespace immediately after an otherwise valid heading marker.',
    before: '#Project overview',
    after: '# Project overview',
  },
  MM102: {
    ruleId: 'MM102',
    title: RULE_LABELS.MM102,
    tier: 'safe',
    why: 'A single space after a list marker makes source Markdown easier to scan and maintain.',
    boundary: 'The tool only normalizes spacing after an existing unordered or ordered list marker.',
    before: '-Install the package',
    after: '- Install the package',
  },
  MM103: {
    ruleId: 'MM103',
    title: RULE_LABELS.MM103,
    tier: 'safe',
    why: 'Accidental trailing whitespace makes Markdown source and code-review diffs noisy.',
    boundary: 'The tool removes ordinary trailing whitespace, but leaves exactly two trailing spaces for review because they can create an intentional hard line break.',
    before: 'A paragraph with accidental spaces   ',
    after: 'A paragraph with accidental spaces',
    reviewNote: 'Keep two trailing spaces when you deliberately need a Markdown hard line break.',
  },
  MM104: {
    ruleId: 'MM104',
    title: RULE_LABELS.MM104,
    tier: 'safe',
    why: 'Tabs outside code blocks can render differently between editors and platforms.',
    boundary: 'The tool replaces hard tabs outside front matter and fenced code with the selected number of spaces.',
    before: '  \t- nested item',
    after: '    - nested item',
  },
  MM105: {
    ruleId: 'MM105',
    title: RULE_LABELS.MM105,
    tier: 'safe',
    why: 'Extra blank lines can make long documents harder to scan and create unnecessary diff noise.',
    boundary: 'The tool only removes extra top-level blank lines between ordinary Markdown blocks.',
    before: 'First paragraph\n\n\n\nSecond paragraph',
    after: 'First paragraph\n\nSecond paragraph',
  },
  MM106: {
    ruleId: 'MM106',
    title: RULE_LABELS.MM106,
    tier: 'safe',
    why: 'A final newline helps text tools compare, combine, and display Markdown files consistently.',
    boundary: 'The tool adds exactly one final newline and does not change any document content.',
    before: 'Last line',
    after: 'Last line\n',
  },
  MM107: {
    ruleId: 'MM107',
    title: RULE_LABELS.MM107,
    tier: 'safe',
    why: 'Blank lines around a top-level fenced code block make Markdown source clearer to read.',
    boundary: 'The tool only inserts blank lines immediately before or after an already matched top-level code fence.',
    before: 'Run this:\n```bash\nnpm test\n```\nContinue.',
    after: 'Run this:\n\n```bash\nnpm test\n```\n\nContinue.',
  },
  MM201: {
    ruleId: 'MM201',
    title: RULE_LABELS.MM201,
    tier: 'review',
    why: 'A heading level jump can make a document outline harder to navigate.',
    boundary: 'The correct heading level depends on the document structure, so the tool does not change it automatically.',
    before: '## Install\n\n#### From source',
    reviewNote: 'Decide whether the second heading should be H3 or whether a missing section belongs between them.',
  },
  MM202: {
    ruleId: 'MM202',
    title: RULE_LABELS.MM202,
    tier: 'review',
    why: 'Multiple H1 headings can make a standalone document harder to understand or render consistently.',
    boundary: 'Several H1 headings can be intentional in combined documents, so the tool only flags them for review.',
    before: '# Overview\n\n# Installation',
    reviewNote: 'Keep multiple H1 headings when they are intentional; otherwise choose a lower-level heading for later sections.',
  },
  MM203: {
    ruleId: 'MM203',
    title: RULE_LABELS.MM203,
    tier: 'review',
    why: 'Repeated heading text may create duplicate anchors or confuse readers navigating a long document.',
    boundary: 'Repeated headings can be valid in changelogs or repeated sections, so the tool does not rename them.',
    before: '## Changes\n\n## Changes',
    reviewNote: 'Keep the repetition when it is meaningful, or make the later heading more specific.',
  },
  MM204: {
    ruleId: 'MM204',
    title: RULE_LABELS.MM204,
    tier: 'review',
    why: 'A language label can improve readability and syntax highlighting for a code sample.',
    boundary: 'The tool cannot reliably identify an arbitrary snippet language, so it does not add one automatically.',
    before: '```\nnpm install\n```',
    reviewNote: 'Add a label such as bash, js, json, or text only when it helps readers on your target platform.',
  },
  MM205: {
    ruleId: 'MM205',
    title: RULE_LABELS.MM205,
    tier: 'review',
    why: 'Useful alt text helps readers understand an image when it is unavailable or described by assistive technology.',
    boundary: 'Only the author can describe the image purpose accurately, so the tool never invents alt text.',
    before: '![](architecture.png)',
    reviewNote: 'Add concise text that describes the image purpose in this document, or confirm that the image is decorative.',
  },
  MM206: {
    ruleId: 'MM206',
    title: RULE_LABELS.MM206,
    tier: 'review',
    why: 'Markdown links normally use a label followed by a URL, and reversed syntax may be a typo.',
    boundary: 'The tool cannot know whether a pattern is an example or intentional text, so it only flags it.',
    before: '(https://example.com)[Example]',
    reviewNote: 'Standard link syntax is [Example](https://example.com). Check whether the current pattern is intentional.',
  },
  MM207: {
    ruleId: 'MM207',
    title: RULE_LABELS.MM207,
    tier: 'review',
    why: 'Inline HTML may render differently across Markdown platforms and publishing pipelines.',
    boundary: 'Some platforms allow useful HTML while others remove it, so the tool does not delete or rewrite it automatically.',
    before: '<details><summary>More</summary></details>',
    reviewNote: 'Confirm that your publishing platform supports the HTML, or replace it with portable Markdown syntax.',
  },
  MM208: {
    ruleId: 'MM208',
    title: RULE_LABELS.MM208,
    tier: 'review',
    why: 'An unclosed fenced code block can cause all following text to render as code.',
    boundary: 'The tool cannot infer where a code sample should end, so it never inserts a closing fence automatically.',
    before: '```js\nconsole.log("Hello")',
    reviewNote: 'Add a matching closing fence at the point where the code sample should end.',
  },
};

export function getRuleHelp(ruleId: string): RuleHelp | null {
  return RULE_HELP[ruleId] ?? null;
}
