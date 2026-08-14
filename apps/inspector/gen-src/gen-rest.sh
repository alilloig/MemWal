#!/bin/zsh
# Generate the 4 interior scenes on nano_banana_flash, style-locked to gates.png.
cd "$(dirname "$0")"
rm -f gen-rest.log
for s in atrium vault observatory scriptorium; do
  ( higgsfield generate create nano_banana_flash \
      --prompt "$(cat scene_${s}.txt) Match the exact visual style, palette and lighting of the reference image." \
      --image gates.png \
      --aspect_ratio 16:9 \
      --wait --wait-timeout 15m --json > "scene_${s}.json" 2> "scene_${s}.err"
    echo "scene ${s}: exit $?" >> gen-rest.log ) &
done
wait
echo "ALL_REST_DONE" >> gen-rest.log
cat gen-rest.log
