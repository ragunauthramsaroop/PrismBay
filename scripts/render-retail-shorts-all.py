#!/usr/bin/env python3
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_SCRIPT = ROOT / 'scripts' / 'render-retail-shorts.py'
spec = importlib.util.spec_from_file_location('retail_renderer', BASE_SCRIPT)
renderer = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(renderer)

CATALOG = ROOT / 'config' / 'retail-video-catalog.json'
PROMOTIONS = ROOT / 'config' / 'retail-promotions.json'
OUT_DIR = ROOT / 'build' / 'retail-shorts-all'


def load_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def main():
    catalog = load_json(CATALOG)
    promotions = load_json(PROMOTIONS).get('promotions', [])
    products = [p for p in catalog.get('products', []) if p.get('checkoutPriceVerified') is True]
    if len(products) != 9:
        raise SystemExit(f'Expected 9 Stripe-price-verified retail products, found {len(products)}')
    if len({p['sku'] for p in products}) != len(products):
        raise SystemExit('Duplicate SKU in retail video catalog')
    for product in products:
        if not str(product.get('checkoutUrl', '')).startswith('https://buy.stripe.com/'):
            raise SystemExit(f'Unsafe checkout URL for {product.get("sku")}')
        if not str(product.get('imageUrl', '')).startswith('https://'):
            raise SystemExit(f'Unsafe image URL for {product.get("sku")}')

    cards_dir = OUT_DIR / 'cards'
    videos_dir = OUT_DIR / 'videos'
    cards_dir.mkdir(parents=True, exist_ok=True)
    videos_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    manifest = {
        'schemaVersion': 1,
        'generatedAt': now.isoformat().replace('+00:00', 'Z'),
        'rule': 'All current prices are Stripe-verified. Sale claims render only from the verified retail promotion registry.',
        'products': [],
    }

    for product in products:
        promo = renderer.active_promotion(product, promotions, now)
        slug = product['slug']
        card_path = cards_dir / f'{slug}.png'
        video_path = videos_dir / f'{slug}.mp4'
        renderer.draw_card(product, promo, card_path)
        renderer.render_video(card_path, video_path)
        manifest['products'].append({
            'sku': product['sku'],
            'slug': slug,
            'name': product['name'],
            'priceUsd': float(product['priceUsd']),
            'checkoutUrl': product['checkoutUrl'],
            'imageUrl': product['imageUrl'],
            'checkoutPriceVerified': True,
            'saleActive': promo is not None,
            'promotion': promo,
            'card': str(card_path.relative_to(OUT_DIR)),
            'video': str(video_path.relative_to(OUT_DIR)),
        })

    (OUT_DIR / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'rendered': len(products),
        'activeSales': sum(1 for p in manifest['products'] if p['saleActive']),
        'outDir': str(OUT_DIR),
    }, indent=2))


if __name__ == '__main__':
    main()
