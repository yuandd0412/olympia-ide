# One-off generator for the NSIS installer branding bitmaps.
#   sidebar.bmp : 164x314 (welcome/finish left panel)
#   header.bmp  : 150x57  (inner pages top-right)
# NSIS MUI2 requires exactly these dimensions, 24-bit BMP.
# Design: Olympia IDE "Verdict Ring" mark on the app's dark tokens.
# Re-run after changing the design:  python generate.py
import math
import struct
from pathlib import Path

OUT = Path(__file__).parent

RING_GAP_LO, RING_GAP_HI = 15.0, 75.0  # degrees (math convention) left open at top-right


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def seg_dist(px, py, x1, y1, x2, y2):
    vx, vy = x2 - x1, y2 - y1
    wx, wy = px - x1, py - y1
    t = max(0.0, min(1.0, (vx * wx + vy * wy) / (vx * vx + vy * vy)))
    dx, dy = px - (x1 + t * vx), py - (y1 + t * vy)
    return math.hypot(dx, dy)


def draw_verdict_ring(canvas, W, H, cx, cy, r, th, ring_a, ring_b, check_pts, check_th, check_color, s):
    """Paint ring arc (with top-right gap) + AC check into a supersampled canvas."""
    for y in range(H):
        for x in range(W):
            d = math.hypot(x - cx, y - cy)
            theta = math.degrees(math.atan2(cy - y, x - cx)) % 360.0
            if abs(d - r) <= th / 2 and not (RING_GAP_LO < theta < RING_GAP_HI):
                t = max(0.0, min(1.0, (y - (cy - r)) / (2 * r)))
                canvas[y][x] = lerp(ring_a, ring_b, t)
    (p1, p2, p3) = [(px * s, py * s) for (px, py) in check_pts]
    for y in range(H):
        for x in range(W):
            if seg_dist(x, y, *p1, *p2) <= check_th * s / 2 or seg_dist(x, y, *p2, *p3) <= check_th * s / 2:
                canvas[y][x] = check_color


def render_sidebar():
    w, h, s = 164, 314, 3
    W, H = w * s, h * s
    top, bot = (37, 37, 38), (24, 24, 25)          # #252526 -> #181819
    ring_a, ring_b = (62, 166, 232), (0, 122, 204)  # #3ea6e8 -> #007acc
    green = (52, 199, 89)                           # #34c759
    canvas = [[lerp(top, bot, y / H) for _ in range(W)] for y in range(H)]
    # check points scaled from the 512 master (ring R150 th42 -> R46 th13)
    draw_verdict_ring(canvas, W, H, 82 * s, 96 * s, 46 * s, 15 * s,
                      ring_a, ring_b,
                      [(58, 98), (78, 119), (109, 81)], 13, green, s)
    # caption dots: subtle verdict colors under the mark
    for i, c in enumerate([(52, 199, 89), (255, 159, 10), (255, 69, 58)]):
        cx, cy = (82 - 28 + i * 28) * s, 168 * s
        r = 4 * s
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    canvas[y][x] = c
    return w, h, canvas, s


def render_header():
    w, h, s = 150, 57, 3
    W, H = w * s, h * s
    white = (255, 255, 255)
    ring_a, ring_b = (62, 166, 232), (0, 122, 204)
    green = (52, 199, 89)
    accent = (0, 122, 204)
    canvas = [[white] * W for _ in range(H)]
    for y in range(H - 2 * s, H):
        for x in range(W):
            canvas[y][x] = accent
    draw_verdict_ring(canvas, W, H, 26 * s, 26 * s, 15 * s, 6 * s,
                      ring_a, ring_b,
                      [(18.2, 26.6), (24.7, 33.4), (34.8, 21.2)], 4.2, green, s)
    return w, h, canvas, s


def downsample(canvas, w, h, s):
    out = []
    for y in range(h):
        row = []
        for x in range(w):
            acc = [0, 0, 0]
            for dy in range(s):
                for dx in range(s):
                    p = canvas[y * s + dy][x * s + dx]
                    for i in range(3):
                        acc[i] += p[i]
            n = s * s
            row.append(tuple(v // n for v in acc))
        out.append(row)
    return out


def write_bmp(path, w, h, rows):
    # 24-bit BMP, bottom-up, rows padded to 4 bytes
    pad = (4 - (w * 3) % 4) % 4
    size = 54 + (w * 3 + pad) * h
    hdr = struct.pack('<2sIHHI', b'BM', size, 0, 0, 54) + struct.pack('<IiiHHIIiiII', 40, w, h, 1, 24, 0, 0, 0, 0, 0, 0)
    with open(path, 'wb') as f:
        f.write(hdr)
        for row in reversed(rows):
            f.write(b''.join(bytes((p[2], p[1], p[0])) for p in row) + b'\x00' * pad)


for name, render in [('sidebar.bmp', render_sidebar), ('header.bmp', render_header)]:
    w, h, canvas, s = render()
    rows = downsample(canvas, w, h, s)
    write_bmp(OUT / name, w, h, rows)
    print(f'{name}: {w}x{h} written')
