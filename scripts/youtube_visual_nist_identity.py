"""Original PrismBay AI diagrams interpreting the 27 October 2026 NIST agent-IAM design tenets.

The three operator tests are PrismBay's editorial interpretation, not an official
NIST checklist. No external imagery, real customer data, or credentials.
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
NAVY = (8, 19, 34)
PANEL = (21, 38, 58)
WHITE = (248, 250, 253)
MUTED = (181, 199, 215)
CYAN = (65, 224, 218)
AMBER = (255, 195, 105)
RED = (255, 112, 128)
GREEN = (151, 238, 177)


def ft(n, bold=False):
    p = '/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold' if bold else '') + '.ttf'
    return ImageFont.truetype(p, n)


def label(d, xy, s, n=44, c=WHITE, bold=True):
    d.text(xy, s, font=ft(n, bold), fill=c)


def box(d, rect, stroke=CYAN):
    d.rounded_rectangle(rect, radius=28, fill=PANEL, outline=stroke, width=5)


def center(d, rect, s, n=50, c=WHITE):
    f = ft(n, True)
    x1, y1, x2, y2 = rect
    b = d.textbbox((0, 0), s, font=f)
    w, h = b[2] - b[0], b[3] - b[1]
    if w > x2 - x1 - 36:
        raise ValueError('Oversized text: ' + s)
    d.text((x1 + (x2-x1-w)/2, y1+(y2-y1-h)/2 - 7), s, font=f, fill=c)


def arrow(d, x, y1, y2, color=CYAN):
    d.line((x, y1, x, y2-22), fill=color, width=12)
    d.polygon([(x-23, y2-32), (x+23, y2-32), (x, y2)], fill=color)


def render_frame_nist_identity(segment, index, total, source):
    im = Image.new('RGB', (W, H), NAVY)
    d = ImageDraw.Draw(im)
    for y in range(0, H, 100):
        d.line((0, y, W, y), fill=(17, 34, 52), width=2)
    d.rectangle((0, 0, W, 19), fill=CYAN)
    label(d, (70, 75), 'PRISMBAY AI  /  AGENT CONTROL LAB', 31, CYAN)
    label(d, (70, 133), 'NIST DESIGN TENETS  |  27 OCT 2026', 28, MUTED)
    d.line((70, 205, 1010, 205), fill=(65, 89, 111), width=3)
    scene = segment['scene']
    headlines = {
        'hook': ('REVOKED ACCESS.', 'NEXT ACTION?'),
        'source': ('NIST PROPOSED', '10 DESIGN TENETS'),
        'identity': ('01 / GIVE AGENTS', 'OWN IDENTITIES'),
        'revoke': ('02 / REVOKE', 'MID-TASK'),
        'evidence': ('03 / KEEP', 'INDEPENDENT LOGS'),
        'close': ('TEST THE STOP', 'BEFORE LAUNCH'),
    }
    h1, h2 = headlines[scene]
    label(d, (72, 286), h1, 65, WHITE)
    label(d, (72, 391), h2, 65, AMBER if scene == 'hook' else CYAN)
    if scene == 'hook':
        box(d, (130, 650, 950, 835), GREEN)
        center(d, (145, 675, 935, 800), 'ACCESS REVOKED', 61, GREEN)
        arrow(d, 540, 855, 990, RED)
        box(d, (130, 1005, 950, 1230), RED)
        center(d, (145, 1030, 935, 1150), 'NEXT TOOL CALL?', 57, RED)
        label(d, (178, 1340), 'Does the system deny access?', 38, MUTED)
    elif scene == 'source':
        box(d, (115, 650, 965, 1130), CYAN)
        for j in range(10):
            x = 210 + (j % 5) * 166
            y = 760 + (j // 5) * 182
            col = CYAN if j in (0, 3, 9) else (69, 99, 118)
            d.ellipse((x-49, y-49, x+49, y+49), fill=col)
            center(d, (x-50, y-50, x+50, y+50), str(j+1), 36, NAVY if j in (0, 3, 9) else WHITE)
        label(d, (150, 1225), 'Three operator tests follow.', 45, WHITE)
        label(d, (155, 1300), 'PrismBay interpretation, not', 34, MUTED, False)
        label(d, (155, 1358), 'an official NIST checklist.', 34, MUTED, False)
    elif scene == 'identity':
        box(d, (100, 660, 980, 875), GREEN)
        center(d, (115, 690, 965, 850), 'AGENT-07  /  DISTINCT', 48, GREEN)
        arrow(d, 540, 890, 1000, RED)
        box(d, (100, 1010, 980, 1240), RED)
        center(d, (115, 1040, 965, 1150), 'SHARED ADMIN LOGIN', 45, RED)
        center(d, (115, 1150, 965, 1220), 'REJECT', 35, WHITE)
        label(d, (125, 1335), 'Trace each action to one agent.', 39, MUTED)
    elif scene == 'revoke':
        box(d, (120, 620, 960, 800), GREEN)
        center(d, (135, 650, 945, 765), 'SHORT-LIVED GRANT', 53, GREEN)
        arrow(d, 540, 810, 910, AMBER)
        box(d, (120, 930, 960, 1110), AMBER)
        center(d, (135, 960, 945, 1075), 'REVOKE MID-RUN', 58, AMBER)
        arrow(d, 540, 1125, 1220, RED)
        box(d, (120, 1240, 960, 1440), RED)
        center(d, (135, 1275, 945, 1385), 'NEXT CALL DENIED', 52, RED)
    elif scene == 'evidence':
        for y, k, v, col in [(640, 'OWNER', 'Who authorized?', CYAN),
                             (890, 'REVOKED', 'When did access end?', AMBER),
                             (1140, 'DENIED', 'Which tool was blocked?', RED)]:
            box(d, (100, y, 980, y+195), col)
            label(d, (150, y+25), k, 43, col)
            label(d, (150, y+99), v, 37, WHITE, False)
        label(d, (135, 1455), 'Keep the record outside the agent.', 34, MUTED)
    elif scene == 'close':
        for j, (k, c) in enumerate([('DISTINCT IDENTITY', CYAN),
                                    ('REVOKE + DENY', AMBER),
                                    ('INDEPENDENT EVIDENCE', GREEN)]):
            y = 650 + j*230
            box(d, (105, y, 975, y+165), c)
            center(d, (120, y+18, 960, y+145), k, 42, c)
        label(d, (140, 1430), 'Follow @PrismBayAI', 49, WHITE)
    d.line((70, 1630, 1010, 1630), fill=(65, 89, 111), width=3)
    label(d, (72, 1660), 'NIST PROPOSAL  /  PRISMBAY TEST', 27, MUTED)
    d.rounded_rectangle((72, 1745, 1008, 1762), radius=8, fill=(50, 68, 89))
    d.rounded_rectangle((72, 1745, 72 + int(936*(index+1)/total), 1762), radius=8, fill=CYAN)
    label(d, (72, 1800), f'ORIGINAL ANALYSIS  |  {index+1:02d} OF {total:02d}', 26, MUTED)
    return im
