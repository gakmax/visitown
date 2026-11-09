"""Visitown 파비콘·앱 아이콘을 픽셀 격자에 찍어 만든다. 로고와 같은 집(분홍 삼각 지붕, 브라우저 점 3개, 노란 문).
실행: python3 brand/make_icons.py  (Pillow 필요, 결과는 apps/web/public/icons/에 덮어쓴다)"""
import os
from PIL import Image, ImageColor

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'apps', 'web', 'public', 'icons')  # 웹 앱의 public/icons
C = {'O': '#3b2f3a', 'P': '#f5a3b5', 'W': '#fff8ea', 'D': '#f2c14e', 'B': '#9fc6f2', 'R': '#e8707f', 'M': '#8fcf9f', 'G': '#f1e6d2'}

# 16px는 따로 찍는다. 점은 빼고 창문은 외곽선 없이 2x2.
HOUSE16 = [
    '................',
    '.......OO.......',
    '......OPPO......',
    '.....OPPPPO.....',
    '....OPPPPPPO....',
    '...OPPPPPPPPO...',
    '..OPPPPPPPPPPO..',
    '.OOOOOOOOOOOOOO.',
    '..OWWWWWWWWWWO..',
    '..OWWWWWWWWWWO..',
    '..OBBWOOOOWBBO..',
    '..OBBWODDOWBBO..',
    '..OWWWODDOWWWO..',
    '..OWWWODDOWWWO..',
    '..OOOOOOOOOOOO..',
    '................',
]

def blank(n):
    return [[None] * n for _ in range(n)]

def put(g, mask, fill):
    """mask 안쪽은 fill, 8방향 이웃 중 하나라도 밖이면 외곽선."""
    for (x, y) in mask:
        edge = any((x + dx, y + dy) not in mask for dx in (-1, 0, 1) for dy in (-1, 0, 1))
        g[y][x] = 'O' if edge else fill

def rect(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}

def house(ww):
    """벽 바깥 너비 ww(짝수)인 집을 (격자, 너비, 높이)로 돌려준다. 처마는 양쪽 2칸 더 나온다."""
    W = ww + 4
    H_eave = W // 2
    halves = [1]
    inc = 1
    while halves[-1] < H_eave:
        halves.append(min(H_eave, halves[-1] + inc))
        inc = 3 - inc
    wh = round(ww * 0.7)
    H = len(halves) + wh
    g = [[None] * W for _ in range(H)]
    y0 = len(halves) - 1                     # 처마 줄 = 벽 윗줄
    x0, x1, y1 = 2, 2 + ww - 1, y0 + wh
    put(g, rect(x0, y0, x1, y1), 'W')
    roof = set()
    for i, h in enumerate(halves):
        roof |= {(x, i) for x in range(W // 2 - h, W // 2 + h)}
    put(g, roof, 'P')
    small = ww < 26
    ds = 1 if small else 2                   # 점 크기
    for k, col in enumerate('RDM'):
        for dx in range(ds):
            for dy in range(ds):
                g[y0 + 2 + (not small) + dy][x0 + 3 + k * (ds + 1) + dx] = col
    ws = 4 if small else 6                   # 창문 크기(외곽선 포함)
    dw = 4 if ww < 20 else 6                 # 문 너비(외곽선 포함)
    wy = y0 + max(5, round(wh * 0.37))
    put(g, rect(x0 + 2, wy, x0 + 1 + ws, wy + ws - 1), 'B')
    put(g, rect(x1 - 1 - ws, wy, x1 - 2, wy + ws - 1), 'B')
    cx = x0 + ww // 2
    put(g, rect(cx - dw // 2, wy + 1, cx + dw // 2 - 1, y1), 'D')
    if dw == 6:                              # 손잡이 한 칸. 좁은 문에선 외곽선에 붙어 홈처럼 보여서 뺀다
        g[(wy + 1 + y1) // 2 + 1][cx] = 'O'
    return g, W, H

def place(canvas, g, w, h):
    n = len(canvas)
    ox, oy = (n - w) // 2, (n - h) // 2
    for y in range(h):
        for x in range(w):
            if g[y][x]:
                canvas[oy + y][ox + x] = g[y][x]

def background(n, notch):
    g = [['G'] * n for _ in range(n)]
    for r in range(notch):                   # 픽셀 노치 모서리
        for x in range(notch - r):
            for (yy, xx) in ((r, x), (r, n - 1 - x), (n - 1 - r, x), (n - 1 - r, n - 1 - x)):
                g[yy][xx] = None
    return g

def icon(n, ww, bg=None):
    g = background(n, bg) if bg is not None else blank(n)
    place(g, *house(ww))
    return g

def image(g, scale):
    n = len(g)
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    px = im.load()
    for y in range(n):
        for x in range(n):
            if g[y][x]:
                px[x, y] = ImageColor.getrgb(C[g[y][x]]) + (255,)
    return im.resize((n * scale, n * scale), Image.NEAREST)

f16 = image([[None if c == '.' else c for c in row] for row in HOUSE16], 1)
f32 = image(icon(32, 28), 1)
f48 = image([[None if c == '.' else c for c in row] for row in HOUSE16], 3)
f16.save(f'{OUT}/favicon-16.png')
f32.save(f'{OUT}/favicon-32.png')
f48.save(f'{OUT}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=[f16, f32])

image(icon(36, 24, bg=0), 5).save(f'{OUT}/icon-180.png')        # iOS가 모서리를 깎으니 꽉 찬 배경
image(icon(32, 22, bg=2), 6).save(f'{OUT}/icon-192.png')
image(icon(32, 22, bg=2), 16).save(f'{OUT}/icon-512.png')
image(icon(32, 18, bg=0), 16).save(f'{OUT}/icon-512-maskable.png')  # 안전 영역(지름 80%) 안에 집
print('ok')
