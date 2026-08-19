import assert from 'node:assert/strict';
import test from 'node:test';
import { applyIssueEdits, selectedSafeIssues } from '../src/scripts/markdownLint/apply';
import { analyzeMarkdown } from '../src/scripts/markdownLint/rules';
import { DEFAULT_FORMATTER_SETTINGS } from '../src/scripts/markdownLint/types';

function analyze(source: string) {
  return analyzeMarkdown(source, DEFAULT_FORMATTER_SETTINGS);
}

function applyAllSafe(source: string): string {
  const result = analyze(source);
  return applyIssueEdits(source.replace(/\r\n?/g, '\n'), result.issues.filter((issue) => issue.tier === 'safe'));
}

test('normalizes deterministic heading and list spacing without touching content', () => {
  const source = '#Title\n-item\n';
  const result = analyze(source);
  assert.deepEqual(result.issues.filter((issue) => issue.tier === 'safe').map((issue) => issue.ruleId), ['MM101', 'MM102']);
  assert.equal(applyAllSafe(source), '# Title\n- item\n');
});

test('keeps two trailing spaces as a review item because they may be a hard line break', () => {
  const source = 'A line with a hard break  \nAnother line\n';
  const result = analyze(source);
  const issue = result.issues.find((candidate) => candidate.ruleId === 'MM103');
  assert.equal(issue?.tier, 'review');
  assert.equal(issue?.edits, undefined);
  assert.equal(applyAllSafe(source), source);
});

test('does not replace tabs in YAML front matter or fenced code', () => {
  const source = '---\ntitle:\tExample\n---\n\n```js\n\tconst keep = true;\n```\n';
  const result = analyze(source);
  assert.equal(result.issues.some((issue) => issue.ruleId === 'MM104'), false);
});

test('replaces hard tabs in ordinary Markdown with the configured number of spaces', () => {
  const source = 'Before\n\t- nested item\n';
  const result = analyzeMarkdown(source, { spacesPerTab: 4 });
  const selected = new Set(result.issues.filter((issue) => issue.tier === 'safe').map((issue) => issue.id));
  const output = applyIssueEdits(source, selectedSafeIssues(result.issues, selected));
  assert.equal(output, 'Before\n    - nested item\n');
});

test('adds spacing around a top-level fenced code block without changing its code', () => {
  const source = 'Install this:\n```bash\nnpm install\n```\nContinue below.\n';
  const result = analyze(source);
  assert.equal(result.issues.filter((issue) => issue.ruleId === 'MM107').length, 2);
  assert.equal(applyAllSafe(source), 'Install this:\n\n```bash\nnpm install\n```\n\nContinue below.\n');
});

test('reports structural risks without creating automatic edits', () => {
  const source = '# Main\n\n### Skipped\n\n```\nplain code\n\n![](image.png)\n';
  const result = analyze(source);
  const reviewRules = new Set(result.issues.filter((issue) => issue.tier === 'review').map((issue) => issue.ruleId));
  assert.equal(reviewRules.has('MM201'), true);
  assert.equal(reviewRules.has('MM204'), true);
  assert.equal(reviewRules.has('MM205'), false, 'image is inside an unclosed code block and must not be scanned as Markdown');
  assert.equal(reviewRules.has('MM208'), true);
  assert.equal(applyAllSafe(source), source);
});

test('adds a final newline as a separately reviewable safe change', () => {
  const source = 'Plain text';
  const result = analyze(source);
  assert.equal(result.issues.some((issue) => issue.ruleId === 'MM106' && issue.tier === 'safe'), true);
  assert.equal(applyAllSafe(source), 'Plain text\n');
});

test('never emits overlapping safe edits', () => {
  const source = '#Title\n\n\n-  item\t\n';
  const result = analyze(source);
  const edits = result.issues.filter((issue) => issue.tier === 'safe').flatMap((issue) => issue.edits ?? []).sort((a, b) => a.startOffset - b.startOffset);
  for (let index = 0; index < edits.length - 1; index += 1) {
    assert.ok(edits[index].endOffset <= edits[index + 1].startOffset, `edits ${index} and ${index + 1} overlap`);
  }
});
