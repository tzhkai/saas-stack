import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emptyMarkdownTable,
  parseDelimitedTable,
  parseMarkdownPipeTable,
  tableFromTemplate,
  tableToMarkdown,
  withAlignment,
  withCell,
  withColumn,
  withRow,
  withTableStyle,
} from '../src/scripts/markdownTable';

test('parses TSV into headers and rows without uploading content', () => {
  const result = parseDelimitedTable('Name\tValue\nalpha\t1\nbeta\t2', '\t');
  assert.ok(result.table);
  assert.deepEqual(result.table.headers, ['Name', 'Value']);
  assert.deepEqual(result.table.rows, [['alpha', '1'], ['beta', '2']]);
  assert.equal(result.warnings.length, 0);
});

test('rejects quoted CSV instead of silently splitting commas inside quoted cells', () => {
  const result = parseDelimitedTable('Name,Note\nalpha,"contains, comma"', ',');
  assert.equal(result.table, null);
  assert.deepEqual(result.warnings.map((item) => item.code), ['csv_complex']);
});

test('warns about uneven simple CSV rows while keeping their visible cells reviewable', () => {
  const result = parseDelimitedTable('Name,Value\nalpha,1,extra\nbeta', ',');
  assert.ok(result.table);
  assert.deepEqual(result.table.rows, [['alpha', '1 extra'], ['beta', '']]);
  assert.ok(result.warnings.some((item) => item.code === 'column_count'));
});

test('parses an existing pipe table and preserves alignment', () => {
  const result = parseMarkdownPipeTable('| Name | Score |\n| :--- | ---: |\n| alpha | 2 |');
  assert.ok(result.table);
  assert.deepEqual(result.table.alignments, ['left', 'right']);
  assert.deepEqual(result.table.rows, [['alpha', '2']]);
});

test('parses escaped pipes and backslashes from a pipe table without changing cell content', () => {
  const result = parseMarkdownPipeTable('| Field | Value |\n| :--- | :--- |\n| A\\|B | C\\\\D |');
  assert.ok(result.table);
  assert.deepEqual(result.table.rows, [['A|B', 'C\\D']]);
  assert.match(tableToMarkdown(result.table), /A\\\|B/);
  assert.match(tableToMarkdown(result.table), /C\\\\D/);
});

test('flags invalid Markdown separator rows instead of silently treating them as valid', () => {
  const result = parseMarkdownPipeTable('| Name |\n| broken |\n| alpha |');
  assert.ok(result.table);
  assert.ok(result.warnings.some((item) => item.code === 'invalid_separator'));
});

test('escapes pipes and backslashes when generating GitHub-style Markdown', () => {
  const edited = withCell(withCell(emptyMarkdownTable(), -1, 0, 'A|B'), 0, 0, 'C\\D');
  const output = tableToMarkdown(edited);
  assert.match(output, /A\\\|B/);
  assert.match(output, /C\\\\D/);
});

test('renders each available style through an explicit fixed choice', () => {
  const base = tableFromTemplate('blank');
  const github = tableToMarkdown(withTableStyle(base, 'github'));
  const compact = tableToMarkdown(withTableStyle(base, 'compact'));
  const apiReference = tableToMarkdown(withTableStyle(base, 'api-reference'));
  assert.match(github.split('\n')[0], /^\| /);
  assert.match(compact.split('\n')[0], /^\|[^ ]/);
  assert.match(apiReference.split('\n')[0], /^\| /);
  assert.match(apiReference, /:---/);
});

test('keeps at least one row and one column during structural changes', () => {
  let table = tableFromTemplate('blank');
  table = withRow(table, 'remove');
  table = withRow(table, 'remove');
  table = withColumn(table, 'remove');
  table = withColumn(table, 'remove');
  table = withColumn(table, 'remove');
  assert.equal(table.rows.length, 1);
  assert.equal(table.headers.length, 1);
});

test('updates table alignment through a fixed enum path', () => {
  const table = withAlignment(tableFromTemplate('api_parameters'), 2, 'right');
  assert.equal(table.alignments[2], 'right');
  assert.match(tableToMarkdown(table), /---:/);
});
