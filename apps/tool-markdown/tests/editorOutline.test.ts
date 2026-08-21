import assert from 'node:assert/strict';
import test from 'node:test';
import { scanEditorOutline, scrollTopForOutlineLine, selectionRangeForLine } from '../src/scripts/editorOutline';

test('extracts H1-H3 headings with local line numbers and hierarchy warnings', () => {
  const source = '# Project\n\n### Install\n\n## Usage\n';
  assert.deepEqual(scanEditorOutline(source), [
    { level: 1, text: 'Project', line: 1, isLevelJump: false, previousLevel: null },
    { level: 3, text: 'Install', line: 3, isLevelJump: true, previousLevel: 1 },
    { level: 2, text: 'Usage', line: 5, isLevelJump: false, previousLevel: 3 },
  ]);
});

test('excludes YAML front matter, fenced code, quotes, lists, and H4-H6 headings', () => {
  const source = [
    '---',
    'title: # Not an outline heading',
    '---',
    '',
    '# Visible',
    '',
    '```markdown',
    '## Code example',
    '```',
    '',
    '> ## Quoted title',
    '- ## Nested title',
    '#### Too deep',
    '## Included',
  ].join('\n');

  assert.deepEqual(scanEditorOutline(source).map((heading) => ({
    level: heading.level,
    text: heading.text,
    line: heading.line,
  })), [
    { level: 1, text: 'Visible', line: 5 },
    { level: 2, text: 'Included', line: 14 },
  ]);
});

test('keeps heading text while removing optional closing ATX markers', () => {
  const source = '# Release notes ##\n## \n';
  assert.deepEqual(scanEditorOutline(source).map((heading) => heading.text), ['Release notes', 'Untitled heading']);
});

test('returns a selection range for a one-indexed line including CRLF source text', () => {
  const source = '# One\r\nSecond line\r\nThird';
  assert.deepEqual(selectionRangeForLine(source, 2), { start: 7, end: 18 });
  assert.deepEqual(source.slice(7, 18), 'Second line');
  assert.deepEqual(selectionRangeForLine(source, 3), { start: 20, end: 25 });
  assert.equal(selectionRangeForLine(source, 4), null);
  assert.equal(selectionRangeForLine(source, 0), null);
});

test('calculates a non-negative local scroll offset with two context lines', () => {
  assert.equal(scrollTopForOutlineLine(1, 24), 0);
  assert.equal(scrollTopForOutlineLine(3, 24), 0);
  assert.equal(scrollTopForOutlineLine(8, 24), 120);
});
