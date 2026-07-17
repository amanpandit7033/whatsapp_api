#!/bin/bash
set -e

echo "==============================================="
echo " WhatsApp API - 1-Click Deployment Script"
echo " Optimized for 512MB RAM / 10GB Storage Servers"
echo "==============================================="

# 1. ADD SWAP SPACE (CRITICAL FOR 512MB RAM)
echo "Checking Swap Space..."
if [ $(free | grep -i swap | awk '{print $2}') -eq 0 ]; then
    echo "No Swap found! Creating 2GB swap space to prevent Out-Of-Memory errors during build..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap space configured successfully!"
else
    echo "Swap space already exists. Skipping."
fi

# 2. UPDATE SYSTEM & INSTALL DEPENDENCIES
echo "Updating system and installing base dependencies..."
sudo apt-get update -y
sudo apt-get install -y curl nginx sqlite3

# Install Node.js 18
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# 3. BACKEND SETUP
echo "Setting up Backend..."
cd backend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created backend/.env (using defaults)"
fi

# Limit npm install concurrency to save RAM
npm install --no-fund --no-audit

# Generate database & build
npx prisma generate
npx prisma db push
npm run build
cd ..

# 4. FRONTEND SETUP
echo "Setting up Frontend..."
cd frontend
echo "VITE_API_URL=/api" > .env
echo "Created frontend/.env dynamically for Nginx relative routing"

# Build React app (RAM intensive)
npm install --no-fund --no-audit
export NODE_OPTIONS="--max-old-space-size=512" # Restrict RAM usage for node during build
npm run build
cd ..

# 5. START BACKEND WITH PM2
echo "Starting Backend with PM2..."
cd backend
pm2 start dist/server.js --name "whatsapp-api" || pm2 restart "whatsapp-api"
pm2 save
pm2 startup | tail -n 1 | bash || true
cd ..

# 6. CONFIGURE NGINX
echo "Configuring Nginx..."
DOMAIN=$(curl -s http://checkip.amazonaws.com || echo "localhost")
NGINX_CONF="/etc/nginx/sites-available/whatsapp-api"
sudo bash -c "cat > $NGINX_CONF" << EOL
server {
    listen 80;
    server_name _; # Catch all domains/IPs mapped to this server

    # Frontend
    location / {
        root $(pwd)/frontend/dist;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # API & WebSocket Proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }
}
EOL

# Enable and Restart Nginx
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "==============================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "Dashboard available at: http://$DOMAIN"
echo "API Endpoint available at: http://$DOMAIN/api"
echo "==============================================="
