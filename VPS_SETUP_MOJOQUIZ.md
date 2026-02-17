# VPS Setup Guide for MojoQuiz System

This guide walks you through setting up a fresh VPS to host **MojoQuiz** at `mojoquiz.co.zw`.

**Target OS:** Ubuntu 22.04 LTS
**Stack:** Node.js, Socket.IO, PostgreSQL (Local)

---

## 1. Domain & DNS Setup

Point your domain to your VPS:

1. **A Record**: Host `@`, Value `Your_VPS_IP`
2. **CNAME Record**: Host `www`, Value `mojoquiz.co.zw`

---

## 2. Initial Server Setup (Optional)

If you already have the `brian` user from the MMPZ setup, skip to **Step 3**.

1. **Update System**:

   ```bash
   ssh root@89.116.26.24
   apt update && apt upgrade -y
   ```

2. **Create User** (if needed):

   ```bash
   adduser brian
   usermod -aG sudo brian
   su - brian
   ```

---

## 3. Install Software (Node.js, PostgreSQL, Nginx)

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx & Tools
sudo apt install -y nginx git
sudo npm install -g pm2
```

---

## 4. Database Setup (Local PostgreSQL)

1. **Access PostgreSQL**:

   ```bash
   sudo -u postgres psql
   ```

2. **Create DB and User**:

   ```sql
   CREATE DATABASE mojoquiz_db;
   CREATE USER brian WITH ENCRYPTED PASSWORD 'Brian7350$@#'; -- Remember to URL-encode special chars in .env
   GRANT ALL PRIVILEGES ON DATABASE mojoquiz_db TO brian;
   ALTER DATABASE mojoquiz_db OWNER TO brian;
   \q
   ```

3. **Import Schema**:

   ```bash
   # From your project root after cloning
   psql -U brian -d mojoquiz_db -f database/schema_full.sql
   ```

---

## 5. Application Deployment

1. **Clone Project**:

   ```bash
   git clone git@github.com:brian-sama/MojoQuiz.git
   cd MojoQuiz
   ```

2. **Install & Build**:

   ```bash
   npm install
   cd backend && npm install && npm run build && cd ..
   cd frontend && npm install && npm run build && cd ..
   ```

3. **Configure Backend .env**:

   ```bash
   nano backend/.env
   ```

   **Content:**

   ```env
   PORT=3001
   NODE_ENV=production
   DATABASE_URL=postgresql://brian:Brian7350%24%40%23@localhost:5432/mojoquiz_db
   CORS_ORIGIN=https://mojoquiz.co.zw
   ```

4. **Start with PM2**:

   ```bash
   cd backend
   pm2 start dist/server.js --name "mojoquiz-backend"
   pm2 save
   pm2 startup
   ```

---

## 6. Nginx Reverse Proxy & SSL

1. **Nginx Config**:

   ```bash
   sudo nano /etc/nginx/sites-available/mojoquiz
   ```

   **Content:**

   ```nginx
   server {
       listen 80;
       server_name mojoquiz.co.zw www.mojoquiz.co.zw;

       location / {
           root /home/brian/MojoQuiz/frontend/dist;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://localhost:3001/api/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /socket.io/ {
           proxy_pass http://localhost:3001/socket.io/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
           proxy_set_header Host $host;
       }
   }
   ```

2. **Enable Site**:

   ```bash
   sudo ln -s /etc/nginx/sites-available/mojoquiz /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```

3. **SSL (HTTPS)**:

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d mojoquiz.co.zw -d www.mojoquiz.co.zw
   ```

---

## 7. Configuration Checklist

- [ ] **Firewall**: Ensure ports 80, 443, and 22 are open.
- [ ] **DB Password**: If password contains `@`, `$`, or `#`, use `%40`, `%24`, `%23` respectively in `DATABASE_URL`.
- [ ] **Permissions**: Nginx needs access to your home directory. Run `chmod +x /home/brian` to allow it.
- [ ] **Socket.IO**: The Nginx `/socket.io/` block is CRITICAL for real-time functionality.
- [ ] **CORS**: Ensure `CORS_ORIGIN` in backend `.env` matches your production domain.
