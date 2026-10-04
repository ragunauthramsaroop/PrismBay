#!/usr/bin/env python3
import argparse
import io
import json
import subprocess
import textwrap
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FONT_BOLD = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
FONT_REG = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
TARGET_SKUS = {
    'legacy-crevice-brush-001',
    'legacy-garment-steamer-001',
    'legacy-spin-scrubber-001',
    'legacy-pet-hair-remover-001',
}


def font(path, size):
    return ImageFont.truetype(str(path), size=size)


def money(value):
    return f'${float(value):,.2f}'


def load_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def active_promotion(product, promotions, now):
    promo = next((p for p in promotions if p.get('sku') == product.get('sku')), None)
    if not promo:
        return None
    required = (
        promo.get('authorized') is True
        and promo.get('regularPriceVerified') is True
        and promo.get('marginVerified') is True
        and promo.get('checkoutPriceVerified') is True
        and isinstance(promo.get('evidenceRefs'), list)
        and len(promo.get('evidenceRefs')) > 0
    )
    if not required:
        return None
    try:
        regular = float(promo['regularPriceUsd'])
        sale = float(promo['salePriceUsd'])
        current = float(product['priceUsd'])
        starts = datetime.fromisoformat(str(promo['startsAt']).replace('Z', '+00:00'))
        ends = datetime.fromisoformat(str(promo['endsAt']).replace('Z', '+00:00'))
    except (KeyError, TypeError, ValueError):
        return None
    if not (regular > sale > 0 and abs(sale - current) < 0.001 and starts <= now < ends):
        return None
    return {
        'campaignId': str(promo.get('campaignId', 'verified-sale')),
        'regularPriceUsd': regular,
        'salePriceUsd': sale,
        'savingsUsd': regular - sale,
        'percentOff': round((regular - sale) / regular * 100),
    }


