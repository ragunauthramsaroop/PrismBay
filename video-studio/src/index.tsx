import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  Img,
  interpolate,
  registerRoot,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Product = {
  id: string;
  name: string;
  kicker: string;
  price: string;
  imageUrl: string;
  benefit: string;
  uses: string[];
  accent: string;
};

const products: Product[] = [
  {
    id: 'CreviceBrushPremium',
    name: '3-in-1 Crevice Cleaning Brush',
    kicker: 'DETAIL CLEANING, REFINED',
    price: '$12.95',
    imageUrl: 'https://prismbay-clean-global.floot.app/_cdn/static/2e2181bb-5561-4acb-b30e-38c49b34ac9a.png',
    benefit: 'Built for the narrow spaces ordinary cleaning tools miss.',
    uses: ['Window tracks', 'Sink edges', 'Tight corners'],
    accent: '#39E7D0',
  },
  {
    id: 'GarmentSteamerPremium',
    name: 'Portable Garment Steamer',
    kicker: 'READY WHEN YOUR WARDROBE ISN’T',
    price: '$29.95',
    imageUrl: 'https://prismbay-clean-global.floot.app/_cdn/static/b57838ed-657b-4fb3-864a-c827a7580758.png',
    benefit: 'A compact clothing refresh for home, travel and last-minute touch-ups.',
    uses: ['Quick refresh', 'Travel ready', 'Compact care'],
    accent: '#8EC5FF',
  },
  {
    id: 'SpinScrubberPremium',
    name: '5-in-1 Electric Spin Scrubber',
    kicker: 'POWER THROUGH THE REPETITIVE WORK',
    price: '$29.95',
    imageUrl: 'https://prismbay-clean-global.floot.app/_cdn/static/fb8dd62e-2f7c-4611-9f7a-0049bb3cd1bc.png',
    benefit: 'Powered scrubbing support for tile, tubs, sinks and grout.',
    uses: ['Tile', 'Tubs', 'Grout'],
    accent: '#B6FF6A',
  },
];

const FONT = 'Arial, Helvetica, sans-serif';

