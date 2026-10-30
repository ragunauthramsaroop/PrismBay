import { createFileRoute, Link } from "@tanstack/react-router";
import Navbar from "~/components/Navbar";
import Footer from "~/components/Footer";
import { PRODUCTS } from "~/data/products";

const channel = "https://www.youtube.com/@PrismBayAI/videos";
const shop = "https://prismbay-clean-49izhg.v2.appdeploy.ai/tiktok/?utm_source=prismbayai&utm_medium=creator_hub&utm_campaign=watch";
const freeVendorGuide = "https://ragunauth123456-maker.github.io/PrismBay/?utm_source=prismbayai&utm_medium=learning_studio&utm_campaign=vendor_risk";
const researchSupport = "https://buy.stripe.com/aFa3cw0jweEMfCn2xs2400H";
const verifiedToolkits = "https://ragunauth123456-maker.github.io/PrismBay/toolkits.html?utm_source=prismbayai&utm_medium=learning_studio&utm_campaign=verified_professional_toolkits";
const interactiveScorecard = "https://ragunauth123456-maker.github.io/PrismBay/scorecard.html?utm_source=prismbayai&utm_medium=learning_studio&utm_campaign=vendor_risk";
const lessons = [
  {
    number: "01", title: "Evaluate AI return on investment",
    question: "Will this workflow create more value than its total cost?",
    detail: "Measure the current task cost and expected hours saved after training. Include subscriptions, integration, oversight and error correction. Compare the forecast with results from a small pilot.",
    exercise: "Record monthly volume, current time per task, total operating cost and acceptable error rate. Reassess after a measured trial."
  },
  {
    number: "02", title: "Set boundaries for AI agents",
    question: "What should an agent read, propose and execute?",
    detail: "Separate read access from write access. Give an agent only the permissions its workflow requires. Require approval before payments, external messages and permanent changes. Keep an action log and a shutdown procedure.",
    exercise: "Set three permission levels: observe, propose and act. Name an owner and approval gate for every workflow."
  },
  {
    number: "03", title: "Build reliable workflows",
    question: "What happens when a model makes a mistake?",
    detail: "Define the input, expected output, acceptance criteria and responsible reviewer before selecting an AI tool. Check data quality, test edge cases and preserve a manual fallback.",
    exercise: "Map one repeatable task from input to decision and handoff. Measure accuracy and time saved before scaling."
  }
];
const recommended = ["nexusos", "guardianos", "spendshield-ai"]
  .map(slug => PRODUCTS.find(item => item.slug === slug))
  .filter((item): item is (typeof PRODUCTS)[number] => Boolean(item));

