"""Original PrismBay AI procurement acceptance-test diagrams for vertical video.

All invoice details and limits are fictional. No external media or personal data.
"""
from PIL import Image, ImageDraw, ImageFont
import textwrap

W, H = 1080, 1920
NAVY = (10, 22, 37)
WHITE = (246, 249, 252)
SOFT = (174, 196, 215)
TEAL = (58, 225, 211)
AMBER = (255, 192, 99)
RED = (255, 105, 120)
GREEN = (142, 233, 169)
PANEL = (20, 38, 57)
LINE = (65, 91, 112)


def ft(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/" + name, size)


def text(draw, xy, value, size=34, color=WHITE, bold=False):
    draw.text(xy, str(value), font=ft(size, bold), fill=color)


def pixel_wrap(value, size, max_width, bold=False):
    """Wrap text using actual font measurements rather than character counts."""
    font = ft(size, bold)
    lines, line = [], ""
    for word in str(value).split():
        proposed = (line + " " + word).strip()
        if font.getlength(proposed) <= max_width:
            line = proposed
        else:
            if not line:
                raise ValueError("Word too wide for layout: " + word)
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return "\n".join(lines)


def centered(draw, box, value, size=38, color=WHITE):
    x1, y1, x2, y2 = box
    font = ft(size, True)
    bounds = draw.textbbox((0, 0), value, font=font)
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    if width > x2 - x1 - 20:
        raise ValueError("Label too wide for box: " + str(value))
    draw.text((x1 + (x2 - x1 - width) / 2,
               y1 + (y2 - y1 - height) / 2 - 5),
              value, font=font, fill=color)


def card(draw, box, outline=TEAL, fill=PANEL, radius=24):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=5)


def arrow(draw, start, end, color=TEAL):
    draw.line((*start, *end), fill=color, width=11)
    x, y = end
    if end[1] > start[1]:
        draw.polygon([(x, y), (x - 19, y - 31), (x + 19, y - 31)], fill=color)
    else:
        draw.polygon([(x, y), (x - 31, y - 19), (x - 31, y + 19)], fill=color)


