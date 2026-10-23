import { Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import LogoHorizontal from "./LogoHorizontal";

const NAV_LINKS = [
  { to: "/products", label: "Products" },
  { to: "/bundles", label: "Bundles" },
  { to: "/compare", label: "Compare" },
  { to: "/demo", label: "Demos" },
  { to: "/creative-studio", label: "Creative Studio" },
  { to: "/watch", label: "Watch" },
  { to: "/resources", label: "Resources" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/trust", label: "Trust Centre" },
  { to: "/jvzoo/resources", label: "Partners" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change (Link clicks)
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <LogoHorizontal />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            to="/products"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Products
          </Link>
          <Link
            to="/bundles"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Bundles
          </Link>
          <Link
            to="/compare"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Compare
          </Link>
          <Link
            to="/demo"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Demos
          </Link>
          <Link to="/creative-studio" className="text-sm font-semibold text-teal-700 transition-colors hover:text-teal-900">Creative Studio</Link>
          <Link to="/watch" className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">Watch</Link>
          <Link
            to="/resources"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Resources
          </Link>
          <Link
            to="/jvzoo/resources"
            className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900"
          >
            Partners
          </Link>
        </nav>

        {/* Desktop sign-in + mobile hamburger */}
        <div className="flex items-center gap-4">
          <Link
            to="/sign-in"
            className="hidden text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 lg:inline-flex"
          >
            Sign In
          </Link>
          {/* Hamburger button — visible on mobile only */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile slide-out overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeMobile}
          />
          {/* Slide-out panel */}
          <nav className="absolute right-0 top-0 h-[calc(100dvh-4rem)] w-72 max-w-[85vw] bg-white shadow-2xl border-l border-neutral-200 overflow-y-auto">
            <div className="flex flex-col p-6">
              <div className="mb-2 pb-4 border-b border-neutral-100">
                <Link
                  to="/sign-in"
                  onClick={closeMobile}
                  className="block w-full rounded-lg bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  Sign In
                </Link>
              </div>
              <div className="py-2 space-y-0.5">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeMobile}
                    className="block rounded-lg px-3 py-2.5 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
