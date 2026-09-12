# Pure-python rasterizer for the Olympia IDE app icon (no dependencies).
# Renders the Verdict Ring mark at 1024px (2x supersampled) and saves a PNG.
# Run:  python scripts/render-icon.py
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).parent.parent / "build/logo/olympia-icon-1024.png"
SIZE = 1024          # output size
S = SIZE / 512.0     # 512-viewbox -> output scale
SS = 2               # supersample factor per axis

TOP, BOT = (37, 37, 38), (24, 24, 25)          # bg gradient #252526 -> #181819
RING_A, RING_B = (62, 166, 232), (0, 122, 204) # ring gradient
GREEN = (52, 199, 89)
GAP_LO, GAP_HI = 15.0, 75.0                    # ring gap (degrees)
R, TH = 150.0, 64.0                            # ring radius / stroke
RX = 0.0                                       # full-bleed square (taskbar legibility)
CHECK = [(178.0, 262.0), (243.0, 330.0), (344.0, 208.0)]
CHECK_TH = 56.0


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def in_rounded_rect(x, y):
    rx = RX
    if x < rx and y < rx:
        return (x - rx) ** 2 + (y - rx) ** 2 <= rx * rx
    if x > 512 - rx and y < rx:
        return (x - (512 - rx)) ** 2 + (y - rx) ** 2 <= rx * rx
    if x < rx and y > 512 - rx:
        return (x - rx) ** 2 + (y - (512 - rx)) ** 2 <= rx * rx
    if x > 512 - rx and y > 512 - rx:
        return (x - (512 - rx)) ** 2 + (y - (512 - rx)) ** 2 <= rx * rx
    return True


def seg_dist(px, py, a, b):
    vx, vy = b[0] - a[0], b[1] - a[1]
    wx, wy = px - a[0], py - a[1]
    t = max(0.0, min(1.0, (vx * wx + vy * wy) / (vx * vx + vy * vy)))
    return math.hypot(px - (a[0] + t * vx), py - (a[1] + t * vy))


def sample(x, y):
    if not in_rounded_rect(x, y):
        return None
    base = lerp(TOP, BOT, y / 512.0)
    d = math.hypot(x - 256.0, y - 256.0)
    theta = math.degrees(math.atan2(256.0 - y, x - 256.0)) % 360.0
    if abs(d - R) <= TH / 2 and not (GAP_LO < theta < GAP_HI):
        return lerp(RING_A, RING_B, y / 512.0)
    if seg_dist(x, y, CHECK[0], CHECK[1]) <= CHECK_TH / 2 or seg_dist(x, y, CHECK[1], CHECK[2]) <= CHECK_TH / 2:
        return GREEN
    return base


rows = []
step = 1.0 / (S * SS)
for oy in range(SIZE):
    row = []
    for ox in range(SIZE):
        acc = [0, 0, 0]
        for dy in range(SS):
            for dx in range(SS):
                c = sample((ox + (dx + 0.5) / SS) / S, (oy + (dy + 0.5) / SS) / S)
                if c is None:
                    continue
                acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
        # 没有命中的子样本保持透明（alpha 由命中比例决定）
        n = SS * SS
        hit = sum(1 for dy in range(SS) for dx in range(SS)
                  if in_rounded_rect((ox + (dx + 0.5) / SS) / S, (oy + (dy + 0.5) / SS) / S))
        if hit == 0:
            row.append((0, 0, 0, 0))
        else:
            # 近似 alpha：边缘半透明
            alpha = int(255 * min(1.0, hit / n * 1.6))
            row.append((acc[0] // hit, acc[1] // hit, acc[2] // hit, alpha))
    rows.append(tuple(row))
    if oy % 128 == 0:
        print(f"row {oy}/{SIZE}")

def write_png(path, w, h, rgb_rows):
    raw = b"".join(b"\x00" + b"".join(bytes(p) for p in row) for row in rgb_rows)
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)  # RGBA
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    Path(path).write_bytes(data)

OUT.parent.mkdir(parents=True, exist_ok=True)
write_png(OUT, SIZE, SIZE, rows)
print(f"written {OUT} ({SIZE}x{SIZE} RGBA)")
