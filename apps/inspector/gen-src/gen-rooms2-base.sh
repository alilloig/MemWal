#!/bin/zsh
# Base library room with an EXPLICIT uniform niche grid, straight-on and flat
# so one shelf-anchor set aligns crystals in every recolored variant.
cd "$(dirname "$0")"
STYLE=$(cat style.txt)
SUBJECT="First-person straight-on eye-level view of a small crystal library chamber. A perfectly FLAT front-facing back wall fills the frame, holding a symmetric grid of exactly 7 columns and 3 rows of identical empty upright arched niches, evenly spaced with equal margins between them, each niche a shallow softly-glowing recess ready to hold a single crystal (the niches are EMPTY). A slender crystal reading pedestal centered at the very bottom. Perfectly symmetric, centered, eye-level, minimal perspective distortion. Glacial ice-blue crystal material, pale frost-white light. No people, no text."
higgsfield generate create nano_banana_flash \
  --prompt "${STYLE} ${SUBJECT} Match the visual style and lighting of the reference image." \
  --image gates.png --aspect_ratio 16:9 \
  --wait --wait-timeout 15m --json > room2_glacial.json 2> room2_glacial.err
url=$(python3 -c "import json;d=json.load(open('room2_glacial.json'));i=d[0] if isinstance(d,list) else d;print(i.get('result_url') or '')" 2>/dev/null)
[ -n "$url" ] && curl -s -o room2_glacial.png "$url" && echo "base glacial ok" || echo "FAIL: $(head -c 160 room2_glacial.err)"
