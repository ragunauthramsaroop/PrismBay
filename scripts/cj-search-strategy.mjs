// Conservative alternate sourcing for the existing CJ read-only verifier.
// Search terms change recall only. Every returned product must still pass
// strict name, sale-status, stock and positive-price checks before inspection.
const alternates = Object.freeze({
  'scrubber':[
    'cordless electric spin scrubber cleaning brush',
    'electric bathroom tile scrubber',
    'electric shower cleaning brush cordless',
    'powered rotating cleaning brush bathroom',
  ],
  'pethair':[
    'reusable pet hair lint roller remover',
    'pet fur remover roller sofa',
    'washable pet hair remover roller',
    'pet lint remover brush furniture',
  ],
  'crevice':[
    'gap cleaning brush crevice tool',
    'window track groove cleaning brush',
    'narrow gap cleaning brush kitchen',
    'crevice cleaning brush household',
  ],
  'pressure-washer':[
    'battery portable pressure washer',
    'cordless car pressure washer',
    'cordless high pressure water gun washer',
    'rechargeable portable car washer',
  ],
  'mattress-vacuum':[
    'bed mattress vacuum cleaner',
    'handheld mattress dust vacuum',
    'mattress mite vacuum cleaner',
    'bed dust mite remover vacuum',
  ],
  'garment-steamer':[
    'handheld clothes steamer portable',
    'travel garment steam iron',
    'portable clothing steamer handheld',
    'mini garment steam iron travel',
  ],
  'mini-mop':[
    'compact squeeze mini mop',
    'small self squeeze cleaning mop',
    'portable mini squeeze mop',
    'mini sponge mop self squeeze',
  ],
  'drain-catcher':[
    'sink drain strainer catcher',
    'kitchen sink drain filter basket',
    'silicone sink drain hair catcher',
    'sink drain strainer filter kitchen',
  ],
  'home-caddy':[
    'portable cleaning caddy organizer',
    'cleaning supplies storage caddy',
    'plastic cleaning carry caddy handle',
    'household cleaning basket organizer caddy',
  ],
  'cordless-handheld-vacuum':[
    'cordless portable handheld car vacuum cleaner',
    'mini cordless hand vacuum cleaner',
    'rechargeable handheld vacuum cleaner',
    'portable car vacuum cordless handheld',
  ],
  'hanging-closet-organizer':[
    'hanging closet shelf storage organizer',
    'wardrobe hanging storage shelves organizer',
    'fabric hanging closet organizer shelves',
    'hanging wardrobe organizer storage shelf',
  ],
  'roll-up-dish-rack':[
    'silicone roll up dish drying rack',
    'over sink roll up drying rack',
    'folding dish drying rack over sink',
    'rollable kitchen sink drying rack',
  ],
  'extendable-high-zone-duster':['telescopic microfiber duster','extendable long reach dusting cleaner'],
  'dryer-vent-cleaner-kit':['dryer vent lint cleaning brush kit','dryer duct lint cleaner brush'],
  'self-standing-floor-mop':['self standing floor mop','upright standing flat mop'],
  'window-washer-squeegee':['window glass washer squeegee','window cleaning squeegee washer'],
  'appliance-cord-organizer':['kitchen appliance cord organizer','adhesive cord wrapper holder appliance'],
  'rug-grippers':['non slip rug gripper adhesive','rug corner gripper pads'],
  'bottle-brush-set':['bottle cleaning brush set','water bottle cleaning brush kit'],
  'sheet-laundry-detangler':['bed sheet laundry detangler','laundry sheet anti tangle ball'],
  'pan-scraper':['non scratch pot pan scraper','cookware dish pan cleaning scraper'],
});

export function candidateSearches(candidate) {
  const primary = typeof candidate?.query === 'string' ? candidate.query.trim() : '';
  if (!primary || primary.length > 100) return [];
  const extras = alternates[String(candidate?.slug || '')] || [];
  const seen = new Set();
  return [primary, ...extras].filter(query => {
    const key = String(query || '').trim().toLowerCase();
    if (!key || key.length > 100 || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

export function uniqueEligibleProducts(productLists, limit = 3) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 3) throw new Error('Invalid candidate inspection limit');
  const out=[], seen=new Set();
  for (const products of productLists) {
    for (const product of products) {
      const id=String(product?.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);out.push(product);
      if (out.length>=limit) return out;
    }
  }
  return out;
}

export function selectBestInspection(results) {
  if (!Array.isArray(results) || results.length===0) return null;
  // No amount of warehouse inventory can replace verified variant stock
  // or a genuinely priced freight estimate.
  const grade=r=>Number(Boolean(r.freightVerified))*4+
    Number(Boolean(r.variantInventoryVerified))*2+
    Number(Boolean(r.supplierVerified));
  return [...results].sort((a,b)=>grade(b)-grade(a))[0];
}
