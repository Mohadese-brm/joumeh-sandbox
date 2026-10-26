# rev2 pixel scan of a 1x card crop (6px margin): along rays from the arch centre, find the rendered border ring and the photo edge.
# Reports border ring radius, photo-edge radius, and gap (inner border edge -> photo) per angle, plus ring continuity (no clipping gaps).
import sys, json, math
from PIL import Image
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def scan(path, pad=8, margin=6):
    sc = 2 if '@2x' in path else 1; margin *= sc
    im = Image.open(path).convert('RGB'); W, H = im.size; w = W - 2*margin
    R = w/2; cx = margin + R; cy = margin + R   # box outer top radius = w/2 (semicircle)
    res = []
    for a in range(5, 180, 5):
        t = math.radians(a); prof = []
        for i in range(0, int(R*10)):        # sample inward every 0.1 device px from 3 device px outside the box
            r = R + 3 - i/10
            x, y = cx + r*math.cos(t), cy - r*math.sin(t)
            if y < 0 or y >= H - 1 or x < 0 or x >= W - 1: prof.append(None); continue
            prof.append((r, im.getpixel((int(x), int(y)))))
        prof = [q for q in prof if q]
        # border ring = darkest sample within R±2 (on cream bg/white inside the border is the darkest thing); photo edge = first r (from outside, past ring) where pixel departs from white
        ring = min((q for q in prof if R - 2*sc <= q[0] <= R + 1), key=lambda q: lum(q[1]))
        white = lambda q: max(abs(c - 255) for c in q[1]) <= 10
        inside = [q for q in prof if q[0] < ring[0]]
        k = next((i for i, q in enumerate(inside) if white(q)), None)            # skip the border's anti-aliased inner edge
        edge = next((q for q in inside[k:] if not white(q)), None) if k is not None else None   # first non-white after the white padding = photo
        res.append({'deg': a, 'ringR': round(ring[0], 1), 'ringRGB': ring[1], 'photoR': round(edge[0], 1) if edge else None,
                    'gap': round((ring[0] - 0.5*sc - edge[0]) / sc, 1) if edge else None})
    gaps = [r['gap'] for r in res if r['gap'] is not None]; ringL = [round(lum(r['ringRGB'])) for r in res]; bgL = round(lum(im.getpixel((2, 2))))
    return {'file': path.split('/')[-1], 'outerR': R / sc, 'gapMin': min(gaps), 'gapMax': max(gaps), 'ringLumMin': min(ringL), 'ringLumMax': max(ringL),
            'scale': sc, 'bgLum': bgL, 'ringContinuous': all(bgL - l >= 8 for l in ringL), 'angles': len(res), 'samples': [r for r in res if r['deg'] in (15, 45, 90, 135, 165)]}
out = [scan(p) for p in sys.argv[1:]]
print(json.dumps(out, indent=1, default=str))
