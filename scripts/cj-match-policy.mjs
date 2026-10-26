// Fail-closed product identity checks. Keyword search alone is never a supplier match.
// No product reaches checkout, even on an identity match, without separate stock,
// freight, media-rights, pricing and commercial approval.
const policy = Object.freeze({
  'scrubber': { required: [/\b(scrubber|scrubbing)\b/i, /\b(electric|spin|rotat\w*|powered|cordless)\b/i], excluded: [/\b(replacement|brush heads?|accessor(?:y|ies)|pad only)\b/i] },
  'pethair': { required: [/\b(pet|dog|cat)\b/i, /\b(hair|fur|lint)\b/i, /\b(remover|roller|brush|cleaner)\b/i], excluded: [/\b(vacuum|grooming|deshedding|shampoo)\b/i] },
  'crevice': { required: [/\b(crevice|gap|groove)\b/i, /\b(clean\w*|brush|scrub\w*)\b/i], excluded: [/\b(vacuum|nozzle|attachment|toilet)\b/i] },
  'pressure-washer': { required: [/\b(pressure|power)\s+washer\b/i, /\b(cordless|battery|portable|recharge\w*)\b/i], excluded: [/\b(nozzle|hose|adapter|pump|replacement|gun only)\b/i] },
  'mattress-vacuum': { required: [/\b(mattress|bed)\b/i, /\b(vacuum|vac)\b/i], excluded: [/\b(cover|storage bag|air pump|shop[\s-]*vac|wet[\s/-]*dry)\b/i] },
  'garment-steamer': { required: [/\b(garment|clothes|clothing)\b/i, /\b(steamer|steam iron)\b/i], excluded: [/\b(facial|food|wallpaper|replacement|accessor(?:y|ies)|nozzle only|hose only)\b/i] },
  'mini-mop': { required: [/\bmop\b/i, /\b(mini|compact|small|self[\s-]*squeez\w*)\b/i], excluded: [/\b(robot|replacement|refill|pad only)\b/i] },
  'drain-catcher': { required: [/\b(sink|drain)\b/i, /\b(catcher|strainer|filter|basket)\b/i], excluded: [/\b(sewer machine|drain snake|auger)\b/i] },
  'home-caddy': { required: [/\bcaddy\b/i, /\b(clean\w*|supply|storage|organizer|home)\b/i], excluded: [/\b(shower|golf|baby|stroller)\b/i] },
  'cordless-handheld-vacuum': { required: [/\b(vacuum|vac)\b/i, /\b(handheld|hand-held|cordless)\b/i], excluded: [/\b(shop[\s-]*vac|wet[\s/-]*dry|gallon|industrial|canister|upright|robot|paint sprayer)\b/i] },
  'extendable-high-zone-duster': { required: [/\bduster\b/i, /(extend|telescop|high[\s-]*zone|long[\s-]*reach)/i], excluded: [/\b(feather costume|paint roller)\b/i] },
  'dryer-vent-cleaner-kit': { required: [/\b(dryer|lint)\b/i, /\b(vent|duct)\b/i, /\b(clean|brush|kit)\b/i], excluded: [/\b(dryer machine|hair dryer)\b/i] },
  'self-standing-floor-mop': { required: [/\bmop\b/i, /\b(stand|self[\s-]*standing|upright)\b/i], excluded: [/\b(robot|vacuum)\b/i] },
  'window-washer-squeegee': { required: [/\b(window|glass)\b/i, /\b(wash|squeegee|clean)\b/i], excluded: [/\b(car windshield replacement|paint)\b/i] },
  'roll-up-dish-rack': { required: [/\b(dish|drying)\b/i, /\brack\b/i, /\b(roll[\s-]*up|foldable|folding|silicone)\b/i], excluded: [/\b(shoe|sneaker|flower print|clothes rack)\b/i] },
  'appliance-cord-organizer': { required: [/\b(cord|cable)\b/i, /\b(organizer|holder|wrap|clip)\b/i], excluded: [/\b(electrical junction|wall wiring)\b/i] },
  'rug-grippers': { required: [/\b(rug|carpet)\b/i, /\b(grippers?|grip[\s-]*pads?|tape|corner[\s-]*(?:pads?|stickers?))\b/i], excluded: [/\b(carpet cleaner|vacuum)\b/i] },
  'bottle-brush-set': { required: [/\bbottle\b/i, /\bbrush\b/i], excluded: [/\b(electric toothbrush|paint brush)\b/i] },
  'sheet-laundry-detangler': { required: [/\b(sheet|laundry)\b/i, /\b(detangl|tangle|twist|ball)\b/i], excluded: [/\b(hair|pet grooming)\b/i] },
  'hanging-closet-organizer': { required: [/\b(closet|wardrobe)\b/i, /\b(hanging|hangable|suspended)\b/i, /\b(organizer|shelf|storage)\b/i], excluded: [/\b(jewelry|mirror|cabinet|lockable|wall[\s-]*door)\b/i] },
  'pan-scraper': { required: [/\b(pan|pot|cookware|dish)\b/i, /\b(scrap\w*|scrub\w*)\b/i], excluded: [/\b(paint|wallpaper|industrial)\b/i] },
  'car-seat-headrest-hooks': { required: [/\b(car|auto|vehicle)\b/i, /\bheadrest\b/i, /\b(hooks?|hangers?)\b/i], excluded: [/\b(wall|bathroom|coat rack|replacement headrest)\b/i] },
  'microfiber-car-detailing-cloths': { required: [/\bmicrofiber\b/i, /\b(car|auto|vehicle|detailing)\b/i, /\b(cloths?|towels?|rags?)\b/i], excluded: [/\b(mop|replacement pad|bath towel|clothing)\b/i] },
  'knife-cleaning-brush': { required: [/\b(knife|cutlery|flatware)\b/i, /\bbrush\b/i, /\b(clean|washing|scrub)\w*\b/i], excluded: [/\b(electric toothbrush|hair|paint|makeup)\b/i] },
  'car-trash-can': { required: [/\b(car|auto|vehicle)\b/i, /\b(trash|garbage|waste)\b/i, /\b(can|bin|container)\b/i], excluded: [/\b(kitchen|outdoor wheelie|dumpster)\b/i] },
  'collapsible-microwave-cover': { required: [/\bmicrowave\b/i, /\bcover\b/i, /\b(collapsible|foldable|food|plate)\b/i], excluded: [/\b(replacement part|waveguide|motor|oven appliance)\b/i] },
  'toilet-scrubber-kit': { required: [/\btoilet\b/i, /\b(scrubber|brush|wand)\b/i, /\b(kit|refill|clean\w*|system)\b/i], excluded: [/\b(plunger|auger|snake|bidet|seat cover)\b/i] },
  'insulated-tumbler': { required: [/\b(tumbler|travel mug)\b/i, /\b(insulated|stainless|thermal|vacuum)\b/i], excluded: [/\b(lid only|replacement|straw only|handle only|blank decal|vinyl sticker)\b/i] },
  'screen-protector': { required: [/\b(screen|display)\b/i, /\bprotector\b/i, /\b(phone|iphone|samsung|galaxy|smartphone)\b/i], excluded: [/\b(camera lens|watch|tablet|installation kit|replacement adhesive)\b/i] },
  'multiport-charger': { required: [/\b(usb[ -]?c|type[ -]?c)\b/i, /\b(charger|charging station)\b/i, /\b(multi[ -]?port|[23456][ -]?ports?|multiple ports?)\b/i], excluded: [/\b(cable only|cord only|case|cover|replacement cable|car charger|vehicle charger|automotive|cigarette lighter|mp3 player)\b/i] },
  'motion-sensor-cabinet-lights': { required: [/\b(motion[ -]?sensor|motion[ -]?activated|pir)\b/i, /\b(cabinet|closet|wardrobe|under[ -]?cabinet)\b/i, /\b(light|lighting|lamp)\b/i], excluded: [/\b(replacement|bulb only|wiring kit|switch only|sensor only)\b/i] },
  'car-phone-mount': { required: [/\b(car|vehicle|auto|dashboard|windshield)\b/i, /\b(phone|smartphone|mobile)\b/i, /\b(mount|holder|cradle)\b/i], excluded: [/\b(motorcycle|bicycle|tripod|desk stand|replacement pad)\b/i] },
  'travel-packing-cubes': { required: [/\b(packing|travel|luggage)\b/i, /\b(packing\s+cubes?|packing\s+organizer\s+bags?|luggage\s+organizer\s+cubes?)\b/i], excluded: [/\b(vacuum sealer|storage boxes|shoe rack|cosmetic case only|electronics|cable|charger|gadget|digital storage)\b/i] },
  'mini-bag-sealer': { required: [/\b(bag|plastic|snack)\b/i, /\bseal(?:er|ing)\b/i, /\b(mini|portable|handheld|recharge\w*)\b/i], excluded: [/\b(vacuum sealer machine|industrial|impulse tabletop)\b/i] },
});

