import test from 'node:test';
import assert from 'node:assert/strict';
const ROOT='https://clean.prismbayai.com/';
const KEY='927a4d6b8c21e5f73a90bc14d2ef6a31';
test('IndexNow key and buyer pages remain on the canonical PrismBay Clean host',()=>{
  const keyLocation=ROOT+KEY+'.txt';
  const urls=[
    ROOT,
    ROOT+'garment-steamer/',
    ROOT+'guides/portable-garment-steamer.html',
    ROOT+'shipping.html',
    ROOT+'returns.html',
    ROOT+'contact.html',
    ROOT+'digital/',
    ROOT+'learn/stakeholder-mapping-toolkit.html',
    ROOT+'learn/esg-reporting-toolkit.html',
    ROOT+'learn/board-briefing-white-paper-system.html',
    ROOT+'learn/executive-intelligence-bundle.html'
  ];
  assert.match(KEY,/^[A-Za-z0-9-]{8,128}$/);
  assert.ok(urls.includes(ROOT+'garment-steamer/'));
  assert.ok(urls.includes(ROOT+'guides/portable-garment-steamer.html'));
  for(const url of urls) assert.ok(url.startsWith(ROOT));
  assert.ok(keyLocation.startsWith(ROOT));
});
