import { trackFixedToolAction } from './toolClient';

/**
 * Decision Helper privacy contract
 * - It accepts only fixed goal/scenario enums; it has no text input or file input.
 * - It never writes to storage, URL parameters, or a network API.
 * - Optional analytics use only the fixed action names below and this fixed source.
 */
export const DECISION_HELPER_SOURCE = 'blog-formatter-vs-linter' as const;
export const DECISION_HELPER_TOOL = 'formatter-vs-linter-guide' as const;

export const CHECK_GOALS = ['format', 'lint', 'both'] as const;
export type CheckGoal = typeof CHECK_GOALS[number];

export const DOCUMENT_SCENARIOS = ['readme', 'api-docs', 'release-notes'] as const;
export type DocumentScenario = typeof DOCUMENT_SCENARIOS[number];

export type DecisionState = Readonly<{
  goal: CheckGoal | null;
  scenario: DocumentScenario | null;
  started: boolean;
}>;

export type DecisionEvent =
  | { type: 'SELECT_GOAL'; goal: CheckGoal }
  | { type: 'SELECT_SCENARIO'; scenario: DocumentScenario }
  | { type: 'RESET' };

export type Decision = Readonly<{
  title: string;
  summary: string;
  steps: readonly string[];
  primaryHref: string;
  primaryLabel: string;
  primaryAction: 'article_open_linter';
  secondaryHref: string;
  secondaryLabel: string;
  secondaryAction: 'article_open_editor' | 'article_open_docs';
}>;

export type ScenarioContent = Readonly<{
  label: string;
  checklist: readonly string[];
  templateHref: string;
  templateLabel: string;
}>;

export const INITIAL_DECISION_STATE: DecisionState = Object.freeze({
  goal: null,
  scenario: null,
  started: false,
});

const LINTER_HREF = '/tools/markdown-linter/?from=blog-formatter-vs-linter';
const EDITOR_HREF = '/editor/?from=blog-formatter-vs-linter';

export const DECISIONS: Readonly<Record<CheckGoal, Decision>> = Object.freeze({
  format: {
    title: 'Start with a formatter',
    summary: 'Your source looks uneven, but the document structure already makes sense. Review predictable spacing and whitespace changes before you copy or commit.',
    steps: Object.freeze([
      'Paste Markdown or load a local file.',
      'Review selected Safe fixes in Diff.',
      'Preview the formatted result before applying it.',
    ]),
    primaryHref: `${LINTER_HREF}#safe-fixes`,
    primaryLabel: 'Review local formatting',
    primaryAction: 'article_open_linter',
    secondaryHref: EDITOR_HREF,
    secondaryLabel: 'Continue editing',
    secondaryAction: 'article_open_editor',
  },
  lint: {
    title: 'Start with a linter review',
    summary: 'You need to inspect questions about structure, code blocks, images, or links. Keep the final decision with the author.',
    steps: Object.freeze([
      'Paste Markdown or load a local file.',
      'Open Why? for a finding that needs context.',
      'Jump to the line and make the editorial decision.',
    ]),
    primaryHref: `${LINTER_HREF}#review-needed`,
    primaryLabel: 'Review Markdown rules',
    primaryAction: 'article_open_linter',
    secondaryHref: '/docs/#document-titles-and-headings',
    secondaryLabel: 'Read heading guidance',
    secondaryAction: 'article_open_docs',
  },
  both: {
    title: 'Use both, in order',
    summary: 'Format predictable syntax first, then review structural findings that depend on your document’s meaning.',
    steps: Object.freeze([
      'Review selected Safe fixes in Diff.',
      'Read the Review needed findings before changing structure.',
      'Preview, then continue in the editor if you need more work.',
    ]),
    primaryHref: LINTER_HREF,
    primaryLabel: 'Run a local release check',
    primaryAction: 'article_open_linter',
    secondaryHref: EDITOR_HREF,
    secondaryLabel: 'Open the editor',
    secondaryAction: 'article_open_editor',
  },
});

