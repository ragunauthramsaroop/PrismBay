import fs from 'node:fs/promises';

const ADOPTION = new Set([
  'REUSE_DIRECTLY',
  'PORT_PATTERN',
  'REFERENCE_ONLY',
  'REJECT',
  'REJECT_PENDING_LICENSE_REVIEW'
]);

function escapeRegex(value) {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

export function globToRegex(pattern) {
  let out = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === '*') {
      if (pattern[i + 1] === '*') {
        out += '.*';
        i += 1;
      } else {
        out += '[^/]*';
      }
    } else {
      out += escapeRegex(char);
    }
  }
  return new RegExp(`^${out}$`);
}

export function pathMatches(pattern, path) {
  return globToRegex(pattern).test(path);
}

export function validateSourceRegistry(registry) {
  const errors = [];
  if (!registry || registry.version !== 1) errors.push('version_must_equal_1');
  if (!registry?.policy || registry.policy.defaultDecision !== 'REJECT') {
    errors.push('default_decision_must_be_REJECT');
  }
  if (!Array.isArray(registry?.sources) || registry.sources.length === 0) {
    errors.push('sources_required');
    return { ok: false, errors };
  }

  const ids = new Set();
  const repos = new Set();
  for (const source of registry.sources) {
    if (!source.id || ids.has(source.id)) errors.push(`invalid_or_duplicate_id:${source.id || 'missing'}`);
    if (source.id) ids.add(source.id);

    if (!source.repository || repos.has(source.repository)) {
      errors.push(`invalid_or_duplicate_repository:${source.repository || 'missing'}`);
    }
    if (source.repository) repos.add(source.repository);

    if (!ADOPTION.has(source.adoption)) errors.push(`invalid_adoption:${source.id || 'missing'}`);
    if (!source.license) errors.push(`license_required:${source.id || 'missing'}`);
    if (!Array.isArray(source.allowedPaths)) errors.push(`allowed_paths_required:${source.id || 'missing'}`);
    if (!Array.isArray(source.forbiddenPaths)) errors.push(`forbidden_paths_required:${source.id || 'missing'}`);
    if (!Array.isArray(source.purpose) || source.purpose.length === 0) errors.push(`purpose_required:${source.id || 'missing'}`);
    if (!source.notes) errors.push(`notes_required:${source.id || 'missing'}`);

    if (source.adoption === 'REJECT_PENDING_LICENSE_REVIEW') {
      if (!source.forbiddenPaths?.includes('**')) errors.push(`pending_license_review_must_block_all_paths:${source.id}`);
      if (source.allowedPaths?.length !== 0) errors.push(`pending_license_review_cannot_allow_paths:${source.id}`);
    }

    if (source.license === 'CUSTOM' && !source.adoption.startsWith('REJECT')) {
      errors.push(`custom_license_requires_reject_status:${source.id}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function evaluateSourcePath(registry, repository, path) {
  const validation = validateSourceRegistry(registry);
  if (!validation.ok) {
    return { allowed: false, decision: 'REJECT', reason: 'invalid_registry', errors: validation.errors };
  }

  const source = registry.sources.find((item) => item.repository === repository);
  if (!source) return { allowed: false, decision: 'REJECT', reason: 'repository_not_allowlisted' };

  if (source.adoption === 'REJECT' || source.adoption === 'REJECT_PENDING_LICENSE_REVIEW') {
    return { allowed: false, decision: source.adoption, reason: 'source_not_approved_for_import', sourceId: source.id };
  }

  if (source.forbiddenPaths.some((pattern) => pathMatches(pattern, path))) {
    return { allowed: false, decision: 'REJECT', reason: 'path_forbidden', sourceId: source.id };
  }

  const matchedAllowedPath = source.allowedPaths.some((pattern) => pathMatches(pattern, path));
  if (!matchedAllowedPath) {
    return { allowed: false, decision: 'REJECT', reason: 'path_not_allowlisted', sourceId: source.id };
  }

  return {
    allowed: true,
    decision: source.adoption,
    reason: 'approved_source_path',
    sourceId: source.id,
    license: source.license
  };
}

export async function loadSourcePolicy(path = 'config/oss-commerce-sources.json') {
  const raw = await fs.readFile(path, 'utf8');
  const registry = JSON.parse(raw);
  const validation = validateSourceRegistry(registry);
  if (!validation.ok) throw new Error(`invalid_oss_source_policy:${validation.errors.join(',')}`);
  return registry;
}

export async function main(path = 'config/oss-commerce-sources.json') {
  const registry = await loadSourcePolicy(path);
  const summary = {
    version: registry.version,
    sourceCount: registry.sources.length,
    approvedForPortOrReuse: registry.sources.filter((source) => ['REUSE_DIRECTLY', 'PORT_PATTERN'].includes(source.adoption)).map((source) => source.repository),
    referenceOnly: registry.sources.filter((source) => source.adoption === 'REFERENCE_ONLY').map((source) => source.repository),
    blocked: registry.sources.filter((source) => source.adoption.startsWith('REJECT')).map((source) => source.repository)
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main(process.argv[2]);
}
