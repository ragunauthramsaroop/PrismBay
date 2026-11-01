/**
 * PrismBay Cloud: local-only receivables action queue and editable drafts.
 * No network, email sending, payments, persistence or background scheduling.
 * Intended for the existing free Cashflow Cloud browser pilot.
 */
const MAX_INVOICES = 500;
const MAX_AMOUNT = 100_000_000;
const MS_DAY = 86_400_000;

function parseDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(label + ' must use YYYY-MM-DD.');
  }
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new RangeError(label + ' is outside the supported date range.');
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError(label + ' is not a real calendar date.');
  }
  return date.getTime();
}
function optionalDate(value, label) {
  return value == null || value === '' ? null : parseDate(value, label);
}
function safeText(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new TypeError(label + ' must be a nonempty single-line string.');
  }
  return value.trim();
}
function normalizeInvoice(raw, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Invoice ' + (index + 1) + ' is invalid.');
  const id = safeText(raw.id, 'id', 120);
  const invoiceNumber = safeText(raw.invoiceNumber, 'invoiceNumber', 60);
  const client = safeText(raw.client, 'client', 120);
  const cents = Math.round(raw.amount * 100);
  if (typeof raw.amount !== 'number' || !Number.isFinite(raw.amount) || raw.amount <= 0 || raw.amount > MAX_AMOUNT ||
      Math.abs(cents - raw.amount * 100) > 1e-6) {
    throw new RangeError('Invoice ' + (index + 1) + ' has an invalid USD amount.');
  }
  if (raw.status !== 'open' && raw.status !== 'paid') throw new TypeError('Invoice ' + (index + 1) + ' has an invalid status.');
  if (raw.doNotContact != null && typeof raw.doNotContact !== 'boolean') throw new TypeError('Invalid contact preference.');
  return {
    id, invoiceNumber, client, amountCents: cents, dueDate: raw.dueDate,
    dueDay: parseDate(raw.dueDate, 'dueDate'), status: raw.status,
    doNotContact: raw.doNotContact === true,
    lastFollowUpDay: optionalDate(raw.lastFollowUpDate, 'lastFollowUpDate'),
    nextFollowUpDay: optionalDate(raw.nextFollowUpDate, 'nextFollowUpDate'),
    promisedPaymentDay: optionalDate(raw.promisedPaymentDate, 'promisedPaymentDate'),
  };
}
function agingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 7) return 'days1to7';
  if (daysOverdue <= 30) return 'days8to30';
  if (daysOverdue <= 60) return 'days31to60';
  return 'days61plus';
}
/**
 * @param {Array} invoices Existing pilot invoice records, at most 500.
 * @param {string} today Local calendar date YYYY-MM-DD supplied by caller.
 * @param {{minimumFollowUpGapDays?:number,lookaheadDays?:number}} options
 * @returns {{summary:object,queue:Array,holds:Array}}
 */
