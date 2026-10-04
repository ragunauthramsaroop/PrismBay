import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesIntendedProduct,hasApprovedProductClass,approvedClassCount} from './cj-match-policy.mjs';

test('every live and research category has an explicit positive identity policy',()=>{
 const positives=[
 ['scrubber','Electric Spin Scrubber Cleaning Tool'],['pethair','Reusable Pet Hair Remover Roller'],['crevice','Gap Crevice Cleaning Brush'],['pressure-washer','Cordless Portable Pressure Washer'],['mattress-vacuum','Mattress Bed Vacuum Cleaner'],['garment-steamer','Portable Garment Clothes Steamer'],['mini-mop','Mini Self Squeeze Mop'],['drain-catcher','Sink Drain Strainer Catcher'],['home-caddy','Portable Cleaning Supply Caddy'],['cordless-handheld-vacuum','Cordless Portable Handheld Vacuum Cleaner'],['extendable-high-zone-duster','Extendable High Reach Microfiber Duster'],['dryer-vent-cleaner-kit','Dryer Vent Cleaning Brush Kit'],['self-standing-floor-mop','Self Standing Floor Mop'],['window-washer-squeegee','Window Washer Squeegee Cleaner'],['roll-up-dish-rack','Roll-Up Dish Drying Rack'],['appliance-cord-organizer','Kitchen Appliance Cord Organizer Holder'],['rug-grippers','Non-slip Rug Grippers'],['rug-grippers','Reusable Adhesive Carpet Gripper'],['rug-grippers','Non Slip Rug Corner Pads'],['bottle-brush-set','Bottle Brush Cleaning Set'],['sheet-laundry-detangler','Sheet Laundry Detangler Ball'],['hanging-closet-organizer','Hanging Closet Shelf Storage Organizer'],['pan-scraper','Non-Scratch Pan Scraper'],
 ['car-seat-headrest-hooks','Car Seat Headrest Bag Hooks'],['microfiber-car-detailing-cloths','Microfiber Car Detailing Cleaning Towels'],['knife-cleaning-brush','Knife Cutlery Cleaning Brush'],['car-trash-can','Compact Car Trash Can Bin'],['collapsible-microwave-cover','Collapsible Microwave Food Cover'],['toilet-scrubber-kit','Disposable Toilet Scrubber Brush Cleaning Kit'],['mini-bag-sealer','Portable Mini Snack Bag Sealer']
 ];
 assert.equal(approvedClassCount(),28);
 for(const [slug,name] of positives){ assert.equal(hasApprovedProductClass(slug),true,slug); assert.equal(matchesIntendedProduct({slug},name),true,slug+' '+name); }
});

test('rejects known CJ and category false positives',()=>{
 const negatives=[
 ['scrubber','Electric Spin Scrubber Replacement Brush Heads'],['pethair','Pet Grooming Deshedding Brush'],['crevice','Vacuum Crevice Nozzle Attachment'],['pressure-washer','Cordless Pressure Washer Nozzle Replacement'],['mattress-vacuum','Mattress Storage Bag'],['garment-steamer','Facial Steamer'],['garment-steamer','Garment Steamer Replacement Nozzle Only'],['garment-steamer','Clothes Steamer Accessory Hose Only'],['mini-mop','Mini Mop Replacement Pad Only'],['drain-catcher','Drain Snake Auger'],['home-caddy','Shower Caddy Organizer'],['cordless-handheld-vacuum','VEVOR Wet Dry Vac, 2.6 Gallon, Portable Shop Vacuum'],['hanging-closet-organizer','Wall-door Mounted Jewelry Wardrobe Large Capacity Mirror And LED Light Lockable Organizer'],['cordless-handheld-vacuum','VEVOR Stand Airless Paint Sprayer'],['hanging-closet-organizer','Shoe Cabinet With 2 Flip Drawers'],['roll-up-dish-rack','Flower Print Lace-up Sneakers'],['rug-grippers','Kitchen Rug Sets Of 3 Washable Boho Kitchen Rugs And Runner Carpets Non Slip Kitchen Area Rug For Laundry Room Entryway Hallway'],
 ['car-seat-headrest-hooks','Bathroom Wall Hook Rack'],['microfiber-car-detailing-cloths','Microfiber Bath Towel'],['knife-cleaning-brush','Hair Cleaning Brush'],['car-trash-can','Kitchen Trash Can'],['collapsible-microwave-cover','Microwave Oven Replacement Motor'],['toilet-scrubber-kit','Toilet Plunger Drain Snake'],['mini-bag-sealer','Industrial Vacuum Sealer Machine']
 ];
 for(const [slug,name] of negatives) assert.equal(matchesIntendedProduct({slug},name),false,slug+' '+name);
 assert.equal(matchesIntendedProduct({slug:'not-approved'},'Brand new stock'),false);
 assert.equal(matchesIntendedProduct({slug:'bottle-brush-set'},null),false);
});

// 2026-10-04 sale-readiness verification trigger: no gate logic changed.
