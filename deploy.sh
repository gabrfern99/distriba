#!/bin/bash
set -e

# Deploy script for remote server
# Usage: ./deploy.sh
#
# Prerequisites on remote server:
#   1. Docker and docker-compose installed
#   2. Authenticated to GHCR: echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
#   3. .env file with AUTH_SECRET, AUTH_URL, COSMOS_API_TOKEN

echo "==> Pulling latest image..."
docker compose -f docker-compose.prod.yml pull app

echo "==> Restarting services..."
docker compose -f docker-compose.prod.yml up -d

echo "==> Cleaning old images..."
docker image prune -f

echo "==> Deploy complete!"
docker compose -f docker-compose.prod.yml ps
