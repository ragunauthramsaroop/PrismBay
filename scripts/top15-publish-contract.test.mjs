import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../storefront/top-15/index.html',import.meta.url),'utf8');
const merch=JSON.parse(fs.readFileSync(new URL('../config/top15-merchandising.json',import.meta.url),'utf8'));
test('Top 15 public page matches the reviewed research shortlist',()=>{
 assert.equal((html.match(/class="product" data-category=/g)||[]).length,15);
 assert.equal(merch.candidates.length,15);
 for(const product of merch.candidates) assert.ok(html.includes(product.name),product.name);
 assert.match(html,/No physical-product orders or payments are accepted on this page/);
 assert.match(html,/not a sales leaderboard/);
});
test('digital purchase section links to four existing Stripe-hosted checkouts',()=>{
 assert.equal((html.match(/class="ready-buy"/g)||[]).length,4);
 assert.equal((html.match(/href="https:\/\/buy\.stripe\.com\//g)||[]).length,4);
 assert.match(html,/https:\/\/buy\.stripe\.com\/4gM8wQ1v8dOj45Ib8QgnK0q/);
 assert.match(html,/https:\/\/buy\.stripe\.com\/bJe7sMgq25hNcCe6SAgnK0s/);
 assert.match(html,/https:\/\/buy\.stripe\.com\/4gMeVe8XA5hNfOq2CkgnK0r/);
 assert.match(html,/https:\/\/buy\.stripe\.com\/eVqfZi5Lo7pV31Ea4MgnK0t/);
});
test('unverified physical products route to a consent-based lead inbox, not payment',()=>{
 assert.equal((html.match(/https:\/\/prismbay-clean-global\.floot\.app\/quote\?product=/g)||[]).length,15);
 assert.equal((html.match(/class="quote"/g)||[]).length,15);
 assert.equal((html.match(/href="mailto:support@prismbayai\.com\?subject=/g)||[]).length,0);
 for(const item of merch.candidates)assert.ok(html.includes('quote?product='+item.slug+'&amp;utm_source=top15'),item.slug);
 assert.match(html,/Physical checkout currently gated/);
 assert.doesNotMatch(html,/World.s lowest price guaranteed|Most sold products in the world/);
});
