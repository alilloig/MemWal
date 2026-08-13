#!/bin/zsh
# Generate the 5 crystal-palace scene stills concurrently (detached from caller).
# bash-3.2-safe (no associative arrays). Run from gen-src/.
set -u
cd "$(dirname "$0")"
STYLE=$(cat style.txt)

subject_for() {
  case "$1" in
    gates) echo "Subject: the towering entrance of the crystal memory palace seen from outside on an approach path - two colossal translucent crystal doors slightly ajar leaking cyan light, a crystalline bridge leading to them over a calm dark reflective void, distant glowing spires of the palace above." ;;
    atrium) echo "Subject: a grand circular atrium at the heart of the crystal palace - a soaring dome of faceted glass, a central column of soft light where small glowing motes of memory spiral upward, balconies of crystal arches all around." ;;
    vault) echo "Subject: a long vaulted gallery, the memory vault - rows of floating crystal shards on slender pedestals, each shard glowing softly from within like a stored memory, small engraved crystal plaques beneath them, the gallery receding into the distance." ;;
    observatory) echo "Subject: a scrying observatory chamber - a giant suspended crystal lens orb at the center focusing beams of light, constellation-like points of light projected across curved crystal walls, a thin walkway leading beneath the orb." ;;
    scriptorium) echo "Subject: a serene scriptorium chamber at the far end of the palace - a crystal writing desk where a quill of pure light hovers over a glowing translucent tablet, shelves of dormant unlit crystal shards waiting to be filled, warm gold light mixing with the cyan glow." ;;
  esac
}

for s in gates atrium vault observatory scriptorium; do
  printf '%s %s\n' "$STYLE" "$(subject_for $s)" > "scene_${s}.txt"
  ( higgsfield generate create gpt_image_2 \
      --prompt "$(cat scene_${s}.txt)" \
      --aspect_ratio 16:9 --resolution 2k --quality high \
      --wait --wait-timeout 15m --json > "scene_${s}.json" 2> "scene_${s}.err"
    echo "scene ${s}: exit $?" >> gen-scenes.log ) &
done
wait
echo "ALL_SCENES_DONE" >> gen-scenes.log
cat gen-scenes.log