def render_frame_procurement(segment, index, total, source):
    image = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(image)
    for x in range(0, W, 90):
        d.line((x, 0, x, H), fill=(18, 37, 53), width=1)
    for y in range(0, H, 90):
        d.line((0, y, W, y), fill=(18, 37, 53), width=1)
    d.rectangle((0, 0, W, 22), fill=TEAL)
    text(d, (75, 85), "PRISMBAY AI  /  PROCUREMENT LAB", 32, TEAL, True)
    text(d, (75, 147), "ILLUSTRATIVE PROCUREMENT TEST", 32, SOFT, True)
    d.line((75, 214, 1005, 214), fill=LINE, width=3)
    headline = "\n".join(textwrap.wrap(segment.get("headline", ""), width=23))
    if headline.count("\n") > 2:
        raise ValueError("Headline needs editorial shortening")
    d.multiline_text((76, 285), headline, font=ft(59, True),
                     fill=WHITE, spacing=14)
    scene = segment.get("scene", "hook")

    if scene == "hook":
        card(d, (105, 660, 975, 865), GREEN)
        centered(d, (120, 705, 960, 820), "DEMO PASSED", 77, GREEN)
        arrow(d, (540, 880), (540, 1015), AMBER)
        card(d, (105, 1040, 975, 1260), RED)
        centered(d, (120, 1085, 960, 1210), "PURCHASE ON HOLD", 51, RED)
        text(d, (166, 1345), "Three tests before approval.", 44, SOFT, True)

    elif scene == "privacy":
        card(d, (125, 605, 955, 820), AMBER)
        text(d, (175, 650), "FICTIONAL INVOICE", 42, WHITE, True)
        text(d, (175, 721), "Use synthetic customer data", 40, SOFT)
        arrow(d, (540, 825), (540, 960))
        for y, title, detail in (
            (975, "PROCESSOR", "Where is data sent?"),
            (1160, "STORAGE", "Who retains the data?"),
            (1345, "DELETION", "When is data erased?"),
        ):
            card(d, (130, y, 950, y + 155), TEAL)
            text(d, (170, y + 22), title, 37, TEAL, True)
            text(d, (170, y + 83), detail, 40, WHITE)

    elif scene == "approval":
        card(d, (130, 620, 950, 860), AMBER)
        centered(d, (140, 645, 940, 775), "$12,000 REQUEST", 60, AMBER)
        centered(d, (140, 785, 940, 843), "ILLUSTRATIVE", 36, SOFT)
        arrow(d, (540, 870), (540, 990), RED)
        card(d, (130, 1010, 950, 1210), RED)
        centered(d, (145, 1035, 935, 1110), "$5,000 LIMIT", 57, RED)
        centered(d, (145, 1120, 935, 1190), "AUTOMATED STOP", 37, WHITE)
        arrow(d, (540, 1215), (540, 1320), GREEN)
        card(d, (130, 1335, 950, 1500), GREEN)
        centered(d, (145, 1365, 935, 1460), "HUMAN APPROVAL", 45, GREEN)

    elif scene == "failure":
        for x, label in ((115, "FAILURE 1"), (565, "FAILURE 2")):
            card(d, (x, 670, x + 400, 865), AMBER)
            centered(d, (x + 10, 730, x + 390, 825), label, 41, AMBER)
        arrow(d, (540, 900), (540, 1050), RED)
        card(d, (130, 1065, 950, 1250), RED)
        centered(d, (145, 1105, 935, 1210), "STOP SAFELY", 63, RED)
        arrow(d, (540, 1260), (540, 1355), GREEN)
        card(d, (130, 1370, 950, 1520), GREEN)
        centered(d, (145, 1400, 935, 1490), "LOG FAILED ACTIONS", 40, GREEN)

    elif scene == "evidence":
        for number, title, detail, y in (
            ("01", "DATA", "Processor, storage, deletion", 625),
            ("02", "AUTHORITY", "Human approval threshold", 910),
            ("03", "RECOVERY", "Stop, retry, audit trail", 1195),
        ):
            card(d, (100, y, 980, y + 235), TEAL)
            centered(d, (125, y + 45, 255, y + 175), number, 65, TEAL)
            text(d, (300, y + 34), title, 46, WHITE, True)
            text(d, (300, y + 117), detail, 38, SOFT)

    elif scene == "close":
        card(d, (120, 680, 960, 910), GREEN)
        centered(d, (140, 730, 940, 850), "EVIDENCE FIRST", 61, GREEN)
        card(d, (120, 980, 960, 1210), AMBER)
        centered(d, (140, 1030, 940, 1150), "SIGN SECOND", 61, AMBER)
        text(d, (138, 1320), "Practical AI business systems.", 42, SOFT, True)
        text(d, (285, 1405), "FOLLOW PRISMBAY AI", 50, TEAL, True)
    else:
        raise ValueError("Unsupported procurement scene: " + str(scene))

    body = pixel_wrap(segment.get("body", ""), size=40, max_width=880)
    if body:
        if body.count("\n") > 2:
            raise ValueError("Body needs editorial shortening")
        d.multiline_text((100, 1575), body, font=ft(40),
                         fill=SOFT, spacing=12)
    d.line((75, 1730, 1005, 1730), fill=LINE, width=3)
    d.rounded_rectangle((75, 1770, 1005, 1790), radius=9, fill=LINE)
    d.rounded_rectangle((75, 1770, 75 + int(930 * (index + 1) / total), 1790),
                        radius=9, fill=TEAL)
    text(d, (75, 1830), f"PRISMBAY AI   /   {index+1:02d} OF {total:02d}",
         32, WHITE, True)
    return image
