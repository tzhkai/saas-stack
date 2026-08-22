import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DECISION_ANALYTICS_ACTIONS,
  DECISION_HELPER_SOURCE,
  DECISION_HELPER_TOOL,
  EVENT_ACTIONS,
} from '../src/scripts/markdownDecisionHelper.ts';

const expectedActions = [
  'decision_helper_visible',
  'decision_helper_started',
  'decision_path_formatter',
  'decision_path_linter',
  'decision_path_both',
  'decision_scenario_readme',
  'decision_scenario_api_docs',
  'decision_scenario_release_notes',
  'decision_helper_result_shown',
  'article_open_linter',
  'article_open_editor',
  'article_open_docs',
  'article_open_template',
] as const;

test('uses one fixed tool and one fixed source for the Decision Helper funnel', () => {
  assert.equal(DECISION_HELPER_TOOL, 'formatter-vs-linter-guide');
  assert.equal(DECISION_HELPER_SOURCE, 'blog-formatter-vs-linter');
});

test('exposes every v1.5 funnel action through the analytics allowlist', () => {
  expectedActions.forEach((action) => assert.equal(DECISION_ANALYTICS_ACTIONS.has(action), true, action));
});

test('keeps visible and result-shown event names fixed', () => {
  assert.equal(EVENT_ACTIONS.visible, 'decision_helper_visible');
  assert.equal(EVENT_ACTIONS.resultShown, 'decision_helper_result_shown');
  assert.equal(Object.values(EVENT_ACTIONS).every((value) => /^decision_(helper|path|scenario)_/.test(value)), true);
});

test('does not place free-form content keys in the event contract', () => {
  const serialized = JSON.stringify([...DECISION_ANALYTICS_ACTIONS]);
  ['markdown', 'content', 'file', 'filename', 'url', 'query', 'title', 'cell'].forEach((forbidden) => {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  });
});
