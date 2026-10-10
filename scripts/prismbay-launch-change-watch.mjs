import fs from 'node:fs';
import crypto from 'node:crypto';

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
};

const launch = readJson('growth-reports/ebay/orchestrator-state.json');
const ticket = readJson('growth-reports/ebay/cj-ticket-watch.json');

const snapshot = {
  checkedAt: new Date().toISOString(),
  phase: launch?.phase ?? null,
  blockers: Array.isArray(launch?.blockers) ? launch.blockers : [],
  cjEbayAuthorized: Boolean(launch?.ebaySellerAuthenticated),
  readyForFinalEbayReview: Boolean(launch?.readyForBrowserPublish),
  liveStockVerified: Boolean(launch?.liveStockVerified),
  dispatchLocationVerified: Boolean(launch?.dispatchLocationVerified),
  economicsPass: Boolean(launch?.economicsPass),
  orchestratorCheckedAt: launch?.checkedAt ?? null,
  orchestratorNextAction: launch?.nextAction ?? null,
  ticketStatus: ticket?.status ?? null,
  ticketReplyDetected: Boolean(ticket?.replyDetected),
  ticketNextAction: ticket?.nextAction ?? null,
};

const stable = {
  phase: snapshot.phase,
  blockers: snapshot.blockers,
  cjEbayAuthorized: snapshot.cjEbayAuthorized,
  readyForFinalEbayReview: snapshot.readyForFinalEbayReview,
  liveStockVerified: snapshot.liveStockVerified,
  dispatchLocationVerified: snapshot.dispatchLocationVerified,
  economicsPass: snapshot.economicsPass,
  orchestratorCheckedAt: snapshot.orchestratorCheckedAt,
  orchestratorNextAction: snapshot.orchestratorNextAction,
  ticketStatus: snapshot.ticketStatus,
  ticketReplyDetected: snapshot.ticketReplyDetected,
  ticketNextAction: snapshot.ticketNextAction,
};

snapshot.fingerprint = crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
fs.mkdirSync('growth-reports/ebay', { recursive: true });
fs.writeFileSync('growth-reports/ebay/launch-change-watch.json', JSON.stringify(snapshot, null, 2) + '\n');

console.log(JSON.stringify(snapshot, null, 2));
