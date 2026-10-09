// Revenue-focused content planning for *existing* PDF/XLSX/DOCX products.
// No API credentials, purchases, outreach sends, social publishing, or unverified physical stock.
const ROOT = 'https://ragunauthramsaroop.github.io/PrismBay/';
export const ACTIVE_DIGITAL_OFFERS = Object.freeze([
  Object.freeze({
    slug: 'bundle',
    name: 'PrismBay Executive Intelligence Bundle',
    priceUsd: 179,
    guide: ROOT + 'toolkits.html',
    guideLead: 'Free comparison page',
    guideCta: 'Compare the included systems',
    audience: 'Executives, corporate affairs leaders, ESG teams, strategy professionals and consultants who need multiple repeatable document systems',
    problem: 'Executive work slows down when stakeholder, ESG and board-reporting processes live in disconnected files.',
    educationalHook: 'A practical executive operating system should separate stakeholder commitments, ESG evidence and board-level claims while preserving accountable owners and source records.',
    actionableTip: 'Map the work into three evidence lanes: stakeholder commitments, ESG performance records and decision-grade research claims. Assign one accountable owner to each lane.',
    checkout: 'https://buy.stripe.com/eVqfZi5Lo7pV31Ea4MgnK0t',
    deliverables: ['Executive Stakeholder Mapping Toolkit', 'ESG & Social Performance Operating Pack', 'Executive White Paper & Board Briefing System']
  }),
  Object.freeze({
    slug: 'stakeholder',
    name: 'Executive Stakeholder Mapping Toolkit',
    priceUsd: 49,
    guide: ROOT + 'stakeholder-engagement-plan-template.html',
    guideLead: 'Free step-by-step example',
    guideCta: 'Get the free guide',
    checkout: 'https://buy.stripe.com/4gM8wQ1v8dOj45Ib8QgnK0q',
    audience: 'Project directors, corporate affairs leads and stakeholder engagement managers',
    problem: 'A contact list is not a follow-through plan.',
    educationalHook: 'Three fields every stakeholder engagement plan needs: an accountable owner, a realistic next action and evidence that a commitment was met.',
    actionableTip: 'Start with a free commitments register: record the exact promise, who approved it, the due date and evidence of closure.',
    deliverables: ['PDF implementation guide', 'editable Excel stakeholder and commitments workbook', 'Word executive briefing template']
  }),
  Object.freeze({
    slug: 'esg',
    name: 'ESG & Social Performance Operating Pack',
    priceUsd: 99,
    guide: ROOT + 'esg-monthly-reporting-template.html',
    guideLead: 'Free step-by-step example',
    guideCta: 'Get the free guide',
    checkout: 'https://buy.stripe.com/4gMeVe8XA5hNfOq2CkgnK0r',
    audience: 'ESG managers, sustainability officers and operational reporting teams',
    problem: 'A polished sustainability dashboard cannot repair an unverified KPI.',
    educationalHook: 'Before putting a green arrow in an ESG report, identify the metric owner, reporting boundary and original supporting evidence.',
    actionableTip: 'Create three basic columns today: KPI definition, evidence location and the accountable reviewer. Mark estimates and unresolved exceptions.',
    deliverables: ['PDF monthly reporting guide', 'editable Excel KPI, grievance and action registers', 'Word monthly executive brief template']
  }),
  Object.freeze({
    slug: 'whitepaper',
    name: 'Executive White Paper & Board Briefing System',
    priceUsd: 79,
    guide: ROOT + 'board-briefing-white-paper-template.html',
    guideLead: 'Free step-by-step example',
    guideCta: 'Get the free guide',
    checkout: 'https://buy.stripe.com/bJe7sMgq25hNcCe6SAgnK0s',
    audience: 'Executive researchers, strategy teams and board-reporting professionals',
    problem: 'A convincing report is not the same as a defensible one.',
    educationalHook: 'Before a board paper goes out, separate verified facts, calculations, management assumptions and the decision being requested.',
    actionableTip: 'Start a claim ledger with the source, date, methodology, reviewer and what could change the conclusion.',
    deliverables: ['PDF implementation guide', 'editable Excel source-and-claims ledger', 'two Word templates for a white paper and a board brief']
  })
]);
const safeSegment = s => String(s).replace(/[^a-z0-9_]/gi,'_').slice(0,64);
export function campaignForSlot(slot) {
  if (!Number.isSafeInteger(slot) || slot < 0) throw new TypeError('A nonnegative six-hour slot is required');
  const offer = ACTIVE_DIGITAL_OFFERS[slot % ACTIVE_DIGITAL_OFFERS.length];
  const campaign = 'organic_' + offer.slug + '_' + String(slot);
  const guide = new URL(offer.guide);
  guide.searchParams.set('utm_source','github_cloud');
  guide.searchParams.set('utm_medium','owned_educational_content');
  guide.searchParams.set('utm_campaign', safeSegment(campaign));
  const checkout = new URL(offer.checkout);
  checkout.searchParams.set('client_reference_id', safeSegment('owned_content_' + offer.slug));
  const guideLead = offer.guideLead || 'Free step-by-step example';
  const guideCta = offer.guideCta || 'Get the free guide';
  return {
    kind: 'verified_existing_digital_documents',
    status: 'content_draft_requires_channel_approval',
    seller: 'STUDYSMARTZ LLC',
    offer: { slug: offer.slug, title: offer.name, priceUsd: offer.priceUsd, deliverables: offer.deliverables },
    audience: offer.audience,
    guideUrl: guide.toString(),
    checkoutUrl: checkout.toString(),
    campaign,
    educationalAngle: offer.problem,
    editorialDraft: offer.educationalHook + ' ' + offer.actionableTip + ' ' + guideLead + ': ' + guide.toString() + ' Optional editable document package: $' + offer.priceUsd + ' USD, one time. This is a document package, not hosted AI software or bespoke consulting.',
    videoBrief: {
      durationSeconds: 30,
      originalGraphicOnly: true,
      audio: 'None; captions or original narration may be produced if the owner approves the media.',
      scenes: [
        { seconds: 7, text: offer.problem, instruction: 'Original typographic hook, no third-party footage.' },
        { seconds: 8, text: offer.educationalHook, instruction: 'One simple, fictional worksheet example with no claim of customer outcomes.' },
        { seconds: 8, text: offer.actionableTip, instruction: 'Show an original abstract table; do not display confidential or actual customer data.' },
        { seconds: 7, text: guideCta + '; optional editable package $' + offer.priceUsd + '.', instruction: 'Use exact guide URL in the post description; disclose own-brand promotion.' }
      ]
    },
    fulfillmentClaim: 'Existing downloadable PDF/Excel/Word package; real paid end-to-end test and order-bound delivery remain separate checks.',
    guardrails: {
      physicalProductsPromoted: false,
      noInventedTestimonials: true,
      noGuaranteedResults: true,
      noClaimsOfNewSales: true,
      marketingEmailsSent: false,
      publishedAutomatically: false,
      authorizationsNeeded: ['channel-specific publishing approval','original media and accurate commercial disclosure']
    }
  };
}
export function currentSixHourSlot(nowMs = Date.now()) {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new TypeError('Valid timestamp required');
  return Math.floor(nowMs / (6 * 60 * 60 * 1000));
}
