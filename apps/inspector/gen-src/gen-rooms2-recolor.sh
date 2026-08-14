#!/bin/zsh
# Recolor the base uniform-grid room into the other 5 variants — same geometry,
# camera and niche grid (locked via --image), only the crystal colour changes.
cd "$(dirname "$0")"
rm -f gen-rooms2.log
recolor() {
  local name="$1"; local color="$2"
  higgsfield generate create nano_banana_flash \
    --prompt "Recolor this exact crystal library chamber to ${color} crystal material and light. Keep the IDENTICAL niche grid layout (7 columns, 3 rows of empty upright niches), the same camera, framing, pedestal and composition — change only the crystal colour and glow. No people, no text." \
    --image room2_glacial.png --aspect_ratio 16:9 \
    --wait --wait-timeout 15m --json > "room2_${name}.json" 2> "room2_${name}.err"
  local url=$(python3 -c "import json;d=json.load(open('room2_${name}.json'));i=d[0] if isinstance(d,list) else d;print(i.get('result_url') or '')" 2>/dev/null)
  [ -n "$url" ] && curl -s -o "room2_${name}.png" "$url" && echo "recolor ${name} ok" >> gen-rooms2.log || echo "recolor ${name} FAIL: $(head -c 140 room2_${name}.err)" >> gen-rooms2.log
}
recolor amethyst "soft violet amethyst" & recolor amber "warm amber and gold" & wait
recolor emerald "emerald green" & recolor rose "rose pink and pearl" & wait
recolor sapphire "deep sapphire blue"
echo "RECOLOR_DONE" >> gen-rooms2.log
cat gen-rooms2.log
