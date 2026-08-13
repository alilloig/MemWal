#!/bin/zsh
# Writes the 5 leg prompts (architecture A — continuous forward take with the
# motion-handoff contract: every leg ends settling into a slow steady forward drift).
cd "$(dirname "$0")"
STYLE=$(cat style.txt)
HANDOFF_IN="Continue the same slow, steady forward drift the shot begins with — the camera only ever glides forward, it never pulls back or reverses."
HANDOFF_OUT="End by settling into a slow, steady forward drift toward the next doorway for the final second."

cat > leg_0.txt <<EOF
Single continuous cinematic camera move, no cuts. Begin outside the crystal palace facing its towering gates, glide slowly FORWARD along the crystalline bridge toward the doors; the colossal translucent doors open gently and the camera passes through into the glowing light of the entrance corridor. ${HANDOFF_OUT} ${STYLE} Smooth graceful slow motion, architectural, empty, unoccupied, no people, no figures. No text.
EOF
cat > leg_1.txt <<EOF
Single continuous cinematic camera move, no cuts. ${HANDOFF_IN} The camera glides forward into a grand circular atrium with a soaring faceted crystal dome; at its center a column of soft light where small glowing motes of memory spiral upward; crystal arch balconies all around. ${HANDOFF_OUT} ${STYLE} Smooth graceful slow motion, architectural, empty, unoccupied, no people, no figures. No text.
EOF
cat > leg_2.txt <<EOF
Single continuous cinematic camera move, no cuts. ${HANDOFF_IN} The camera glides forward into a long vaulted crystal gallery — the memory vault — rows of floating glowing crystal shards hovering above slender pedestals on both sides, each shard lit softly from within, the gallery receding far into the distance. ${HANDOFF_OUT} ${STYLE} Smooth graceful slow motion, architectural, empty, unoccupied, no people, no figures. No text.
EOF
cat > leg_3.txt <<EOF
Single continuous cinematic camera move, no cuts. ${HANDOFF_IN} The camera glides forward into a scrying observatory chamber where a giant suspended crystal lens orb focuses beams of light, constellation-like points of light projected across the curved crystal walls; the camera passes beneath the orb along a thin walkway. ${HANDOFF_OUT} ${STYLE} Smooth graceful slow motion, architectural, empty, unoccupied, no people, no figures. No text.
EOF
cat > leg_4.txt <<EOF
Single continuous cinematic camera move, no cuts. ${HANDOFF_IN} The camera glides forward into a serene crystal scriptorium — a crystal writing desk where a quill of pure light hovers over a glowing translucent tablet, shelves of dormant unlit crystal shards along the walls, warm gold light mixing with the cyan glow. The camera pushes in gently toward the desk and settles into an almost still, very slow forward drift. ${STYLE} Smooth graceful slow motion, architectural, empty, unoccupied, no people, no figures. No text.
EOF
echo prompts-written
