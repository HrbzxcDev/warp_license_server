#!/usr/bin/env bash
# One-time VPS setup for warp-license-backend CI/CD.
# Run as root or with sudo on a fresh Ubuntu/Debian VPS.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/warp-license-server}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
GHCR_USER="${GHCR_USER:-HrbzxcDev}"

echo "==> Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Creating deploy user: ${DEPLOY_USER}"
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "${DEPLOY_USER}"
  usermod -aG docker "${DEPLOY_USER}"
fi

echo "==> Creating deploy directory: ${DEPLOY_PATH}"
mkdir -p "${DEPLOY_PATH}"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_PATH}"

echo "==> Writing docker-compose.prod.yml"
cat > "${DEPLOY_PATH}/docker-compose.prod.yml" <<'EOF'
services:
  warp-license-server:
    image: ghcr.io/hrbzxcdev/warp-license-backend:latest
    ports:
      - "5150:5150"
    env_file: .env
    restart: unless-stopped
EOF
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_PATH}/docker-compose.prod.yml"

if [[ ! -f "${DEPLOY_PATH}/.env" ]]; then
  echo "==> Creating ${DEPLOY_PATH}/.env template (edit with real secrets)"
  cat > "${DEPLOY_PATH}/.env" <<'EOF'
API_KEY=change-this-to-a-long-random-string
ADMIN_KEY=change-this-to-a-different-long-random-string
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
EOF
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_PATH}/.env"
  chmod 600 "${DEPLOY_PATH}/.env"
fi

echo ""
echo "Next steps:"
echo "  1. Edit ${DEPLOY_PATH}/.env with production DATABASE_URL, API_KEY, ADMIN_KEY"
echo "  2. Log in to GHCR (required for private packages):"
echo "       echo <PAT_with_read:packages> | docker login ghcr.io -u ${GHCR_USER} --password-stdin"
echo "  3. Add the deploy user's SSH public key to ~${DEPLOY_USER}/.ssh/authorized_keys"
echo "  4. Add GitHub Actions secrets: VPS_HOST, VPS_USER=${DEPLOY_USER}, VPS_SSH_KEY, VPS_DEPLOY_PATH=${DEPLOY_PATH}"
echo "  5. Test manually:"
echo "       cd ${DEPLOY_PATH} && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d"
echo "       curl -sf http://localhost:5150/health"
