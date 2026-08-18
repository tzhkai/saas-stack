import projectReadme from './templates/project-readme.md?raw';
import cliCommands from './templates/cli-commands.md?raw';
import apiParameters from './templates/api-parameters.md?raw';
import featureComparison from './templates/feature-comparison.md?raw';
import releaseNotes from './templates/release-notes.md?raw';
import technicalBrief from './templates/technical-brief.md?raw';

export type TemplateTarget = 'editor' | 'table' | 'readme';
export type TemplateCategory = 'Project docs' | 'Technical writing' | 'Reference' | 'Release management';

export type MarkdownTemplate = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  intro: string;
  category: TemplateCategory;
  target: TemplateTarget;
  markdown: string;
  includes: string[];
  steps: string[];
  guideHref: string;
  guideLabel: string;
};

export const MARKDOWN_TEMPLATES: readonly MarkdownTemplate[] = [
  {
    slug: 'github-readme-template',
    title: 'GitHub README Template',
    seoTitle: 'Free GitHub README Template for Open-Source Projects | MarkdownMaster',
    description: 'Copy a practical GitHub README template with installation, usage, contributing, and license sections. Customize it free in your browser.',
    intro: 'Start an open-source project README with a clear overview, setup path, example usage, and contribution guidance.',
    category: 'Project docs',
    target: 'readme',
    markdown: projectReadme,
    includes: ['Project overview and feature list', 'Installation and usage sections', 'Contributing, license, and support guidance'],
    steps: ['Open the template in the editor.', 'Replace the placeholders with project-specific details.', 'Copy the finished Markdown into your repository root as README.md.'],
    guideHref: '/blog/how-to-write-a-perfect-readme-markdown-github/',
    guideLabel: 'Read the complete README guide',
  },
  {
    slug: 'cli-command-reference-template',
    title: 'CLI Command Reference Template',
    seoTitle: 'Free CLI Command Reference Template in Markdown | MarkdownMaster',
    description: 'Document command-line installation, common commands, options, and examples with a copy-ready Markdown CLI reference template.',
    intro: 'Turn a command-line tool into documentation people can scan: installation first, then commands, options, examples, and troubleshooting.',
    category: 'Technical writing',
    target: 'table',
    markdown: cliCommands,
    includes: ['Installation and quick-start section', 'Command, description, and example table', 'Options and troubleshooting structure'],
    steps: ['Open the template in the editor.', 'Replace each sample command with your CLI syntax.', 'Keep command examples short enough to copy and test.'],
    guideHref: '/blog/markdown-for-developers-readme-docs-wikis/',
    guideLabel: 'Read Markdown for developers',
  },
  {
    slug: 'api-parameter-documentation-template',
    title: 'API Parameter Documentation Template',
    seoTitle: 'Free API Parameter Documentation Template in Markdown | MarkdownMaster',
    description: 'Create clear API parameter documentation with endpoint, authentication, request fields, responses, and errors in Markdown.',
    intro: 'Document an API endpoint with the information developers need before they make their first request: authentication, parameters, responses, and errors.',
    category: 'Reference',
    target: 'table',
    markdown: apiParameters,
    includes: ['Endpoint and authentication overview', 'Parameter and response field tables', 'Error and example request sections'],
    steps: ['Open the template in the editor.', 'Replace the sample endpoint and fields.', 'Check that required fields, types, and errors are explicit.'],
    guideHref: '/blog/markdown-tables-how-to-create-format-align/',
    guideLabel: 'Read the Markdown tables guide',
  },
  {
    slug: 'feature-comparison-table-template',
    title: 'Feature Comparison Table Template',
    seoTitle: 'Free Feature Comparison Table Template in Markdown | MarkdownMaster',
    description: 'Compare products, plans, or approaches with a readable Markdown feature comparison table and decision guidance.',
    intro: 'Make a decision easier to understand with a compact comparison table that explains differences without hiding the trade-offs.',
    category: 'Reference',
    target: 'table',
    markdown: featureComparison,
    includes: ['Feature-by-option comparison table', 'Plain-language decision guidance', 'Structure that works in GitHub READMEs and docs'],
    steps: ['Open the template in the editor.', 'Rename columns to the options being compared.', 'Keep each cell concise and explain key trade-offs below the table.'],
    guideHref: '/blog/markdown-tables-how-to-create-format-align/',
    guideLabel: 'Read the Markdown tables guide',
  },
  {
    slug: 'release-notes-template',
    title: 'Release Notes Template',
    seoTitle: 'Free Release Notes Template in Markdown | MarkdownMaster',
    description: 'Publish concise software release notes with added, changed, fixed, migration, and known-issue sections in Markdown.',
    intro: 'Publish a version update that users can skim: summarize the release, name the changes, and call out any migration or known limitations.',
    category: 'Release management',
    target: 'editor',
    markdown: releaseNotes,
    includes: ['Version, date, and release summary', 'Added, changed, fixed, and migration sections', 'Known limitations and upgrade notes'],
    steps: ['Open the template in the editor.', 'Replace the version and date before listing customer-facing changes.', 'Use consistent verbs so readers can scan what changed.'],
    guideHref: '/blog/markdown-syntax-complete-guide/',
    guideLabel: 'Read the Markdown syntax guide',
  },
  {
    slug: 'technical-brief-template',
    title: 'Technical Brief Template',
    seoTitle: 'Free Technical Brief Template in Markdown | MarkdownMaster',
    description: 'Structure an RFC or technical proposal with context, proposal, alternatives, risks, rollout, and success metrics in Markdown.',
    intro: 'Turn an early technical idea into a reviewable brief with enough context for teammates to understand the proposal and its trade-offs.',
    category: 'Technical writing',
    target: 'editor',
    markdown: technicalBrief,
    includes: ['Context, problem, and proposal sections', 'Alternatives, risks, and rollout plan', 'Success metrics and decision record'],
    steps: ['Open the template in the editor.', 'State the decision or proposal in one sentence.', 'Document alternatives and risks before asking for approval.'],
    guideHref: '/blog/markdown-for-developers-readme-docs-wikis/',
    guideLabel: 'Read Markdown for developers',
  },
] as const;

export const TEMPLATE_BY_SLUG = new Map(MARKDOWN_TEMPLATES.map((template) => [template.slug, template]));

export function getTemplate(slug: string): MarkdownTemplate | undefined {
  return TEMPLATE_BY_SLUG.get(slug);
}
