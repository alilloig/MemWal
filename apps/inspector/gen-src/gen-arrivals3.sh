#!/bin/zsh
# Regenerate the 6 namespace-room fly-in clips to END on the NEW uniform-grid
# room stills, so each video settles on the room it enters. 2 at a time (plan
# concurrency). seedance first; on failure fall back to kling3_0 (different
# content filter). Encodes to public/palace/lib_<name>.mp4 on success.
cd "$(dirname "$0")"
rm -f gen-arrivals3.log
DIVE="Single continuous cinematic camera move, no cuts. Fly slowly FORWARD through a glowing crystal archway and come to a gentle stop facing the room. Ethereal crystal palace, prismatic refracted light, dreamlike, smooth graceful slow motion, no people, no text."

url_of() { python3 -c "import json;d=json.load(open('$1'));i=d[0] if isinstance(d,list) else d;print(i.get('result_url') or '')" 2>/dev/null; }

one() {
  local name="$1"
  higgsfield generate create seedance_2_0 --prompt "$DIVE" --end-image "room2_${name}.png" \
    --mode std --resolution 1080p --aspect_ratio 16:9 --duration 5 \
    --wait --wait-timeout 20m --json > "arr2_${name}.json" 2> "arr2_${name}.err"
  local url=$(url_of "arr2_${name}.json")
  if [ -z "$url" ]; then
    echo "arr2 ${name}: seedance failed, trying kling3_0" >> gen-arrivals3.log
    higgsfield generate create kling3_0 --prompt "$DIVE" --end-image "room2_${name}.png" \
      --mode std --sound off --aspect_ratio 16:9 --duration 5 \
      --wait --wait-timeout 20m --json > "arr2_${name}.json" 2> "arr2_${name}.err"
    url=$(url_of "arr2_${name}.json")
  fi
  if [ -n "$url" ]; then
    curl -s -o "arr2_${name}.mp4" "$url"
    ffmpeg -y -i "arr2_${name}.mp4" -an -vf "unsharp=5:5:0.6:5:5:0.0" -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart "../public/palace/lib_${name}.mp4" >/dev/null 2>&1
    echo "arr2 ${name}: ok" >> gen-arrivals3.log
  else
    echo "arr2 ${name}: FAIL $(head -c 130 arr2_${name}.err)" >> gen-arrivals3.log
  fi
}
one glacial & one amethyst & wait
one amber & one emerald & wait
one rose & one sapphire & wait
echo "ARRIVALS3_DONE" >> gen-arrivals3.log
cat gen-arrivals3.log
