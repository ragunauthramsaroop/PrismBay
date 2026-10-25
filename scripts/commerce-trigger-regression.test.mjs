import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const commerce=fs.readFileSync('.github/workflows/paperclip-commerce-group.yml','utf8');
const dispatch=fs.readFileSync('.github/workflows/paperclip-realtime-dispatch.yml','utf8');

test('commerce work has a schedule, manual dispatch and no five-way workflow completion fan-out',()=>{
  const triggers=commerce.split('\npermissions:')[0];
  assert.match(triggers,/cron: '\*\/15 \* \* \* \*'/);
  assert.match(triggers,/workflow_dispatch:/);
  assert.doesNotMatch(triggers,/^  workflow_run:/m);
  assert.doesNotMatch(triggers,/^  issue_comment:/m);
  assert.match(commerce,/cancel-in-progress: false/);
});
test('real-time dispatcher cannot create event storms from issue comments or pull requests',()=>{
  const triggers=dispatch.split('\npermissions:')[0];
  assert.doesNotMatch(triggers,/^  issue_comment:/m);
  assert.doesNotMatch(triggers,/^  pull_request_target:/m);
  assert.match(dispatch,/workflow_dispatch:/);
  assert.match(dispatch,/types: \[completed\]/);
});
test('trusted workflow completions are guarded by main branch, success and 15-minute cooldown',()=>{
  assert.match(dispatch,/head_branch == 'main'/);
  assert.match(dispatch,/conclusion == 'success'/);
  assert.match(dispatch,/15 \* 60 \* 1000/);
  assert.match(dispatch,/latest\.status !== 'completed'/);
});

const continuity=fs.readFileSync('.github/workflows/revenue-continuity-orchestrator.yml','utf8');

test('existing continuity supervisor recovers stale commerce control without creating a second pipeline',()=>{
  assert.match(continuity,/'ceo-autonomous-recovery\.yml:35'/);
  assert.match(continuity,/'paperclip-commerce-group\.yml:105'/);
  assert.match(continuity,/gh workflow run "\$wf" --repo "\$GITHUB_REPOSITORY" --ref main/);
  assert.match(continuity,/if \[\[ "\$status" == 'in_progress'/);
  assert.match(continuity,/if \(\( age_min > max_age \)\)/);
  assert.doesNotMatch(continuity,/stripe_api_write|cj.*order.*submit/i);
});
