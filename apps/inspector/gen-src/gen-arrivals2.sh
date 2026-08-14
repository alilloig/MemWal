#!/bin/zsh
# Regenerate the clips that ended on a flight-leg frame instead of the room's
# actual still — so every clip settles on the exact image the scene shows.
# 2 at a time (plan concurrency limit).
cd "$(dirname "$0")"
DIVE="Single continuous cinematic camera move, no cuts. Fly slowly FORWARD through a glowing crystal archway and come to a gentle stop facing the room. Ethereal crystal palace, prismatic refracted light, dreamlike, smooth graceful slow motion, no people, no text."
ENTER="Single continuous cinematic camera move, no cuts. Begin outside the crystal palace gates; the great translucent doors open and the camera flies FORWARD through them, down a glowing corridor, and into the grand domed atrium, settling to a gentle stop facing the room. Ethereal crystal palace, prismatic light, dreamlike, smooth graceful slow motion, no people, no text."

gen() {  # <name> <prompt> <end-image> [start-image]
  local name="$1"; local prompt="$2"; local endimg="$3"; local startimg="$4"
  local args=(--prompt "$prompt" --end-image "$endimg" --mode std --resolution 1080p --aspect_ratio 16:9 --duration 5)
  [ -n "$startimg" ] && args+=(--start-image "$startimg")
  higgsfield generate create seedance_2_0 "${args[@]}" \
    --wait --wait-timeout 20m --json > "arr_${name}.json" 2> "arr_${name}.err"
  local code=$?
  local url=$(python3 -c "import json;d=json.load(open('arr_${name}.json'));i=d[0] if isinstance(d,list) else d;print(i.get('result_url') or '')" 2>/dev/null)
  if [ $code -eq 0 ] && [ -n "$url" ]; then
    curl -s -o "arr_${name}.mp4" "$url" && echo "arr ${name}: ok ($(du -h arr_${name}.mp4 | cut -f1))"
  else
    echo "arr ${name}: FAIL ($code) $(head -c 140 arr_${name}.err)"
  fi
}

gen enter "$ENTER" atrium.png gates.png &
gen atrium "$DIVE" atrium.png &
wait
gen observatory "$DIVE" observatory.png &
gen scriptorium "$DIVE" scriptorium.png &
wait
echo "ARRIVALS2_DONE"
