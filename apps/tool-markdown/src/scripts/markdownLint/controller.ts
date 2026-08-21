import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { applyIssueEdits, makeLineDiff, selectedSafeIssues } from './apply';
import { analyzeMarkdown } from './rules';
import { DEFAULT_FORMATTER_SETTINGS, type AnalysisResult, type FormatterSettings, type Issue } from './types';
import { getRuleHelp } from './ruleHelp';
import { EDITOR_HANDOFF_KEY, announceStatus, copyText, saveEditorHandoff, trackToolAction } from '../toolClient';

type ResultTab = 'diff' | 'formatted' | 'preview';
type Status = 'idle' | 'checking' | 'ready' | 'error';

type State = {
  sourceText: string;
  revision: number;
  status: Status;
  result: AnalysisResult | null;
  selectedSafeIssueIds: Set<string>;
  activeTab: ResultTab;
  settings: FormatterSettings;
  undoText: string | null;
  importedFrom: string | null;
  errorMessage: string | null;
  activeHelpIssueId: string | null;
  helpReturnIssueId: string | null;
};

export const MAX_MARKDOWN_LENGTH = 524_288;
const ANALYSIS_DELAY_MS = 400;
let interactionPendingAnalysis = false;

export const SAMPLE_MARKDOWN = [
  '#README draft',
  `A short project description.${'   '}`,
  '###Setup',
  '-item one',
  '-  item two',
  '',
  '',
  'Run this command:',
  '```',
  'npm install',
  '```',
  '![ ](preview.png)',
].join('\n');

const input = document.querySelector<HTMLTextAreaElement>('#markdown-input');
const stats = document.querySelector<HTMLOutputElement>('[data-document-stats]');
const summary = document.querySelector<HTMLElement>('[data-summary]');
const issuesRoot = document.querySelector<HTMLElement>('[data-issues]');
const resultPanel = document.querySelector<HTMLElement>('[data-result-panel]');
const statusMessage = document.querySelector<HTMLElement>('[data-tool-status]');
const sourceBar = document.querySelector<HTMLElement>('[data-source-bar]');
const applyButton = document.querySelector<HTMLButtonElement>('[data-action="apply"]');
const copyButton = document.querySelector<HTMLButtonElement>('[data-action="copy"]');
const undoButton = document.querySelector<HTMLButtonElement>('[data-action="undo"]');
const openEditorButton = document.querySelector<HTMLButtonElement>('[data-action="open-editor"]');
const sampleButton = document.querySelector<HTMLButtonElement>('[data-action="load-sample"]');
const clearButton = document.querySelector<HTMLButtonElement>('[data-action="clear"]');
const importButton = document.querySelector<HTMLButtonElement>('[data-action="import"]');
const fileInput = document.querySelector<HTMLInputElement>('#markdown-file-input');
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-tab]'));
const ruleHelpDrawer = document.querySelector<HTMLElement>('[data-rule-help]');
const ruleHelpTier = document.querySelector<HTMLElement>('[data-rule-help-tier]');
const ruleHelpTitle = document.querySelector<HTMLElement>('[data-rule-help-title]');
const ruleHelpWhy = document.querySelector<HTMLElement>('[data-rule-help-why]');
const ruleHelpBoundary = document.querySelector<HTMLElement>('[data-rule-help-boundary]');
const ruleHelpBefore = document.querySelector<HTMLElement>('[data-rule-help-before]');
const ruleHelpAfterLabel = document.querySelector<HTMLElement>('[data-rule-help-after-label]');
const ruleHelpAfterWrap = document.querySelector<HTMLElement>('[data-rule-help-after-wrap]');
const ruleHelpAfter = document.querySelector<HTMLElement>('[data-rule-help-after]');
const ruleHelpReview = document.querySelector<HTMLElement>('[data-rule-help-review]');
const ruleHelpGoToLine = document.querySelector<HTMLButtonElement>('[data-action="rule-help-go-to-line"]');
const ruleHelpCloseButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action="close-rule-help"]'));

let debounceTimer: number | undefined;

marked.setOptions({ breaks: true, gfm: true });