export const SCENARIO_CONTENT: Readonly<Record<DocumentScenario, ScenarioContent>> = Object.freeze({
  readme: {
    label: 'README',
    checklist: Object.freeze([
      'Use one clear document title and a readable heading hierarchy.',
      'Keep list and heading markers consistent in the source.',
      'Add a language label when it makes a code example easier to scan.',
      'Write useful alt text for images that communicate information.',
    ]),
    templateHref: '/templates/github-readme-template/',
    templateLabel: 'Open the GitHub README template',
  },
  'api-docs': {
    label: 'API documentation',
    checklist: Object.freeze([
      'Keep endpoint sections and parameter headings easy to navigate.',
      'Use labelled code fences for request and response examples.',
      'Check that tables and lists remain readable in plain Markdown.',
      'Review links and duplicate headings before publishing.',
    ]),
    templateHref: '/templates/api-parameter-documentation-template/',
    templateLabel: 'Start API documentation',
  },
  'release-notes': {
    label: 'Release notes',
    checklist: Object.freeze([
      'Use a release title and consistent change-category headings.',
      'Keep bullets, blank lines, and whitespace easy to review in a diff.',
      'Label command examples when the language is known.',
      'Preview the final list before copying it into a release.',
    ]),
    templateHref: '/templates/release-notes-template/',
    templateLabel: 'Use the release-notes template',
  },
});

export const EVENT_ACTIONS = Object.freeze({
  visible: 'decision_helper_visible',
  started: 'decision_helper_started',
  format: 'decision_path_formatter',
  lint: 'decision_path_linter',
  both: 'decision_path_both',
  readme: 'decision_scenario_readme',
  'api-docs': 'decision_scenario_api_docs',
  'release-notes': 'decision_scenario_release_notes',
  resultShown: 'decision_helper_result_shown',
} as const);

export type DecisionAnalyticsAction =
  | typeof EVENT_ACTIONS.visible
  | typeof EVENT_ACTIONS.started
  | typeof EVENT_ACTIONS.format
  | typeof EVENT_ACTIONS.lint
  | typeof EVENT_ACTIONS.both
  | typeof EVENT_ACTIONS.readme
  | typeof EVENT_ACTIONS['api-docs']
  | typeof EVENT_ACTIONS['release-notes']
  | typeof EVENT_ACTIONS.resultShown
  | Decision['primaryAction']
  | Decision['secondaryAction']
  | 'article_open_template';

export const DECISION_ANALYTICS_ACTIONS: ReadonlySet<DecisionAnalyticsAction> = new Set([
  EVENT_ACTIONS.visible,
  EVENT_ACTIONS.started,
  EVENT_ACTIONS.format,
  EVENT_ACTIONS.lint,
  EVENT_ACTIONS.both,
  EVENT_ACTIONS.readme,
  EVENT_ACTIONS['api-docs'],
  EVENT_ACTIONS['release-notes'],
  EVENT_ACTIONS.resultShown,
  'article_open_linter',
  'article_open_editor',
  'article_open_docs',
  'article_open_template',
]);

function isDecisionAnalyticsAction(value: string | undefined): value is DecisionAnalyticsAction {
  return Boolean(value && DECISION_ANALYTICS_ACTIONS.has(value as DecisionAnalyticsAction));
}

function isCheckGoal(value: string | undefined): value is CheckGoal {
  return Boolean(value && (CHECK_GOALS as readonly string[]).includes(value));
}

function isDocumentScenario(value: string | undefined): value is DocumentScenario {
  return Boolean(value && (DOCUMENT_SCENARIOS as readonly string[]).includes(value));
}

/**
 * Pure finite-state reducer. A scenario cannot be selected before a goal.
 * Selecting a new goal keeps the scenario: the reader may compare decisions
 * without having to reselect the document type.
 */
