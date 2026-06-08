#!/usr/bin/env bash
# Configure GitHub Actions secrets for VPS deploy.
# Requires: gh CLI authenticated (gh auth login)
# Usage:
#   VPS_HOST=1.2.3.4 VPS_USER=deploy VPS_SSH_KEY_FILE=~/.ssh/deploy_key VPS_DEPLOY_PATH=/opt/warp-license-server ./setup-github-secrets.sh
set -euo pipefail

: "${VPS_HOST:?Set VPS_HOST}"
: "${VPS_USER:?Set VPS_USER}"
: "${VPS_SSH_KEY_FILE:?Set VPS_SSH_KEY_FILE (path to private key PEM)}"
: "${VPS_DEPLOY_PATH:?Set VPS_DEPLOY_PATH}"

gh secret set VPS_HOST --body "${VPS_HOST}"
gh secret set VPS_USER --body "${VPS_USER}"
gh secret set VPS_DEPLOY_PATH --body "${VPS_DEPLOY_PATH}"
gh secret set VPS_SSH_KEY < "${VPS_SSH_KEY_FILE}"

echo "GitHub Actions secrets configured:"
gh secret list | grep -E '^VPS_'
