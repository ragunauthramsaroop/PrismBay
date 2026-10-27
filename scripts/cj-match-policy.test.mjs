import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesIntendedProduct,hasApprovedProductClass,approvedClassCount} from './cj-match-policy.mjs';

test('every live and research category has an explicit positive identity policy',()=>{
 const positives=[
 ['scrubber','Electric Spin Scrubber Cleaning Tool'],['pethair','Reusable Pet Hair Remover Roller'],['crevice','3-in-1 Gap Crevice Cleaning Brush'],['pressure-washer','Cordless Portable Pressure Washer'],['mattress-vacuum','Mattress Bed Vacuum Cleaner'],['garment-steamer','Portable Garment Clothes Steamer'],['mini-mop','Mini Self Squeeze Mop'],['drain-catcher','2-Pack Sink Drain Strainer Catcher'],['home-caddy','Portable Cleaning Supply Caddy'],['cordless-handheld-vacuum','Cordless Portable Handheld Vacuum Cleaner'],['extendable-high-zone-duster','Extendable High Reach Microfiber Duster'],['dryer-vent-cleaner-kit','Dryer Vent Cleaning Brush Kit'],['self-standing-floor-mop','Self Standing Floor Mop'],['window-washer-squeegee','Window Washer Squeegee Cleaner'],['roll-up-dish-rack','Roll-Up Dish Drying Rack'],['appliance-cord-organizer','Kitchen Appliance Cord Organizer Holder'],['rug-grippers','Non-slip Rug Grippers'],['rug-grippers','Reusable Adhesive Carpet Gripper'],['rug-grippers','Non Slip Rug Corner Pads'],['bottle-brush-set','Bottle Brush Cleaning Set'],['sheet-laundry-detangler','Sheet Laundry Detangler Ball'],['hanging-closet-organizer','Hanging Closet Shelf Storage Organizer'],['pan-scraper','Non-Scratch Pan Scraper'],
 ['car-seat-headrest-hooks','Car Seat Headrest Bag Hooks'],['microfiber-car-detailing-cloths','Microfiber Car Detailing Cleaning Towels'],['knife-cleaning-brush','Knife Cutlery Cleaning Brush'],['car-trash-can','Compact Car Trash Can Bin'],['collapsible-microwave-cover','Collapsible Microwave Food Cover'],['toilet-scrubber-kit','Disposable Toilet Scrubber Brush Cleaning Kit'],['mini-bag-sealer','Portable Mini Snack Bag Sealer'],
 ['insulated-tumbler','Insulated Stainless Steel Tumbler'],['screen-protector','iPhone Screen Protector for Phone'],['multiport-charger','USB-C Charger With 4 Ports'],['motion-sensor-cabinet-lights','Motion Sensor Under Cabinet LED Light'],['car-phone-mount','Car Phone Mount Holder'],['travel-packing-cubes','Travel Packing Cubes Set']
 ];
 assert.equal(approvedClassCount(),34);
 for(const [slug,name] of positives){ assert.equal(hasApprovedProductClass(slug),true,slug); assert.equal(matchesIntendedProduct({slug},name),true,slug+' '+name); }
});

test('rejects known CJ and category false positives',()=>{
 const negatives=[
 ['scrubber','Electric Spin Scrubber Replacement Brush Heads'],['pethair','Pet Grooming Deshedding Brush'],['crevice','Vacuum Crevice Nozzle Attachment'],['pressure-washer','Cordless Pressure Washer Nozzle Replacement'],['mattress-vacuum','Mattress Storage Bag'],['garment-steamer','Facial Steamer'],['garment-steamer','Garment Steamer Replacement Nozzle Only'],['garment-steamer','Clothes Steamer Accessory Hose Only'],['mini-mop','Mini Mop Replacement Pad Only'],['drain-catcher','Drain Snake Auger'],['home-caddy','Shower Caddy Organizer'],['cordless-handheld-vacuum','VEVOR Wet Dry Vac, 2.6 Gallon, Portable Shop Vacuum'],['hanging-closet-organizer','Wall-door Mounted Jewelry Wardrobe Large Capacity Mirror And LED Light Lockable Organizer'],['cordless-handheld-vacuum','VEVOR Stand Airless Paint Sprayer'],['hanging-closet-organizer','Shoe Cabinet With 2 Flip Drawers'],['roll-up-dish-rack','Flower Print Lace-up Sneakers'],['rug-grippers','Kitchen Rug Sets Of 3 Washable Boho Kitchen Rugs And Runner Carpets Non Slip Kitchen Area Rug For Laundry Room Entryway Hallway'],
 ['car-seat-headrest-hooks','Bathroom Wall Hook Rack'],['microfiber-car-detailing-cloths','Microfiber Bath Towel'],['knife-cleaning-brush','Hair Cleaning Brush'],['car-trash-can','Kitchen Trash Can'],['collapsible-microwave-cover','Microwave Oven Replacement Motor'],['toilet-scrubber-kit','Toilet Plunger Drain Snake'],['mini-bag-sealer','Industrial Vacuum Sealer Machine'],
 ['insulated-tumbler','Insulated Tumbler Lid Only'],['screen-protector','Smart Watch Screen Protector'],['multiport-charger','USB-C Charger Replacement Cable Only 4 Ports'],['multiport-charger','KP-C105 Best-selling Multi-port Car Charger USB Type-C With Super-fast Charging And MP3 Player Function In Stock'],['motion-sensor-cabinet-lights','Motion Sensor Cabinet Light Replacement Switch Only'],['car-phone-mount','Motorcycle Phone Mount Holder'],['travel-packing-cubes','Travel Packing Storage Boxes'],['travel-packing-cubes','Electronics Organizer Travel Cable Organizer Bag Waterproof Portable Digital Storage Bag Electronic Accessories Case Cable Charger Organizer Case']
 ];
 for(const [slug,name] of negatives) assert.equal(matchesIntendedProduct({slug},name),false,slug+' '+name);
 assert.equal(matchesIntendedProduct({slug:'not-approved'},'Brand new stock'),false);
 assert.equal(matchesIntendedProduct({slug:'bottle-brush-set'},null),false);
});

