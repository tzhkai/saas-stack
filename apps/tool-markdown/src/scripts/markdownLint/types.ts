export type IssueTier = 'safe' | 'review';

export type Position = {
  line: number;
  column: number;
  offset: number;
};

export type TextRange = {
  start: Position;
  end: Position;
};

export type TextEdit = {
  startOffset: number;
  endOffset: number;
  replacement: string;
};

export type Issue = {
  id: string;
  ruleId: string;
  tier: IssueTier;
  title: string;
  message: string;
  range: TextRange;
  suggestion?: string;
  edits?: TextEdit[];
};

export type FormatterSettings = {
  spacesPerTab: 2 | 4;
};

export type DocumentStats = {
  characters: number;
  lines: number;
  headings: number;
  fencedCodeBlocks: number;
};

export type AnalysisResult = {
  sourceText: string;
  issues: Issue[];
  stats: DocumentStats;
};

export const DEFAULT_FORMATTER_SETTINGS: FormatterSettings = {
  spacesPerTab: 2,
};

export const SAFE_RULE_IDS = new Set(['MM101', 'MM102', 'MM103', 'MM104', 'MM105', 'MM106', 'MM107']);

export const RULE_LABELS: Record<string, string> = {
  MM101: 'Normalize heading spacing',
  MM102: 'Normalize list marker spacing',
  MM103: 'Remove accidental trailing whitespace',
  MM104: 'Replace hard tabs outside code',
  MM105: 'Collapse extra blank lines',
  MM106: 'Add a final newline',
  MM107: 'Add space around top-level code fences',
  MM201: 'Heading level skipped',
  MM202: 'Multiple H1 headings',
  MM203: 'Duplicate heading text',
  MM204: 'Code fence has no language',
  MM205: 'Image has no alt text',
  MM206: 'Possible reversed link syntax',
  MM207: 'Inline HTML detected',
  MM208: 'Unclosed fenced code block',
};