function readEditorHandoff(): { markdown: string; source: string } | null {
  try {
    const raw = sessionStorage.getItem(EDITOR_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(EDITOR_HANDOFF_KEY);
    const handoff = JSON.parse(raw) as { markdown?: unknown; source?: unknown; createdAt?: unknown };
    const age = Date.now() - Number(handoff.createdAt || 0);
    if (typeof handoff.markdown !== 'string' || handoff.markdown.length > MAX_MARKDOWN_LENGTH || age < 0 || age >= 900_000) return null;
    return { markdown: handoff.markdown, source: typeof handoff.source === 'string' ? handoff.source : 'a Markdown workflow' };
  } catch {
    return null;
  }
}

const handoff = readEditorHandoff();
let state: State = {
  sourceText: handoff?.markdown ?? '',
  revision: 0,
  status: handoff?.markdown ? 'checking' : 'idle',
  result: null,
  selectedSafeIssueIds: new Set(),
  activeTab: 'diff',
  settings: DEFAULT_FORMATTER_SETTINGS,
  undoText: null,
  importedFrom: handoff?.source ?? null,
  errorMessage: null,
  activeHelpIssueId: null,
  helpReturnIssueId: null,
};

function selectedIssues(): Issue[] {
  return state.result ? selectedSafeIssues(state.result.issues, state.selectedSafeIssueIds) : [];
}

function formattedOutput(): string {
  if (!state.result || state.result.sourceText !== state.sourceText) return state.sourceText;
  return applyIssueEdits(state.sourceText, selectedIssues());
}

function escapeText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] ?? character));
}

function renderIssues(issues: Issue[]): void {
  if (!issuesRoot) return;
  if (!issues.length) {
    issuesRoot.innerHTML = state.sourceText.trim()
      ? '<p class="issues-empty">No selected checks found a formatting issue in this Markdown.</p>'
      : '<div class="issues-empty issues-empty--start"><strong>Start a local Markdown check</strong><span>Paste Markdown, import a local file, or try the README example. Safe fixes stay reviewable, and structural choices remain yours.</span></div>';
    return;
  }

  const groups: Array<[string, Issue[]]> = [
    ['Safe fixes', issues.filter((issue) => issue.tier === 'safe')],
    ['Review needed', issues.filter((issue) => issue.tier === 'review')],
  ];

  issuesRoot.innerHTML = groups
    .filter(([, groupIssues]) => groupIssues.length)
    .map(([label, groupIssues]) => `
      <section class="issue-group" aria-label="${label}">
        <h3>${label} <span>${groupIssues.length}</span></h3>
        ${groupIssues.map((issue) => {
          const selected = state.selectedSafeIssueIds.has(issue.id);
          const control = issue.tier === 'safe'
            ? `<input type="checkbox" data-issue-id="${issue.id}" ${selected ? 'checked' : ''} aria-label="Apply ${escapeText(issue.title)}">`
            : '<span class="issue-review-dot" aria-hidden="true"></span>';
          return `<article class="issue issue--${issue.tier}" data-line="${issue.range.start.line}" tabindex="0">
              <div class="issue-control">${control}</div>
              <div class="issue-copy">
                <p class="issue-title"><code>${issue.ruleId}</code> ${escapeText(issue.title)}</p>
                <p>${escapeText(issue.message)}</p>
                ${issue.suggestion ? `<p class="issue-suggestion">${escapeText(issue.suggestion)}</p>` : ''}
                <button type="button" class="issue-help" data-rule-help-id="${escapeText(issue.id)}" aria-label="Explain Markdown rule ${escapeText(issue.ruleId)}">Why?</button>
              </div>
              <span class="issue-line">Line ${issue.range.start.line}</span>
            </article>`;
        }).join('')}
      </section>`)
    .join('');
}

function activeHelpIssue(): Issue | null {
  if (!state.activeHelpIssueId || !state.result) return null;
  return state.result.issues.find((issue) => issue.id === state.activeHelpIssueId) ?? null;
}

function renderRuleHelp(): void {
  if (!ruleHelpDrawer) return;
  const issue = activeHelpIssue();
  ruleHelpDrawer.hidden = !issue;
  if (!issue) return;

  const help = getRuleHelp(issue.ruleId);
  if (!help) {
    ruleHelpDrawer.hidden = true;
    return;
  }

  if (ruleHelpTier) ruleHelpTier.textContent = issue.tier === 'safe' ? 'Safe fix · review before applying' : 'Review needed · author decision';
  if (ruleHelpTitle) ruleHelpTitle.textContent = `${help.ruleId} · ${help.title}`;
  if (ruleHelpWhy) ruleHelpWhy.textContent = help.why;
  if (ruleHelpBoundary) ruleHelpBoundary.textContent = help.boundary;
  if (ruleHelpBefore) ruleHelpBefore.textContent = help.before;

  const showAfter = issue.tier === 'safe' && Boolean(help.after);
  if (ruleHelpAfterLabel) ruleHelpAfterLabel.hidden = !showAfter;
  if (ruleHelpAfterWrap) ruleHelpAfterWrap.hidden = !showAfter;
  if (ruleHelpAfter) ruleHelpAfter.textContent = showAfter ? help.after ?? '' : '';

  const reviewText = issue.suggestion || (issue.tier === 'review' ? help.reviewNote ?? '' : '');
  if (ruleHelpReview) {
    ruleHelpReview.hidden = !reviewText;
    ruleHelpReview.textContent = reviewText;
  }
}

