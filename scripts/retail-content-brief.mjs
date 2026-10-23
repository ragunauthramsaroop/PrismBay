// Research briefs are not retail offers. Commercial approval belongs to the existing supplier and checkout gates.
export const RESEARCH_CONTENT_POLICY =
  'Research concepts only. Public attention is not supplier approval, stock, final-destination freight, media rights, checkout readiness, sales evidence, or permission to publish. Never promote or render product advertisements from this queue.';

const RESEARCH_HOOKS = [
  name => `Three questions to ask before choosing a ${name}.`,
  name => `What to check when comparing ${name} options.`,
  name => `A practical checklist for evaluating a ${name}.`,
];

export function researchContentBrief(product, rank) {
  const slug = String(product?.slug || '').trim();
  const name = String(product?.name || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !name || !Number.isSafeInteger(rank) || rank < 1) {
    throw new Error('Invalid research content candidate');
  }
  return {
    rank,
    slug,
    product: name,
    channel: 'tiktok',
    format: 'short-video',
    status: 'RESEARCH_CANDIDATE',
    approved: false,
    saleReady: false,
    finalZipFreightVerified: false,
    checkoutAllowed: false,
    mediaRightsVerified: false,
    publicationAuthorized: false,
    publishable: false,
    hook: RESEARCH_HOOKS[(rank - 1) % RESEARCH_HOOKS.length](name),
    cta: 'Research concept only. No product offer or checkout.',
    mediaPlan: 'Original typography or abstract graphics only. No product footage or performance demonstration without separate evidence.',
    guardrail: 'No purchase CTA, unsupported product performance, before-and-after results, sales, reviews, stock, discounts, shipping promises, or unlicensed media.',
  };
}

export function buildResearchContentQueue(ranked, at = new Date()) {
  if (!Array.isArray(ranked) || !Number.isFinite(at?.getTime?.())) throw new Error('Invalid research queue inputs');
  return {
    schemaVersion: 2,
    updatedAt: at.toISOString(),
    policy: RESEARCH_CONTENT_POLICY,
    items: ranked.slice(0, 5).map((product, index) => researchContentBrief(product, index + 1)),
  };
}
