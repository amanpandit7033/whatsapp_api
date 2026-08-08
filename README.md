# WhatsApp Multi-Instance API Gateway

A high-performance, multi-instance WhatsApp API Gateway and Dashboard built with **Node.js**, **Express**, **Baileys**, **Prisma (SQLite)**, and **React (Vite)**. Optimized to run smoothly on low-resource production VPS instances (e.g., 512MB–1GB RAM).

---

## 📥 Cloning the Repository

Clone the repository to your local machine or server:

```bash
git clone https://github.com/amanpandit7033/whatsapp_api.git
cd whatsapp_api
```

---

## 💻 Local Development Setup

Run the application locally on your development machine:

### 1. Backend Setup
```bash
cd backend

# Create environment configuration
cat << EOL > .env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="supersecret_dev_key"
EOL

# Install dependencies & initialize database
npm install
npx prisma generate
npx prisma db push

# Seed initial admin account (Username: admin / Password: AdminPassword123!)
node seed_admin.js

# Start backend with hot reload
npm run dev
```

### 2. Frontend Setup
In a new terminal:
```bash
cd frontend

# Set local backend URL
cat << EOL > .env
VITE_API_URL=http://localhost:5000
EOL

# Install dependencies & start Vite dev server
npm install
npm run dev
```

Access the local dashboard at **`http://localhost:5173`**.

---

## 🚀 Production Linux Server Deployment

### System Requirements
* **OS:** Ubuntu 20.04 / 22.04 / 24.04 LTS or Debian 11 / 12
* **RAM:** 512 MB minimum (Swap recommended)

### 1-Click Server Setup

On your production server, clone the repository and run [`deploy.sh`](file:///d:/Antigravity/whatsapp_api/deploy.sh):

```bash
git clone https://github.com/amanpandit7033/whatsapp_api.git
cd whatsapp_api
chmod +x deploy.sh
./deploy.sh
```

The script automatically sets up:
* 2GB Swap space (prevents out-of-memory errors on small VPS nodes)
* Node.js 20 LTS, PM2, and Nginx
* Database migrations and initial admin account seeding
* Frontend build optimization and static hosting
* Nginx reverse proxy (WebSocket & 50MB upload limits)
* PM2 process management & UFW firewall permissions

---

## 🔒 Securing with SSL (HTTPS via Certbot)

To enable HTTPS for your domain:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔑 Default Credentials & Initial Login

* **Dashboard URL:** `http://YOUR_SERVER_IP` (or `https://yourdomain.com`)
* **Default Admin Username:** `admin`
* **Default Admin Password:** `AdminPassword123!`

> ⚠️ Change the default admin password after your first login in the User Management section.

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)
| Key | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Node.js server port | `5000` |
| `DATABASE_URL` | Prisma SQLite database location | `"file:./dev.db"` |
| `JWT_SECRET` | Secret key for JWT token signing | *Auto-generated* |

### Frontend (`frontend/.env`)
| Key | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend API URL (Leave blank for relative Nginx proxying) | `""` |

---

## 📊 Operational & Maintenance Commands

### PM2 Process Control
```bash
# View process status
pm2 status

# View live application logs
pm2 logs whatsapp-api

# Restart / Stop backend service
pm2 restart whatsapp-api
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
# Test & reload Nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```
