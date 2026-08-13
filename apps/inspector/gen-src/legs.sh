#!/bin/zsh
# Architecture A: 5 sequential legs. Leg 0 starts from gates.png; each later leg
# starts from the previous leg's ACTUAL last frame. One model for the whole
# chain ($VMODEL, default seedance_2_0_mini for the free plan). 3 attempts per
# leg (NSFW false-positive re-rolls). bash-3.2-safe.
cd "$(dirname "$0")"
VMODEL="${VMODEL:-seedance_2_0_mini}"
case "$VMODEL" in
  kling3_0) VOPTS=(--mode std --sound off --duration 8) ;;
  seedance_2_0) VOPTS=(--mode std --resolution 1080p --duration 8) ;;
  *) VOPTS=(--resolution 720p --duration 8) ;;
esac
rm -f legs.log

for i in 0 1 2 3 4; do
  if [ "$i" -eq 0 ]; then START=gates.png; else START="leg_$((i-1))_last.png"; fi
  if [ ! -f "$START" ]; then echo "leg $i: missing start image $START" | tee -a legs.log; exit 1; fi
  ok=0
  for attempt in 1 2 3; do
    echo "leg $i attempt $attempt ($VMODEL)" | tee -a legs.log
    higgsfield generate create "$VMODEL" \
      --prompt "$(cat leg_${i}.txt)" \
      --start-image "$START" \
      "${VOPTS[@]}" --aspect_ratio 16:9 \
      --wait --wait-timeout 20m --json > "leg_${i}.json" 2> "leg_${i}.err"
    code=$?
    url=$(python3 -c "import json;d=json.load(open('leg_${i}.json'));i=d[0] if isinstance(d,list) else d;print(i.get('result_url') or '')" 2>/dev/null)
    if [ $code -eq 0 ] && [ -n "$url" ]; then
      curl -s -o "leg_${i}.mp4" "$url" && ok=1 && break
    fi
    echo "leg $i attempt $attempt failed (exit $code): $(head -c 160 leg_${i}.err) $(head -c 160 leg_${i}.json)" | tee -a legs.log
  done
  if [ $ok -ne 1 ]; then echo "leg $i FAILED after 3 attempts" | tee -a legs.log; exit 1; fi
  ffmpeg -y -sseof -0.15 -i "leg_${i}.mp4" -frames:v 1 -q:v 2 "leg_${i}_last.png" >/dev/null 2>&1
  echo "leg $i done -> leg_${i}.mp4 (last frame extracted)" | tee -a legs.log
done
echo "ALL_LEGS_DONE" | tee -a legs.log
