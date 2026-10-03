import Head from 'next/head';
import { ArrowRight, CheckCircle2, ChevronRight, CircleDollarSign, Droplets, Home, PackageCheck, ShieldCheck, Shirt, Sparkles, Truck, Wind } from 'lucide-react';

const products = [
  { name: '3-in-1 Crevice Cleaning Brush', price: '$12.95', slug: 'crevice', category: 'Detail cleaning', description: 'A compact tool for tracks, edges, corners and the narrow spaces ordinary brushes miss.', icon: Sparkles, tone: 'mint', badge: 'Small-space hero' },
  { name: 'Portable Garment Steamer', price: '$29.95', slug: 'garment-steamer', category: 'Fabric care', description: 'Handheld steam care for clothes, travel and everyday household fabric touch-ups.', icon: Shirt, tone: 'sand', badge: 'Travel friendly' },
  { name: 'Reusable Pet Hair Remover', price: '$14.95', slug: 'pethair', category: 'Pet home', description: 'A reusable manual tool for lifting pet hair and lint from suitable fabric surfaces.', icon: Wind, tone: 'blue', badge: 'Reusable' },
  { name: '5-in-1 Electric Spin Scrubber', price: '$29.95', slug: 'scrubber', category: 'Bathroom', description: 'Multi-head powered scrubbing support for tubs, tile, grout and repetitive cleaning jobs.', icon: Droplets, tone: 'lavender', badge: 'Multi-surface' },
  { name: 'Mattress Vacuum', price: '$39.95', slug: 'mattress-vacuum', category: 'Soft surfaces', description: 'Compact vacuum care for mattresses, upholstery and other suitable soft household surfaces.', icon: Home, tone: 'rose', badge: 'Home care' },
  { name: 'Cordless Pressure Washer', price: '$69.95', slug: 'pressure-washer', category: 'Outdoor', description: 'Portable cordless cleaning support for cars, patios and suitable outdoor hard surfaces.', icon: Droplets, tone: 'teal', badge: 'Cordless' },
];

const problems = [
  { title: 'Tight spaces', copy: 'Tracks, sink edges, corners and hard-to-reach details.', slug: 'crevice', icon: Sparkles },
  { title: 'Fabric refresh', copy: 'Quick clothing and household fabric care without the ironing-board ritual.', slug: 'garment-steamer', icon: Shirt },
  { title: 'Pet hair', copy: 'Reusable cleanup for sofas, bedding and suitable upholstery.', slug: 'pethair', icon: Wind },
  { title: 'Bathroom reset', copy: 'Tools built around tile, tubs, grout and repetitive scrubbing.', slug: 'scrubber', icon: Droplets },
];

function ProductCard({ product, compact = false }: { product: typeof products[number]; compact?: boolean }) {
  const Icon = product.icon;
  return (
    <article className={'productCard ' + (compact ? 'productCardCompact' : '')}>
      <a className={'productVisual tone-' + product.tone} href={'/' + product.slug + '/'} aria-label={'View ' + product.name}>
        <span className='visualHalo' />
        <Icon size={compact ? 42 : 58} strokeWidth={1.35} aria-hidden='true' />
        <span className='visualBadge'>{product.badge}</span>
      </a>
      <div className='productBody'>
        <div className='productMeta'><span>{product.category}</span><span>{product.price}</span></div>
        <h3><a href={'/' + product.slug + '/'}>{product.name}</a></h3>
        <p>{product.description}</p>
        <div className='productActions'>
          <a className='textLink' href={'/' + product.slug + '/'}>Explore product <ArrowRight size={16} /></a>
          <a className='softButton' href={'/contact/?product=' + product.slug}>Check availability</a>
        </div>
      </div>
    </article>
  );
}

