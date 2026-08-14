#!/bin/zsh
# Generate one luminous memory-crystal per room variant, on a PURE BLACK
# background. shards-to-webp.py keys that black to an alpha channel so the shard
# composites normally in the app (no mix-blend-mode). 2 at a time (plan limit).
cd "$(dirname "$0")"
rm -f gen-shards.log
P="A single luminous faceted crystal shard standing upright, a glowing memory crystal lit from within, translucent gemstone facets with sharp clean edges, soft radiant bloom and light rays, COLORWORD radiance, floating centered on a pure solid black background, cinematic product render, high detail, no text, no logos, no people."

one() {
  local name="$1"; local color="$2"
  local prompt="${P/COLORWORD/$color}"
  higgsfield generate create nano_banana_flash --prompt "$prompt" --aspect_ratio 1:1 \
    --wait --wait-timeout 15m --json > "shard_${name}.json" 2> "shard_${name}.err"
  local code=$?
  local url=$(python3 -c "import json;d=json.load(open('shard_${name}.json'));i=d[0] if isinstance(d,list) else d;print(i.get('result_url') or '')" 2>/dev/null)
  if [ $code -eq 0 ] && [ -n "$url" ]; then
    curl -s -o "shard_${name}.png" "$url" && echo "shard ${name}: ok" >> gen-shards.log
  else
    echo "shard ${name}: FAIL ($code) $(head -c 120 shard_${name}.err)" >> gen-shards.log
  fi
}

one glacial "icy cyan and pale frost-white" & one amethyst "soft violet and magenta" & wait
one amber "warm amber and gold" & one emerald "emerald green" & wait
one rose "rose pink and pearl" & one sapphire "deep sapphire blue with starlight" & wait
echo "SHARDS_DONE" >> gen-shards.log
cat gen-shards.log
