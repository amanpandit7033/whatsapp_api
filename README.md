# WhatsApp Multi-Instance API Dashboard

A complete TechRush-compatible WhatsApp multi-instance API built with Node.js, Express, Baileys, Prisma, and React.

## 🚀 Linux Server Deployment Guide (Ubuntu/Debian)

This guide walks you through deploying the application on a production Linux server using PM2 and Nginx.

### 1. Server Requirements
- Node.js (v18 or higher)
- NPM
- PM2 (Process Manager)
- Nginx

**Install Node.js & PM2:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo npm install -g pm2
```

### 2. Backend Setup
Navigate to the backend folder and set up the Node.js server.

```bash
cd /path/to/whatsapp_api/backend

# Install dependencies
npm install

# Setup Environment variables (SQLite is used by default)
cp .env.example .env
# Edit .env and ensure PORT=5000 is set

# Generate Prisma Client and initialize the Database
npm run prisma:generate
npm run prisma:push

# Build the TypeScript code
npm run build

# Start the backend server with PM2
pm2 start dist/server.js --name "whatsapp-api"
pm2 save
pm2 startup
```

### 3. Frontend Setup
Navigate to the frontend folder and build the React dashboard.

```bash
cd /path/to/whatsapp_api/frontend

# Install dependencies
npm install

# Setup Environment variables
cp .env.example .env
# Edit .env and set VITE_API_URL=http://your_domain_or_ip/api (Leave it empty if Nginx is routing on the same domain)

# Build the React application for production
npm run build
```

### 4. Nginx Configuration
We will use Nginx to serve the static frontend files and proxy API/WebSocket requests to the backend.

Create a new Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/whatsapp-api
```

Paste the following configuration (replace `your_domain.com` and `/path/to/whatsapp_api` with your actual values):

```nginx
server {
    listen 80;
    server_name your_domain.com; # Or use your server IP

    # 1. Serve Frontend React App
    location / {
        root /path/to/whatsapp_api/frontend/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # 2. Proxy API Requests to Node.js Backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 3. Proxy WebSocket connections (Socket.io)
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable the configuration and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Securing with SSL (Optional but Recommended)
To enable HTTPS, use Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

### ✅ Deployment Complete!
You can now access your dashboard by visiting `http://your_domain.com`. 
The Admin backend API is available at `http://your_domain.com/api`.
