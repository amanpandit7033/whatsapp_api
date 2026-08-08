#!/bin/bash
set -e

# Always resolve script directory so script runs reliably regardless of working directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==============================================="
echo " WhatsApp API - Production Deployment Script"
echo " Optimized for 512MB RAM / 10GB Storage Servers"
echo "==============================================="

# 1. ADD SWAP SPACE (CRITICAL FOR 512MB RAM)
echo "Checking Swap Space..."
if [ $(free | grep -i swap | awk '{print $2}') -eq 0 ]; then
    if [ ! -f /swapfile ]; then
        echo "No Swap found! Creating 2GB swap space..."
        sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
    fi
    sudo swapon /swapfile 2>/dev/null || true
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi
    echo "Swap space configured successfully!"
else
    echo "Swap space already active. Skipping."
fi

# 2. UPDATE SYSTEM & INSTALL DEPENDENCIES
echo "Updating system and installing base dependencies..."
sudo apt-get update -y
sudo apt-get install -y curl nginx sqlite3 rsync

# Install Node.js (NodeSource Node.js 20 LTS)
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# 3. BACKEND SETUP
echo "Setting up Backend..."
cd "$SCRIPT_DIR/backend"

# Ensure .env exists with secure default secrets if not already present
if [ ! -f .env ]; then
    JWT_SECRET_GEN=$(head -c 32 /dev/urandom | base64 | tr -d '=+/')
    cat << EOL > .env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="${JWT_SECRET_GEN}"
EOL
    echo "Created backend/.env with generated JWT_SECRET"
fi

# Limit npm install concurrency to save RAM
npm install --no-fund --no-audit

# Generate database schema & seed initial admin account
npx prisma generate
npx prisma db push
if [ -f seed_admin.js ]; then
    echo "Seeding default admin user..."
    node seed_admin.js || true
fi

npm run build
cd "$SCRIPT_DIR"

# 4. FRONTEND SETUP
echo "Setting up Frontend..."
cd "$SCRIPT_DIR/frontend"

if [ ! -f .env ]; then
    echo "VITE_API_URL=" > .env
    echo "Created frontend/.env dynamically for relative routing"
fi

npm install --no-fund --no-audit
export NODE_OPTIONS="--max-old-space-size=512" # Restrict RAM usage for node during build
npm run build
cd "$SCRIPT_DIR"

# 5. START BACKEND WITH PM2
echo "Starting Backend with PM2..."
cd "$SCRIPT_DIR/backend"
pm2 start dist/server.js --name "whatsapp-api" || pm2 restart "whatsapp-api"
pm2 save

PM2_STARTUP_CMD=$(pm2 startup 2>&1 | grep -E 'sudo env|env PATH' | head -n 1 || true)
if [ -n "$PM2_STARTUP_CMD" ]; then
    eval "$PM2_STARTUP_CMD" || true
fi
cd "$SCRIPT_DIR"

# 6. CONFIGURE NGINX
echo "Configuring Nginx..."

WEB_ROOT="/var/www/whatsapp_api_dist"
sudo mkdir -p "$WEB_ROOT"
# Clean stale build assets and sync new ones safely into dedicated dist folder
sudo rsync -a --delete "$SCRIPT_DIR/frontend/dist/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"

DOMAIN=$(curl -s --connect-timeout 5 http://checkip.amazonaws.com || echo "localhost")
NGINX_CONF="/etc/nginx/sites-available/whatsapp-api"

sudo bash -c "cat > $NGINX_CONF" << EOL
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    # Frontend Static Files
    location / {
        root $WEB_ROOT;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket Proxy for Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
EOL

# Enable and Restart Nginx
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Open Firewall for Web Traffic
echo "Opening firewall for port 80..."
sudo ufw allow 80/tcp || true
sudo ufw allow 'Nginx Full' || true

echo "==============================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "Dashboard available at: http://$DOMAIN"
echo "API Endpoint available at: http://$DOMAIN/api"
echo "Default Admin Login: admin / AdminPassword123!"
echo "==============================================="
