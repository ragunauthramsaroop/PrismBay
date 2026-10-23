import { useState } from 'react';
import Head from 'next/head';
import { ArrowRight, Bath, Car, CheckCircle2, ChevronRight, Droplets, Home, Leaf, LockKeyhole, PackageCheck, PawPrint, Search, Shirt, Sparkles, Truck, UserRound, Wind, Waves, ShoppingBag } from 'lucide-react';

const products = [
  { name: '3-in-1 Crevice Cleaning Brush', price: '$12.95', slug: 'crevice', category: 'Detail cleaning', description: 'A compact tool for tracks, edges, corners and narrow spaces ordinary brushes miss.', icon: Sparkles, tone: 'mint', badge: 'Featured' },
  { name: 'Portable Garment Steamer', price: '$29.95', slug: 'garment-steamer', category: 'Fabric care', description: 'Handheld steam care for clothing, travel and everyday household fabric touch-ups.', icon: Shirt, tone: 'sand', badge: 'Live checkout' },
  { name: 'Reusable Pet Hair Remover', price: '$14.95', slug: 'pethair', category: 'Pet home', description: 'Reusable manual cleanup for pet hair and lint on suitable fabric surfaces.', icon: Wind, tone: 'blue', badge: 'Reusable' },
  { name: '5-in-1 Electric Spin Scrubber', price: '$29.95', slug: 'scrubber', category: 'Bathroom', description: 'Multi-head powered scrubbing support for tubs, tile, grout and repetitive cleaning jobs.', icon: Droplets, tone: 'lavender', badge: 'Multi-surface' },
];

const categories = [
  { title: 'Kitchen', icon: Home, copy: 'Counters, sinks and daily cleanup.', tone: 'kitchen' },
  { title: 'Bathroom', icon: Bath, copy: 'Tile, tubs, grout and fixtures.', tone: 'bathroom' },
  { title: 'Floors', icon: Waves, copy: 'Quick maintenance for hard surfaces.', tone: 'floors' },
  { title: 'Windows', icon: Sparkles, copy: 'Tracks, glass edges and detail work.', tone: 'windows' },
  { title: 'Car interior', icon: Car, copy: 'Compact tools for cabin cleanup.', tone: 'car' },
  { title: 'Pet areas', icon: PawPrint, copy: 'Hair and lint on suitable surfaces.', tone: 'pet' },
];

function ProductCard({ product }: { product: typeof products[number] }) {
  const Icon = product.icon;
  const liveCheckout = product.slug === 'garment-steamer';
  const checkoutHref = liveCheckout ? '/garment-steamer/' : '/contact/?product=' + product.slug;
  return (
    <article className='retailProductCard'>
      <a className={'retailProductVisual tone-' + product.tone} href={'/' + product.slug + '/'}>
        <span className='retailBadge'>{product.badge}</span>
        <span className='productHalo' />
        <Icon size={78} strokeWidth={1.15} />
      </a>
      <div className='retailProductBody'>
        <span className='retailCategory'>{product.category}</span>
        <h3><a href={'/' + product.slug + '/'}>{product.name}</a></h3>
        <p>{product.description}</p>
        <div className='retailPrice'>{product.price}</div>
        <a className='retailBuy' href={checkoutHref}>{liveCheckout ? 'Check live availability' : 'Check availability'} <ArrowRight size={16} /></a>
      </div>
    </article>
  );
}

