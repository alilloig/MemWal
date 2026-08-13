#!/bin/zsh
# Probe which image model+settings the free plan accepts, cheapest acceptable first.
cd "$(dirname "$0")"
try() {
  local name="$1"; shift
  higgsfield generate create "$@" --prompt "$(cat scene_gates.txt)" --aspect_ratio 16:9 --wait --wait-timeout 12m --json > "probe_${name}.json" 2> "probe_${name}.err"
  local code=$?
  if [ $code -eq 0 ] && grep -q result_url "probe_${name}.json"; then
    echo "OK ${name}"
    return 0
  fi
  echo "FAIL ${name} (exit $code): $(head -c 120 probe_${name}.err)"
  return 1
}
try gpt2_default gpt_image_2 && exit 0
try nb2 nano_banana_flash && exit 0
try nbl nano_banana_2_lite && exit 0
try flux flux_2 && exit 0
echo ALL_PROBES_FAILED
