#!/bin/zsh
cd "$(dirname "$0")"
for s in gates atrium vault observatory scriptorium; do
  ffmpeg -y -i "${s}.png" -vf scale=1920:-2 -c:v libwebp -q:v 80 "../public/palace/${s}.webp" >/dev/null 2>&1
  echo "${s}.webp $(du -h ../public/palace/${s}.webp | cut -f1)"
done
