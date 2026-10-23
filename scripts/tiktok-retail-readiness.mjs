import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

async function readJson(path) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return null; }
}

// Public checks and repository files are not authenticated evidence of a
// connected TikTok account, licensed media, video.publish scope or owner consent.
// Only the existing approved publisher may clear these external gates.
const EXTERNAL_PUBLICATION_GATES = Object.freeze([
  'authenticated_retail_tiktok_connection',
  'retail_video_publish_scope',
  'creative_rights_and_media_digest',
  'owner_publication_authorization',
]);

export function buildTikTokRetailReadiness({ publisher, supplierReview, publicPost = null }) {
  const checks = Array.isArray(publisher?.result?.checks) ? publisher.result.checks : [];
  const verification = checks.find(row => /tiktokio.*\.txt/i.test(String(row?.url || ''))) || null;
  const terms = checks.find(row => /\/terms(?:$|\?)/i.test(String(row?.url || ''))) || null;
  const privacy = checks.find(row => /\/privacy(?:$|\?)/i.test(String(row?.url || ''))) || null;
  const saleReady = Number.isSafeInteger(supplierReview?.saleReadyCount) && supplierReview.saleReadyCount > 0
    ? supplierReview.saleReadyCount : 0;
  const publicPostVerified = publicPost?.publicPostVerified === true;
  const technicalMissing = [];
  if (!terms?.ok) technicalMissing.push('terms_url');
  if (!privacy?.ok) technicalMissing.push('privacy_url');
  if (!publisher?.result?.tiktokVerificationReady) technicalMissing.push('site_verification_file');
  if (saleReady < 1) technicalMissing.push('sale_ready_product');
  if (!publicPostVerified) technicalMissing.push('public_post_verification');
  const missing = [...technicalMissing, ...EXTERNAL_PUBLICATION_GATES];

  return {
    schemaVersion: 2,
    checkedAt: new Date().toISOString(),
    termsReady: Boolean(terms?.ok),
    privacyReady: Boolean(privacy?.ok),
    siteVerificationReady: publisher?.result?.tiktokVerificationReady === true,
    verificationUrl: verification?.url || null,
    verificationHttpStatus: verification?.status ?? null,
    saleReadyProductCount: saleReady,
    publicPostVerified,
    technicalPrerequisitesReady: technicalMissing.length === 0,
    // Repository and public-page evidence never authorize social publication.
    readyForPublicRetailPublishing: false,
    missing,
    ownerOrProviderEvidenceRequired: missing.filter(x => ['site_verification_file','public_post_verification'].includes(x) || EXTERNAL_PUBLICATION_GATES.includes(x)),
    rule: 'Do not synthesize TikTok verification content. Public checks and repository flags do not establish retail account connection, video.publish scope, licensed media or owner consent. Only the existing authenticated publisher may clear those gates. Keep educational YouTube separate.',
  };
}

export async function main() {
  const publisher = await readJson('growth-reports/publisher.json');
  const supplierReview = await readJson('growth-reports/cj-worker-review.json');
  const publicPost = await readJson('growth-reports/tiktok-public-post-evidence.json');
  const report = buildTikTokRetailReadiness({ publisher, supplierReview, publicPost });
  await fs.mkdir('growth-reports', { recursive: true });
  await fs.writeFile('growth-reports/tiktok-retail-readiness.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
