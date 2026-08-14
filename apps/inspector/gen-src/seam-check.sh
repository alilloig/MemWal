#!/bin/zsh
# Seam QA (scroll-world Step 8, offline form): every leg i+1 must START on the
# exact frame leg i ENDED on. Extract both boundary frames and compare PSNR —
# frame-locked seams score very high (>35 dB); a content jump scores low.
cd "$(dirname "$0")"
for i in 0 1 2 3; do
  n=$((i+1))
  ffmpeg -y -ss 0 -i "leg_${n}.mp4" -frames:v 1 -q:v 2 "seam_${n}_first.png" >/dev/null 2>&1
  psnr=$(ffmpeg -i "leg_${i}_last.png" -i "seam_${n}_first.png" -lavfi psnr -f null - 2>&1 | grep -oE 'average:[0-9.inf]+' | cut -d: -f2)
  echo "seam ${i}->${n}: PSNR ${psnr} dB"
done