export function reduceDecisionState(state: DecisionState, event: DecisionEvent): DecisionState {
  switch (event.type) {
    case 'SELECT_GOAL':
      return Object.freeze({ goal: event.goal, scenario: state.scenario, started: true });
    case 'SELECT_SCENARIO':
      return state.goal
        ? Object.freeze({ goal: state.goal, scenario: event.scenario, started: true })
        : state;
    case 'RESET':
      return INITIAL_DECISION_STATE;
  }
}

export function decisionForGoal(goal: CheckGoal | null): Decision | null {
  return goal ? DECISIONS[goal] : null;
}

export function scenarioFor(state: DecisionState): ScenarioContent | null {
  return state.scenario ? SCENARIO_CONTENT[state.scenario] : null;
}

function track(action: DecisionAnalyticsAction): void {
  trackFixedToolAction(DECISION_HELPER_TOOL, action, DECISION_HELPER_SOURCE);
}

function textElement(tagName: 'li' | 'p', text: string): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  return element;
}

function replaceTextList(list: HTMLElement | null, items: readonly string[]): void {
  if (!list) return;
  list.replaceChildren(...items.map((item) => textElement('li', item)));
}

function setLink(link: HTMLAnchorElement | null, href: string, label: string, action: DecisionAnalyticsAction): void {
  if (!link) return;
  link.href = href;
  link.textContent = label;
  link.dataset.decisionAction = action;
  link.hidden = false;
}

function clearLink(link: HTMLAnchorElement | null): void {
  if (!link) return;
  link.removeAttribute('href');
  link.removeAttribute('data-decision-action');
  link.textContent = '';
  link.hidden = true;
}

export type DecisionHelperController = Readonly<{
  getState: () => DecisionState;
  dispatch: (event: DecisionEvent) => void;
  destroy: () => void;
}>;

/**
 * DOM contract expected from the Astro article page:
 *
 * <section data-decision-helper>
 *   <button data-decision-goal="format">…</button>
 *   <button data-decision-scenario="readme">…</button>
 *   <div data-decision-result hidden>
 *     <h3 data-decision-title></h3>
 *     <p data-decision-summary></p>
 *     <ol data-decision-steps></ol>
 *     <section data-decision-scenario-result hidden>
 *       <h4 data-decision-scenario-title></h4>
 *       <ul data-decision-checklist></ul>
 *       <a data-decision-template hidden></a>
 *     </section>
 *     <a data-decision-primary hidden></a>
 *     <a data-decision-secondary hidden></a>
 *   </div>
 *   <p data-decision-status aria-live="polite"></p>
 * </section>
 */
