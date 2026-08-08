# WhatsApp Multi-Instance API Gateway

A high-performance, multi-instance WhatsApp API Gateway and Dashboard built with **Node.js**, **Express**, **Baileys**, **Prisma (SQLite)**, and **React (Vite)**. Optimized to run smoothly on low-resource production VPS instances (e.g., 512MB–1GB RAM).

---

## 📋 System Requirements

* **OS:** Ubuntu 20.04 / 22.04 / 24.04 LTS or Debian 11 / 12
* **RAM:** 512 MB minimum (2 GB Swap recommended)
* **Node.js:** v18 or v20 LTS
* **Package Manager:** npm (v9+)
* **Web Server:** Nginx (used for static file hosting & reverse proxy)
* **Process Manager:** PM2

---

## ⚡ Option 1: 1-Click Automatic Deployment (Recommended)

The included [`deploy.sh`](file:///d:/Antigravity/whatsapp_api/deploy.sh) script fully automates server provisioning, swap setup, dependency installation, backend build, Prisma DB migration, admin seeding, frontend compilation, PM2 process management, and Nginx proxy configuration.

### Run the 1-Click Script:
```bash
chmod +x deploy.sh
./deploy.sh
```

### What `deploy.sh` handles automatically:
1. **Swap Allocation:** Detects RAM and creates a 2GB swap space if none exists (prevents build OOM crashes on 512MB RAM servers).
2. **Environment & Node.js:** Installs Node.js 20 LTS, Nginx, SQLite3, rsync, and PM2 globally.
3. **Backend Setup:** Generates `backend/.env` with an auto-generated random `JWT_SECRET`, runs Prisma migrations (`npx prisma db push`), seeds the default admin account, and compiles TypeScript.
4. **Frontend Build:** Restricts Node RAM usage (`--max-old-space-size=512`), builds the React app, and syncs static assets to `/var/www/whatsapp_api`.
5. **Process Management:** Starts and persists the backend using PM2 (`pm2 start dist/server.js --name whatsapp-api`).
6. **Nginx Proxy:** Configures Nginx with WebSocket support (`/socket.io/`), long-polling timeouts (86400s), and `client_max_body_size 50M` for Excel and media file uploads.

---

## 🛠️ Option 2: Manual Step-by-Step Production Deployment

If you prefer to configure your server manually, follow these steps:

### Step 1: Configure Swap Space (Crucial for 512MB RAM VPS)
```bash
# Check existing swap
free -h

# Create 2GB swap file if no swap exists
sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Step 2: Install Node.js 20 LTS & Core System Dependencies
```bash
sudo apt-get update -y
sudo apt-get install -y curl nginx sqlite3 rsync

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### Step 3: Backend Setup & Environment Variables
Navigate to the `backend` directory and set up configuration:
```bash
cd backend

# Create backend/.env file
cat << EOL > .env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="$(head -c 32 /dev/urandom | base64 | tr -d '=+/')"
EOL

# Install dependencies
npm install --no-fund --no-audit

# Generate Prisma client & apply database schema
npx prisma generate
npx prisma db push

# Seed initial admin account
node seed_admin.js

# Compile TypeScript to JavaScript (dist/ folder)
npm run build
```

### Step 4: Start Backend with PM2
```bash
pm2 start dist/server.js --name "whatsapp-api"
pm2 save
pm2 startup
```

### Step 5: Frontend Build Setup
Navigate to the `frontend` directory and compile the React app:
```bash
cd ../frontend

# Create frontend/.env (Leave VITE_API_URL blank for Nginx relative proxying)
echo "VITE_API_URL=" > .env

# Install dependencies
npm install --no-fund --no-audit

# Limit RAM usage during Vite compilation
export NODE_OPTIONS="--max-old-space-size=512"
npm run build
```

### Step 6: Configure Nginx & Serve Web Traffic
Copy static build files and set up Nginx reverse proxy:

```bash
# Move static assets to web root
sudo mkdir -p /var/www/whatsapp_api
sudo rsync -a --delete frontend/dist/ /var/www/whatsapp_api/
sudo chown -R www-data:www-data /var/www/whatsapp_api
```

Create Nginx site configuration (`/etc/nginx/sites-available/whatsapp-api`):
```bash
sudo nano /etc/nginx/sites-available/whatsapp-api
```

Paste the following configuration:
```nginx
server {
    listen 80;
    server_name _; # Replace with your domain or IP address

    # Increase maximum allowed body size for media/Excel bulk uploads
    client_max_body_size 50M;

    # 1. Frontend React SPA Hosting
    location / {
        root /var/www/whatsapp_api;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # 2. Reverse Proxy for Backend REST API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # 3. Reverse Proxy for Socket.io WebSockets
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Enable the Nginx config and restart Nginx:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/whatsapp-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Configure Firewall (UFW)
```bash
sudo ufw allow 80/tcp || true
sudo ufw allow 'Nginx Full' || true
```

---

## 🔒 Securing with SSL (HTTPS via Certbot)

To enable SSL encryption for your domain:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔑 Default Credentials & Initial Access

Upon completing deployment:

* **Dashboard URL:** `http://YOUR_SERVER_IP` (or `https://yourdomain.com`)
* **Default Admin Username:** `admin`
* **Default Admin Password:** `AdminPassword123!`

> ⚠️ **Security Tip:** Immediately update the admin password after initial login via the User Management panel.

---

## ⚙️ Environment Variables Reference

### Backend Environment (`backend/.env`)
| Key | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Node.js backend port | `5000` |
| `DATABASE_URL` | SQLite or PostgreSQL connection string | `"file:./dev.db"` |
| `JWT_SECRET` | Secret key for signing authentication tokens | *Random 32-char string* |

### Frontend Environment (`frontend/.env`)
| Key | Description | Default / Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL for API requests (Leave empty for relative Nginx proxying) | `""` or `"https://api.yourdomain.com"` |

---

## 📊 Useful Operational & Maintenance Commands

### PM2 Process Control
```bash
# View running process status
pm2 status

# View live application logs (WhatsApp connections & errors)
pm2 logs whatsapp-api

# Restart backend process
pm2 restart whatsapp-api

# Stop backend process
pm2 stop whatsapp-api
```

### Database Management
```bash
cd backend

# Re-apply database schema changes
npx prisma db push

# Re-seed default admin credentials
node seed_admin.js
```

### Nginx Management
```bash
# Test Nginx configuration syntax
sudo nginx -t

# Reload Nginx without downtime
sudo systemctl reload nginx

# View Nginx access & error logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```
