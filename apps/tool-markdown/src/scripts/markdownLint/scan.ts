import type { Position, TextRange } from './types';

export type LineContext = {
  lineNumber: number;
  startOffset: number;
  endOffset: number;
  text: string;
  isFrontMatter: boolean;
  isFenceLine: boolean;
  isInsideFence: boolean;
  isTopLevel: boolean;
  fenceInfo?: string;
};

export type ScanResult = {
  lines: LineContext[];
  headings: LineContext[];
  unmatchedFenceStart?: LineContext;
  fencedCodeBlocks: number;
};

function isFence(line: string): RegExpExecArray | null {
  return /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
}

export function isAtxHeading(line: LineContext): boolean {
  return !line.isFrontMatter && !line.isInsideFence && !line.isFenceLine && /^#{1,6}(?:\s|$)/.test(line.text);
}

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

export function scanMarkdown(input: string): ScanResult {
  const source = normalizeLineEndings(input);
  const rawLines = source.split('\n');
  const lines: LineContext[] = [];
  let offset = 0;
  let frontMatterOpen = rawLines[0] === '---';
  let fenceOpen: { marker: '`' | '~'; size: number; start: LineContext } | null = null;
  let fencedCodeBlocks = 0;

  for (let index = 0; index < rawLines.length; index += 1) {
    const text = rawLines[index];
    const isFrontMatterDelimiter = frontMatterOpen && index > 0 && /^(---|\.\.\.)\s*$/.test(text);
    const fenceMatch = !frontMatterOpen ? isFence(text) : null;
    const isFenceLine = Boolean(fenceMatch);
    const isInsideFence = Boolean(fenceOpen) && !isFenceLine;
    const isTopLevel = !/^\s/.test(text) && !/^>/.test(text) && !/^[-+*]\s/.test(text) && !/^\d+[.)]\s/.test(text);

    const context: LineContext = {
      lineNumber: index + 1,
      startOffset: offset,
      endOffset: offset + text.length,
      text,
      isFrontMatter: frontMatterOpen,
      isFenceLine,
      isInsideFence,
      isTopLevel,
      fenceInfo: fenceMatch?.[3].trim(),
    };
    lines.push(context);

    if (frontMatterOpen && isFrontMatterDelimiter) {
      frontMatterOpen = false;
    } else if (fenceMatch) {
      const marker = fenceMatch[2][0] as '`' | '~';
      const size = fenceMatch[2].length;
      if (!fenceOpen) {
        fenceOpen = { marker, size, start: context };
        fencedCodeBlocks += 1;
      } else if (fenceOpen.marker === marker && size >= fenceOpen.size) {
        fenceOpen = null;
      }
    }

    offset += text.length + 1;
  }

  return {
    lines,
    headings: lines.filter(isAtxHeading),
    unmatchedFenceStart: fenceOpen?.start,
    fencedCodeBlocks,
  };
}

export function positionFromOffset(offset: number, scan: ScanResult): Position {
  const line = scan.lines.find((candidate) => offset <= candidate.endOffset) ?? scan.lines.at(-1);
  if (!line) return { line: 1, column: 1, offset: 0 };
  return {
    line: line.lineNumber,
    column: Math.max(1, offset - line.startOffset + 1),
    offset,
  };
}

export function rangeFromOffsets(startOffset: number, endOffset: number, scan: ScanResult): TextRange {
  return {
    start: positionFromOffset(startOffset, scan),
    end: positionFromOffset(endOffset, scan),
  };
}

export function lineRange(line: LineContext, scan: ScanResult): TextRange {
  return rangeFromOffsets(line.startOffset, line.endOffset, scan);
}
