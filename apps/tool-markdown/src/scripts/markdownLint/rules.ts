import { lineRange, normalizeLineEndings, rangeFromOffsets, scanMarkdown, type LineContext, type ScanResult } from './scan';
import type { AnalysisResult, FormatterSettings, Issue, IssueTier, TextEdit } from './types';

function issueId(ruleId: string, line: number, column = 1): string {
  return `${ruleId}:${line}:${column}`;
}

function createIssue(options: Omit<Issue, 'id'> & { line: number; column?: number }): Issue {
  const { line, column = 1, ...issue } = options;
  return { ...issue, id: issueId(issue.ruleId, line, column) };
}

function canInspect(line: LineContext): boolean {
  return !line.isFrontMatter && !line.isInsideFence && !line.isFenceLine;
}

function isBlank(line: LineContext): boolean {
  return /^\s*$/.test(line.text);
}

function parseFence(line: LineContext): { marker: '`' | '~'; size: number; info: string } | null {
  const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line.text);
  if (!match) return null;
  return { marker: match[2][0] as '`' | '~', size: match[2].length, info: match[3].trim() };
}

type FencePair = { open: LineContext; close?: LineContext; info: string };

function getFencePairs(scan: ScanResult): FencePair[] {
  const pairs: FencePair[] = [];
  let open: { line: LineContext; marker: '`' | '~'; size: number; info: string } | null = null;

  for (const line of scan.lines) {
    if (line.isFrontMatter) continue;
    const fence = parseFence(line);
    if (!fence) continue;

    if (!open) {
      open = { line, ...fence };
      continue;
    }

    if (open.marker === fence.marker && fence.size >= open.size) {
      pairs.push({ open: open.line, close: line, info: open.info });
      open = null;
    }
  }

  if (open) pairs.push({ open: open.line, info: open.info });
  return pairs;
}

