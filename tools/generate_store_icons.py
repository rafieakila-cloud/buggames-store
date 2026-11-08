"""Generate BUGGAMES STORE icons (green shopping bag + Buggy face)."""
from PIL import Image, ImageDraw

INK = (36, 18, 57)
GREEN = (1, 135, 95)      # #01875f - Play Store green
GREEN_DARK = (0, 97, 72)  # #006148
GREEN_LIGHT = (80, 220, 160)
WHITE = (255, 255, 255)
BELLY = (255, 249, 201)
BELLY2 = (255, 233, 138)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_bg(size, fill):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.185), fill=fill)
    return img


def draw_store_bug(d, cx, cy, s):
    # ---- shopping bag (white) ----
    bw, bh = 150 * s, 150 * s
    top_y = cy - 30 * s
    bag = [(cx - bw * 0.52, top_y), (cx + bw * 0.52, top_y), (cx + bw * 0.40, top_y + bh), (cx - bw * 0.40, top_y + bh)]
    d.polygon(bag, fill=WHITE, outline=INK)
    d.line([(cx - bw * 0.52, top_y), (cx + bw * 0.52, top_y)], fill=INK, width=max(6, int(10 * s)))
    # bag bottom seam
    d.line([(cx - bw * 0.40, top_y + bh - 14 * s), (cx + bw * 0.40, top_y + bh - 14 * s)], fill=INK, width=max(4, int(7 * s)))
    # handle: arc above bag
    handle_box = [cx - 58 * s, top_y - 62 * s, cx + 58 * s, top_y + 22 * s]
    d.arc(handle_box, start=180, end=360, fill=INK, width=max(6, int(9 * s)))
    d.arc([handle_box[0] + 4, handle_box[1] + 4, handle_box[2] - 4, handle_box[3] - 4], start=180, end=360, fill=WHITE, width=max(2, int(4 * s)))

    # ---- bug face peeking out of bag (green body) ----
    body_y = top_y + 52 * s
    bw2, bh2 = 66 * s, 52 * s
    d.ellipse([cx - bw2, body_y - bh2, cx + bw2, body_y + bh2], fill=GREEN_LIGHT, outline=INK, width=max(5, int(7 * s)))
    # center line
    d.line([(cx, body_y - bh2), (cx, body_y + bh2)], fill=INK, width=max(3, int(5 * s)))
    # eyes
    for sx in (-1, 1):
        ex = cx + sx * 27 * s
        d.ellipse([ex - 11 * s, body_y - 12 * s, ex + 11 * s, body_y + 10 * s], fill=WHITE, outline=INK, width=max(3, int(4 * s)))
        d.ellipse([ex - 4.6 * s, body_y - 3.2 * s, ex + 4.6 * s, body_y + 6 * s], fill=INK)
    # smile
    d.arc([cx - 18 * s, body_y + 8 * s, cx + 18 * s, body_y + 26 * s], start=20, end=160, fill=INK, width=max(3, int(5 * s)))
    # antennae poking above bag
    for sx in (-1, 1):
        d.line([(cx + sx * 30 * s, body_y - bh2), (cx + sx * 44 * s, body_y - bh2 - 24 * s)], fill=INK, width=max(4, int(6 * s)))
        d.ellipse([cx + sx * 44 * s - 5 * s, body_y - bh2 - 32 * s, cx + sx * 44 * s + 5 * s, body_y - bh2 - 22 * s], fill=(255, 210, 63), outline=INK, width=max(2, int(3 * s)))


def make(size, maskable=False):
    img = Image.new('RGBA', (size, size), GREEN + (255,)) if maskable else rounded_bg(size, GREEN + (255,))
    d = ImageDraw.Draw(img)
    s = (size * (0.62 if maskable else 0.66)) / 210
    draw_store_bug(d, size // 2, int(size * 0.55), s)
    return img


if __name__ == '__main__':
    make(192).save('icons/icon-192.png')
    make(512).save('icons/icon-512.png')
    make(512, maskable=True).save('icons/maskable-512.png')
    make(180).save('icons/apple-touch-icon.png')
    print('store icons regenerated')