// A supplier title without the live offer's explicit component/pack count
// cannot establish exact configuration identity. Recheck variant specifications
// and fulfillment separately, even when the advertised count matches.
const liveOfferConfigurations = Object.freeze({
  'crevice': { expected: 3, pattern: /\b(\d{1,2})\s*[- ]?in\s*[- ]?1\b/i },
  'drain-catcher': { expected: 2, pattern: /\b(\d{1,2})\s*[- ]?(?:pcs?|pieces?|packs?|pk|count|ct)\b/i },
});

function lacksExactLiveOfferConfiguration(slug, name) {
  const config = liveOfferConfigurations[slug];
  if (!config) return false;
  const match = name.match(config.pattern);
  return !match || Number(match[1]) !== config.expected;
}

export function hasApprovedProductClass(slug) {
  return Object.prototype.hasOwnProperty.call(policy, String(slug || ''));
}

export function matchesIntendedProduct(candidate, name) {
  const rule = policy[String(candidate?.slug || '')];
  if (!rule || typeof name !== 'string' || !name.trim() || name.length > 500) return false;
  return rule.required.every(pattern => pattern.test(name)) &&
    !rule.excluded.some(pattern => pattern.test(name)) &&
    !lacksExactLiveOfferConfiguration(String(candidate.slug), name);
}

export function approvedClassCount() { return Object.keys(policy).length; }