export function mountMarkdownDecisionHelper(root: HTMLElement): DecisionHelperController {
  const goalButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-decision-goal]'));
  const scenarioButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-decision-scenario]'));
  const result = root.querySelector<HTMLElement>('[data-decision-result]');
  const title = root.querySelector<HTMLElement>('[data-decision-title]');
  const summary = root.querySelector<HTMLElement>('[data-decision-summary]');
  const steps = root.querySelector<HTMLElement>('[data-decision-steps]');
  const scenarioResult = root.querySelector<HTMLElement>('[data-decision-scenario-result]');
  const scenarioTitle = root.querySelector<HTMLElement>('[data-decision-scenario-title]');
  const checklist = root.querySelector<HTMLElement>('[data-decision-checklist]');
  const template = root.querySelector<HTMLAnchorElement>('[data-decision-template]');
  const primary = root.querySelector<HTMLAnchorElement>('[data-decision-primary]');
  const secondary = root.querySelector<HTMLAnchorElement>('[data-decision-secondary]');
  const status = root.querySelector<HTMLElement>('[data-decision-status]');

  let state: DecisionState = INITIAL_DECISION_STATE;
  let resultShownTracked = false;

  function render(): void {
    const decision = decisionForGoal(state.goal);
    const scenario = scenarioFor(state);

    goalButtons.forEach((button) => {
      const selected = button.dataset.decisionGoal === state.goal;
      button.setAttribute('aria-pressed', String(selected));
      button.dataset.selected = String(selected);
    });

    scenarioButtons.forEach((button) => {
      const enabled = Boolean(state.goal);
      const selected = button.dataset.decisionScenario === state.scenario;
      button.disabled = !enabled;
      button.setAttribute('aria-pressed', String(selected));
      button.dataset.selected = String(selected);
    });

    if (!decision) {
      result?.setAttribute('hidden', '');
      scenarioResult?.setAttribute('hidden', '');
      clearLink(primary);
      clearLink(secondary);
      if (status) status.textContent = 'Choose what you need to do first.';
      return;
    }

    result?.removeAttribute('hidden');
    if (title) title.textContent = decision.title;
    if (summary) summary.textContent = decision.summary;
    replaceTextList(steps, decision.steps);
    setLink(primary, decision.primaryHref, decision.primaryLabel, decision.primaryAction);
    setLink(secondary, decision.secondaryHref, decision.secondaryLabel, decision.secondaryAction);

    if (scenario) {
      scenarioResult?.removeAttribute('hidden');
      if (scenarioTitle) scenarioTitle.textContent = `${scenario.label} release-ready checklist`;
      replaceTextList(checklist, scenario.checklist);
      setLink(template, scenario.templateHref, scenario.templateLabel, 'article_open_template');
      if (status) status.textContent = `${decision.title}. Showing a ${scenario.label} checklist.`;
    } else {
      scenarioResult?.setAttribute('hidden', '');
      clearLink(template);
      if (status) status.textContent = `${decision.title}. Choose a document type for a focused checklist.`;
    }
  }

  function dispatch(event: DecisionEvent): void {
    const wasStarted = state.started;
    const previousGoal = state.goal;
    const previousScenario = state.scenario;
    state = reduceDecisionState(state, event);

    if (event.type === 'SELECT_GOAL' && !wasStarted) track(EVENT_ACTIONS.started);
    if (event.type === 'SELECT_GOAL' && state.goal !== previousGoal && state.goal) track(EVENT_ACTIONS[state.goal]);
    if (event.type === 'SELECT_SCENARIO' && state.scenario !== previousScenario && state.scenario) {
      track(EVENT_ACTIONS[state.scenario]);
      if (!resultShownTracked) {
        track(EVENT_ACTIONS.resultShown);
        resultShownTracked = true;
      }
    }

    render();
  }

  function onClick(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const goalButton = target.closest<HTMLButtonElement>('[data-decision-goal]');
    if (goalButton && root.contains(goalButton)) {
      const goal = goalButton.dataset.decisionGoal;
      if (isCheckGoal(goal)) dispatch({ type: 'SELECT_GOAL', goal });
      return;
    }

    const scenarioButton = target.closest<HTMLButtonElement>('[data-decision-scenario]');
    if (scenarioButton && root.contains(scenarioButton)) {
      const scenario = scenarioButton.dataset.decisionScenario;
      if (isDocumentScenario(scenario)) dispatch({ type: 'SELECT_SCENARIO', scenario });
      return;
    }

    const cta = target.closest<HTMLAnchorElement>('[data-decision-action]');
    if (cta && root.contains(cta)) {
      const action = cta.dataset.decisionAction;
      if (isDecisionAnalyticsAction(action)) track(action);
    }
  }

  root.addEventListener('click', onClick);
  render();

  return Object.freeze({
    getState: () => state,
    dispatch,
    destroy: () => root.removeEventListener('click', onClick),
  });
}

export function trackDecisionHelperVisible(): void {
  track(EVENT_ACTIONS.visible);
}

export function autoMountMarkdownDecisionHelper(): void {
  document.querySelectorAll<HTMLElement>('[data-decision-helper]').forEach((root) => mountMarkdownDecisionHelper(root));
}