export function buildReceivablesQueue(invoices, today, options = {}) {
  if (!Array.isArray(invoices) || invoices.length > MAX_INVOICES) throw new RangeError('Expected at most 500 invoices.');
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Invalid options.');
  const minimumFollowUpGapDays = options.minimumFollowUpGapDays ?? 3;
  const lookaheadDays = options.lookaheadDays ?? 7;
  if (!Number.isInteger(minimumFollowUpGapDays) || minimumFollowUpGapDays < 0 || minimumFollowUpGapDays > 60) throw new RangeError('Invalid follow-up interval.');
  if (!Number.isInteger(lookaheadDays) || lookaheadDays < 0 || lookaheadDays > 30) throw new RangeError('Invalid lookahead interval.');
  const todayDay = parseDate(today, 'today');
  const agingCents = { current: 0, days1to7: 0, days8to30: 0, days31to60: 0, days61plus: 0 };
  const agingCounts = { current: 0, days1to7: 0, days8to30: 0, days31to60: 0, days61plus: 0 };
  const queue = [], holds = [];
  const seenIds = new Set(), seenNumbers = new Set();
  let openCents = 0, overdueCents = 0, dueNext7Cents = 0, openCount = 0, paidCount = 0;
  for (let index = 0; index < invoices.length; index++) {
    const invoice = normalizeInvoice(invoices[index], index);
    const invoiceKey = invoice.invoiceNumber.toLocaleLowerCase('en-US');
    if (seenIds.has(invoice.id) || seenNumbers.has(invoiceKey)) throw new Error('Duplicate invoice ID or number.');
    seenIds.add(invoice.id); seenNumbers.add(invoiceKey);
    if (invoice.status === 'paid') { paidCount++; continue; }
    openCount++; openCents += invoice.amountCents;
    const daysOverdue = Math.floor((todayDay - invoice.dueDay) / MS_DAY);
    const bucket = agingBucket(daysOverdue);
    agingCents[bucket] += invoice.amountCents;
    agingCounts[bucket]++;
    if (daysOverdue > 0) overdueCents += invoice.amountCents;
    if (daysOverdue <= 0 && daysOverdue >= -7) dueNext7Cents += invoice.amountCents;
    let holdReason = null;
    if (invoice.doNotContact) holdReason = 'do_not_contact';
    else if (invoice.promisedPaymentDay !== null && invoice.promisedPaymentDay >= todayDay) holdReason = 'payment_promised';
    else if (invoice.nextFollowUpDay !== null && invoice.nextFollowUpDay > todayDay) holdReason = 'follow_up_snoozed';
    else if (invoice.lastFollowUpDay !== null && todayDay - invoice.lastFollowUpDay < minimumFollowUpGapDays * MS_DAY) holdReason = 'recently_contacted';
    else if (daysOverdue < -lookaheadDays) holdReason = 'not_due_yet';
    if (holdReason) {
      holds.push({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, reason: holdReason });
      continue;
    }
    const priority = daysOverdue > 30 ? 'critical' : daysOverdue > 7 ? 'high' : daysOverdue >= 0 ? 'medium' : 'upcoming';
    const action = daysOverdue > 0 ? 'overdue_follow_up' : daysOverdue === 0 ? 'due_today' : 'upcoming_due';
    queue.push({
      id: invoice.id, invoiceNumber: invoice.invoiceNumber, client: invoice.client,
      amount: invoice.amountCents / 100, dueDate: invoice.dueDate, daysOverdue,
      agingBucket: bucket, priority, action,
    });
  }
  const rank = { critical: 0, high: 1, medium: 2, upcoming: 3 };
  queue.sort((a, b) => rank[a.priority] - rank[b.priority] || b.daysOverdue - a.daysOverdue || b.amount - a.amount || a.invoiceNumber.localeCompare(b.invoiceNumber));
  return {
    summary: {
      openCount, paidCount, openAmount: openCents / 100, overdueAmount: overdueCents / 100,
      dueNext7Amount: dueNext7Cents / 100, actionCount: queue.length,
      aging: Object.fromEntries(Object.entries(agingCents).map(([key, value]) => [key, { count: agingCounts[key], amount: value / 100 }])),
    },
    queue, holds,
  };
}
/** Editable draft only. No email sending or background automation. */
export function buildFollowUpDraft(invoice, today) {
  const normalized = normalizeInvoice(invoice, 0);
  if (normalized.status !== 'open') throw new Error('Paid invoices do not need a follow-up draft.');
  if (normalized.doNotContact) throw new Error('Client opted out of contact.');
  const daysOverdue = Math.floor((parseDate(today, 'today') - normalized.dueDay) / MS_DAY);
  const amount = (normalized.amountCents / 100).toFixed(2);
  const timing = daysOverdue > 0 ? 'was due on ' + normalized.dueDate : 'is due on ' + normalized.dueDate;
  return {
    subject: 'Invoice ' + normalized.invoiceNumber + ': payment status',
    body: 'Hello ' + normalized.client + ',\n\nI am following up on invoice ' + normalized.invoiceNumber + ' for USD ' + amount + ', which ' + timing + '. Please let me know the expected payment date or whether you need a copy of the invoice.\n\nThank you.',
    sendAutomatically: false,
  };
}