function closeRuleHelp(restoreFocus = true): void {
  const returnIssueId = state.helpReturnIssueId;
  state = { ...state, activeHelpIssueId: null, helpReturnIssueId: null };
  renderRuleHelp();
  if (!restoreFocus || !returnIssueId || !issuesRoot) return;
  const button = Array.from(issuesRoot.querySelectorAll<HTMLButtonElement>('[data-rule-help-id]'))
    .find((candidate) => candidate.dataset.ruleHelpId === returnIssueId);
  button?.focus();
}

function renderResult(): void {
  if (!resultPanel) return;
  const output = formattedOutput();
  if (state.activeTab === 'formatted') {
    resultPanel.className = 'result-panel result-panel--formatted';
    resultPanel.textContent = output || 'Formatted Markdown will appear here.';
    return;
  }
  if (state.activeTab === 'preview') {
    resultPanel.className = 'result-panel result-panel--preview';
    if (!output.trim()) {
      resultPanel.textContent = 'A safe local preview will appear here.';
      return;
    }
    resultPanel.innerHTML = DOMPurify.sanitize(marked.parse(output) as string, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['img', 'audio', 'video', 'source', 'iframe', 'object', 'embed', 'link', 'style'],
    });
    resultPanel.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
      link.rel = 'noopener noreferrer';
      link.target = '_blank';
    });
    return;
  }

  const diff = makeLineDiff(state.sourceText, output);
  resultPanel.className = 'result-panel result-panel--diff';
  resultPanel.replaceChildren(...diff.map((line) => {
    const row = document.createElement('div');
    row.className = `diff-line diff-line--${line.kind}`;
    const oldLine = document.createElement('span');
    oldLine.className = 'diff-number';
    oldLine.textContent = line.oldLine ? String(line.oldLine) : '';
    const newLine = document.createElement('span');
    newLine.className = 'diff-number';
    newLine.textContent = line.newLine ? String(line.newLine) : '';
    const marker = document.createElement('span');
    marker.className = 'diff-marker';
    marker.textContent = line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' ';
    const text = document.createElement('span');
    text.className = 'diff-text';
    text.textContent = line.text || ' ';
    row.append(oldLine, newLine, marker, text);
    return row;
  }));
}

function render(): void {
  const safeCount = state.result?.issues.filter((issue) => issue.tier === 'safe').length ?? 0;
  const reviewCount = state.result?.issues.filter((issue) => issue.tier === 'review').length ?? 0;

  if (stats) {
    const lineCount = state.result?.stats.lines ?? (state.sourceText ? state.sourceText.split('\n').length : 0);
    const headingCount = state.result?.stats.headings ?? 0;
    const fenceCount = state.result?.stats.fencedCodeBlocks ?? 0;
    stats.textContent = `${state.sourceText.length.toLocaleString()} characters · ${lineCount.toLocaleString()} lines · ${headingCount} headings · ${fenceCount} code blocks`;
  }

  if (sourceBar) {
    sourceBar.hidden = !state.importedFrom;
    sourceBar.textContent = state.importedFrom ? `Imported locally from ${state.importedFrom}.` : '';
  }

  if (summary) {
    if (state.status === 'idle') summary.textContent = 'Paste Markdown, import a local file, or load the example to begin.';
    else if (state.status === 'checking') summary.textContent = 'Checking Markdown locally…';
    else if (state.status === 'error') summary.textContent = state.errorMessage ?? 'The document could not be checked.';
    else if (!safeCount && !reviewCount) summary.textContent = 'No selected checks found a formatting issue.';
    else summary.textContent = `${safeCount} safe ${safeCount === 1 ? 'fix' : 'fixes'} ready · ${reviewCount} ${reviewCount === 1 ? 'item' : 'items'} need review`;
  }

  renderIssues(state.status === 'ready' ? state.result?.issues ?? [] : []);
  renderRuleHelp();
  renderResult();

  if (applyButton) applyButton.disabled = !selectedIssues().length || state.status !== 'ready';
  if (copyButton) copyButton.disabled = !state.sourceText.trim() || state.status === 'checking';
  if (undoButton) undoButton.disabled = state.undoText === null || state.status === 'checking';
  tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.tab === state.activeTab)));
}

