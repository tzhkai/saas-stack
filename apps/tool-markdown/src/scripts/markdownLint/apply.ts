import type { Issue, TextEdit } from './types';

export type DiffLine = {
  kind: 'context' | 'added' | 'removed';
  text: string;
  oldLine?: number;
  newLine?: number;
};

export function selectedSafeIssues(issues: Issue[], selectedIds: Set<string>): Issue[] {
  return issues.filter((issue) => issue.tier === 'safe' && selectedIds.has(issue.id) && issue.edits?.length);
}

function sortedEdits(issues: Issue[]): TextEdit[] {
  return issues
    .flatMap((issue) => issue.edits ?? [])
    .sort((a, b) => b.startOffset - a.startOffset || b.endOffset - a.endOffset);
}

function assertNoOverlaps(edits: TextEdit[]): void {
  for (let index = 0; index < edits.length - 1; index += 1) {
    const current = edits[index];
    const next = edits[index + 1];
    if (next.endOffset > current.startOffset) {
      throw new Error('Selected Markdown edits overlap and cannot be applied safely.');
    }
  }
}

export function applyIssueEdits(source: string, issues: Issue[]): string {
  const edits = sortedEdits(issues);
  assertNoOverlaps(edits);

  let output = source;
  for (const edit of edits) {
    output = `${output.slice(0, edit.startOffset)}${edit.replacement}${output.slice(edit.endOffset)}`;
  }
  return output;
}

function splitLines(text: string): string[] {
  return text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
}

/**
 * Produces a bounded, line-level review diff. The formatter only makes local
 * edits, so a compact prefix/suffix comparison is more legible than a large
 * generic diff dependency and keeps the entire feature offline.
 */
export function makeLineDiff(before: string, after: string): DiffLine[] {
  if (before === after) {
    return splitLines(before).map((text, index) => ({ kind: 'context', text, oldLine: index + 1, newLine: index + 1 }));
  }

  const oldLines = splitLines(before);
  const newLines = splitLines(after);
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) prefix += 1;

  let oldSuffix = oldLines.length - 1;
  let newSuffix = newLines.length - 1;
  while (oldSuffix >= prefix && newSuffix >= prefix && oldLines[oldSuffix] === newLines[newSuffix]) {
    oldSuffix -= 1;
    newSuffix -= 1;
  }

  const contextBefore = oldLines.slice(Math.max(0, prefix - 2), prefix).map((text, index) => ({
    kind: 'context' as const,
    text,
    oldLine: Math.max(0, prefix - 2) + index + 1,
    newLine: Math.max(0, prefix - 2) + index + 1,
  }));

  const removed = oldLines.slice(prefix, oldSuffix + 1).map((text, index) => ({
    kind: 'removed' as const,
    text,
    oldLine: prefix + index + 1,
  }));
  const added = newLines.slice(prefix, newSuffix + 1).map((text, index) => ({
    kind: 'added' as const,
    text,
    newLine: prefix + index + 1,
  }));

  const suffixStartOld = oldSuffix + 1;
  const suffixStartNew = newSuffix + 1;
  const contextAfter = oldLines.slice(suffixStartOld, suffixStartOld + 2).map((text, index) => ({
    kind: 'context' as const,
    text,
    oldLine: suffixStartOld + index + 1,
    newLine: suffixStartNew + index + 1,
  }));

  return [...contextBefore, ...removed, ...added, ...contextAfter];
}
