#!/usr/bin/env python3
"""Convert the room stills to 1920w webp posters in public/palace/."""
import os
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "public", "palace")
os.makedirs(out, exist_ok=True)
for s in ["gates", "atrium", "vault", "observatory", "scriptorium"]:
    im = Image.open(os.path.join(here, f"{s}.png")).convert("RGB")
    w, h = im.size
    if w > 1920:
        im = im.resize((1920, round(h * 1920 / w)), Image.LANCZOS)
    dest = os.path.join(out, f"{s}.webp")
    im.save(dest, "WEBP", quality=82, method=6)
    print(s, im.size, f"{os.path.getsize(dest)//1024} KB")
