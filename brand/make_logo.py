"""Visitown 로고를 픽셀 격자에 직접 찍는다. PNG(최근접 확대)와 SVG(색마다 path 하나)를 같이 만든다.
실행: python3 brand/make_logo.py  (Pillow 필요, 결과는 이 폴더에 덮어쓴다)
진입 화면(apps/web/shell/dashboard.html의 .gate-logo)에는 visitown-logo-inline.svg 내용을 그대로 붙여 넣는다."""
import sys, os
from PIL import Image, ImageColor

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

C = {
    'O': '#3b2f3a',  # 외곽선·머리
    'P': '#f5a3b5',  # 지붕·분홍 캐릭터
    'W': '#fff8ea',  # 벽
    'D': '#f2c14e',  # 문·노란 점
    'B': '#9fc6f2',  # 창문·파란 캐릭터
    'R': '#e8707f',  # 빨간 점
    'M': '#8fcf9f',  # 민트 점·나무
    'T': '#3fa86a',  # 워드마크 town
}
BG = '#f1e6d2'

# ---------- 심볼 ----------
SW, SH = 48, 46
grid = [[None] * SW for _ in range(SH)]

def put(mask, fill, outline='O'):
    """mask: (x,y) 집합. 8방향 이웃이 mask 밖이면 외곽선, 아니면 채움."""
    for (x, y) in mask:
        edge = any((x + dx, y + dy) not in mask for dx in (-1, 0, 1) for dy in (-1, 0, 1))
        grid[y][x] = outline if edge else fill

def rect(x0, y0, x1, y1):
    return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}

def sprite(rows, ox, oy, pal):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                grid[oy + j][ox + i] = pal.get(ch, ch)

# 벽 (x 11..36, 가운데 23.5 기준 대칭)
put(rect(11, 16, 36, 34), 'W')

# 지붕: 꼭대기 반폭 1에서 처마 반폭 15까지 1·2칸씩 번갈아 넓힌다
half = [1]
for inc in (1, 2, 1, 2, 1, 2, 1, 2, 2):
    half.append(half[-1] + inc)
roof = set()
for i, h in enumerate(half):
    y = 7 + i
    roof |= {(x, y) for x in range(24 - h, 24 + h)}
put(roof, 'P')

# 브라우저 점 3개
for x, col in ((14, 'R'), (17, 'D'), (20, 'M')):
    for dx in (0, 1):
        for dy in (0, 1):
            grid[19 + dy][x + dx] = col

# 창문 둘, 문
put(rect(13, 23, 18, 28), 'B')
put(rect(29, 23, 34, 28), 'B')
put(rect(21, 24, 26, 34), 'D')
grid[29][24] = 'O'  # 손잡이 한 칸

# 나무: 밑동이 벽 바닥선(y=34)에서 끝난다
TREE = [
    '...OOO...',
    '.OOMMMOO.',
    '.OMMMMMO.',
    'OMMMMMMMO',
    'OMMMMMMMO',
    'OMMMMMMMO',
    '.OMMMMMO.',
    '..OOOOO..',
    '....O....',
    '....O....',
]
sprite(TREE, 0, 25, {})
sprite(TREE, 39, 25, {})

# 뒷모습 캐릭터 둘: 문 양옆 아래, 문을 가리지 않게
CHAR = [
    '..OOOO..',
    '.OhhhhO.',
    'OhhhhhhO',
    'OhhhhhhO',
    '.OOOOOO.',
    'OccccccO',
    'OccccccO',
    '.OccccO.',
    '.OO..OO.',
]
sprite(CHAR, 12, 31, {'h': 'O', 'c': 'B'})
sprite(CHAR, 28, 31, {'h': 'P', 'c': 'P'})

# ---------- 워드마크 (같은 픽셀 크기, 대문자 높이 12) ----------
GLYPH = {
    'V': ['###...###'] * 6 + ['.###.###.', '.###.###.', '.#######.', '..#####..', '..#####..', '...###...'],
    'i': ['...', '###', '###', '...'] + ['###'] * 8,
    's': ['........'] * 4 + ['.#######', '########', '###.....', '#######.', '.#######', '.....###', '########', '#######.'],
    't': ['......', '.###..', '.###..', '.###..', '######', '######', '.###..', '.###..', '.###..', '.###..', '.#####', '..####'],
    'o': ['........'] * 4 + ['.######.', '########'] + ['###..###'] * 4 + ['########', '.######.'],
    'w': ['...........'] * 4 + ['###.....###', '###.....###'] + ['###.###.###'] * 4 + ['###########', '.####.####.'],
    'n': ['........'] * 4 + ['#######.', '########'] + ['###..###'] * 6,
}

