import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHECK_GOALS,
  DECISIONS,
  DOCUMENT_SCENARIOS,
  INITIAL_DECISION_STATE,
  SCENARIO_CONTENT,
  decisionForGoal,
  reduceDecisionState,
  scenarioFor,
} from '../src/scripts/markdownDecisionHelper';

test('does not allow a document scenario before a check goal is selected', () => {
  const state = reduceDecisionState(INITIAL_DECISION_STATE, {
    type: 'SELECT_SCENARIO',
    scenario: 'readme',
  });

  assert.deepEqual(state, INITIAL_DECISION_STATE);
  assert.equal(decisionForGoal(state.goal), null);
  assert.equal(scenarioFor(state), null);
});

test('moves through the local goal then scenario state machine', () => {
  const formatterState = reduceDecisionState(INITIAL_DECISION_STATE, {
    type: 'SELECT_GOAL',
    goal: 'format',
  });
  assert.deepEqual(formatterState, { goal: 'format', scenario: null, started: true });

  const readmeState = reduceDecisionState(formatterState, {
    type: 'SELECT_SCENARIO',
    scenario: 'readme',
  });
  assert.deepEqual(readmeState, { goal: 'format', scenario: 'readme', started: true });
  assert.equal(scenarioFor(readmeState)?.label, 'README');
});

test('keeps the selected document scenario when a reader compares another goal', () => {
  const state = reduceDecisionState(
    reduceDecisionState(
      reduceDecisionState(INITIAL_DECISION_STATE, { type: 'SELECT_GOAL', goal: 'format' }),
      { type: 'SELECT_SCENARIO', scenario: 'api-docs' },
    ),
    { type: 'SELECT_GOAL', goal: 'both' },
  );

  assert.deepEqual(state, { goal: 'both', scenario: 'api-docs', started: true });
  assert.equal(decisionForGoal(state.goal)?.title, 'Use both, in order');
});

test('resets the state without retaining a goal or document scenario', () => {
  const active = reduceDecisionState(
    reduceDecisionState(INITIAL_DECISION_STATE, { type: 'SELECT_GOAL', goal: 'lint' }),
    { type: 'SELECT_SCENARIO', scenario: 'release-notes' },
  );

  assert.deepEqual(reduceDecisionState(active, { type: 'RESET' }), INITIAL_DECISION_STATE);
});

test('maps every fixed goal to local Linter and fixed-source editor or docs actions', () => {
  CHECK_GOALS.forEach((goal) => {
    const decision = DECISIONS[goal];
    assert.match(decision.primaryHref, /^\/tools\/markdown-linter\/\?from=blog-formatter-vs-linter/);
    assert.equal(decision.primaryAction, 'article_open_linter');
    assert.ok(
      decision.secondaryHref === '/editor/?from=blog-formatter-vs-linter'
        || decision.secondaryHref === '/docs/#document-titles-and-headings',
    );
    assert.ok(decision.steps.length >= 3);
  });
});

test('maps every fixed scenario to a concise checklist and an existing template URL', () => {
  DOCUMENT_SCENARIOS.forEach((scenario) => {
    const content = SCENARIO_CONTENT[scenario];
    assert.ok(content.checklist.length >= 3);
    assert.match(content.templateHref, /^\/templates\/[a-z0-9-]+\/$/);
    assert.ok(content.templateLabel.length > 8);
  });
});
