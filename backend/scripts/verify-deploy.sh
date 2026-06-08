#!/usr/bin/env bash
# Post-deploy smoke test. Run on the VPS or against a reachable API host.
set -euo pipefail

API_URL="${API_URL:-http://localhost:5150}"

response="$(curl -sf "${API_URL}/health")"
echo "${response}" | grep -q '"status":"ok"'
echo "Health check passed: ${response}"
