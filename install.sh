#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Updating package lists..."
sudo apt-get update -y

echo "==> Installing prerequisites..."
sudo apt-get install -y curl gnupg ca-certificates lsb-release

# --- Node.js 20 via NodeSource ---
if ! command -v node &>/dev/null || [[ "$(node --version | cut -d. -f1 | tr -d 'v')" -lt 20 ]]; then
  echo "==> Adding NodeSource repository for Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  echo "==> Installing Node.js 20..."
  sudo apt-get install -y nodejs
else
  echo "==> Node.js $(node --version) already installed, skipping."
fi

# --- PostgreSQL 15 ---
if ! command -v psql &>/dev/null; then
  echo "==> Adding PostgreSQL apt repository..."
  sudo install -d /usr/share/postgresql-common/pgdg
  sudo curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    | sudo tee /etc/apt/sources.list.d/pgdg.list
  sudo apt-get update -y
  echo "==> Installing PostgreSQL 15..."
  sudo apt-get install -y postgresql-15
else
  echo "==> PostgreSQL $(psql --version) already installed, skipping."
fi

# --- npm packages ---
echo "==> Installing npm packages..."
cd "$SCRIPT_DIR"
npm install

echo ""
echo "==> Installation complete."
echo "    Node.js: $(node --version)"
echo "    npm:     $(npm --version)"
echo "    psql:    $(psql --version)"
echo ""
echo "Next steps:"
echo "  1. Configure your .env file (copy from .env.example)"
echo "  2. Start PostgreSQL:  sudo systemctl start postgresql"
echo "  3. Run migrations:    npm run db:push"
echo "  4. Start dev server:  npm run dev"
echo "  5. Or build & start:  npm run build && npm run start"