function normalizeHeadingText(text: string): string {
  return text
    .replace(/^#{1,6}\s*/, '')
    .replace(/\s+#+\s*$/, '')
    .trim()
    .toLowerCase();
}

function findAll(regex: RegExp, text: string): RegExpExecArray[] {
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    matches.push(match);
    if (!regex.global) break;
  }
  return matches;
}

function headingSpacing(scan: ScanResult): Issue[] {
  return scan.lines.flatMap((line) => {
    if (!canInspect(line)) return [];
    const match = /^(#{1,6})([ \t]*)(\S.*)$/.exec(line.text);
    if (!match || match[2] === ' ') return [];
    const startOffset = line.startOffset + match[1].length;
    const endOffset = startOffset + match[2].length;
    return [createIssue({
      line: line.lineNumber,
      column: match[1].length + 1,
      ruleId: 'MM101',
      tier: 'safe',
      title: 'Use one space after the heading marker',
      message: `Heading syntax on line ${line.lineNumber} should use one space after ${match[1]}.`,
      range: rangeFromOffsets(startOffset, endOffset, scan),
      edits: [{ startOffset, endOffset, replacement: ' ' }],
    })];
  });
}

function listMarkerSpacing(scan: ScanResult): Issue[] {
  return scan.lines.flatMap((line) => {
    if (!canInspect(line)) return [];
    const match = /^(\s*(?:[-+*]|\d+[.)]))([ \t]*)(\S.*)$/.exec(line.text);
    if (!match || match[2] === ' ') return [];
    const markerEnd = line.startOffset + match[1].length;
    return [createIssue({
      line: line.lineNumber,
      column: match[1].length + 1,
      ruleId: 'MM102',
      tier: 'safe',
      title: 'Use one space after the list marker',
      message: `List syntax on line ${line.lineNumber} should use one space after its marker.`,
      range: rangeFromOffsets(markerEnd, markerEnd + match[2].length, scan),
      edits: [{ startOffset: markerEnd, endOffset: markerEnd + match[2].length, replacement: ' ' }],
    })];
  });
}

function trailingWhitespace(scan: ScanResult): Issue[] {
  return scan.lines.flatMap((line) => {
    if (!canInspect(line)) return [];
    const match = /([ \t]+)$/.exec(line.text);
    if (!match) return [];
    const whitespace = match[1];
    const startOffset = line.endOffset - whitespace.length;

    if (whitespace === '  ') {
      return [createIssue({
        line: line.lineNumber,
        column: startOffset - line.startOffset + 1,
        ruleId: 'MM103',
        tier: 'review',
        title: 'Review a possible hard line break',
        message: `Line ${line.lineNumber} ends with two spaces, which may be an intentional Markdown line break.`,
        range: rangeFromOffsets(startOffset, line.endOffset, scan),
        suggestion: 'Keep it if you want a hard line break; otherwise remove the two spaces manually.',
      })];
    }

    return [createIssue({
      line: line.lineNumber,
      column: startOffset - line.startOffset + 1,
      ruleId: 'MM103',
      tier: 'safe',
      title: 'Remove accidental trailing whitespace',
      message: `Line ${line.lineNumber} ends with whitespace that does not affect Markdown output.`,
      range: rangeFromOffsets(startOffset, line.endOffset, scan),
      edits: [{ startOffset, endOffset: line.endOffset, replacement: '' }],
    })];
  });
}

function hardTabs(scan: ScanResult, settings: FormatterSettings): Issue[] {
  return scan.lines.flatMap((line) => {
    if (!canInspect(line) || !line.text.includes('\t')) return [];
    const trailingWhitespace = /[ \t]+$/.exec(line.text)?.[0] ?? '';
    const trailingStart = line.text.length - trailingWhitespace.length;
    const edits: TextEdit[] = findAll(/\t/g, line.text)
      .filter((match) => match.index < trailingStart)
      .map((match) => ({
        startOffset: line.startOffset + match.index,
        endOffset: line.startOffset + match.index + 1,
        replacement: ' '.repeat(settings.spacesPerTab),
      }));
    if (!edits.length) return [];
    return [createIssue({
      line: line.lineNumber,
      ruleId: 'MM104',
      tier: 'safe',
      title: 'Replace hard tabs outside code',
      message: `Line ${line.lineNumber} contains ${edits.length} hard tab${edits.length === 1 ? '' : 's'} outside a code block.`,
      range: lineRange(line, scan),
      edits,
    })];
  });
}

function extraBlankLines(scan: ScanResult): Issue[] {
  const issues: Issue[] = [];
  let runStart = -1;

  const flush = (endIndex: number) => {
    if (runStart === -1 || endIndex - runStart < 2) {
      runStart = -1;
      return;
    }
    const before = scan.lines[runStart - 1];
    const after = scan.lines[endIndex];
    const firstBlank = scan.lines[runStart];
    const secondBlank = scan.lines[runStart + 1];
    const lastBlank = scan.lines[endIndex - 1];

    if (!before || !after || !canInspect(before) || !canInspect(after) || !before.isTopLevel || !after.isTopLevel) {
      runStart = -1;
      return;
    }

    const startOffset = secondBlank.startOffset;
    const endOffset = lastBlank.endOffset + 1;
    issues.push(createIssue({
      line: secondBlank.lineNumber,
      ruleId: 'MM105',
      tier: 'safe',
      title: 'Collapse extra blank lines',
      message: `Lines ${firstBlank.lineNumber}-${lastBlank.lineNumber} contain extra empty lines.`,
      range: rangeFromOffsets(startOffset, endOffset, scan),
      edits: [{ startOffset, endOffset, replacement: '' }],
    }));
    runStart = -1;
  };

  for (let index = 0; index < scan.lines.length; index += 1) {
    const line = scan.lines[index];
    const eligible = canInspect(line) && line.isTopLevel && isBlank(line);
    if (eligible && runStart === -1) runStart = index;
    if (!eligible && runStart !== -1) flush(index);
  }
  flush(scan.lines.length);
  return issues;
}

function finalNewline(source: string, scan: ScanResult): Issue[] {
  if (!source || source.endsWith('\n')) return [];
  return [createIssue({
    line: scan.lines.at(-1)?.lineNumber ?? 1,
    ruleId: 'MM106',
    tier: 'safe',
    title: 'Add a final newline',
    message: 'Markdown files are easier to compare and combine when they end with one newline.',
    range: rangeFromOffsets(source.length, source.length, scan),
    edits: [{ startOffset: source.length, endOffset: source.length, replacement: '\n' }],
  })];
}

function fenceSpacing(scan: ScanResult): Issue[] {
  const issues: Issue[] = [];
  for (const pair of getFencePairs(scan)) {
    if (!pair.close || !pair.open.isTopLevel || !pair.close.isTopLevel) continue;
    const openIndex = pair.open.lineNumber - 1;
    const closeIndex = pair.close.lineNumber - 1;
    const before = scan.lines[openIndex - 1];
    const after = scan.lines[closeIndex + 1];

    if (before && canInspect(before) && !isBlank(before)) {
      issues.push(createIssue({
        line: pair.open.lineNumber,
        ruleId: 'MM107',
        tier: 'safe',
        title: 'Add a blank line before the code fence',
        message: `Add space before the code fence on line ${pair.open.lineNumber} for clearer Markdown structure.`,
        range: lineRange(pair.open, scan),
        edits: [{ startOffset: pair.open.startOffset, endOffset: pair.open.startOffset, replacement: '\n' }],
      }));
    }

    if (after && canInspect(after) && !isBlank(after)) {
      issues.push(createIssue({
        line: pair.close.lineNumber,
        ruleId: 'MM107',
        tier: 'safe',
        title: 'Add a blank line after the code fence',
        message: `Add space after the code fence on line ${pair.close.lineNumber} for clearer Markdown structure.`,
        range: lineRange(pair.close, scan),
        edits: [{ startOffset: pair.close.endOffset + 1, endOffset: pair.close.endOffset + 1, replacement: '\n' }],
      }));
    }
  }
  return issues;
}

function headingLevels(scan: ScanResult): Issue[] {
  const issues: Issue[] = [];
  let previousLevel: number | null = null;
  for (const line of scan.headings) {
    const level = /^#+/.exec(line.text)?.[0].length ?? 0;
    if (previousLevel !== null && level > previousLevel + 1) {
      issues.push(createIssue({
        line: line.lineNumber,
        ruleId: 'MM201',
        tier: 'review',
        title: 'Heading level skipped',
        message: `This H${level} follows H${previousLevel}. Check whether a heading level is missing.`,
        range: lineRange(line, scan),
        suggestion: 'Choose the level that matches the document structure; this tool does not infer it automatically.',
      }));
    }
    previousLevel = level;
  }
  return issues;
}

function multipleH1(scan: ScanResult): Issue[] {
  const h1s = scan.headings.filter((line) => /^#\s/.test(line.text));
  return h1s.slice(1).map((line) => createIssue({
    line: line.lineNumber,
    ruleId: 'MM202',
    tier: 'review',
    title: 'Multiple H1 headings',
    message: `This is H1 number ${h1s.indexOf(line) + 1} in the document.`,
    range: lineRange(line, scan),
    suggestion: 'A README or combined document may use several H1 headings intentionally; otherwise consider a lower-level heading.',
  }));
}

function duplicateHeadings(scan: ScanResult): Issue[] {
  const seen = new Map<string, LineContext>();
  const issues: Issue[] = [];
  for (const line of scan.headings) {
    const text = normalizeHeadingText(line.text);
    if (!text) continue;
    const earlier = seen.get(text);
    if (earlier) {
      issues.push(createIssue({
        line: line.lineNumber,
        ruleId: 'MM203',
        tier: 'review',
        title: 'Duplicate heading text',
        message: `“${text}” also appears as a heading on line ${earlier.lineNumber} and may create a duplicate anchor.`,
        range: lineRange(line, scan),
        suggestion: 'Keep it for repeated changelog sections, or make the heading more specific.',
      }));
    } else {
      seen.set(text, line);
    }
  }
  return issues;
}

function fenceLanguage(scan: ScanResult): Issue[] {
  return getFencePairs(scan)
    .filter((pair) => !pair.info && pair.open.isTopLevel)
    .map((pair) => createIssue({
      line: pair.open.lineNumber,
      ruleId: 'MM204',
      tier: 'review',
      title: 'Code fence has no language label',
      message: `The code fence on line ${pair.open.lineNumber} has no language label.`,
      range: lineRange(pair.open, scan),
      suggestion: 'Add a language such as bash, js, json, or text if it improves readability on your target platform.',
    }));
}

function missingImageAlt(scan: ScanResult): Issue[] {
  return scan.lines.flatMap((line) => {
    if (!canInspect(line)) return [];
    return findAll(/!\[\s*\]\([^)]*\)/g, line.text).map((match) => createIssue({
      line: line.lineNumber,
      column: match.index + 1,
      ruleId: 'MM205',
      tier: 'review',
      title: 'Image has no alt text',
      message: `The image on line ${line.lineNumber} has an empty description.`,
      range: rangeFromOffsets(line.startOffset + match.index, line.startOffset + match.index + match[0].length, scan),
      suggestion: 'Add concise alt text that describes the image’s purpose in this document.',
    }));
  });
}

function reversedLinks(scan: ScanResult): Issue[] {
  return scan.lines.flatMap((line) => {
    if (!canInspect(line)) return [];
    return findAll(/\([^()\n]+\)\[[^\]]+\]/g, line.text).map((match) => createIssue({
      line: line.lineNumber,
      column: match.index + 1,
      ruleId: 'MM206',
      tier: 'review',
      title: 'Possible reversed link syntax',
      message: `The text on line ${line.lineNumber} looks like a link with its label and URL reversed.`,
      range: rangeFromOffsets(line.startOffset + match.index, line.startOffset + match.index + match[0].length, scan),
      suggestion: 'Standard Markdown links use [label](URL). Check whether this pattern is intentional.',
    }));
  });
}

