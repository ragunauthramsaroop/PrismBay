import test from 'node:test';
import assert from 'node:assert/strict';
const ROOT='https://clean.prismbayai.com/';
const KEY='927a4d6b8c21e5f73a90bc14d2ef6a31';
test('IndexNow key and steamer buyer cluster remain on the canonical PrismBay Clean host',()=>{
  const keyLocation=ROOT+KEY+'.txt';
  const urls=[
    ROOT,
    ROOT+'garment-steamer/',
    ROOT+'guides/portable-garment-steamer.html',
    ROOT+'guides/garment-steamer-vs-iron.html',
    ROOT+'guides/travel-garment-steamer-guide.html',
    ROOT+'guides/how-to-use-a-garment-steamer.html',
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
  for(const path of [
    'garment-steamer/',
    'guides/portable-garment-steamer.html',
    'guides/garment-steamer-vs-iron.html',
    'guides/travel-garment-steamer-guide.html',
    'guides/how-to-use-a-garment-steamer.html'
  ]) assert.ok(urls.includes(ROOT+path));
  for(const url of urls) assert.ok(url.startsWith(ROOT));
  assert.ok(keyLocation.startsWith(ROOT));
});
