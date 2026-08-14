#!/bin/zsh
# Per-room arrival clips for click navigation: a short forward fly-in that
# SETTLES on the room still (end-image = the still, so the video hands off to
# the poster seamlessly). Independent clips — run all in parallel.
cd "$(dirname "$0")"
rm -f gen-arrivals.log
DIVE="Single continuous cinematic camera move, no cuts. Fly slowly FORWARD through a glowing crystal archway and come to a gentle stop facing the room. Ethereal crystal palace, prismatic refracted light, dreamlike, smooth graceful slow motion, no people, no text."

arrival() {
  local name="$1"; local endimg="$2"
  ( higgsfield generate create seedance_2_0 \
      --prompt "$DIVE" \
      --end-image "$endimg" \
      --mode std --resolution 1080p --aspect_ratio 16:9 --duration 5 \
      --wait --wait-timeout 20m --json > "arr_${name}.json" 2> "arr_${name}.err"
    code=$?
    url=$(python3 -c "import json;d=json.load(open('arr_${name}.json'));i=d[0] if isinstance(d,list) else d;print(i.get('result_url') or '')" 2>/dev/null)
    if [ $code -eq 0 ] && [ -n "$url" ]; then
      curl -s -o "arr_${name}.mp4" "$url" && echo "arr ${name}: ok" >> gen-arrivals.log
    else
      echo "arr ${name}: FAIL ($code) $(head -c 140 arr_${name}.err)$(head -c 140 arr_${name}.json)" >> gen-arrivals.log
    fi ) &
}

arrival rotunda rotunda.png
arrival lib_glacial lib_glacial.png
arrival lib_amethyst lib_amethyst.png
arrival lib_amber lib_amber.png
arrival lib_emerald lib_emerald.png
arrival lib_rose lib_rose.png
arrival lib_sapphire lib_sapphire.png
wait
echo "ALL_ARRIVALS_DONE" >> gen-arrivals.log
cat gen-arrivals.log