def word(text, colors, gap=2):
    cols = []
    for k, ch in enumerate(text):
        g = GLYPH[ch]
        w = len(g[0])
        for i in range(w):
            cols.append([colors[k] if g[r][i] == '#' else None for r in range(12)])
        if k < len(text) - 1:
            cols += [[None] * 12 for _ in range(gap)]
    return cols  # 열 단위

WM = word('Visitown', ['O'] * 4 + ['T'] * 4)

# ---------- 출력 ----------
def bbox(g):
    pts = [(x, y) for y, row in enumerate(g) for x, v in enumerate(row) if v]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def crop(g):
    x0, y0, x1, y1 = bbox(g)
    return [row[x0:x1 + 1] for row in g[y0:y1 + 1]]

def compose_logo(sym, gap=9):
    sh, sw = len(sym), len(sym[0])
    ww = len(WM)
    H, W = sh, sw + gap + ww
    g = [[None] * W for _ in range(H)]
    for y in range(sh):
        for x in range(sw):
            g[y][x] = sym[y][x]
    # 워드마크 세로 가운데를 벽 가운데 쯤(심볼 높이의 55%)에 맞춘다
    top = round(sh * 0.55) - 6
    for i, col in enumerate(WM):
        for r, v in enumerate(col):
            if v:
                g[top + r][sw + gap + i] = v
    return g

def pad(g, mx, my):
    W = len(g[0]) + 2 * mx
    out = [[None] * W for _ in range(my)]
    out += [[None] * mx + row + [None] * mx for row in g]
    out += [[None] * W for _ in range(my)]
    return out

def square(g, margin):
    h, w = len(g), len(g[0])
    n = max(h, w) + 2 * margin
    mx, my = (n - w) // 2, (n - h) // 2
    return [[None] * n for _ in range(my)] + [[None] * mx + row + [None] * (n - w - mx) for row in g] + [[None] * n for _ in range(n - h - my)]

def png(g, path, scale, bg):
    h, w = len(g), len(g[0])
    im = Image.new('RGBA', (w, h), bg or (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        for x in range(w):
            if g[y][x]:
                px[x, y] = ImageColor.getrgb(C[g[y][x]]) + (255,)
    im.resize((w * scale, h * scale), Image.NEAREST).save(path)

def svg_markup(g, bg=None, attrs=''):
    """같은 색이 가로로 이어지는 구간을 'M x y h n v1 h-n z'로 이어 붙여 색마다 path 하나로 만든다."""
    h, w = len(g), len(g[0])
    runs = {}
    for y in range(h):
        x = 0
        while x < w:
            v = g[y][x]
            if not v:
                x += 1
                continue
            s = x
            while x < w and g[y][x] == v:
                x += 1
            runs.setdefault(v, []).append(f'M{s} {y}h{x - s}v1h-{x - s}z')
    out = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" shape-rendering="crispEdges"{attrs}>'
    if bg:
        out += f'<rect width="{w}" height="{h}" fill="{bg}"/>'
    for v, d in runs.items():
        out += f'<path fill="{C[v]}" d="{"".join(d)}"/>'
    return out + '</svg>'

def svg(g, path, bg):
    open(path, 'w').write(svg_markup(g, bg) + '\n')

sym = crop(grid)
logo = pad(compose_logo(sym), 8, 8)
icon = square(sym, 3)

for name, g, scale in (('visitown-logo', logo, 12), ('visitown-symbol', icon, 10)):
    png(g, f'{OUT}/{name}.png', scale, BG)
    png(g, f'{OUT}/{name}-transparent.png', scale, None)
    svg(g, f'{OUT}/{name}.svg', BG)
    svg(g, f'{OUT}/{name}-transparent.svg', None)
open(f'{OUT}/visitown-logo-inline.svg', 'w').write(svg_markup(crop(compose_logo(sym)), attrs=' role="img" aria-label="Visitown"') + '\n')
print('symbol', len(sym[0]), 'x', len(sym), '| logo', len(logo[0]), 'x', len(logo), '| icon', len(icon))
