import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, Bath, Car, CheckCircle2, Droplets, Home, Leaf, LockKeyhole, PackageCheck, PawPrint, Search, Shirt, Sparkles, Truck, UserRound, Waves, ShoppingBag, Wind } from 'lucide-react';

export const Route = createFileRoute('/clean')({
  head: () => ({
    meta: [
      { title: 'PrismBay Clean | Everyday Mess. Better Tools.' },
      { name: 'description', content: 'Practical cleaning, fabric-care and home tools selected around real everyday problems.' },
      { property: 'og:title', content: 'PrismBay Clean | Everyday Mess. Better Tools.' },
      { property: 'og:description', content: 'A curated collection of practical problem-solving tools for everyday cleaning and home care.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: 'https://www.prismbayai.com/images/prismbay-clean-hero.jpg' },
      { property: 'og:url', content: 'https://www.prismbayai.com/clean' },
    ],
    links: [{ rel: 'canonical', href: 'https://www.prismbayai.com/clean' }],
  }),
  component: CleanStorefront,
});

const products = [
  { name: '3-in-1 Crevice Cleaning Brush', price: '$12.95', slug: 'crevice', category: 'Detail cleaning', description: 'A compact tool for tracks, edges, corners and narrow spaces ordinary brushes miss.', icon: Sparkles, bg: 'from-emerald-50 to-emerald-100' },
  { name: 'Portable Garment Steamer', price: '$29.95', slug: 'garment-steamer', category: 'Fabric care', description: 'Handheld steam care for clothing, travel and everyday household fabric touch-ups.', icon: Shirt, bg: 'from-amber-50 to-orange-100' },
  { name: 'Reusable Pet Hair Remover', price: '$14.95', slug: 'pethair', category: 'Pet home', description: 'Reusable manual cleanup for pet hair and lint on suitable fabric surfaces.', icon: Wind, bg: 'from-sky-50 to-cyan-100' },
  { name: '5-in-1 Electric Spin Scrubber', price: '$29.95', slug: 'scrubber', category: 'Bathroom', description: 'Multi-head powered scrubbing support for tubs, tile, grout and repetitive cleaning jobs.', icon: Droplets, bg: 'from-violet-50 to-purple-100' },
];

const categories = [
  { title: 'Kitchen', icon: Home, copy: 'Counters, sinks and daily cleanup.' },
  { title: 'Bathroom', icon: Bath, copy: 'Tile, tubs, grout and fixtures.' },
  { title: 'Floors', icon: Waves, copy: 'Quick maintenance for hard surfaces.' },
  { title: 'Windows', icon: Sparkles, copy: 'Tracks, glass edges and detail work.' },
  { title: 'Car interior', icon: Car, copy: 'Compact tools for cabin cleanup.' },
  { title: 'Pet areas', icon: PawPrint, copy: 'Hair and lint on suitable surfaces.' },
];

function CleanStorefront() {
  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#17372f]">
      <div className="bg-[#174b38] text-white">
        <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-center gap-5 px-5 text-[11px] font-medium sm:justify-end">
          <span className="flex items-center gap-1.5"><Truck size={13} /> U.S. launch</span><span className="hidden h-3 w-px bg-white/30 sm:block" />
          <span className="hidden items-center gap-1.5 sm:flex"><PackageCheck size={13} /> Fulfillment checked</span><span className="hidden h-3 w-px bg-white/30 sm:block" />
          <span className="hidden items-center gap-1.5 sm:flex"><LockKeyhole size={13} /> Secure checkout when approved</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-8 px-5 sm:px-8">
          <a href="/clean" className="flex items-center gap-2.5 no-underline">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e8f4eb] text-[#24714f]"><Leaf size={23} /></span>
            <span className="leading-none"><span className="block text-xl font-extrabold tracking-tight text-[#17372f]">PrismBay<span className="text-[#3c915f]">Clean</span></span><span className="mt-1 block text-[8px] font-bold tracking-[.19em] text-neutral-500">EVERYDAY MESS. BETTER TOOLS.</span></span>
          </a>
          <nav className="ml-auto hidden items-center gap-7 text-sm font-semibold text-[#243c35] lg:flex">
            <a href="/clean">Home</a><a href="#shop">Shop</a><a href="#problems">By Problem</a><a href="#about">About</a><a href="#faq">FAQs</a>
          </nav>
          <div className="ml-auto flex items-center gap-3 lg:ml-4">
            <div className="hidden min-w-56 items-center justify-between rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-400 xl:flex"><span>Search cleaning solutions…</span><Search size={16} /></div>
            <a href="/contact" aria-label="Customer support" className="rounded-full p-2 hover:bg-neutral-100"><UserRound size={21} /></a>
            <a href="#shop" aria-label="Shop" className="rounded-full p-2 hover:bg-neutral-100"><ShoppingBag size={21} /></a>
          </div>
        </div>
      </header>

      <main>
        <section className="overflow-hidden bg-[#f4f1e9]">
          <div className="mx-auto grid max-w-7xl lg:grid-cols-[.88fr_1.12fr]">
            <div className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:px-12 lg:py-24">
              <span className="text-xs font-extrabold tracking-[.14em] text-neutral-500">A CLEANER, BRIGHTER HOME</span>
              <h1 className="mt-4 font-serif text-6xl font-bold leading-[.93] tracking-[-.05em] text-[#142c25] sm:text-7xl lg:text-[82px]">Everyday mess.<br /><span className="text-[#3e8d61]">Better tools.</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">Smart, practical cleaning solutions for the awkward, repetitive and easy-to-ignore jobs around your home.</p>
              <a href="#shop" className="mt-7 inline-flex w-fit items-center gap-2 rounded-lg bg-[#174b38] px-7 py-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#113a2b]">Shop featured tools <ArrowRight size={17} /></a>
              <div className="mt-9 grid gap-4 sm:grid-cols-3">
                <div className="flex gap-3"><Truck className="mt-0.5 shrink-0 text-[#174b38]" size={24} /><span><b className="block text-xs">Destination shipping</b><small className="text-[11px] text-neutral-500">Confirmed before payment</small></span></div>
                <div className="flex gap-3"><PackageCheck className="mt-0.5 shrink-0 text-[#174b38]" size={24} /><span><b className="block text-xs">Fulfillment checked</b><small className="text-[11px] text-neutral-500">Stock and route reviewed</small></span></div>
                <div className="flex gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-[#174b38]" size={24} /><span><b className="block text-xs">Secure checkout</b><small className="text-[11px] text-neutral-500">Enabled only when approved</small></span></div>
              </div>
            </div>
            <div className="min-h-[480px] bg-cover bg-center lg:min-h-[610px]" style={{ backgroundImage: "linear-gradient(90deg, rgba(244,241,233,.22), rgba(244,241,233,0) 28%), url('/images/prismbay-clean-hero.jpg')" }} />
          </div>
        </section>

        <section id="problems" className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="text-center"><h2 className="font-serif text-4xl font-bold tracking-tight text-[#17372f]">Shop by Cleaning Problem</h2><p className="mt-2 text-neutral-500">Find the right tool for the mess in front of you.</p></div>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((item) => { const Icon = item.icon; return <a key={item.title} href="#shop" className="group relative overflow-hidden rounded-2xl border border-emerald-950/10 bg-gradient-to-br from-[#dfe9df] to-[#efe8dc] p-5 no-underline shadow-sm transition hover:-translate-y-1 hover:shadow-md"><div className="grid h-11 w-11 place-items-center rounded-full bg-white/80 text-[#174b38]"><Icon size={22} /></div><h3 className="mt-8 text-base font-bold text-[#17372f]">{item.title}</h3><p className="mt-1 text-xs leading-5 text-neutral-600">{item.copy}</p></a>; })}
          </div>
        </section>

        <section id="shop" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
          <div className="flex items-end justify-between gap-6"><div><h2 className="font-serif text-4xl font-bold tracking-tight text-[#17372f]">Featured Products</h2><p className="mt-2 text-neutral-500">Focused tools for a cleaner, easier home.</p></div><span className="hidden text-sm font-semibold text-[#28714f] sm:block">Availability verified before checkout →</span></div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => { const Icon = product.icon; return <article key={product.slug} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className={`relative grid h-64 place-items-center bg-gradient-to-br ${product.bg}`}><span className="absolute left-4 top-4 rounded-full bg-[#3f965f] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Curated</span><span className="absolute h-36 w-36 rounded-full border-[30px] border-white/45" /><Icon className="relative text-[#315f53]" size={82} strokeWidth={1.1} /></div><div className="p-5"><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#4b826d]">{product.category}</span><h3 className="mt-2 text-lg font-extrabold leading-tight text-neutral-900">{product.name}</h3><p className="mt-2 min-h-16 text-xs leading-5 text-neutral-500">{product.description}</p><div className="mt-4 text-xl font-extrabold text-[#17372f]">{product.price}</div><a href={`/contact?product=${product.slug}`} className="mt-4 flex items-center justify-center gap-2 rounded-md bg-[#27734f] px-4 py-3 text-sm font-bold text-white hover:bg-[#1e5b3e]">Check availability <ArrowRight size={15} /></a></div></article>; })}
          </div>
        </section>

        <section id="about" className="bg-[#eee8dc]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
            <div className="flex flex-col justify-center"><span className="text-xs font-extrabold tracking-[.14em] text-[#4e7a68]">PRACTICAL BY DESIGN</span><h2 className="mt-3 font-serif text-5xl font-bold leading-tight tracking-tight text-[#17372f]">A cleaner home.<br />Fewer wasted tools.</h2><p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">PrismBay Clean is organized around real household jobs rather than an endless catalog. Products move toward checkout only after the supplier route, stock and shipping path have been checked.</p><a href="#shop" className="mt-7 inline-flex w-fit items-center gap-2 rounded-lg bg-[#174b38] px-6 py-3.5 text-sm font-bold text-white">Shop now <ArrowRight size={16} /></a></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[{ icon: Leaf, title: 'Useful by design', copy: 'Specific tools for specific jobs.' },{ icon: Home, title: 'For real homes', copy: 'Everyday problems, clearly explained.' },{ icon: CheckCircle2, title: 'Route checked', copy: 'Supplier and fulfillment evidence first.' },{ icon: Sparkles, title: 'No fake hype', copy: 'No fabricated reviews, stock or urgency.' }].map((item) => { const Icon = item.icon; return <div key={item.title} className="rounded-2xl border border-white/60 bg-white/65 p-6"><div className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#27734f]"><Icon size={24} /></div><h3 className="mt-4 font-bold text-[#17372f]">{item.title}</h3><p className="mt-1 text-sm text-neutral-600">{item.copy}</p></div>; })}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <div className="text-center"><h2 className="font-serif text-4xl font-bold tracking-tight text-[#17372f]">Good to know before you buy</h2><p className="mt-2 text-neutral-500">Simple answers. Clear fulfillment rules.</p></div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[['Where do you currently ship?', 'Launch orders are currently limited to eligible U.S. addresses. Destination shipping is confirmed before payment is released.'],['Why does a product say “check availability”?', 'Supplier stock and the final fulfillment route can change. PrismBay Clean verifies the current route instead of pretending availability is guaranteed.'],['Are these customer reviews or sales claims?', 'No. This storefront does not use fabricated reviews, fake sales counts or manufactured scarcity.'],['What if the route cannot be confirmed?', 'Checkout stays blocked rather than silently substituting an unverified supplier or shipping route.']].map(([q,a]) => <div key={q} className="rounded-xl border border-neutral-200 bg-white p-6"><h3 className="font-bold text-neutral-900">{q}</h3><p className="mt-2 text-sm leading-6 text-neutral-600">{a}</p></div>)}
          </div>
        </section>
      </main>

      <footer className="bg-[#102b23] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-[2fr_1fr_1fr] sm:px-8"><div><div className="flex items-center gap-2 text-xl font-extrabold"><Leaf size={21} /><span>PrismBay<span className="text-[#75c792]">Clean</span></span></div><p className="mt-3 max-w-sm text-sm leading-6 text-emerald-50/60">Practical tools for the cleaning jobs you would rather finish and move on from.</p></div><div className="flex flex-col gap-2 text-sm"><b className="mb-1 text-xs uppercase tracking-wider text-emerald-100/60">Shop</b><a href="#shop">Featured tools</a><a href="#problems">By problem</a></div><div className="flex flex-col gap-2 text-sm"><b className="mb-1 text-xs uppercase tracking-wider text-emerald-100/60">Customer care</b><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></div>
        <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-6 py-5 text-[11px] text-emerald-50/50 sm:flex-row sm:px-8"><span>© PrismBay Clean · a PrismBay retail experience</span><span>Availability and shipping confirmed before checkout.</span></div></div>
      </footer>
    </div>
  );
}
