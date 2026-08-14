#!/usr/bin/env python3
# Convert the uniform-grid library rooms to 1920w webp, replacing the old
# lib_<variant>.webp stills.
import os
from PIL import Image

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "public", "palace")
RES = Image.Resampling.LANCZOS
for s in ["glacial", "amethyst", "amber", "emerald", "rose", "sapphire"]:
    im = Image.open(os.path.join(here, f"room2_{s}.png")).convert("RGB")
    w, h = im.size
    if w > 1920:
        im = im.resize((1920, round(h * 1920 / w)), RES)
    dest = os.path.join(out, f"lib_{s}.webp")
    im.save(dest, "WEBP", quality=82, method=6)
    print(s, f"{os.path.getsize(dest)//1024} KB")
