import fs from 'node:fs/promises';
import path from 'node:path';

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORBIDDEN_KEYS = new Set(['email', 'to', 'recipient_email', 'recipientEmail', 'customer_email', 'customerEmail']);

function clone(value) {
  return structuredClone(value);
}

function assertNoRawEmail(value, key = '') {
  if (FORBIDDEN_KEYS.has(key)) throw new Error('raw_email_not_allowed_in_job_store');
  if (typeof value === 'string' && EMAIL_LIKE.test(value.trim())) throw new Error('raw_email_not_allowed_in_job_store');
  if (Array.isArray(value)) {
    for (const item of value) assertNoRawEmail(item);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) assertNoRawEmail(childValue, childKey);
  }
}

function normalizeDocument(input) {
  const jobs = Array.isArray(input?.jobs) ? input.jobs : [];
  const idempotency = input?.idempotency && typeof input.idempotency === 'object' ? input.idempotency : {};
  return { schemaVersion: 1, jobs, idempotency };
}

export class FileJobStore {
  constructor(filePath) {
    if (!filePath) throw new Error('job_store_path_required');
    this.filePath = path.resolve(filePath);
    this.jobs = new Map();
    this.idempotency = new Map();
    this.loaded = false;
    this.writeTail = Promise.resolve();
  }

  async load() {
    if (this.loaded) return this;
    let document = { schemaVersion: 1, jobs: [], idempotency: {} };
    try {
      document = normalizeDocument(JSON.parse(await fs.readFile(this.filePath, 'utf8')));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    for (const job of document.jobs) {
      assertNoRawEmail(job);
      if (!job?.id || !job?.idempotencyKey) throw new Error('invalid_persisted_job');
      this.jobs.set(job.id, clone(job));
      this.idempotency.set(job.idempotencyKey, job.id);
    }
    for (const [key, id] of Object.entries(document.idempotency)) {
      if (this.jobs.has(id)) this.idempotency.set(key, id);
    }
    this.loaded = true;
    return this;
  }

  async persistSnapshot() {
    const document = {
      schemaVersion: 1,
      jobs: [...this.jobs.values()],
      idempotency: Object.fromEntries(this.idempotency)
    };
    assertNoRawEmail(document);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
    const file = await fs.open(tempPath, 'wx', 0o600);
    try {
      await file.writeFile(`${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8' });
      await file.sync();
    } finally {
      await file.close();
    }
    await fs.rename(tempPath, this.filePath);
    if (process.platform !== 'win32') {
      const directory = await fs.open(path.dirname(this.filePath), 'r');
      try { await directory.sync(); } finally { await directory.close(); }
    }
  }

  queueMutation(fn) {
    if (!this.loaded) return Promise.reject(new Error('job_store_not_loaded'));
    const operation = this.writeTail.then(fn);
    this.writeTail = operation.catch(() => {});
    return operation;
  }

  async persist() {
    return this.queueMutation(async () => {
      await this.persistSnapshot();
    });
  }

  async enqueue(job) {
    assertNoRawEmail(job);
    if (!job?.id || !job?.idempotencyKey) throw new Error('invalid_job');
    return this.queueMutation(async () => {
      const existingId = this.idempotency.get(job.idempotencyKey);
      if (existingId) return { inserted: false, duplicateOf: existingId, job: this.get(existingId) };
      this.jobs.set(job.id, clone(job));
      this.idempotency.set(job.idempotencyKey, job.id);
      try {
        await this.persistSnapshot();
      } catch (error) {
        this.jobs.delete(job.id);
        this.idempotency.delete(job.idempotencyKey);
        throw error;
      }
      return { inserted: true, job: clone(job) };
    });
  }

  async put(job) {
    assertNoRawEmail(job);
    return this.queueMutation(async () => {
      if (!this.jobs.has(job?.id)) throw new Error('job_not_found');
      const previous = this.jobs.get(job.id);
      if (previous.idempotencyKey !== job.idempotencyKey) throw new Error('idempotency_key_immutable');
      this.jobs.set(job.id, clone(job));
      try {
        await this.persistSnapshot();
      } catch (error) {
        this.jobs.set(job.id, previous);
        throw error;
      }
      return clone(job);
    });
  }

  async update(id, updater) {
    if (typeof updater !== 'function') throw new Error('job_updater_required');
    return this.queueMutation(async () => {
      const previous = this.jobs.get(id);
      if (!previous) throw new Error('job_not_found');
      const next = await updater(clone(previous));
      assertNoRawEmail(next);
      if (!next?.id || next.id !== previous.id) throw new Error('job_id_immutable');
      if (next.idempotencyKey !== previous.idempotencyKey) throw new Error('idempotency_key_immutable');
      this.jobs.set(id, clone(next));
      try {
        await this.persistSnapshot();
      } catch (error) {
        this.jobs.set(id, previous);
        throw error;
      }
      return clone(next);
    });
  }

  async waitForWrites() {
    await this.writeTail;
  }

  get(id) {
    const job = this.jobs.get(id);
    return job ? clone(job) : null;
  }

  list(state = null) {
    return [...this.jobs.values()]
      .filter((job) => !state || job.state === state)
      .map((job) => clone(job));
  }
}
