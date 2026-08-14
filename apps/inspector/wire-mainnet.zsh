#!/bin/zsh
# Wire the inspector to the mainnet Walrus Memory account using the MCP's
# credentials (~/.memwal/credentials.json). Run from anywhere:
#   zsh apps/inspector/wire-mainnet.zsh
# Self-contained: starts the dev server, launches the dev Chrome (wallet
# profile, port 9222) if needed, opens the palace tab, injects the settings.
# The delegate key never leaves this machine.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
CDP=~/.claude/skills/drive-slush-wallet/scripts/cdp.py
CHROME="/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"

# 1. dev server
if ! curl -s -m 2 -o /dev/null http://localhost:5183; then
  echo "starting inspector dev server…"
  (cd "$HERE" && nohup pnpm dev > /tmp/inspector-dev.log 2>&1 &)
  until curl -s -m 2 -o /dev/null http://localhost:5183; do sleep 1; done
fi
echo "dev server up on :5183"

# 2. dev Chrome on 9222 (wallet profile)
if ! curl -s -m 2 -o /dev/null http://127.0.0.1:9222/json/version; then
  echo "launching dev Chrome…"
  "$CHROME" --remote-debugging-port=9222 --user-data-dir="$HOME/dev-chrome" \
    --disable-backgrounding-occluded-windows --disable-renderer-backgrounding \
    > /dev/null 2>&1 &
  until curl -s -m 2 -o /dev/null http://127.0.0.1:9222/json/version; do sleep 1; done
fi

# 3. palace tab (open one if missing)
TARGET=$(python3 "$CDP" targets "localhost:5183" 2>/dev/null | grep -m1 'id:' | awk '{print $2}')
if [ -z "$TARGET" ]; then
  curl -s -m 5 -X PUT "http://127.0.0.1:9222/json/new?http://localhost:5183" > /dev/null
  sleep 2
  TARGET=$(python3 "$CDP" targets "localhost:5183" 2>/dev/null | grep -m1 'id:' | awk '{print $2}')
fi
if [ -z "$TARGET" ]; then
  echo "could not open http://localhost:5183 in the dev Chrome — open it manually and re-run."
  exit 1
fi

# 4. inject settings from the MCP credentials
JSON=$(python3 - <<'PY'
import json
c = json.load(open('/Users/alilloig/.memwal/credentials.json'))
assert c['accountId'] == '0x55a1ee026f1a1f299a03a82e1bc83fd04060e14799174ac3400c4281553a8239', \
    f"credentials.json holds unexpected account {c['accountId']}"
s = {
    'delegateKey': c['delegatePrivateKey'],
    'accountId': c['accountId'],
    'serverUrl': 'http://localhost:5183',
    'namespace': 'default',
    'network': 'mainnet',
    'suiGrpcUrl': '',
    'walrusPackageId': '',
    'dashboardUrl': 'https://memory.walrus.xyz',
}
print(json.dumps(json.dumps(s)))
PY
)
python3 "$CDP" eval "$TARGET" "(() => { localStorage.setItem('memwal-inspector-settings', ${JSON}); location.reload(); return 'mainnet settings stored, reloading'; })()"
echo "done — the palace should reconnect to 0x55a1ee02…8239 on mainnet."
