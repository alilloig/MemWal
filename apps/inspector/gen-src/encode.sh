#!/bin/zsh
# Encode the rendered legs (native res, crf 20, GOP 8, faststart, no audio,
# light unsharp). Only leg 0 (gates.mp4) ships as the connect cinematic since
# the click-navigation rewrite; the GOP-8 tuning and the other four outputs are
# leftovers of the earlier scroll-scrub build. public/palace/ is not gitignored,
# so re-running this drops four unused clips into the repo — delete them, or
# encode leg 0 only.
cd "$(dirname "$0")"
rooms=(gates atrium vault observatory scriptorium)
for i in 0 1 2 3 4; do
  src="leg_${i}.mp4"
  out="../public/palace/${rooms[$((i+1))]}.mp4"
  if [ ! -f "$src" ]; then echo "missing $src"; exit 1; fi
  ffmpeg -y -i "$src" -an -vf "unsharp=5:5:0.8:5:5:0.0" \
    -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
    -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart "$out" >/dev/null 2>&1
  echo "${rooms[$((i+1))]}.mp4 $(du -h "$out" | cut -f1)"
done
