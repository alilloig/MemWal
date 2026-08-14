#!/bin/zsh
# Generate the click-navigation rooms: the vault rotunda hub + 6 distinct
# namespace-library variants. Style-locked to gates.png. Concurrent.
cd "$(dirname "$0")"
STYLE=$(cat style.txt)
BASE="Straight-on symmetrical first-person view. Subject: a small intimate circular crystal library room - the back wall dominated by a symmetric grid of crystal shelves with EMPTY geometric niches in even rows (three shelf rows, empty niches ready to hold small crystals), a slender reading pedestal at the center bottom, soft glow from within the shelves."
rm -f gen-rooms.log

gen() {
  local name="$1"; shift
  local subject="$1"; shift
  ( higgsfield generate create nano_banana_flash \
      --prompt "${STYLE} ${subject} Match the exact visual style and lighting of the reference image." \
      --image gates.png \
      --aspect_ratio 16:9 \
      --wait --wait-timeout 15m --json > "room_${name}.json" 2> "room_${name}.err"
    echo "room ${name}: exit $?" >> gen-rooms.log ) &
}

# NOTE: ROTUNDA_SLOTS in src/palace/scenes.ts is aligned to SEVEN doors — keep
# the door count here at seven and re-check the slot positions on any regen.
gen rotunda "Subject: the interior of a grand circular rotunda seen from its exact center - a ring of seven tall arched doorways evenly spaced around the curved crystal wall, each doorway glowing from within in a different hue (cyan, violet, warm gold, emerald, rose, deep sapphire), a compass rose inlaid in the polished reflective floor, the ceiling a faceted crystal dome. No people."
gen lib_glacial "${BASE} Variant material: glacial ice-blue crystal, pale frost light, cool white-cyan glow."
gen lib_amethyst "${BASE} Variant material: violet amethyst crystal, dreamy purple light, soft magenta accents."
gen lib_amber "${BASE} Variant material: warm amber and gold crystal, honey-colored light, golden dust motes."
gen lib_emerald "${BASE} Variant material: emerald green crystal, deep forest-glass tones, gentle green luminescence."
gen lib_rose "${BASE} Variant material: rose quartz crystal, blush pink light, delicate pearl shimmer."
gen lib_sapphire "${BASE} Variant material: deep midnight sapphire crystal, starlight speckles, indigo night glow."
wait
echo "ALL_ROOMS_DONE" >> gen-rooms.log
cat gen-rooms.log