def fetch_image(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'PrismBay-Retail-Renderer/1.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        data = response.read()
    return Image.open(io.BytesIO(data)).convert('RGB')


def wrap(draw, text, target_width, fnt):
    words = str(text).split()
    lines = []
    current = []
    for word in words:
        test = ' '.join(current + [word])
        if draw.textbbox((0, 0), test, font=fnt)[2] <= target_width:
            current.append(word)
        else:
            if current:
                lines.append(' '.join(current))
            current = [word]
    if current:
        lines.append(' '.join(current))
    return lines


def center_text(draw, y, text, fnt, fill, canvas_width=1080):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    x = (canvas_width - (bbox[2] - bbox[0])) // 2
    draw.text((x, y), text, font=fnt, fill=fill)
    return bbox[3] - bbox[1]


def draw_card(product, promo, out_path):
    W, H = 1080, 1920
    bg = '#f5f8f6'
    green = '#0b3f31'
    green2 = '#155d48'
    ink = '#10231d'
    muted = '#617068'
    burgundy = '#8f2030'
    canvas = Image.new('RGB', (W, H), bg)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, 0, W, 112), fill=green)
    draw.text((54, 31), 'PRISMBAY CLEAN', font=font(FONT_BOLD, 42), fill='white')
    draw.text((54, 79), 'EVERYDAY MESS. BETTER TOOLS.', font=font(FONT_REG, 17), fill='#bfe0d2')

    label = 'VERIFIED SALE' if promo else 'READY TO ORDER'
    label_fill = burgundy if promo else green2
    label_font = font(FONT_BOLD, 24)
    label_box = draw.textbbox((0, 0), label, font=label_font)
    label_w = label_box[2] - label_box[0] + 44
    draw.rounded_rectangle((54, 150, 54 + label_w, 204), radius=27, fill=label_fill)
    draw.text((76, 164), label, font=label_font, fill='white')

    title_font = font(FONT_BOLD, 58)
    title_lines = wrap(draw, product['name'], 970, title_font)[:3]
    y = 240
    for line in title_lines:
        draw.text((54, y), line, font=title_font, fill=ink)
        y += 68

    media_box = (70, 470, 1010, 1190)
    draw.rounded_rectangle(media_box, radius=38, fill='white', outline='#dce7e1', width=3)
    try:
        img = fetch_image(product['imageUrl'])
        fitted = ImageOps.contain(img, (850, 650), Image.Resampling.LANCZOS)
        x = 70 + (940 - fitted.width) // 2
        y_img = 470 + (720 - fitted.height) // 2
        canvas.paste(fitted, (x, y_img))
    except Exception:
        center_text(draw, 760, 'Product image unavailable', font(FONT_BOLD, 34), muted)

    if promo:
        draw.text((70, 1238), f'Was {money(promo["regularPriceUsd"])}', font=font(FONT_REG, 34), fill=muted)
        bbox = draw.textbbox((70, 1238), f'Was {money(promo["regularPriceUsd"])}', font=font(FONT_REG, 34))
        draw.line((bbox[0], (bbox[1] + bbox[3]) // 2, bbox[2], (bbox[1] + bbox[3]) // 2), fill=muted, width=3)
        draw.text((70, 1290), money(product['priceUsd']), font=font(FONT_BOLD, 102), fill=burgundy)
        draw.text((70, 1402), f'Save {money(promo["savingsUsd"])}  •  {promo["percentOff"]}% off', font=font(FONT_BOLD, 31), fill=burgundy)
        desc_y = 1480
    else:
        draw.text((70, 1240), 'CURRENT PRICE', font=font(FONT_BOLD, 25), fill=green2)
        draw.text((70, 1280), money(product['priceUsd']), font=font(FONT_BOLD, 102), fill=ink)
        desc_y = 1410

    desc_font = font(FONT_REG, 28)
    desc_lines = wrap(draw, product['description'], 940, desc_font)[:3]
    for line in desc_lines:
        draw.text((70, desc_y), line, font=desc_font, fill=muted)
        desc_y += 40

    cta_top = 1595
    draw.rounded_rectangle((70, cta_top, 1010, cta_top + 125), radius=62, fill=green)
    center_text(draw, cta_top + 27, 'SHOP  CLEAN.PRISMBAYAI.COM', font(FONT_BOLD, 34), 'white')

    center_text(draw, 1762, 'Checkout via Stripe  •  U.S. delivery only', font(FONT_BOLD, 23), ink)
    center_text(draw, 1808, 'Third-party supplier fulfillment', font(FONT_REG, 20), muted)
    center_text(draw, 1850, 'Pricing shown here must match live checkout.', font(FONT_REG, 18), muted)

    canvas.save(out_path, quality=96)


def render_video(card_path, video_path):
    vf = "zoompan=z='min(zoom+0.00012,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=360:s=1080x1920:fps=30,format=yuv420p"
    cmd = [
        'ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-i', str(card_path),
        '-vf', vf, '-t', '12', '-r', '30', '-c:v', 'libx264', '-preset', 'medium',
        '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(video_path)
    ]
    subprocess.run(cmd, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--catalog', default=ROOT / 'config/legacy-live-catalog.json')
    parser.add_argument('--promotions', default=ROOT / 'config/retail-promotions.json')
    parser.add_argument('--out-dir', default=ROOT / 'build/retail-shorts')
    args = parser.parse_args()

    catalog = load_json(args.catalog)
    promo_file = load_json(args.promotions)
    promotions = promo_file.get('promotions', [])
    products = [p for p in catalog.get('products', []) if p.get('sku') in TARGET_SKUS]
    if len(products) != 4:
        raise SystemExit(f'Expected 4 retail products, found {len(products)}')

    out_dir = Path(args.out_dir)
    cards_dir = out_dir / 'cards'
    videos_dir = out_dir / 'videos'
    cards_dir.mkdir(parents=True, exist_ok=True)
    videos_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    manifest = {
        'schemaVersion': 1,
        'generatedAt': now.isoformat().replace('+00:00', 'Z'),
        'rule': 'Sale claims render only from the verified retail promotion registry. No promotion evidence means current-price creative only.',
        'products': [],
    }

    for product in products:
        promo = active_promotion(product, promotions, now)
        slug = product['slug']
        card_path = cards_dir / f'{slug}.png'
        video_path = videos_dir / f'{slug}.mp4'
        draw_card(product, promo, card_path)
        render_video(card_path, video_path)
        manifest['products'].append({
            'sku': product['sku'],
            'slug': slug,
            'name': product['name'],
            'priceUsd': float(product['priceUsd']),
            'checkoutUrl': product['checkoutUrl'],
            'imageUrl': product['imageUrl'],
            'saleActive': promo is not None,
            'promotion': promo,
            'card': str(card_path.relative_to(out_dir)),
            'video': str(video_path.relative_to(out_dir)),
        })

    (out_dir / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'rendered': len(products), 'activeSales': sum(1 for p in manifest['products'] if p['saleActive']), 'outDir': str(out_dir)}, indent=2))


if __name__ == '__main__':
    main()