function inlineHtml(scan: ScanResult): Issue[] {
  return scan.lines.flatMap((line) => {
    if (!canInspect(line)) return [];
    return findAll(/<\/?[a-zA-Z][\w:-]*(?:\s[^>]*)?>/g, line.text).map((match) => createIssue({
      line: line.lineNumber,
      column: match.index + 1,
      ruleId: 'MM207',
      tier: 'review',
      title: 'Inline HTML detected',
      message: `Line ${line.lineNumber} contains inline HTML that may render differently across Markdown platforms.`,
      range: rangeFromOffsets(line.startOffset + match.index, line.startOffset + match.index + match[0].length, scan),
      suggestion: 'Check whether your publishing platform supports this HTML or replace it with Markdown syntax.',
    }));
  });
}

function unclosedFence(scan: ScanResult): Issue[] {
  const line = scan.unmatchedFenceStart;
  if (!line) return [];
  return [createIssue({
    line: line.lineNumber,
    ruleId: 'MM208',
    tier: 'review',
    title: 'Unclosed fenced code block',
    message: `The code fence opened on line ${line.lineNumber} does not have a matching closing fence.`,
    range: lineRange(line, scan),
    suggestion: 'Add a matching closing fence manually. The tool does not guess where your code block should end.',
  })];
}

export function analyzeMarkdown(input: string, settings: FormatterSettings): AnalysisResult {
  const sourceText = normalizeLineEndings(input);
  const scan = scanMarkdown(sourceText);
  const issues = [
    ...headingSpacing(scan),
    ...listMarkerSpacing(scan),
    ...trailingWhitespace(scan),
    ...hardTabs(scan, settings),
    ...extraBlankLines(scan),
    ...finalNewline(sourceText, scan),
    ...fenceSpacing(scan),
    ...headingLevels(scan),
    ...multipleH1(scan),
    ...duplicateHeadings(scan),
    ...fenceLanguage(scan),
    ...missingImageAlt(scan),
    ...reversedLinks(scan),
    ...inlineHtml(scan),
    ...unclosedFence(scan),
  ].sort((a, b) => a.range.start.offset - b.range.start.offset || a.ruleId.localeCompare(b.ruleId));

  return {
    sourceText,
    issues,
    stats: {
      characters: sourceText.length,
      lines: scan.lines.length,
      headings: scan.headings.length,
      fencedCodeBlocks: scan.fencedCodeBlocks,
    },
  };
}
