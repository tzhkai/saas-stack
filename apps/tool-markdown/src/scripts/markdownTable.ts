export const TABLE_STYLES = ['github', 'compact', 'api-reference'] as const;
export type TableStyle = typeof TABLE_STYLES[number];

export const COLUMN_ALIGNMENTS = ['left', 'center', 'right'] as const;
export type ColumnAlignment = typeof COLUMN_ALIGNMENTS[number];

export type TableWarningCode =
  | 'column_count'
  | 'empty_header'
  | 'invalid_separator'
  | 'csv_complex'
  | 'no_table_data';

export type TableWarning = Readonly<{
  code: TableWarningCode;
  message: string;
}>;

export type MarkdownTable = Readonly<{
  headers: readonly string[];
  rows: readonly (readonly string[])[];
  alignments: readonly ColumnAlignment[];
  style: TableStyle;
  warnings: readonly TableWarning[];
}>;

export type ParseResult = Readonly<{
  table: MarkdownTable | null;
  warnings: readonly TableWarning[];
}>;

const EMPTY_HEADERS = ['Column 1', 'Column 2', 'Column 3'] as const;

function warning(code: TableWarningCode, message: string): TableWarning {
  return Object.freeze({ code, message });
}

function cloneRows(rows: readonly (readonly string[])[]): string[][] {
  return rows.map((row) => [...row]);
}

export function emptyMarkdownTable(style: TableStyle = 'github'): MarkdownTable {
  return Object.freeze({
    headers: Object.freeze([...EMPTY_HEADERS]),
    rows: Object.freeze([Object.freeze(['', '', '']), Object.freeze(['', '', ''])]),
    alignments: Object.freeze(['left', 'left', 'left']),
    style,
    warnings: Object.freeze([]),
  });
}

export function isTableStyle(value: string | undefined): value is TableStyle {
  return Boolean(value && (TABLE_STYLES as readonly string[]).includes(value));
}

export function isColumnAlignment(value: string | undefined): value is ColumnAlignment {
  return Boolean(value && (COLUMN_ALIGNMENTS as readonly string[]).includes(value));
}

