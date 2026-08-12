#!/bin/bash
set -e

# Always resolve script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==============================================="
echo " WhatsApp API - Quick Update & Deployment Script"
echo "==============================================="

# 1. PULL LATEST CODE (if in git repo)
if [ -d .git ]; then
    echo "Pulling latest code from git repository..."
    git pull origin main || true
fi

# 2. BACKEND BUILD & DATABASE MIGRATION
echo "Updating Backend and Database Schema..."
cd "$SCRIPT_DIR/backend"
npm install --no-fund --no-audit
npx prisma db push
npx prisma generate
npm run build

# 3. FRONTEND BUILD
echo "Building Frontend Production Assets..."
cd "$SCRIPT_DIR/frontend"
npm install --no-fund --no-audit
export NODE_OPTIONS="--max-old-space-size=512"
npm run build

# 4. SYNC DIST TO NGINX WEB ROOT
echo "Syncing frontend assets to Nginx web root..."
WEB_ROOT="/var/www/whatsapp_api_dist"
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete "$SCRIPT_DIR/frontend/dist/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"

# 5. RESTART PM2 BACKEND PROCESS
echo "Restarting Backend PM2 Service..."
pm2 restart whatsapp-api 2>/dev/null || pm2 restart all

# 6. RELOAD NGINX
echo "Reloading Nginx web server..."
sudo systemctl reload nginx || sudo systemctl restart nginx

echo "==============================================="
echo "✅ UPDATE COMPLETED SUCCESSFULLY!"
echo "Please refresh your browser (Ctrl + Shift + R / Cmd + Shift + R)"
echo "and log out & log in once to refresh your permissions."
echo "==============================================="
