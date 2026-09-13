#!/usr/bin/env bash
set -euo pipefail
DEVICE=$(xcrun simctl list devices available -j | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(x["udid"] for devices in d["devices"].values() for x in devices if "iPhone" in x["name"]))')
xcrun simctl boot "$DEVICE"
xcrun simctl bootstatus "$DEVICE" -b
xcrun simctl install "$DEVICE" build/ios-smoke/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch "$DEVICE" uk.co.benjaminchurchill.fieldservice --invoice-export-smoke
CONTAINER=$(xcrun simctl get_app_container "$DEVICE" uk.co.benjaminchurchill.fieldservice data)
for attempt in $(seq 1 45); do
  if [ -f "$CONTAINER/Documents/invoice-export-smoke.txt" ]; then break; fi
  sleep 1
done
test "$(cat "$CONTAINER/Documents/invoice-export-smoke.txt")" = registered
echo 'InvoiceExport is registered in the running simulator app.'
