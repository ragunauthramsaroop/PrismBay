/**
 * PrismBay Cashflow Cloud: dependency-free, local-only CSV import validation.
 * This module does not upload, persist, or modify records. Callers must present
 * the preview and request explicit confirmation before committing the result.
 */
const MAX_BYTES = 512 * 1024;
const MAX_RECORDS = 500;
const MAX_AMOUNT_CENTS = 10_000_000_000;
const FIELDS = ['invoiceNumber', 'client', 'amount', 'dueDate', 'status'];
const ALIASES = new Map([
  ['invoice', 'invoiceNumber'], ['invoice number', 'invoiceNumber'], ['invoice no', 'invoiceNumber'],
  ['invoice id', 'invoiceNumber'], ['invoicenumber', 'invoiceNumber'],
  ['client', 'client'], ['customer', 'client'], ['customer name', 'client'], ['client name', 'client'],
  ['amount usd', 'amount'], ['amount', 'amount'], ['invoice amount', 'amount'],
  ['due date', 'dueDate'], ['due', 'dueDate'], ['duedate', 'dueDate'],
  ['status', 'status'], ['payment status', 'status'],
]);
function fail(message) {
  return { ok: false, records: [], errors: [message], count: 0, totalAmount: 0 };
}
function normalizeHeader(value) {
  return value.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/[.]/g, '').replace(/\s+/g, ' ');
}
/** Strict CSV parser: supports CRLF/LF, RFC 4180 quotes and escaped quotes. */
export function parseCsvRows(text) {
  if (typeof text !== 'string') throw new TypeError('CSV input must be text.');
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) throw new Error('CSV file exceeds 512 KB.');
  const src = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;
  let atStart = true;
  let line = 1;
  let rowStart = 1;
  const endRow = () => {
    row.push(field);
    if (row.some(cell => cell.trim() !== '')) rows.push({ line: rowStart, cells: row });
    if (rows.length > MAX_RECORDS + 2) throw new Error('CSV contains too many rows (500 invoice limit).');
    row = []; field = ''; quoted = false; closedQuote = false; atStart = true;
    rowStart = line + 1;
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; closedQuote = true; }
      else { field += ch; if (ch === '\n') line++; }
      continue;
    }
    if (ch === '"') {
      if (atStart && !closedQuote) { quoted = true; atStart = false; }
      else throw new Error('Invalid quote in CSV near line ' + line + '.');
    } else if (ch === ',') {
      row.push(field); field = ''; atStart = true; closedQuote = false;
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      endRow(); line++; rowStart = line;
    } else {
      if (closedQuote) throw new Error('Unexpected text after a closing quote near line ' + line + '.');
      field += ch; atStart = false;
    }
  }
  if (quoted) throw new Error('CSV ends inside a quoted field.');
  if (field !== '' || row.length > 0 || closedQuote) endRow();
  return rows;
}
function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const utc = new Date(Date.UTC(y, m - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d;
}
function parseUsdAmount(raw) {
  const trimmed = raw.trim().replace(/^\$/, '');
  const number = trimmed.replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(number)) return null;
  const [whole, fraction = ''] = number.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  return cents / 100;
}
function isSafeText(value, maxLength) {
  return value.length > 0 && value.length <= maxLength &&
    !/^[=+@\-\t\r]/.test(value) && !/[\u0000-\u001F\u007F]/.test(value);
}
/**
 * @param {string} csvText UTF-8 CSV contents; no network access.
 * @param {{invoiceNumber:string}[]} existingInvoices Already loaded invoices.
 * @param {number} maxRecords Combined maximum, 1..500.
 * @returns {{ok:boolean,records:Array,errors:string[],count:number,totalAmount:number}}
 */
export function previewInvoiceImport(csvText, existingInvoices = [], maxRecords = MAX_RECORDS) {
  if (!Array.isArray(existingInvoices) || !Number.isInteger(maxRecords) || maxRecords < 1 || maxRecords > MAX_RECORDS) {
    return fail('Invalid import limits or existing invoice list.');
  }
  let rows;
  try { rows = parseCsvRows(csvText); }
  catch (error) { return fail(error instanceof Error ? error.message : 'Unable to parse CSV.'); }
  if (rows.length < 2) return fail('CSV needs a header and at least one invoice.');
  const header = rows[0].cells;
  const positions = new Map();
  for (let i = 0; i < header.length; i++) {
    const name = ALIASES.get(normalizeHeader(header[i]));
    if (!name) continue;
    if (positions.has(name)) return fail('Duplicate column: ' + name + '.');
    positions.set(name, i);
  }
  const missing = FIELDS.filter(field => !positions.has(field));
  if (missing.length) return fail('Missing required columns: ' + missing.join(', ') + '.');
  if (existingInvoices.length + rows.length - 1 > maxRecords) {
    return fail('Import would exceed the ' + maxRecords + '-invoice limit. Export or remove records first.');
  }
  const known = new Set();
  for (const invoice of existingInvoices) {
    if (typeof invoice?.invoiceNumber !== 'string') return fail('Existing invoice list is invalid.');
    known.add(invoice.invoiceNumber.trim().toLocaleLowerCase('en-US'));
  }
  const errors = [];
  const records = [];
  let totalCents = 0;
  for (const { line, cells } of rows.slice(1)) {
    if (cells.length !== header.length) {
      errors.push('Line ' + line + ': expected ' + header.length + ' columns, found ' + cells.length + '.');
      continue;
    }
    const get = name => (cells[positions.get(name)] || '').trim();
    const invoiceNumber = get('invoiceNumber');
    const client = get('client');
    const amount = parseUsdAmount(get('amount'));
    const dueDate = get('dueDate');
    const status = get('status').toLowerCase();
    if (!isSafeText(invoiceNumber, 60)) errors.push('Line ' + line + ': invalid or unsafe invoice number.');
    if (!isSafeText(client, 120)) errors.push('Line ' + line + ': invalid or unsafe client name.');
    if (amount === null) errors.push('Line ' + line + ': amount must be positive USD with at most two decimals.');
    if (!isValidDate(dueDate)) errors.push('Line ' + line + ': due date must be a real YYYY-MM-DD date.');
    if (status !== 'open' && status !== 'paid') errors.push('Line ' + line + ': status must be open or paid.');
    const key = invoiceNumber.toLocaleLowerCase('en-US');
    if (known.has(key)) errors.push('Line ' + line + ': duplicate invoice number.');
    known.add(key);
    if (errors.length > 30) return fail('CSV contains more than 30 validation errors. Correct the file and retry.');
    if (amount !== null) totalCents += Math.round(amount * 100);
    records.push({ invoiceNumber, client, amount, dueDate, status });
  }
  if (errors.length) return { ok: false, records: [], errors, count: 0, totalAmount: 0 };
  return { ok: true, records, errors: [], count: records.length, totalAmount: totalCents / 100 };
}