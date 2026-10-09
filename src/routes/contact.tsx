import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import Navbar from '~/components/Navbar';
import Footer from '~/components/Footer';
import LogoHorizontal from '~/components/LogoHorizontal';
import { breadcrumbListScript, twitterMeta } from "~/utils/seo";

export const Route = createFileRoute("/contact")({
  validateSearch: (search: Record<string, unknown>) => ({
    product: typeof search.product === "string" ? search.product : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Contact PrismBay — Get Support & Inquiries | PrismBay" },
      { name: "description", content: "Contact the PrismBay team for product inquiries, support questions, licensing information, or partnership opportunities. We respond within 24 hours." },
      { property: "og:title", content: "Contact PrismBay — Get Support & Inquiries | PrismBay" },
      { property: "og:description", content: "Contact the PrismBay team for product inquiries, support questions, licensing information, or partnership opportunities. We respond within 24 hours." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://www.prismbayai.com/images/og-default.png" },
      { property: "og:url", content: "https://www.prismbayai.com/contact" },
      ...twitterMeta("Contact PrismBay — Get Support & Inquiries | PrismBay", "Contact the PrismBay team for product inquiries, support questions, licensing information, or partnership opportunities. We respond within 24 hours."),
    ],
    links: [
      { rel: "canonical", href: "https://www.prismbayai.com/contact" },
    ],
    scripts: [
      breadcrumbListScript([
        { name: "Home", url: "https://www.prismbayai.com" },
        { name: "Contact", url: "https://www.prismbayai.com/contact" },
      ]),
    ],
  }),
  component: ContactPage,
});

type LiveQuoteResponse = {
  success?: boolean;
  error?: string;
  checkoutUrl?: string;
  estimatedDelivery?: string | null;
  stockVerified?: boolean;
  destinationShippingVerified?: boolean;
  economicsVerified?: boolean;
};

function GarmentSteamerPreflight() {
  const [zip, setZip] = useState("");
  const [checking, setChecking] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState<string | null>(null);

  const checkAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError("");
    setCheckoutUrl("");
    setEstimatedDelivery(null);

    if (!/^\d{5}$/.test(zip.trim())) {
      setQuoteError("Enter a valid 5-digit U.S. ZIP code.");
      return;
    }

    setChecking(true);
    try {
      const response = await fetch("/api/clean-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug: "garment-steamer", zip: zip.trim() }),
      });
      const data = await response.json() as LiveQuoteResponse;
      if (!response.ok || data.success !== true || !data.checkoutUrl) {
        setQuoteError(data.error || "Live availability could not be confirmed for this ZIP code.");
        return;
      }
      if (data.stockVerified !== true || data.destinationShippingVerified !== true || data.economicsVerified !== true) {
        setQuoteError("Live availability could not be confirmed for this ZIP code.");
        return;
      }
      setCheckoutUrl(data.checkoutUrl);
      setEstimatedDelivery(data.estimatedDelivery || null);
    } catch {
      setQuoteError("Live availability checking is temporarily unavailable. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">PrismBay Clean live availability</p>
      <h2 className="mt-2 text-2xl font-bold text-neutral-900">Portable Garment Steamer</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">USD 29.95. Enter the U.S. delivery ZIP code. PrismBay checks current supplier stock, destination shipping and the commercial threshold before releasing checkout.</p>

      <form onSubmit={checkAvailability} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="clean-zip" className="sr-only">U.S. ZIP code</label>
        <input
          id="clean-zip"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="U.S. ZIP code"
          className="min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-4 py-3 text-base text-neutral-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
        <button
          type="submit"
          disabled={checking}
          className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checking ? "Checking live route..." : "Check ZIP & availability"}
        </button>
      </form>

      {quoteError ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{quoteError}</div>
      ) : null}

      {checkoutUrl ? (
        <div className="mt-5 rounded-xl border border-emerald-300 bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">✓</span>
            <div>
              <h3 className="font-bold text-neutral-900">Live route verified for ZIP {zip}</h3>
              <p className="mt-1 text-sm leading-6 text-neutral-600">Supplier stock, destination shipping and the checkout economics passed the live gate.{estimatedDelivery ? ` Current supplier delivery estimate: ${estimatedDelivery}.` : ""}</p>
            </div>
          </div>
          <a
            href={checkoutUrl}
            rel="nofollow"
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Continue to secure checkout
          </a>
          <p className="mt-3 text-center text-xs text-neutral-500">The live supplier route is checked again immediately before the checkout link is released. Supplier ordering is not automatic.</p>
        </div>
      ) : null}
    </div>
  );
}

function ContactPage() {
  const { product } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || "Failed to send message. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />
      <section className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Contact</p>
            <h1 className="mt-2 text-3xl font-bold text-neutral-800 sm:text-4xl">{product === "garment-steamer" ? "Check live availability" : "Get in touch"}</h1>
            <p className="mt-4 text-lg text-neutral-500">{product === "garment-steamer" ? "Confirm the current supplier route for your U.S. ZIP before payment." : "Have a question about our products, licensing, or anything else? We'd love to hear from you."}</p>
          </div>
        </div>
      </section>
      <section className="bg-neutral-50">
        <div className="mx-auto max-w-2xl px-6 py-16">
          {product === "garment-steamer" ? <GarmentSteamerPreflight /> : null}
          {sent ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <circle cx="16" cy="16" r="12" stroke="#16B3A7" strokeWidth="2" />
                  <path d="M10 16l4 4 8-8" stroke="#16B3A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-800">Message Sent</h2>
              <p className="mt-2 text-neutral-600">Thanks for reaching out, {name || "friend"}. We'll get back to you at {email || "your email"} within 1–2 business days.</p>
              <Link to="/" className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-600">
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm space-y-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1.5">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-base text-neutral-700 placeholder:text-neutral-400 transition-colors duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-base text-neutral-700 placeholder:text-neutral-400 transition-colors duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-1.5">Subject (optional)</label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's this about?"
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-base text-neutral-700 placeholder:text-neutral-400 transition-colors duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-1.5">Message</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  placeholder="How can we help?"
                  className="block w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-base text-neutral-700 placeholder:text-neutral-400 transition-colors duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-y"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-lg bg-brand-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-600 hover:shadow-md hover:-translate-y-px active:bg-brand-700 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2"
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
              <p className="text-xs text-center text-neutral-400">
                Or email us directly at <a href="mailto:support@prismbayai.com" className="text-brand-600 hover:text-brand-700">support@prismbayai.com</a>
              </p>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
