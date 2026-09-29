#!/usr/bin/env bash
# NØVA — capture real application screenshots with headless Chrome.
# Desktop 1440x900, mobile 390x844. Requires `npm run dev` on :3000.
# Note: this environment cannot view images; sanity-check by file size
# (a rendered R3F hero shot is ~100-400KB; a blank page is a few KB).
set -u
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://localhost:3000}"
OUT="docs/screenshots"
mkdir -p "$OUT"

shoot() { # name url width height
  local name="$1" url="$2" w="$3" h="$4"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --enable-unsafe-swiftshader \
    --window-size="$w,$h" --screenshot="$OUT/$name.png" \
    --virtual-time-budget=15000 --timeout=45000 \
    --user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" \
    "$url" >/dev/null 2>&1
  ls -l "$OUT/$name.png" 2>/dev/null | awk '{print $5, $9}'
}

shoot nova-desktop          "$BASE/"                             1440 900
shoot nova-mobile           "$BASE/"                             390  844
shoot dashboard-desktop     "$BASE/dashboard"                    1440 900
shoot dashboard-mobile      "$BASE/dashboard"                    390  844
shoot verification-desktop  "$BASE/grant?request=req_hackspire_grant" 1440 900
shoot verification-mobile   "$BASE/grant?request=req_hackspire_grant" 390  844
