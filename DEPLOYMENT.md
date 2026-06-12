# WhatsApp API Gateway - Production Deployment Guide

This guide provides step-by-step instructions for deploying the WhatsApp API Gateway (Backend + Frontend) to a production environment.

## Prerequisites

Before starting, ensure your production server has the following installed:
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **PostgreSQL** database (running and accessible)
- **PM2** (Process Manager for Node.js): `npm install -g pm2`
- **Nginx** (Recommended for reverse proxy and serving frontend)
- **Git** (to clone the repository)

---

## 1. Transfer Project to Server

Since this project is not hosted on a Git repository like GitHub, you will need to manually transfer the source code from your local machine to your production server.

### Option A: Using ZIP & FTP/WinSCP (Recommended for Windows)
1. On your local machine, compress the entire `whatsapp_api` folder into a `.zip` file. 
   *(Tip: Delete the `node_modules` folders inside `backend` and `frontend` before zipping to save time).*
2. Connect to your server using an FTP client like **FileZilla** or **WinSCP**.
3. Upload the `.zip` file to your desired directory on the server.
4. SSH into your server, unzip the file, and enter the directory:
```bash
unzip whatsapp_api.zip
cd whatsapp_api
```

### Option B: Using SCP (Mac/Linux)
If you are on Mac or Linux, you can copy the folder directly via terminal:
```bash
scp -r ./whatsapp_api user@your_server_ip:/var/www/
ssh user@your_server_ip
cd /var/www/whatsapp_api
```

---

## 2. Backend Deployment Setup

### Step 2.1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2.2: Environment Variables
Create a `.env` file in the `backend` directory with your production details:
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_db?schema=public"
JWT_SECRET="your-super-secure-jwt-secret-key-change-me"
```
*(Make sure the database exists in PostgreSQL)*

### Step 2.3: Database Migration
Apply Prisma migrations to initialize the production database schema:
```bash
npx prisma generate
npx prisma migrate deploy
```

### Step 2.4: Build the Backend
Compile the TypeScript code to JavaScript:
```bash
npm run build
```
*(This will output the compiled code to the `dist` folder).*

### Step 2.5: Start with PM2
Start the backend using PM2 to ensure it runs continuously and restarts on crashes:
```bash
pm2 start dist/server.js --name "whatsapp-api-backend"
pm2 save
pm2 startup
```

---

## 3. Frontend Deployment Setup

### Step 3.1: Install Dependencies
```bash
cd ../frontend
npm install
```

### Step 3.2: Environment Variables
Create a `.env` file in the `frontend` directory. Make sure it points to your production backend API.
```env
# If using a domain:
VITE_API_URL=https://api.yourdomain.com
# If running locally without domain:
# VITE_API_URL=http://your-server-ip:3000
```

### Step 3.3: Build for Production
Generate the static production bundle:
```bash
npm run build
```
*(This generates a `dist` folder inside `frontend` containing the optimized HTML/CSS/JS files).*

---

## 4. Web Server & Reverse Proxy (Nginx)

To serve the frontend securely and route API requests, we recommend configuring Nginx.

### Step 4.1: Configure Nginx
Create a new Nginx configuration block (e.g., `/etc/nginx/sites-available/whatsapp_api`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve Frontend Static Files
    location / {
        root /path/to/whatsapp_api/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Reverse Proxy for Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Reverse Proxy for WebSocket/Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### Step 4.2: Enable & Restart Nginx
```bash
sudo ln -s /etc/nginx/sites-available/whatsapp_api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. Securing with SSL (HTTPS)
Use **Certbot** to automatically configure SSL for your domain:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 6. Maintenance & Troubleshooting

- **Viewing Backend Logs:** 
  To see live logs of your WhatsApp connections or errors:
  ```bash
  pm2 logs whatsapp-api-backend
  ```

- **Restarting Backend:**
  If you make updates to the `.env` or code:
  ```bash
  pm2 restart whatsapp-api-backend
  ```

- **Prisma Updates:**
  If you change the Prisma schema in the future, remember to run:
  ```bash
  npx prisma migrate deploy
  pm2 restart whatsapp-api-backend
  ```

## You are now ready for Production! 🚀
Access your dashboard at `https://yourdomain.com` and login with your admin credentials.
