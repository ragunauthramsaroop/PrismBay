import fs from 'node:fs';
import crypto from 'node:crypto';

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
};

const launch = readJson('growth-reports/ebay/autonomous-state.json');
const ticket = readJson('growth-reports/ebay/cj-ticket-watch.json');

const snapshot = {
  checkedAt: new Date().toISOString(),
  phase: launch?.phase ?? null,
  blockers: Array.isArray(launch?.blockers) ? launch.blockers : [],
  cjEbayAuthorized: Boolean(launch?.cjEbayAuthorized),
  readyForFinalEbayReview: Boolean(launch?.readyForFinalEbayReview),
  ticketStatus: ticket?.status ?? null,
  ticketReplyDetected: Boolean(ticket?.replyDetected),
  ticketNextAction: ticket?.nextAction ?? null,
};

const stable = {
  phase: snapshot.phase,
  blockers: snapshot.blockers,
  cjEbayAuthorized: snapshot.cjEbayAuthorized,
  readyForFinalEbayReview: snapshot.readyForFinalEbayReview,
  ticketStatus: snapshot.ticketStatus,
  ticketReplyDetected: snapshot.ticketReplyDetected,
  ticketNextAction: snapshot.ticketNextAction,
};

snapshot.fingerprint = crypto.createHash('sha256').update(JSON.stringify(stable)).digest('hex');
fs.mkdirSync('growth-reports/ebay', { recursive: true });
fs.writeFileSync('growth-reports/ebay/launch-change-watch.json', JSON.stringify(snapshot, null, 2) + '\n');

console.log(JSON.stringify(snapshot, null, 2));