export const Route = createFileRoute("/watch")({
  head: () => ({
    meta: [
      { title: "Watch, Learn & Build AI Systems | PrismBay Learning Studio" },
      { name: "description", content: "Free original AI implementation lessons, practical decision frameworks, PrismBay videos and optional business-system blueprints." },
      { property: "og:title", content: "PrismBay Learning Studio" },
      { property: "og:description", content: "Learn to evaluate AI ROI, govern AI agents and design reliable workflows." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.prismbayai.com/watch" }
    ],
    links: [{ rel: "canonical", href: "https://www.prismbayai.com/watch" }]
  }),
  component: WatchPage
});
function WatchPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Navbar />
      <section className="bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">PrismBay Learning Studio</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">Watch. Learn. Build AI systems with clear controls.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-200">
            Practical guidance for founders, operators and business leaders. Start with free lessons, then explore optional implementation blueprints when your business has a defined need.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <a href={channel} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600">Watch on YouTube</a>
            <Link to="/resources" className="rounded-lg border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10">Read free guides</Link>
          </div>
          <p className="mt-5 text-sm text-neutral-300">Visiting from a Short? The clickable link to this page is on our YouTube channel profile.</p>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <section aria-labelledby="learning-heading">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Free original lessons</p>
          <h2 id="learning-heading" className="mt-3 text-3xl font-bold">Three decisions before deploying an AI agent</h2>
          <p className="mt-4 max-w-3xl leading-7 text-neutral-600">A useful AI deployment starts with a measurable task, clear permissions and a reliable way to catch errors. These decision guides accompany the original practical videos on our channel.</p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {lessons.map(lesson => (
              <article key={lesson.number} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
                <p className="text-sm font-semibold text-brand-600">LESSON {lesson.number}</p>
                <h3 className="mt-3 text-xl font-bold">{lesson.title}</h3>
                <p className="mt-4 font-semibold">{lesson.question}</p>
                <p className="mt-3 text-sm leading-7 text-neutral-600">{lesson.detail}</p>
                <div className="mt-6 rounded-xl bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-800">Your next step</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-700">{lesson.exercise}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-20 rounded-2xl bg-white p-7 ring-1 ring-neutral-200 sm:p-10" aria-labelledby="pilot-heading">
          <h2 id="pilot-heading" className="text-2xl font-bold">A practical pilot plan</h2>
          <p className="mt-4 leading-8 text-neutral-600">
            Select one workflow with a known owner and stable information sources. Record its workload and quality baseline. Test representative tasks, including missing information, ambiguous instructions and unexpected failures. Start with an agent that drafts recommendations instead of executing irreversible actions.
          </p>
          <p className="mt-4 leading-8 text-neutral-600">
            Review every output during the trial. Record exceptions, corrections, employee feedback and supervision costs. Compare results with the baseline before approving more autonomy. Require a named owner, an escalation path, permission limits and a documented fallback.
          </p>
          <p className="mt-4 leading-8 text-neutral-600">
            Separate one-time implementation costs from recurring costs. Include redesign, security reviews, training and quality assurance. Revisit your assumptions after the first operating cycle. A model demonstration is not a completed business case.
          </p>
          <Link to="/resources" className="mt-6 inline-flex font-semibold text-brand-700 underline underline-offset-4">Explore the full guide library</Link>
        </section>
        <section className="mt-20 rounded-2xl border border-teal-200 bg-teal-50 p-7 sm:p-10" aria-labelledby="free-vendor-heading">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-800">Free original worksheet</p>
          <h2 id="free-vendor-heading" className="mt-3 text-3xl font-bold text-neutral-900">Compare AI vendors by evidence, not price alone.</h2>
          <p className="mt-4 max-w-3xl leading-8 text-neutral-700">Use our independently published 10-question AI Vendor Risk Matrix to compare retention, data export, privacy controls, human approval and exit rights. Includes a fictional example and a practical review plan. No email, account or payment is required.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={interactiveScorecard} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-teal-800 px-5 py-3 font-semibold text-white hover:bg-teal-900">Try the interactive evidence review</a>
            <a href={freeVendorGuide} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-teal-700 px-5 py-3 font-semibold text-teal-900 hover:bg-teal-100">Read the free worksheet</a>
            <Link to="/resources/$slug" params={{ slug: "ai-vendor-procurement-four-evidence-gates" }} className="rounded-lg border border-teal-700 px-5 py-3 font-semibold text-teal-900 hover:bg-teal-100">Read the four-gate AI vendor decision card</Link>
            <a href={researchSupport} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-teal-700 px-5 py-3 font-semibold text-teal-900 hover:bg-teal-100">Support free research (optional)</a>
          </div>
          <p className="mt-5 text-sm leading-6 text-neutral-600">Optional one-time $3–$100 USD commercial support is processed by Studysmartz LLC. It is not a charitable donation or a paid content purchase; the complete worksheet remains free for everyone.</p>
        </section>
        <section className="mt-20" aria-labelledby="systems-heading">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Optional paid resources</p>
          <h2 id="systems-heading" className="mt-3 text-3xl font-bold">From free lessons to implementation planning</h2>
          <p className="mt-4 max-w-3xl leading-7 text-neutral-600">
            PrismBay sells documentation packages, not working hosted software. Each blueprint describes workflows, architecture, operating controls and implementation considerations. Review product limitations before purchasing.
          </p>
          <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Ready-to-download professional systems</p>
            <h3 className="mt-2 text-xl font-bold">Verified stakeholder, ESG and board-reporting toolkits</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-700">Separate from our AI software blueprints, these existing document products include real PDF guides, editable Excel workbooks and Word templates. Their live Stripe prices, ZIP contents and download endpoints have been checked. Individual purchases start at $49 USD; the complete three-system bundle costs $179.</p>
            <a href={verifiedToolkits} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-lg bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Browse verified professional toolkits →</a>
          </div>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {recommended.map(product => (
              <article key={product.slug} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6">
                <p className="text-sm font-semibold text-brand-600">{product.category}</p>
                <h3 className="mt-2 text-xl font-bold">{product.name}</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-neutral-600">{product.tagline}</p>
                <Link to={"/products/" + product.slug} className="mt-6 rounded-lg border border-neutral-300 px-4 py-3 text-center font-semibold hover:bg-neutral-50">Review blueprint</Link>

              </article>
            ))}
          </div>
        </section>
        <section className="mt-20 grid gap-6 md:grid-cols-2" aria-label="Other destinations">
          <div className="rounded-2xl border border-neutral-200 bg-white p-7">
            <h2 className="text-2xl font-bold">PrismBay Clean</h2>
            <p className="mt-3 leading-7 text-neutral-600">Explore a separate store for practical home products. Review product details, current prices and eligible delivery locations before ordering.</p>
            <a href={shop} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex font-semibold text-brand-700 underline underline-offset-4">Visit the cleaning store</a>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-7">
            <h2 className="text-2xl font-bold">Work with PrismBay</h2>
            <p className="mt-3 leading-7 text-neutral-600">For relevant brand partnerships or original content collaborations, send a proposal describing your product, audience and commercial terms. Sponsored content receives a clear disclosure.</p>
            <Link to="/contact" className="mt-6 inline-flex font-semibold text-brand-700 underline underline-offset-4">Contact our team</Link>
          </div>
        </section>
        <p className="mt-12 text-sm leading-6 text-neutral-500">Commercial disclosure: this page links to PrismBay's own paid products and store. Free lessons do not require a purchase. No third-party sponsorship is implied.</p>
      </main>
      <Footer />
    </div>
  );
}
