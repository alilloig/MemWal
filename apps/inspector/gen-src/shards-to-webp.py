#!/usr/bin/env python3
# Convert the crystal shards (glow on pure black) into transparent WEBP images
# by keying luminance → alpha, so the black drops out and the glow keeps a soft
# edge. Composited normally in the app (no fragile mix-blend-mode).
import os
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "public", "palace")
RES = Image.Resampling.LANCZOS

for s in ["glacial", "amethyst", "amber", "emerald", "rose", "sapphire"]:
    im = Image.open(os.path.join(here, f"shard_{s}.png")).convert("RGB")
    if im.width > 384:
        im = im.resize((384, round(im.height * 384 / im.width)), RES)
    # alpha = brightness (max channel), curved so faint rays fade but the
    # crystal body/glow stays solid.
    px = im.load()
    a = Image.new("L", im.size)
    ap = a.load()
    for y in range(im.height):
        for x in range(im.width):
            pr, pg, pb = px[x, y]
            m = max(pr, pg, pb) / 255.0
            ap[x, y] = int((m ** 0.75) * 255)
    im.putalpha(a)
    dest = os.path.join(out, f"shard_{s}.webp")
    im.save(dest, "WEBP", quality=90, method=6)
    print(s, f"{os.path.getsize(dest)//1024} KB")
