import { FormEvent, useState } from 'react';
import Head from 'next/head';
import { CheckCircle2, Loader2, LockKeyhole, MapPin, PackageCheck, Shirt, Truck } from 'lucide-react';

type QuoteState = {
  ok: boolean;
  error?: string;
  freightUsd?: number | null;
  contributionUsd?: number | null;
  logisticsMethod?: string | null;
  deliveryEstimate?: string | null;
  quoteToken?: string | null;
  checkoutUrl?: string | null;
};

function messageFor(error?: string) {
  if (error === 'valid_us_zip_required') return 'Enter a valid 5-digit U.S. ZIP code.';
  if (error === 'quote_service_unreachable') return 'Live shipping verification is temporarily unavailable. Please try again.';
  if (error === 'shipping_quotes_not_configured') return 'This product is not ready for live destination quoting yet.';
  if (error === 'quote_unavailable') return 'No approved shipping route is available for this ZIP right now.';
  return 'We could not approve this destination yet. No payment was taken.';
}

export default function GarmentSteamer() {
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteState | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setQuote(null);
    try {
      const response = await fetch('/api/shipping-quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sku: 'garment-steamer', zip, quantity: 1 }),
      });
      const data = await response.json();
      setQuote(data);
    } catch {
      setQuote({ ok: false, error: 'quote_service_unreachable' });
    } finally {
      setLoading(false);
    }
  }

  return <>
    <Head>
      <title>Portable Garment Steamer | PrismBay Clean</title>
      <meta name='description' content='Check live U.S. destination shipping for the PrismBay Clean Portable Garment Steamer before payment.' />
      <meta name='robots' content='index,follow,max-image-preview:large' />
    </Head>
    <main style={{maxWidth:1080,margin:'0 auto',padding:'48px 24px 80px',fontFamily:'Arial, sans-serif',color:'#173a2f'}}>
      <a href='/' style={{color:'#174b38',textDecoration:'none'}}>← PrismBay Clean</a>
      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:40,alignItems:'start',marginTop:32}}>
        <div style={{background:'#f4efe5',borderRadius:28,padding:48,minHeight:420,display:'grid',placeItems:'center'}}>
          <Shirt size={140} strokeWidth={1.1} />
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:1.4,color:'#527467'}}>FABRIC CARE</div>
          <h1 style={{fontSize:48,lineHeight:1.02,margin:'12px 0'}}>Portable Garment Steamer</h1>
          <div style={{fontSize:30,fontWeight:700,marginBottom:18}}>USD 29.95</div>
          <p style={{fontSize:18,lineHeight:1.6,color:'#476158'}}>Handheld steam care for clothing, travel and everyday household fabric touch-ups.</p>
          <div style={{display:'grid',gap:12,margin:'28px 0'}}>
            <span style={{display:'flex',gap:10,alignItems:'center'}}><PackageCheck size={20}/> Supplier variant checked before checkout</span>
            <span style={{display:'flex',gap:10,alignItems:'center'}}><Truck size={20}/> Destination freight checked for your ZIP</span>
            <span style={{display:'flex',gap:10,alignItems:'center'}}><LockKeyhole size={20}/> Payment stays blocked until commercial checks pass</span>
          </div>
          <form onSubmit={submit} style={{border:'1px solid #d8e1dc',borderRadius:20,padding:22,background:'#fff'}}>
            <label htmlFor='zip' style={{display:'block',fontWeight:700,marginBottom:8}}>Check shipping to your U.S. ZIP</label>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <div style={{position:'relative',flex:'1 1 180px'}}>
                <MapPin size={18} style={{position:'absolute',left:14,top:15,color:'#527467'}} />
                <input id='zip' inputMode='numeric' autoComplete='postal-code' maxLength={5} value={zip} onChange={e=>setZip(e.target.value.replace(/\D/g,'').slice(0,5))} placeholder='e.g. 10001' style={{width:'100%',boxSizing:'border-box',padding:'14px 14px 14px 42px',border:'1px solid #b9c9c0',borderRadius:12,fontSize:16}} />
              </div>
              <button type='submit' disabled={loading || zip.length !== 5} style={{border:0,borderRadius:12,padding:'14px 20px',fontWeight:700,background:'#174b38',color:'#fff',cursor:'pointer',minWidth:170}}>{loading ? <span style={{display:'inline-flex',gap:8,alignItems:'center'}}><Loader2 size={18}/> Checking</span> : 'Check availability'}</button>
            </div>
            <p style={{fontSize:13,color:'#667d74',marginBottom:0}}>No payment is taken during this check.</p>
          </form>
          {quote?.ok ? <div style={{marginTop:18,padding:20,borderRadius:16,background:'#edf7f1',border:'1px solid #b8ddc7'}}>
            <div style={{display:'flex',gap:8,alignItems:'center',fontWeight:700}}><CheckCircle2 size={20}/> Destination route approved</div>
            {typeof quote.freightUsd === 'number' ? <p>Verified shipping: USD {quote.freightUsd.toFixed(2)}</p> : <p>Live supplier and destination checks passed.</p>}
            {quote.deliveryEstimate ? <p>Estimated transit: {quote.deliveryEstimate}</p> : null}
            {quote.checkoutUrl ? <a href={quote.checkoutUrl} rel='nofollow' style={{display:'inline-block',marginTop:8,padding:'13px 18px',background:'#174b38',color:'#fff',borderRadius:11,textDecoration:'none',fontWeight:700}}>Continue to secure checkout</a> : <p style={{marginBottom:0}}>Checkout approval is pending final authorization. No payment link has been released.</p>}
          </div> : null}
          {quote && !quote.ok ? <div style={{marginTop:18,padding:18,borderRadius:14,background:'#fff7ed',border:'1px solid #f0d5ad'}}>{messageFor(quote.error)}</div> : null}
        </div>
      </section>
    </main>
  </>;
}