// 2026-10-04 sale-readiness verification trigger: no gate logic changed.

test('rejects contradictory live-offer component counts in supplier titles', () => {
  const rejected = [
    ['crevice', '4 In 1 Bottle Gap Cleaner Brush Multifunctional Cup Cleaning Tool'],
    ['crevice', '4-in-1 Crevice Gap Cleaning Brush'],
    ['drain-catcher', '3PCS Silicone Sink Drain Filter Hair Catcher'],
    ['drain-catcher', 'Sink Drain Catcher 3-Pack Strainer'],
    ['drain-catcher', 'Sink Drain Filter 1 Piece Catcher'],
  ];
  for (const [slug, name] of rejected) {
    assert.equal(matchesIntendedProduct({ slug }, name), false, slug + ': ' + name);
  }
  const accepted = [
    ['crevice', '3 In 1 Crevice Gap Cleaning Brush'],
    ['drain-catcher', '2PCS Silicone Sink Drain Filter Catcher'],
    ['drain-catcher', 'Sink Drain Catcher 2-Pack Strainer'],
  ];
  for (const [slug, name] of accepted) {
    assert.equal(matchesIntendedProduct({ slug }, name), true, slug + ': ' + name);
  }
  // Missing component/pack counts fail identity screening. A matching title
  // still needs exact-variant, freight, checkout and fulfillment evidence.
  assert.equal(matchesIntendedProduct({ slug: 'crevice' }, 'Gap Crevice Cleaning Brush'), false);
  assert.equal(matchesIntendedProduct({ slug: 'drain-catcher' }, 'Sink Drain Filter Catcher'), false);
  assert.equal(matchesIntendedProduct({ slug: 'crevice' }, 'Curved Toilet Brush Gap Cleaning Tool Bathroom Accessory'), false);
});

test('rejects live CJ matches with incompatible product form factors',()=>{
 const falseMatches=[
  ['scrubber','Electric Bath Scrubber, Shower Brush, Bathing Back-scrubbing Magic Tool, Long-handled Automatic Bath Brush, Massager'],
  ['pethair','Pets Comb Brush Massage Cleaning Remove Hair Comb Pet Products'],
  ['garment-steamer','Standing Garment Steamer'],
  ['home-caddy','Stoneware Purple Sand Tea Caddy Sealed Storage'],
  ['cordless-handheld-vacuum','Car Vacuum Cleaner 120W Strong Suction Wet And Dry Car Vacuum Cleaner Handheld High Power'],
  ['hanging-closet-organizer','Wall Mounted Storage Bag Door Closet Hanging Storage Bag Organizer Waterproof 3 Pockets Pouch'],
  ['roll-up-dish-rack','Suction Cup Socks Foldable Drying Punch Free Towel Rack']
 ];
 for(const [slug,title] of falseMatches){
  assert.equal(matchesIntendedProduct({slug},title),false,slug+': '+title);
 }
 const valid=[
  ['scrubber','5-in-1 Electric Spin Scrubber Cleaning Tool'],
  ['pethair','Reusable Pet Hair Remover Roller'],
  ['garment-steamer','Portable Garment Clothes Steamer'],
  ['home-caddy','Portable Cleaning Supply Caddy'],
  ['cordless-handheld-vacuum','Cordless Portable Handheld Vacuum Cleaner'],
  ['hanging-closet-organizer','Hanging Closet Shelf Storage Organizer'],
  ['roll-up-dish-rack','Roll-Up Dish Drying Rack']
 ];
 for(const [slug,title] of valid){
  assert.equal(matchesIntendedProduct({slug},title),true,slug+': '+title);
 }
});