function analyze(text: string, revision: number): void {
  try {
    const result = analyzeMarkdown(text, state.settings);
    if (revision !== state.revision || text !== state.sourceText) return;
    state = {
      ...state,
      status: 'ready',
      result,
      selectedSafeIssueIds: new Set(result.issues.filter((issue) => issue.tier === 'safe' && issue.edits?.length).map((issue) => issue.id)),
      errorMessage: null,
      activeHelpIssueId: null,
      helpReturnIssueId: null,
    };
    render();
    if (interactionPendingAnalysis) {
      interactionPendingAnalysis = false;
      trackToolAction('markdown-linter', 'check_complete');
    }
  } catch {
    if (revision !== state.revision) return;
    state = { ...state, status: 'error', errorMessage: 'The document could not be checked. Your text is still available.', activeHelpIssueId: null, helpReturnIssueId: null };
    render();
  }
}

function scheduleAnalysis(text: string): void {
  window.clearTimeout(debounceTimer);
  if (!text.trim()) {
    state = { ...state, status: 'idle', result: null, selectedSafeIssueIds: new Set(), errorMessage: null, activeHelpIssueId: null, helpReturnIssueId: null };
    render();
    return;
  }
  const revision = state.revision;
  debounceTimer = window.setTimeout(() => analyze(text, revision), ANALYSIS_DELAY_MS);
}

function updateInput(nextText: string, importedFrom: string | null = null, initiatedByUser = true): void {
  if (nextText.length > MAX_MARKDOWN_LENGTH) {
    state = { ...state, status: 'error', errorMessage: 'This tool checks up to 512 KiB at a time.', activeHelpIssueId: null, helpReturnIssueId: null };
    render();
    return;
  }
  if (initiatedByUser && nextText.trim()) interactionPendingAnalysis = true;
  state = {
    ...state,
    sourceText: nextText.replace(/\r\n?/g, '\n'),
    revision: state.revision + 1,
    status: nextText.trim() ? 'checking' : 'idle',
    importedFrom,
    errorMessage: null,
    activeHelpIssueId: null,
    helpReturnIssueId: null,
  };
  render();
  scheduleAnalysis(state.sourceText);
}

function focusIssueLine(lineNumber: number): void {
  if (!input) return;
  const lines = input.value.split('\n');
  const start = lines.slice(0, Math.max(0, lineNumber - 1)).join('\n').length + (lineNumber > 1 ? 1 : 0);
  input.focus();
  input.setSelectionRange(start, start + (lines[lineNumber - 1]?.length ?? 0));
}

input?.addEventListener('input', () => updateInput(input.value, null));
issuesRoot?.addEventListener('change', (event) => {
  const checkbox = (event.target as HTMLElement).closest<HTMLInputElement>('input[data-issue-id]');
  if (!checkbox) return;
  const next = new Set(state.selectedSafeIssueIds);
  checkbox.checked ? next.add(checkbox.dataset.issueId ?? '') : next.delete(checkbox.dataset.issueId ?? '');
  state = { ...state, selectedSafeIssueIds: next };
  render();
});
issuesRoot?.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const helpButton = target.closest<HTMLButtonElement>('[data-rule-help-id]');
  if (helpButton) {
    const issueId = helpButton.dataset.ruleHelpId ?? '';
    state = { ...state, activeHelpIssueId: issueId, helpReturnIssueId: issueId };
    renderRuleHelp();
    trackToolAction('markdown-linter', 'open_rule_help');
    return;
  }
  const row = target.closest<HTMLElement>('[data-line]');
  if (row && !target.matches('input, button')) focusIssueLine(Number(row.dataset.line));
});
issuesRoot?.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && !(event.target as HTMLElement).matches('input, button')) {
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-line]');
    if (row) {
      event.preventDefault();
      focusIssueLine(Number(row.dataset.line));
    }
  }
});

