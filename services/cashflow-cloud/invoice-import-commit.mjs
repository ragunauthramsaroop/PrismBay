/**
 * Atomic, opt-in local CSV import commit for the existing PrismBay Cloud pilot.
 * No server, storage, email, payment or network access.
 * Always preview with previewInvoiceImport first, and explicitly ask the user
 * before invoking this commit function. Revalidation at commit time prevents
 * stale previews from overwriting changed invoice lists.
 */
import { previewInvoiceImport } from './invoice-import.mjs';

function rejected(message) {
  return { ok: false, records: null, added: [], count: 0, errors: [message] };
}

/**
 * @param {string} csvText Raw CSV, retained only in the browser.
 * @param {Array} existingInvoices Current local workspace records.
 * @param {{personalWorkspace:boolean,confirmed:boolean,idFactory?:()=>string}} options
 * @returns {{ok:boolean,records:Array|null,added:Array,count:number,errors:string[]}}
 */
export function commitInvoiceImport(csvText, existingInvoices, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return rejected('Invalid import settings.');
  }
  if (options.personalWorkspace !== true) {
    return rejected('Start your own browser workspace before importing financial records.');
  }
  if (options.confirmed !== true) {
    return rejected('Review the invoice preview and explicitly confirm import.');
  }
  if (!Array.isArray(existingInvoices)) {
    return rejected('Existing invoice records are unavailable.');
  }

  // Revalidate the complete input against the latest workspace at commit time.
  const preview = previewInvoiceImport(csvText, existingInvoices);
  if (!preview.ok) return { ...rejected('Import validation failed.'), errors: preview.errors };

  const idFactory = options.idFactory ?? (() => globalThis.crypto.randomUUID());
  if (typeof idFactory !== 'function') return rejected('Invalid invoice ID generator.');

  const ids = new Set();
  for (const item of existingInvoices) {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) {
      return rejected('Existing invoice IDs are invalid or duplicated.');
    }
    ids.add(item.id);
  }
  const added = [];
  try {
    for (const item of preview.records) {
      const id = idFactory();
      if (typeof id !== 'string' || !id.trim() || id.length > 120 || ids.has(id) ||
          /[\u0000-\u001f\u007f]/.test(id)) {
        return rejected('Unable to assign unique invoice IDs. No records were imported.');
      }
      ids.add(id);
      added.push({ id, ...item });
    }
  } catch {
    return rejected('Unable to assign invoice IDs. No records were imported.');
  }
  // A single new array is returned only after every record passes validation.
  // The caller is responsible for calling setRecords(result.records) once.
  return {
    ok: true,
    records: [...existingInvoices, ...added],
    added,
    count: added.length,
    errors: [],
  };
}
