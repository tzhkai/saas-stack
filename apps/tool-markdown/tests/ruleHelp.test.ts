import assert from 'node:assert/strict';
import test from 'node:test';
import { getRuleHelp, RULE_HELP } from '../src/scripts/markdownLint/ruleHelp';
import { RULE_LABELS } from '../src/scripts/markdownLint/types';

test('provides complete static help for every existing Markdown lint rule', () => {
  assert.deepEqual(Object.keys(RULE_HELP).sort(), Object.keys(RULE_LABELS).sort());
  for (const [ruleId, label] of Object.entries(RULE_LABELS)) {
    const help = getRuleHelp(ruleId);
    assert.ok(help, `${ruleId} should have help text`);
    assert.equal(help?.title, label);
    assert.ok(help?.why.length);
    assert.ok(help?.boundary.length);
    assert.ok(help?.before.length);
  }
});

test('limits automatic examples to safe formatting rules', () => {
  for (const help of Object.values(RULE_HELP)) {
    if (help.tier === 'safe') assert.ok(help.after, `${help.ruleId} should show a reviewable result`);
    else assert.equal(help.after, undefined, `${help.ruleId} must not imply an automatic structural fix`);
  }
});

test('documents the intentionally ambiguous hard line break case', () => {
  const help = getRuleHelp('MM103');
  assert.equal(help?.tier, 'safe');
  assert.match(help?.boundary ?? '', /two trailing spaces/i);
  assert.match(help?.reviewNote ?? '', /hard line break/i);
});