const PremiumProductShort: React.FC<Product> = (product) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const hero = spring({frame, fps, config: {damping: 18, mass: 0.9, stiffness: 110}});
  const titleIn = spring({frame: frame - 20, fps, config: {damping: 16, stiffness: 120}});
  const detailsIn = spring({frame: frame - 92, fps, config: {damping: 18, stiffness: 110}});
  const priceIn = spring({frame: frame - 250, fps, config: {damping: 14, stiffness: 130}});
  const ctaIn = spring({frame: frame - 330, fps, config: {damping: 16, stiffness: 120}});

  const glowX = interpolate(frame, [0, 450], [-120, 260]);
  const glowY = interpolate(frame, [0, 450], [180, -100]);
  const imageScale = 0.92 + hero * 0.08 + Math.sin(frame / 26) * 0.006;
  const imageRotate = interpolate(hero, [0, 1], [-5, 0]);
  const panelShift = interpolate(detailsIn, [0, 1], [90, 0]);
  const endDim = interpolate(frame, [405, 450], [0, 0.2], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: '#071016', color: '#F7FBFC', fontFamily: FONT, overflow: 'hidden'}}>
      <Audio src={staticFile('prismbay-original.wav')} volume={0.14} />

      <AbsoluteFill style={{
        background: `radial-gradient(circle at ${45 + glowX / 20}% ${48 + glowY / 20}%, ${product.accent}2E 0%, transparent 32%), linear-gradient(155deg, #09141B 0%, #071016 58%, #020608 100%)`,
      }} />
      <AbsoluteFill style={{opacity: 0.26, backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)', backgroundSize: '58px 58px'}} />

      <div style={{position: 'absolute', left: 72, top: 72, fontSize: 34, fontWeight: 800, letterSpacing: 5}}>PRISMBAY <span style={{color: product.accent}}>CLEAN</span></div>
      <div style={{position: 'absolute', right: 72, top: 82, fontSize: 19, opacity: 0.58, letterSpacing: 2.8}}>SMARTER HOME ESSENTIALS</div>

      <div style={{position: 'absolute', left: 72, top: 180, width: 790, opacity: titleIn, transform: `translateY(${interpolate(titleIn,[0,1],[48,0])}px)`}}>
        <div style={{fontSize: 23, color: product.accent, fontWeight: 800, letterSpacing: 4.2, marginBottom: 24}}>{product.kicker}</div>
        <div style={{fontSize: 82, lineHeight: 0.98, fontWeight: 900, letterSpacing: -4.5}}>{product.name}</div>
      </div>

      <div style={{position: 'absolute', left: 78, top: 595, width: 920, height: 760, borderRadius: 54, background: 'linear-gradient(145deg, rgba(255,255,255,.115), rgba(255,255,255,.035))', border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 55px 140px rgba(0,0,0,.52)', overflow: 'hidden', transform: `scale(${0.94 + hero * 0.06})`}}>
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 65% 28%, ${product.accent}26, transparent 38%)`}} />
        <Img src={product.imageUrl} style={{position: 'absolute', width: '78%', height: '78%', left: '11%', top: '10%', objectFit: 'contain', transform: `scale(${imageScale}) rotate(${imageRotate}deg)`, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.35))'}} />
        <div style={{position: 'absolute', left: 34, bottom: 30, padding: '16px 24px', borderRadius: 999, background: 'rgba(3,10,14,.74)', border: `1px solid ${product.accent}55`, fontSize: 18, fontWeight: 800, letterSpacing: 2.4}}>EXACT PRODUCT • NO SIMULATED DEMO</div>
      </div>

      <div style={{position: 'absolute', left: 72, top: 1405, width: 936, opacity: detailsIn, transform: `translateX(${panelShift}px)`}}>
        <div style={{fontSize: 30, lineHeight: 1.34, fontWeight: 600, color: '#DDE7EA'}}>{product.benefit}</div>
        <div style={{display: 'flex', gap: 16, marginTop: 28}}>
          {product.uses.map((use, i) => (
            <div key={use} style={{padding: '18px 22px', borderRadius: 18, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.10)', fontSize: 21, fontWeight: 800, opacity: Math.max(0, Math.min(1, detailsIn - i * 0.12))}}>{use}</div>
          ))}
        </div>
      </div>

      <div style={{position: 'absolute', left: 72, bottom: 180, display: 'flex', alignItems: 'end', gap: 26, opacity: priceIn, transform: `translateY(${interpolate(priceIn,[0,1],[55,0])}px)`}}>
        <div>
          <div style={{fontSize: 18, opacity: 0.58, letterSpacing: 3.4, fontWeight: 800}}>CURRENT PRICE</div>
          <div style={{fontSize: 92, lineHeight: 1, fontWeight: 900, color: product.accent, letterSpacing: -4}}>{product.price}</div>
        </div>
        <div style={{fontSize: 19, opacity: 0.56, paddingBottom: 12}}>No unverified sale claims.</div>
      </div>

      <div style={{position: 'absolute', right: 72, bottom: 188, opacity: ctaIn, transform: `scale(${0.92 + ctaIn * 0.08})`, transformOrigin: 'right center'}}>
        <div style={{padding: '22px 30px', borderRadius: 22, background: product.accent, color: '#071016', fontSize: 24, fontWeight: 900, letterSpacing: -0.5}}>SHOP PRISMBAY CLEAN</div>
        <div style={{textAlign: 'right', marginTop: 15, fontSize: 20, fontWeight: 700, opacity: 0.82}}>clean.prismbayai.com</div>
      </div>

      <AbsoluteFill style={{background: `rgba(0,0,0,${endDim})`}} />
    </AbsoluteFill>
  );
};

const Root: React.FC = () => (
  <>
    {products.map((product) => (
      <Composition
        key={product.id}
        id={product.id}
        component={PremiumProductShort}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={product}
      />
    ))}
  </>
);

registerRoot(Root);
