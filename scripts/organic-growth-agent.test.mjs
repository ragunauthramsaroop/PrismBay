import test from 'node:test';
// Existing CI already runs this file; include deterministic paid-document campaign tests.
import './digital-conversion-campaign.test.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function runRole(role) {
  const folder = mkdtempSync(path.join(tmpdir(), 'prismbay-growth-'));
  try {
    const script = fileURLToPath(new URL('./organic-growth-agent.mjs', import.meta.url));
    const run = spawnSync(process.execPath, [script, role], { cwd:folder, encoding:'utf8', timeout:20000 });
    assert.equal(run.status, 0, run.stderr);
    const safe = role.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return JSON.parse(readFileSync(path.join(folder,'growth-reports',safe+'.json'),'utf8'));
  } finally { rmSync(folder,{recursive:true,force:true}); }
}

test('scheduled creative worker focuses physical draft on guarded garment-steamer preflight without sales claims', () => {
  const report = runRole('Hook/Creative Writer');
  assert.equal(report.result.product,'Portable Garment Steamer');
  assert.equal(report.result.draftOnly,true);
  assert.equal(report.result.publicationAuthorized,false);
  assert.equal(report.result.physicalProductAvailabilityClaim,false);
  assert.equal(report.result.guardedPreflightPromotion,true);
  assert.equal(report.result.directStripePromotion,false);
  assert.match(report.result.cta,/^https:\/\/browser-worker-production-f5b4\.up\.railway\.app\/garment-steamer\//);
  assert.doesNotMatch(report.result.cta,/buy\.stripe\.com/);
  assert.equal(report.result.hooks.length,3);
  assert.equal(report.result.digitalCampaign.kind,'verified_existing_digital_documents');
  assert.equal(report.result.digitalCampaign.status,'content_draft_requires_channel_approval');
  assert.match(report.result.digitalCampaign.guideUrl,/github_cloud/);
  assert.match(report.result.digitalCampaign.checkoutUrl,/^https:\/\/buy\.stripe\.com\//);
  assert.equal(report.result.digitalCampaign.videoBrief.scenes.reduce((s,x)=>s+x.seconds,0),30);
  assert.equal(report.result.digitalCampaign.guardrails.publishedAutomatically,false);
  assert.equal(report.result.digitalCampaign.guardrails.physicalProductsPromoted,false);
});

test('trend scout keeps the only verified physical preflight product first', () => {
  const report = runRole('Trend Scout');
  assert.equal(report.result.commercialPriority,'Portable Garment Steamer');
  assert.equal(report.result.priorityProducts[0],'Portable Garment Steamer');
});
