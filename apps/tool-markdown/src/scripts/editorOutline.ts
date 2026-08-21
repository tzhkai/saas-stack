export type OutlineHeading = {
  level: 1 | 2 | 3;
  text: string;
  line: number;
  isLevelJump: boolean;
  previousLevel: number | null;
};

export type TextSelectionRange = {
  start: number;
  end: number;
};

function parseFence(line: string): { marker: '`' | '~'; size: number } | null {
  const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
  if (!match) return null;
  return { marker: match[2][0] as '`' | '~', size: match[2].length };
}

function headingText(line: string): string {
  return line
    .replace(/^#{1,3}(?:\s+|$)/, '')
    .replace(/\s+#+\s*$/, '')
    .trim() || 'Untitled heading';
}

/**
 * Extracts top-level ATX H1-H3 headings for the editor outline.
 * Front matter and fenced-code content are intentionally excluded.
 * This function is local-only and never sends document text anywhere.
 */
export function scanEditorOutline(source: string): OutlineHeading[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const headings: OutlineHeading[] = [];
  let frontMatterOpen = lines[0] === '---';
  let fence: { marker: '`' | '~'; size: number } | null = null;
  let previousLevel: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const isFrontMatterDelimiter = frontMatterOpen && index > 0 && /^(---|\.\.\.)\s*$/.test(line);

    if (frontMatterOpen) {
      if (isFrontMatterDelimiter) frontMatterOpen = false;
      continue;
    }

    const parsedFence = parseFence(line);
    if (parsedFence) {
      if (!fence) fence = parsedFence;
      else if (fence.marker === parsedFence.marker && parsedFence.size >= fence.size) fence = null;
      continue;
    }
    if (fence) continue;

    const match = /^(#{1,3})(?:\s|$)/.exec(line);
    if (!match) continue;

    const level = match[1].length as 1 | 2 | 3;
    headings.push({
      level,
      text: headingText(line),
      line: index + 1,
      isLevelJump: previousLevel !== null && level > previousLevel + 1,
      previousLevel,
    });
    previousLevel = level;
  }

  return headings;
}

/**
 * Returns the selection range of a one-indexed line in the original textarea value.
 * CRLF is preserved for offsets so the range can be passed directly to setSelectionRange.
 */
export function selectionRangeForLine(source: string, lineNumber: number): TextSelectionRange | null {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return null;

  let start = 0;
  for (let currentLine = 1; currentLine < lineNumber; currentLine += 1) {
    const newline = source.indexOf('\n', start);
    if (newline === -1) return null;
    start = newline + 1;
  }

  const newline = source.indexOf('\n', start);
  let end = newline === -1 ? source.length : newline;
  if (end > start && source[end - 1] === '\r') end -= 1;
  return { start, end };
}

/** Calculates a stable textarea scroll position with two context lines above the target. */
export function scrollTopForOutlineLine(lineNumber: number, lineHeight: number): number {
  return Math.max(0, (lineNumber - 3) * lineHeight);
}

/**
 * Focuses a textarea and selects the requested line. Returns false if the line no longer exists.
 * The caller owns rendering and analytics; this helper has no side effects beyond the local textarea.
 */
export function jumpTextareaToOutlineLine(textarea: HTMLTextAreaElement, lineNumber: number): boolean {
  const range = selectionRangeForLine(textarea.value, lineNumber);
  if (!range) return false;

  textarea.focus();
  textarea.setSelectionRange(range.start, range.end);
  const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 23;
  textarea.scrollTop = scrollTopForOutlineLine(lineNumber, lineHeight);
  return true;
}