ruleHelpGoToLine?.addEventListener('click', () => {
  const issue = activeHelpIssue();
  if (!issue) return;
  closeRuleHelp(false);
  focusIssueLine(issue.range.start.line);
  trackToolAction('markdown-linter', 'rule_help_go_to_line');
});
ruleHelpCloseButtons.forEach((button) => button.addEventListener('click', () => closeRuleHelp()));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.activeHelpIssueId) {
    event.preventDefault();
    closeRuleHelp();
  }
});

tabs.forEach((tab) => tab.addEventListener('click', () => {
  const nextTab = tab.dataset.tab;
  if (nextTab === 'diff' || nextTab === 'formatted' || nextTab === 'preview') {
    state = { ...state, activeTab: nextTab };
    render();
    trackToolAction('markdown-linter', nextTab === 'formatted' ? 'view_formatted' : nextTab === 'preview' ? 'view_preview' : 'view_diff');
  }
}));

applyButton?.addEventListener('click', () => {
  if (!state.result || state.status !== 'ready') return;
  const output = formattedOutput();
  if (output === state.sourceText) return;
  const previous = state.sourceText;
  input!.value = output;
  state = { ...state, sourceText: output, revision: state.revision + 1, undoText: previous, status: 'checking', result: null, selectedSafeIssueIds: new Set(), activeHelpIssueId: null, helpReturnIssueId: null };
  announceStatus(statusMessage, 'Applied selected safe fixes. You can undo this change.', 'success');
  render();
  trackToolAction('markdown-linter', 'apply_selected');
  scheduleAnalysis(output);
});

undoButton?.addEventListener('click', () => {
  if (state.undoText === null || !input) return;
  const restored = state.undoText;
  input.value = restored;
  state = { ...state, sourceText: restored, revision: state.revision + 1, undoText: null, status: 'checking', result: null, selectedSafeIssueIds: new Set(), activeHelpIssueId: null, helpReturnIssueId: null };
  announceStatus(statusMessage, 'Restored the text from before the last apply.', 'success');
  render();
  scheduleAnalysis(restored);
});

copyButton?.addEventListener('click', async () => {
  const copied = await copyText(formattedOutput());
  announceStatus(statusMessage, copied ? 'Copied formatted Markdown.' : 'Clipboard access was blocked. Select the result and copy it manually.', copied ? 'success' : 'error');
  if (copied) trackToolAction('markdown-linter', 'copy_formatted');
});

openEditorButton?.addEventListener('click', () => {
  const output = formattedOutput();
  if (!output.trim()) {
    announceStatus(statusMessage, 'Write Markdown before opening the editor.', 'error');
    return;
  }
  if (!saveEditorHandoff(output, 'formatter-linter')) {
    announceStatus(statusMessage, 'Could not prepare the editor handoff. Copy the Markdown instead.', 'error');
    return;
  }
  trackToolAction('markdown-linter', 'open_editor');
  window.location.assign('/editor/?from=formatter-linter');
});

sampleButton?.addEventListener('click', () => {
  if (!input) return;
  input.value = SAMPLE_MARKDOWN;
  updateInput(SAMPLE_MARKDOWN, 'the built-in README example');
  trackToolAction('markdown-linter', 'load_example');
});

clearButton?.addEventListener('click', () => {
  if (!input) return;
  input.value = '';
  updateInput('', null, false);
  interactionPendingAnalysis = false;
  input.focus();
  trackToolAction('markdown-linter', 'clear_input');
});

importButton?.addEventListener('click', () => fileInput?.click());
fileInput?.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const allowed = ['text/markdown', 'text/plain', ''];
  const extension = file.name.toLowerCase().match(/\.(md|markdown|mdx)$/)?.[1];
  if (!extension || !allowed.includes(file.type)) {
    announceStatus(statusMessage, 'Choose a .md, .markdown, or .mdx file.', 'error');
    fileInput.value = '';
    return;
  }
  if (file.size > MAX_MARKDOWN_LENGTH) {
    announceStatus(statusMessage, 'This tool checks local files up to 512 KiB.', 'error');
    fileInput.value = '';
    return;
  }
  try {
    const content = await file.text();
    if (!input) return;
    input.value = content;
    updateInput(content, 'a local Markdown file');
    trackToolAction('markdown-linter', 'import_local_file');
  } catch {
    announceStatus(statusMessage, 'The local file could not be read. Your current text has not changed.', 'error');
  } finally {
    fileInput.value = '';
  }
});

if (input) input.value = state.sourceText;
render();
if (state.sourceText.trim()) {
  interactionPendingAnalysis = Boolean(handoff);
  scheduleAnalysis(state.sourceText);
}
trackToolAction('markdown-linter', 'open');
