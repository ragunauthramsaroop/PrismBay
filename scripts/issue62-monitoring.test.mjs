import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'scripts/n8n-prismbay-revenue-watch.json'), 'utf8'));
const growth = fs.readFileSync(path.join(root, 'scripts/organic-growth-agent.mjs'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'scripts/n8n-revenue-watch.md'), 'utf8');

test('revenue health workflow routes production errors to the existing n8n error workflow', () => {
  assert.equal(workflow.settings.errorWorkflow, 'jarvis05db28a6f9fa04');
  assert.equal(workflow.settings.saveDataErrorExecution, 'all');
  assert.ok(workflow.nodes.some(n => n.type === 'n8n-nodes-base.scheduleTrigger'));
  const catalogNode = workflow.nodes.find(n => n.id === 'catalog');
  assert.match(catalogNode.parameters.url, /api[.]github[.]com\/repos\/ragunauth123456-maker\/PrismBay\/contents\/public\/viral-catalog[.]json/);
  assert.match(catalogNode.parameters.url, /[?]ref=main[&]t=/);
  assert.match(catalogNode.parameters.url, /[$]now[.]toMillis[(][)]/);
  assert.match(workflow.nodes.find(n => n.id === 'audit').parameters.jsCode, /encoding==='base64'/);
});

test('broken Railway custom store route is not a default public target', () => {
  assert.ok(!growth.includes('PRISMBAY_SHOP_CUSTOM_URL'));
  assert.ok(!growth.includes('https://shop.prismbayai.com/tiktok'));
  assert.ok(growth.includes("const SHOP = process.env.PRISMBAY_SHOP_URL || 'https://clean.prismbayai.com/';"));
  assert.ok(growth.includes("directStripeOnPublicStorefrontAllowed: false"));
  assert.ok(growth.includes("buyerZipPreflightRequired: true"));
});

test('documentation distinguishes local failure routing from external notification delivery', () => {
  assert.match(docs, /JARVIS error handler/);
  assert.match(docs, /local JARVIS event bridge/);
  assert.match(docs, /not proof of external email\/SMS delivery/);
});