export default function Storefront({ source = 'direct' }: { source?: string }) {
  const canonical = source === 'tiktok' ? 'https://prismbay-clean-49izhg.v2.appdeploy.ai/tiktok/' : 'https://prismbay-clean-49izhg.v2.appdeploy.ai/';
  return (
    <>
      <Head>
        <title>PrismBay Clean | Smarter Tools for Everyday Messes</title>
        <meta name='description' content='Discover practical cleaning, fabric-care and home tools selected to solve specific everyday problems without unnecessary clutter.' />
        <meta name='robots' content='index,follow,max-image-preview:large' />
        <meta name='theme-color' content='#17372f' />
        <link rel='canonical' href={canonical} />
      </Head>

      <div className='storefront'>
        <div className='announcement'>
          <div className='storeWrap announcementInner'>
            <span><Truck size={15} /> U.S. launch · destination shipping confirmed before payment</span>
            <a href='/shipping/'>Shipping details <ChevronRight size={14} /></a>
          </div>
        </div>

        <header className='storeHeader'>
          <div className='storeWrap navBar'>
            <a className='logoLockup' href='/'>
              <span className='logoMark'><Sparkles size={19} /></span>
              <span>PrismBay <b>Clean</b></span>
            </a>
            <nav className='desktopNav' aria-label='Main navigation'>
              <a href='#shop'>Shop</a>
              <a href='#problems'>Shop by problem</a>
              <a href='#why'>Why PrismBay</a>
              <a href='#faq'>FAQ</a>
            </nav>
            <a className='navCta' href='#shop'>Shop tools <ArrowRight size={16} /></a>
          </div>
        </header>

        <main>
          <section className='heroSection'>
            <div className='storeWrap heroGrid'>
              <div className='heroCopy'>
                <div className='eyebrowPill'><span /> CLEANING, WITHOUT THE CLUTTER</div>
                <h1>Everyday mess.<br /><em>Better tools.</em></h1>
                <p className='heroLead'>A focused collection of practical problem-solvers for the awkward, repetitive and easy-to-ignore cleaning jobs around your home.</p>
                <div className='heroActions'>
                  <a className='primaryButton' href='#shop'>Shop the collection <ArrowRight size={18} /></a>
                  <a className='secondaryButton' href='#problems'>Find your problem</a>
                </div>
                <div className='heroTrust'>
                  <span><ShieldCheck size={17} /> Secure checkout path</span>
                  <span><PackageCheck size={17} /> Stock checked before fulfillment</span>
                  <span><CircleDollarSign size={17} /> Shipping confirmed first</span>
                </div>
              </div>

              <div className='heroVisual' aria-label='PrismBay Clean featured tool collection'>
                <div className='heroOrb heroOrbOne' />
                <div className='heroOrb heroOrbTwo' />
                <div className='floatingCard floatingCardMain'>
                  <div className='miniTop'><span>FEATURED PROBLEM-SOLVER</span><span>$12.95</span></div>
                  <div className='heroIconShell'><Sparkles size={78} strokeWidth={1.15} /></div>
                  <div>
                    <strong>Crevice Cleaning Brush</strong>
                    <small>Tracks · edges · tight gaps</small>
                  </div>
                </div>
                <div className='floatingCard floatingCardSide floatingCardA'>
                  <Shirt size={30} strokeWidth={1.4} />
                  <div><strong>Fabric care</strong><small>Steam. Refresh. Go.</small></div>
                </div>
                <div className='floatingCard floatingCardSide floatingCardB'>
                  <Wind size={30} strokeWidth={1.4} />
                  <div><strong>Pet hair</strong><small>Reusable cleanup.</small></div>
                </div>
                <div className='visualCaption'>Purposeful tools. Clear use cases. No fake hype.</div>
              </div>
            </div>
          </section>

          <section className='promiseStrip'>
            <div className='storeWrap promiseGrid'>
              <div><CheckCircle2 /><span><b>Curated, not crowded</b><small>Specific tools for specific jobs.</small></span></div>
              <div><ShieldCheck /><span><b>Transparent checkout</b><small>Availability and destination shipping first.</small></span></div>
              <div><PackageCheck /><span><b>Fulfillment checked</b><small>No silent supplier substitution.</small></span></div>
            </div>
          </section>

          <section id='shop' className='sectionBlock storeWrap'>
            <div className='sectionHeading'>
              <div><span className='sectionKicker'>THE COLLECTION</span><h2>Start with the jobs you actually have.</h2></div>
              <p>Useful tools, simple positioning, and no endless catalog of lookalikes.</p>
            </div>
            <div className='featuredGrid'>
              {products.slice(0, 3).map(product => <ProductCard product={product} key={product.slug} />)}
            </div>
            <div className='moreGrid'>
              {products.slice(3).map(product => <ProductCard compact product={product} key={product.slug} />)}
            </div>
          </section>

          <section id='problems' className='problemSection'>
            <div className='storeWrap'>
              <div className='sectionHeading inverseHeading'>
                <div><span className='sectionKicker'>SHOP BY PROBLEM</span><h2>What are you trying to fix?</h2></div>
                <p>Skip the category maze. Start with the frustration.</p>
              </div>
              <div className='problemGrid'>
                {problems.map(item => {
                  const Icon = item.icon;
                  return <a className='problemCard' href={'/' + item.slug + '/'} key={item.title}><span className='problemIcon'><Icon size={25} /></span><h3>{item.title}</h3><p>{item.copy}</p><span className='problemArrow'><ArrowRight size={18} /></span></a>;
                })}
              </div>
            </div>
          </section>

          <section id='why' className='storySection storeWrap'>
            <div className='storyCard'>
              <div className='storyCopy'>
                <span className='sectionKicker'>WHY PRISMBAY CLEAN</span>
                <h2>Less “viral product.” More “does this solve the job?”</h2>
                <p>We organize the store around practical use cases. Before a product moves toward live checkout, supplier identity, stock, shipping and commercial viability are checked behind the scenes.</p>
                <p>That means the customer-facing store stays simple while the operational complexity stays where it belongs: in the backend.</p>
                <a className='textLink storyLink' href='/shipping/'>How fulfillment works <ArrowRight size={16} /></a>
              </div>
              <div className='processStack'>
                <div><span>01</span><div><b>Find the problem</b><small>Start with a real household use case.</small></div></div>
                <div><span>02</span><div><b>Check the route</b><small>Supplier, stock and shipping are validated.</small></div></div>
                <div><span>03</span><div><b>Confirm before payment</b><small>Destination-specific fulfillment stays fail-closed.</small></div></div>
              </div>
            </div>
          </section>

          <section id='faq' className='faqSection storeWrap'>
            <div className='faqHeading'><span className='sectionKicker'>GOOD TO KNOW</span><h2>Simple answers before you buy.</h2></div>
            <div className='faqGrid'>
              <details><summary>Where do you currently ship?</summary><p>Launch orders are currently limited to eligible U.S. addresses. Availability and destination shipping are confirmed before payment is released.</p></details>
              <details><summary>Why do some products say “check availability”?</summary><p>Because PrismBay Clean does not want to present supplier stock or final shipping as guaranteed until the current route is verified for the order.</p></details>
              <details><summary>Are the trend labels customer reviews or sales claims?</summary><p>No. This storefront does not use fabricated reviews, fake sales counts or manufactured scarcity. Internal research signals stay off the customer page.</p></details>
              <details><summary>What if a supplier route cannot be confirmed?</summary><p>Checkout stays blocked rather than silently substituting an unverified route. See the shipping and returns pages for more information.</p></details>
            </div>
          </section>

          <section className='closingSection'>
            <div className='storeWrap closingCard'>
              <div><span className='sectionKicker'>READY WHEN YOU ARE</span><h2>Pick one annoying job.<br />Start there.</h2></div>
              <a className='lightButton' href='#shop'>Browse problem-solvers <ArrowRight size={18} /></a>
            </div>
          </section>
        </main>

        <footer className='storeFooter'>
          <div className='storeWrap footerGrid'>
            <div><a className='logoLockup footerLogo' href='/'><span className='logoMark'><Sparkles size={18} /></span><span>PrismBay <b>Clean</b></span></a><p>Practical tools for the cleaning jobs you would rather finish and move on from.</p></div>
            <div><b>Shop</b><a href='#shop'>Collection</a><a href='#problems'>By problem</a><a href='/tiktok/'>Social storefront</a></div>
            <div><b>Customer care</b><a href='/shipping/'>Shipping</a><a href='/returns/'>Returns</a><a href='/contact/'>Contact</a><a href='/privacy/'>Privacy</a></div>
          </div>
          <div className='storeWrap footerBottom'><span>© PrismBay Clean · operated by STUDYSMARTZ LLC</span><span>Clear products. Clear terms. No fake hype.</span></div>
        </footer>

        <div className='mobileShopBar'><span><b>PrismBay Clean</b><small>Problem-solving tools</small></span><a href='#shop'>Shop now <ArrowRight size={16} /></a></div>
      </div>
    </>
  );
}