export default function Storefront({ source = 'direct' }: { source?: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const searchTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filteredProducts = products.filter(product => {
    const searchable = `${product.name} ${product.category} ${product.description}`.toLowerCase();
    return (category === 'All categories' || product.category === category) &&
      searchTerms.every(term => searchable.includes(term));
  });
  const clearFilters = () => { setQuery(''); setCategory('All categories'); };
  const canonical = source === 'tiktok' ? 'https://clean.prismbayai.com/tiktok/' : 'https://clean.prismbayai.com/';
  return (
    <>
      <Head>
        <title>PrismBay Clean | Everyday Mess. Better Tools.</title>
        <meta name='description' content='Practical cleaning, fabric-care and home tools selected around real everyday problems.' />
        <meta name='robots' content='index,follow,max-image-preview:large' />
        <meta name='theme-color' content='#174b38' />
        <link rel='canonical' href={canonical} />
      </Head>

      <div className='retailStore'>
        <div className='retailUtility'>
          <div className='retailWrap utilityInner'>
            <span><Truck size={14} /> U.S. launch</span><i />
            <span><PackageCheck size={14} /> Fulfillment checked</span><i />
            <span><LockKeyhole size={14} /> Secure checkout when approved</span>
          </div>
        </div>

        <header className='retailHeader'>
          <div className='retailWrap retailNav'>
            <a className='retailLogo' href='/'><span className='leafMark'><Leaf size={22} /></span><span>PrismBay<b>Clean</b><small>EVERYDAY MESS. BETTER TOOLS.</small></span></a>
            <nav className='retailLinks'><a href='/'>Home</a><a href='#shop'>Shop</a><a href='#problems'>By Problem</a><a href='#about'>About</a><a href='#faq'>FAQs</a></nav>
            <div className='retailActions'><a className='searchShell' href='#product-search'><span>Search cleaning solutions…</span><Search size={17} aria-hidden='true' /></a><a href='/contact/' aria-label='Account and support'><UserRound size={21} /></a><a href='#shop' aria-label='Shop'><ShoppingBag size={21} /></a></div>
          </div>
        </header>

        <main>
          <section className='retailHero'>
            <div className='retailWrap retailHeroGrid'>
              <div className='retailHeroCopy'>
                <span className='retailEyebrow'>A CLEANER, BRIGHTER HOME</span>
                <h1>Everyday mess.<br /><em>Better tools.</em></h1>
                <p>Smart, practical cleaning solutions for the awkward, repetitive and easy-to-ignore jobs around your home.</p>
                <a className='retailPrimary' href='#shop'>Shop featured tools <ArrowRight size={17} /></a>
                <div className='heroBenefits'>
                  <span><Truck size={24} /><b>Destination shipping</b><small>Confirmed before payment</small></span>
                  <span><PackageCheck size={24} /><b>Fulfillment checked</b><small>Stock and route reviewed</small></span>
                  <span><LockKeyhole size={24} /><b>Secure checkout</b><small>Enabled only when approved</small></span>
                </div>
              </div>
              <div className='retailHeroPhoto' role='img' aria-label='PrismBay Clean home cleaning lifestyle visual'><div className='photoFade' /></div>
            </div>
          </section>

          <section id='problems' className='categorySection retailWrap'>
            <div className='retailSectionTitle'><h2>Shop by Cleaning Problem</h2><p>Find the right tool for the mess in front of you.</p></div>
            <div className='categoryGrid'>{categories.map(item => { const Icon = item.icon; return <a className={'categoryTile cat-' + item.tone} href='#shop' key={item.title}><span className='categoryIcon'><Icon size={26} /></span><b>{item.title}</b><small>{item.copy}</small></a>; })}</div>
          </section>

          <section id='shop' className='featuredSection retailWrap'>
            <div className='featuredHeading'><div><h2>Featured Products</h2><p>Focused tools for specific everyday jobs.</p></div></div>
            <div className='catalogControls' role='search' aria-label='Find a cleaning tool'>
              <div className='catalogField'>
                <label htmlFor='product-search'>Search products</label>
                <input id='product-search' type='search' value={query} onChange={event => setQuery(event.target.value)} placeholder='Try pet hair or steamer' aria-controls='product-results' />
              </div>
              <div className='catalogField'>
                <label htmlFor='product-category'>Category</label>
                <select id='product-category' value={category} onChange={event => setCategory(event.target.value)} aria-controls='product-results'>
                  <option>All categories</option>
                  {Array.from(new Set(products.map(product => product.category))).map(value => <option key={value}>{value}</option>)}
                </select>
              </div>
              <button className='catalogReset' type='button' onClick={clearFilters} disabled={!query && category === 'All categories'}>Clear filters</button>
            </div>
            <p className='catalogResultCount' role='status' aria-live='polite' aria-atomic='true'>{filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found</p>
            <div id='product-results'>
              {filteredProducts.length > 0 ? (
                <div className='retailProductGrid'>{filteredProducts.map(product => <ProductCard product={product} key={product.slug} />)}</div>
              ) : (
                <div className='catalogEmpty'><h3>No matching products</h3><p>Try a different search or browse all our featured tools.</p><button className='catalogReset' type='button' onClick={clearFilters}>Show all products</button></div>
              )}
            </div>
          </section>

          <section id='about' className='lifestyleBand'>
            <div className='retailWrap lifestyleInner'>
              <div className='lifestyleCopy'><span>WHY PRISMBAY CLEAN</span><h2>A cleaner home.<br />Less guesswork.</h2><p>We keep the customer experience simple while stock, supplier route, shipping and commercial viability are checked behind the scenes.</p><a className='retailPrimary' href='#shop'>Shop now <ArrowRight size={17} /></a></div>
              <div className='lifestyleBenefits'><div><Leaf /><span><b>Practical by design</b><small>Products organized around real use cases.</small></span></div><div><Home /><span><b>For everyday homes</b><small>Simple tools for recurring cleaning jobs.</small></span></div><div><CheckCircle2 /><span><b>Clear terms</b><small>No fabricated reviews, stock or urgency.</small></span></div><div><Sparkles /><span><b>Modern & focused</b><small>A smaller catalog with clearer purpose.</small></span></div></div>
            </div>
          </section>

          <section className='trustSection retailWrap'>
            <h2>Why Choose PrismBay Clean?</h2>
            <div className='trustGrid'><div><Sparkles /><b>Focused Products</b><p>Selected around clear household problems.</p></div><div><Truck /><b>Route Checked</b><p>Shipping and supplier availability are verified before checkout is released.</p></div><div><PackageCheck /><b>Transparent Fulfillment</b><p>No silent supplier substitution.</p></div><div><UserRound /><b>Customer Support</b><p>Order and product support through PrismBay Clean.</p></div></div>
          </section>

          <section id='faq' className='retailFaq retailWrap'><h2>Good to know</h2><div className='faqGrid'><details><summary>Where do you currently ship?</summary><p>Launch orders are limited to eligible U.S. addresses. Destination shipping and fulfillment availability are confirmed before payment is released.</p></details><details><summary>Why does checkout sometimes require confirmation?</summary><p>Because PrismBay Clean keeps stock, supplier-route and final shipping claims fail-closed until they are verified for the order.</p></details><details><summary>Do you show fake reviews or fake sales counts?</summary><p>No. Customer-facing pages do not use fabricated reviews, sales counts, scarcity or stock claims.</p></details><details><summary>What happens if a supplier route fails?</summary><p>Checkout remains blocked or the route is replaced with another verified option rather than silently substituting an unverified product.</p></details></div></section>
        </main>

        <footer className='retailFooter'><div className='retailWrap footerGrid'><div><a className='retailLogo footerRetailLogo' href='/'><span className='leafMark'><Leaf size={21} /></span><span>PrismBay<b>Clean</b></span></a><p>Practical cleaning and home tools for everyday jobs.</p></div><div><b>Shop</b><a href='#shop'>Featured tools</a><a href='#problems'>By problem</a></div><div><b>Customer care</b><a href='/shipping/'>Shipping</a><a href='/returns/'>Returns</a><a href='/contact/'>Contact</a></div></div><div className='retailWrap retailFooterBottom'>© PrismBay Clean · operated by STUDYSMARTZ LLC</div></footer>
      </div>
    </>
  );
}