export function normalizeCell(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function escapeMarkdownCell(value: string): string {
  return normalizeCell(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function unescapeMarkdownCell(value: string): string {
  return normalizeCell(value).replace(/\\\|/g, '|').replace(/\\\\/g, '\\');
}

function normalizeGrid(headers: readonly string[], rows: readonly (readonly string[])[]): {
  headers: string[];
  rows: string[][];
  warnings: TableWarning[];
} {
  const warnings: TableWarning[] = [];
  const width = Math.max(headers.length, 1);
  const normalizedHeaders = Array.from({ length: width }, (_, index) => normalizeCell(headers[index] ?? ''));
  const normalizedRows = cloneRows(rows).map((row) => {
    if (row.length !== width) warnings.push(warning('column_count', 'Some pasted rows had a different column count. Missing cells were left blank and extra cells were kept in the last column.'));
    const result = Array.from({ length: width }, (_, index) => normalizeCell(row[index] ?? ''));
    if (row.length > width) result[width - 1] = normalizeCell([result[width - 1], ...row.slice(width)].filter(Boolean).join(' '));
    return result;
  });
  if (normalizedHeaders.some((header) => !header)) warnings.push(warning('empty_header', 'One or more column headers are empty. Add clear labels before publishing.'));
  return { headers: normalizedHeaders, rows: normalizedRows, warnings };
}

function tableFromGrid(headers: readonly string[], rows: readonly (readonly string[])[], style: TableStyle, alignments?: readonly ColumnAlignment[], extraWarnings: readonly TableWarning[] = []): MarkdownTable {
  const normalized = normalizeGrid(headers, rows);
  const resolvedAlignments = Array.from({ length: normalized.headers.length }, (_, index) => alignments?.[index] ?? 'left') as ColumnAlignment[];
  return Object.freeze({
    headers: Object.freeze(normalized.headers),
    rows: Object.freeze(normalized.rows.map((row) => Object.freeze(row))),
    alignments: Object.freeze(resolvedAlignments),
    style,
    warnings: Object.freeze([...extraWarnings, ...normalized.warnings]),
  });
}

export function parseDelimitedTable(input: string, delimiter: '\t' | ',', style: TableStyle = 'github'): ParseResult {
  const lines = input.replace(/\r\n?/g, '\n').split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    const item = warning('no_table_data', 'Paste a header row and at least one data row to build a table.');
    return Object.freeze({ table: null, warnings: Object.freeze([item]) });
  }

  const hasQuotes = delimiter === ',' && lines.some((line) => /(^|,)\s*"/.test(line));
  if (hasQuotes) {
    const item = warning('csv_complex', 'This CSV uses quoted fields. To avoid changing a comma inside a quoted cell, the local simple CSV parser did not import it. Paste TSV instead, remove quoted commas, or use a CSV-aware spreadsheet before copying.');
    return Object.freeze({ table: null, warnings: Object.freeze([item]) });
  }
  const grid = lines.map((line) => line.split(delimiter));
  const table = tableFromGrid(grid[0], grid.slice(1), style);
  return Object.freeze({ table, warnings: table.warnings });
}

function splitMarkdownRow(line: string): string[] {
  const source = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let cell = '';
  let escaped = false;
  for (const char of source) {
    if (escaped) {
      cell += `\\${char}`;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '|') {
      cells.push(unescapeMarkdownCell(cell));
      cell = '';
      continue;
    }
    cell += char;
  }
  if (escaped) cell += '\\';
  cells.push(unescapeMarkdownCell(cell));
  return cells;
}

function alignmentFromSeparator(value: string): ColumnAlignment | null {
  const trimmed = value.trim();
  if (!/^:?-{3,}:?$/.test(trimmed)) return null;
  if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
  if (trimmed.endsWith(':')) return 'right';
  return 'left';
}

export function parseMarkdownPipeTable(input: string, style: TableStyle = 'github'): ParseResult {
  const lines = input.replace(/\r\n?/g, '\n').split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    const item = warning('no_table_data', 'Paste a single Markdown table with a header row and separator row.');
    return Object.freeze({ table: null, warnings: Object.freeze([item]) });
  }

  const headers = splitMarkdownRow(lines[0]);
  const separatorCells = splitMarkdownRow(lines[1]);
  const separatorAlignments = separatorCells.map(alignmentFromSeparator);
  const warnings: TableWarning[] = [];
  if (separatorCells.length !== headers.length || separatorAlignments.some((alignment) => !alignment)) {
    warnings.push(warning('invalid_separator', 'The Markdown separator row is incomplete or invalid. A safe left-aligned separator was used so you can review the generated table.'));
  }
  const alignments = headers.map((_, index) => separatorAlignments[index] ?? 'left') as ColumnAlignment[];
  const rows = lines.slice(2).map(splitMarkdownRow);
  const table = tableFromGrid(headers, rows, style, alignments, warnings);
  return Object.freeze({ table, warnings: table.warnings });
}

function separatorFor(alignment: ColumnAlignment, style: TableStyle): string {
  if (style === 'compact') {
    if (alignment === 'center') return ':--:';
    if (alignment === 'right') return '--:';
    return ':--';
  }
  if (alignment === 'center') return ':---:';
  if (alignment === 'right') return '---:';
  return ':---';
}

function rowSource(cells: readonly string[], style: TableStyle): string {
  const values = cells.map(escapeMarkdownCell);
  return style === 'compact' ? `|${values.join('|')}|` : `| ${values.join(' | ')} |`;
}

export function tableToMarkdown(table: MarkdownTable): string {
  const separator = table.alignments.map((alignment) => separatorFor(alignment, table.style));
  return [rowSource(table.headers, table.style), rowSource(separator, table.style), ...table.rows.map((row) => rowSource(row, table.style))].join('\n');
}

export function withTableStyle(table: MarkdownTable, style: TableStyle): MarkdownTable {
  return Object.freeze({ ...table, style });
}

export function withCell(table: MarkdownTable, rowIndex: number, columnIndex: number, value: string): MarkdownTable {
  const headers = [...table.headers];
  const rows = cloneRows(table.rows);
  if (rowIndex === -1) headers[columnIndex] = value;
  else if (rows[rowIndex]) rows[rowIndex][columnIndex] = value;
  return tableFromGrid(headers, rows, table.style, table.alignments);
}

export function withAlignment(table: MarkdownTable, columnIndex: number, alignment: ColumnAlignment): MarkdownTable {
  const alignments = [...table.alignments];
  alignments[columnIndex] = alignment;
  return tableFromGrid(table.headers, table.rows, table.style, alignments);
}

export function withRow(table: MarkdownTable, direction: 'add' | 'remove'): MarkdownTable {
  const rows = cloneRows(table.rows);
  if (direction === 'add') rows.push(table.headers.map(() => ''));
  if (direction === 'remove' && rows.length > 1) rows.pop();
  return tableFromGrid(table.headers, rows, table.style, table.alignments);
}

export function withColumn(table: MarkdownTable, direction: 'add' | 'remove'): MarkdownTable {
  const headers = [...table.headers];
  const rows = cloneRows(table.rows);
  const alignments = [...table.alignments];
  if (direction === 'add') {
    headers.push(`Column ${headers.length + 1}`);
    rows.forEach((row) => row.push(''));
    alignments.push('left');
  }
  if (direction === 'remove' && headers.length > 1) {
    headers.pop();
    rows.forEach((row) => row.pop());
    alignments.pop();
  }
  return tableFromGrid(headers, rows, table.style, alignments);
}

export const TABLE_TEMPLATES = Object.freeze({
  feature_comparison: tableFromGrid(['Feature', 'Free', 'Pro'], [['Live preview', 'Yes', 'Yes'], ['Export HTML', '—', 'Yes'], ['Priority support', '—', 'Yes']], 'github', ['left', 'center', 'center']),
  cli_commands: tableFromGrid(['Command', 'Description', 'Example'], [['install', 'Install the package', 'npm install your-cli'], ['init', 'Create a configuration file', 'your-cli init']], 'github'),
  api_parameters: tableFromGrid(['Parameter', 'Type', 'Required', 'Description'], [['limit', 'integer', 'No', 'Maximum items to return'], ['cursor', 'string', 'No', 'Pagination cursor']], 'github', ['left', 'left', 'center', 'left']),
  blank: emptyMarkdownTable(),
} as const);

export type TableTemplate = keyof typeof TABLE_TEMPLATES;

export function tableFromTemplate(template: TableTemplate): MarkdownTable {
  const source = TABLE_TEMPLATES[template];
  return tableFromGrid(source.headers, source.rows, source.style, source.alignments);
}
