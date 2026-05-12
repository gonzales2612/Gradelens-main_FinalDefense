# GradeLens - Developer Commands Guide

This document contains all essential commands for running GradeLens locally and deploying to production.

---

## 🟢 Local Development (Docker Compose)

### Test 1: Development Configuration

#### Start Services
```powershell
cd c:\Users\ADMIN\Desktop\Program\GradeLens\infra
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d --build
```

#### Start Frontend Dev Server (Separate Terminal)
```powershell
cd c:\Users\ADMIN\Desktop\Program\GradeLens\presentation\frontend
npm run dev
```

#### Monitor Logs
```powershell
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f api
docker compose -f docker-compose.dev.yml logs -f cv-worker
docker compose -f docker-compose.dev.yml logs -f cv-api

# You can also view the logs in Docker Engine itself
```

#### Check Status
```powershell
docker compose -f docker-compose.dev.yml ps
```

#### Access Points (Dev)
- Frontend Dev Server: http://localhost:5173
- API: http://localhost:3000/api
- CV API: http://localhost:8000
- API Health Check: http://localhost:3000/api/health
- CV API Health: http://localhost:8000/health
- MongoDB: localhost:27017
- Redis: localhost:6379

#### Verify Dev Setup
- [ ] All 5 containers running (api, cv-worker, cv-api, mongo, redis)
- [ ] API health check: http://localhost:3000/api/health
- [ ] CV API health: http://localhost:8000/health
- [ ] Hot reload works (edit src file and see restart)
- [ ] Logs show "npm run dev" for API
- [ ] Frontend accessible at http://localhost:5173

#### MongoDB Commands (Local Dev)
```powershell
# Access MongoDB shell
docker exec -it gradelens-mongo mongosh gradelens

# Seed admin user
docker exec -it gradelens-api npx tsx src/scripts/seed-admin.ts

# Export scans collection
docker exec gradelens-mongo mongosh gradelens --quiet --eval "printjson(db.scans.find().toArray())" > scan_full_pretty.json

# View collections
docker exec gradelens-mongo mongosh gradelens --quiet --eval "db.getCollectionNames()"

# Count documents in a collection
docker exec gradelens-mongo mongosh gradelens --quiet --eval "db.scans.countDocuments()"
```

#### Rebuild Specific Service
```powershell
# If you make changes and need to rebuild
docker compose -f docker-compose.dev.yml build api --no-cache
docker compose -f docker-compose.dev.yml up -d api

# Or rebuild all
docker compose -f docker-compose.dev.yml up -d --build
```

#### Stop Dev Services
```powershell
docker compose -f docker-compose.dev.yml down

# Stop and remove volumes (clean slate)
docker compose -f docker-compose.dev.yml down -v
```

---

## 🔴 Production Deployment (DigitalOcean)

### Initial Setup

#### 1. Clone Repository
```bash
cd /opt
sudo git clone https://github.com/Zedbyte/GradeLens.git gradelens
cd gradelens
ls -la
```

#### 2. Create Environment File
```bash
cd /opt/gradelens/infra
```

```bash
# Generate secure secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

cat > .env << EOF
# JWT Secrets (Auto-generated)
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Database
MONGO_URL=mongodb://mongo:27017/gradelens

# Redis
REDIS_URL=redis://redis:6379/0

# Application
NODE_ENV=production
PORT=3000
SCAN_STORAGE_DIR=/data/scans
ALLOWED_ORIGINS=http://143.198.207.23

# CV Service
DEBUG=false
IMAGE_ROOT=/data/scans
EOF
```

#### 3. Build All Services
```bash
cd /opt/gradelens/infra
docker compose build
```

#### 4. Start All Services
```bash
docker compose up -d
```

#### 5. Check Status
```bash
docker compose ps
```

All services should show "Up" status:
- gradelens-nginx
- gradelens-frontend
- gradelens-api
- gradelens-cv-worker
- gradelens-cv-api
- gradelens-mongo
- gradelens-redis

#### 6. Seed Admin User
```bash
docker compose exec api node dist/scripts/seed-admin.js
```

#### 7. Verify Deployment
- [ ] Access application: http://143.198.207.23
- [ ] Check health: http://143.198.207.23/health
- [ ] Log in with admin credentials
- [ ] All containers running without restarts

---

### Updating the Application

#### Pull Latest Changes
```bash
cd /opt/gradelens
git pull
```

#### Rebuild and Restart Specific Service
```bash
cd /opt/gradelens/infra

# Rebuild API only
docker compose build api
docker compose up -d api

# Rebuild Frontend only (for UI changes)
docker compose build frontend
docker compose up -d frontend

# Restart Nginx (after any backend change)
docker compose restart nginx
```

#### Rebuild All Services
```bash
cd /opt/gradelens/infra
docker compose build
docker compose up -d
```

#### Force Rebuild (No Cache)
```bash
docker compose build --no-cache api
docker compose build --no-cache frontend
docker compose up -d
```

---

### Monitoring & Logs

#### View All Logs
```bash
cd /opt/gradelens/infra
docker compose logs -f
```

#### View Specific Service Logs
```bash
# API logs
docker compose logs -f api

# Frontend logs
docker compose logs -f frontend

# Nginx logs
docker compose logs -f nginx

# CV Worker logs
docker compose logs -f cv-worker

# CV API logs
docker compose logs -f cv-api

# MongoDB logs
docker compose logs -f mongo

# Redis logs
docker compose logs -f redis
```

#### View Last N Lines
```bash
docker compose logs --tail=100 api
```

#### Check Container Status
```bash
docker compose ps

# Detailed inspection
docker inspect gradelens-api
```

---

### MongoDB Operations (Production)

#### Access MongoDB Shell
```bash
docker compose exec mongo mongosh gradelens
```

#### Seed Admin User
```bash
docker compose exec api node dist/scripts/seed-admin.js
```

#### Common MongoDB Queries
```bash
# List all collections
docker compose exec mongo mongosh gradelens --quiet --eval "db.getCollectionNames()"

# Count documents
docker compose exec mongo mongosh gradelens --quiet --eval "db.scans.countDocuments()"
docker compose exec mongo mongosh gradelens --quiet --eval "db.users.countDocuments()"

# Find all users
docker compose exec mongo mongosh gradelens --quiet --eval "db.users.find().pretty()"

# Export data
docker compose exec mongo mongosh gradelens --quiet --eval "printjson(db.scans.find().toArray())" > scans_export.json
```

#### Backup Database
```bash
# Create backup
docker compose exec mongo mongodump --db=gradelens --out=/tmp/backup

# Copy backup to host
docker cp gradelens-mongo:/tmp/backup ./mongodb_backup_$(date +%Y%m%d)
```

---

### Nginx Operations

#### Restart Nginx
```bash
docker compose restart nginx
```

#### Reload Nginx Config
```bash
docker compose exec nginx nginx -s reload
```

#### Test Nginx Config
```bash
docker compose exec nginx nginx -t
```

#### View Nginx Access Logs
```bash
docker compose logs nginx | grep "POST\|GET\|DELETE\|PUT"
```

---

### Service Management

#### Restart Specific Service
```bash
docker compose restart api
docker compose restart frontend
docker compose restart nginx
```

#### Restart All Services
```bash
docker compose restart
```

#### Stop All Services
```bash
docker compose stop
```

#### Start All Services
```bash
docker compose start
```

#### Remove All Services (Keep Data)
```bash
docker compose down
```

#### Remove All Services and Volumes (Clean Slate)
```bash
docker compose down -v
```

---

### Frontend Changes Deployment

When you update frontend code (LoginForm, components, etc.):

```bash
# 1. Pull latest code
cd /opt/gradelens
git pull

# 2. Rebuild frontend container
cd infra
docker compose build frontend

# 3. Restart frontend
docker compose up -d frontend

# 4. Restart nginx to clear cache
docker compose restart nginx

# 5. Clear browser cache (on client side)
# Hard refresh: Ctrl + Shift + R
```

---

### Troubleshooting

#### Check Container Health
```bash
docker compose ps
docker inspect gradelens-api | grep -A 10 "State"
```

#### Enter Container Shell
```bash
docker compose exec api sh
docker compose exec frontend sh
```

#### Check Network Connectivity
```bash
# From nginx to api
docker compose exec nginx wget -O- http://api:3000/api/health

# From api to mongo
docker compose exec api sh
nc -zv mongo 27017
```

#### Remove and Rebuild Everything
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

#### Check Disk Space
```bash
df -h
docker system df
docker system prune -a
```

---

## 🔒 SSL/HTTPS Setup with Let's Encrypt

This guide walks through setting up HTTPS for GradeLens using a custom domain and Let's Encrypt SSL certificates.

### Prerequisites
- A registered domain name (e.g., gradelens.app from name.com)
- Domain pointing to your DigitalOcean droplet IP (143.198.207.23)
- SSH access to your droplet

---

### Step 1: Configure DNS at Name.com

1. **Log in to Name.com Dashboard**
2. **Navigate to your domain** → **Manage DNS Records**
3. **Add A Records:**

   **Root Domain:**
   - Type: `A`
   - Host: `@`
   - Answer: `143.198.207.23` (your droplet IP)
   - TTL: `300` (or default)

   **WWW Subdomain:**
   - Type: `A`
   - Host: `www`
   - Answer: `143.198.207.23`
   - TTL: `300`

4. **Save the records**
5. **Wait 5-10 minutes** for DNS propagation

**Verify DNS Propagation (from droplet):**
```bash
# Both should return your droplet IP
dig gradelens.app +short
dig www.gradelens.app +short
```

---

### Step 2: Configure Firewall (Allow HTTP/HTTPS)

**Let's Encrypt needs port 80 accessible to verify domain ownership.**

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ensure SSH is allowed (if not already)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Verify rules
sudo ufw status numbered
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

### Step 3: Install Certbot

```bash
sudo apt update
sudo apt install certbot -y

# Verify installation
certbot --version
```

---

### Step 4: Obtain SSL Certificate

**Stop nginx temporarily** (certbot needs port 80):
```bash
cd /opt/gradelens/infra
docker compose stop nginx
```

**Get certificate:**
```bash
sudo certbot certonly --standalone \
  -d gradelens.app \
  -d www.gradelens.app \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

Replace `your-email@example.com` with your actual email.

**Successful output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/gradelens.app/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/gradelens.app/privkey.pem
This certificate expires on YYYY-MM-DD.
```

---

### Step 5: Update Environment Variables

**Update `.env` to allow HTTPS origins:**
```bash
cd /opt/gradelens/infra
nano .env
```

Update the `ALLOWED_ORIGINS` line:
```env
ALLOWED_ORIGINS=https://gradelens.app,https://www.gradelens.app,http://gradelens.app,http://www.gradelens.app
```

Save and exit (Ctrl+X, Y, Enter)

---

### Step 6: Update Docker Compose Configuration

**On your local machine**, edit `infra/docker-compose.yml`:

Update the nginx service to include HTTPS port and certificate volumes:

```yaml
nginx:
  image: nginx:alpine
  container_name: gradelens-nginx
  ports:
    - "80:80"
    - "443:443"  # Add HTTPS port
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro  # Mount SSL certificates
    - /var/www/certbot:/var/www/certbot:ro  # For certificate renewal
  depends_on:
    - api
    - frontend
    - cv-api
  restart: unless-stopped
  networks:
    - gradelens
```

Update the API service ALLOWED_ORIGINS:
```yaml
api:
  # ... other config ...
  environment:
    # ... other env vars ...
    ALLOWED_ORIGINS: https://gradelens.app,https://www.gradelens.app,http://gradelens.app,http://www.gradelens.app
```

---

### Step 7: Update Nginx Configuration for HTTPS

**On your local machine**, edit `infra/nginx/nginx.conf`:

Replace entire content with:

```nginx
upstream api {
    server api:3000;
}

upstream cv-api {
    server cv-api:8000;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name gradelens.app www.gradelens.app;
    
    # Allow Let's Encrypt renewal
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name gradelens.app www.gradelens.app;
    client_max_body_size 50M;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/gradelens.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gradelens.app/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API routes
    location /api/ {
        proxy_pass http://api/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # CV API routes
    location /cv/ {
        proxy_pass http://cv-api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Health check
    location /health {
        proxy_pass http://api/api/health;
        proxy_set_header Host $host;
    }
}
```

**Replace `gradelens.app` with your actual domain** in the certificate paths and server_name directives.

---

### Step 8: Update Frontend Environment

**On your local machine**, edit `presentation/frontend/.env.production`:

```env
# Frontend Production Environment Variables
VITE_API_BASE_URL=https://gradelens.app/api
VITE_CV_API_URL=https://gradelens.app/cv
```

**Replace `gradelens.app` with your domain.**

---

### Step 9: Enable Secure Cookies (API)

**On your local machine**, edit `application/api/src/controllers/auth.controller.ts`:

Change cookie settings from `secure: false` to `secure: true`:

```typescript
res.cookie("refresh_token", refreshToken, {
  httpOnly: true,
  secure: true,  // Enable for HTTPS
  sameSite: "lax",
  path: API_ROUTES.BASE.API,
  maxAge: 1000 * 60 * 60 * 24 * 30,
});
```

Do this for both login and refresh endpoints.

---

### Step 10: Deploy HTTPS Configuration

**Commit and push changes:**
```powershell
git add .
git commit -m "Enable HTTPS with Let's Encrypt SSL"
git push
```

**On the droplet:**
```bash
# Pull latest changes
cd /opt/gradelens
git pull

# Create webroot directory for certificate renewal
sudo mkdir -p /var/www/certbot

# Rebuild services with new config
cd infra

# or rebuild everything,
docker compose build

# or if frontend & api changes only,
docker compose build api frontend --no-cache

docker compose up -d

# Check all services are running
docker compose ps
```

---

### Step 11: Set Up Auto-Renewal (Crontab)

**Certificates expire every 90 days.** Set up automatic renewal:

```bash
sudo crontab -e
```

**Choose editor** (select 1 for nano)

**Add this line at the bottom:**
```cron
0 3 * * * certbot renew --webroot -w /var/www/certbot --quiet --deploy-hook "docker compose -f /opt/gradelens/infra/docker-compose.yml restart nginx"
```

This runs daily at 3 AM and renews certificates when they're close to expiration.

Save and exit (Ctrl+X, Y, Enter)

**Test renewal (dry run):**
```bash
sudo certbot renew --webroot -w /var/www/certbot --dry-run
```

Expected output:
```
Congratulations, all simulated renewals succeeded
```

---

### Step 12: Verify HTTPS Deployment

1. **Visit your site:** https://gradelens.app

2. **Check for:**
   - ✅ 🔒 Padlock icon in browser
   - ✅ Certificate issued by "Let's Encrypt"
   - ✅ HTTP redirects to HTTPS automatically
   - ✅ Login works (sessions persist after refresh)
   - ✅ Camera access works (requires HTTPS)

3. **Test HTTP redirect:**
   - Visit http://gradelens.app → should redirect to https://gradelens.app

4. **Test health endpoint:**
   - https://gradelens.app/health

5. **Check certificate expiration:**
```bash
sudo certbot certificates
```

---

## Troubleshooting HTTPS Issues

### DNS Not Resolving

**Problem:** Domain doesn't point to your droplet

**Solution:**
```bash
# Check DNS from droplet
dig gradelens.app +short
dig www.gradelens.app +short

# Both should return: 143.198.207.23
```

Wait 10-15 minutes if DNS just updated. Clear local DNS cache on your computer.

---

### Certbot Fails: "Connection Timeout"

**Problem:** Firewall blocking port 80

**Solution:**
```bash
# Check firewall status
sudo ufw status

# Allow ports if not already
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verify port is open
sudo netstat -tlnp | grep :80
```

---

### Certbot Fails: "Port Already in Use"

**Problem:** Nginx is running on port 80

**Solution:**
```bash
# Stop nginx before getting certificate
cd /opt/gradelens/infra
docker compose stop nginx

# Get certificate
sudo certbot certonly --standalone -d gradelens.app -d www.gradelens.app

# Restart nginx after
docker compose up -d nginx
```

---

### CORS Errors After HTTPS

**Problem:** Frontend still trying to connect to HTTP or localhost

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
```bash
# 1. Verify .env.production has correct domain
cat presentation/frontend/.env.production
# Should show: VITE_API_BASE_URL=https://gradelens.app/api

# 2. Verify docker-compose.yml has correct ALLOWED_ORIGINS
cat infra/docker-compose.yml | grep ALLOWED_ORIGINS
# Should include: https://gradelens.app,https://www.gradelens.app

# 3. Rebuild frontend to pick up new env vars
cd infra
docker compose build frontend --no-cache
docker compose up -d frontend
docker compose restart nginx

# 4. Clear browser cache (Ctrl+Shift+Delete)
# 5. Hard refresh (Ctrl+Shift+R)
```

---

### Certificate Renewal Fails

**Problem:** Auto-renewal can't bind to port 80

**Solution:**

Use webroot method instead of standalone:

```bash
# Create webroot directory
sudo mkdir -p /var/www/certbot

# Update crontab
sudo crontab -e

# Change to webroot method:
0 3 * * * certbot renew --webroot -w /var/www/certbot --quiet --deploy-hook "docker compose -f /opt/gradelens/infra/docker-compose.yml restart nginx"

# Test renewal
sudo certbot renew --webroot -w /var/www/certbot --dry-run
```

---

### HTTPS Works But Camera Doesn't

**Problem:** Camera requires HTTPS but still shows security error

**Possible causes:**
1. Mixed content (some resources loading over HTTP)
2. Self-signed certificate (use Let's Encrypt instead)
3. Browser doesn't trust certificate

**Solution:**
```bash
# Verify all resources use HTTPS
# Open browser DevTools → Console
# Check for mixed content warnings

# Verify certificate is valid
curl -I https://gradelens.app

# Should show:
# HTTP/2 200
# server: nginx
```

---

### View Certificate Details

```bash
# Check certificate info
sudo certbot certificates

# View certificate expiration
openssl x509 -in /etc/letsencrypt/live/gradelens.app/fullchain.pem -text -noout | grep "Not After"

# Test SSL configuration
curl -vI https://gradelens.app 2>&1 | grep "SSL"
```

---

## 📝 Quick Reference

### Local Development
```powershell
# Start
cd infra
docker compose -f docker-compose.dev.yml up -d --build

# Frontend
cd presentation/frontend
npm run dev

# Stop
docker compose -f docker-compose.dev.yml down
```

### Production Deployment
```bash
# Deploy
cd /opt/gradelens
git pull
cd infra
docker compose build
docker compose up -d

# Update frontend only
docker compose build frontend
docker compose up -d frontend
docker compose restart nginx

# View logs
docker compose logs -f api
```

### MongoDB
```bash
# Local
docker exec -it gradelens-mongo mongosh gradelens
docker exec -it gradelens-api npx tsx src/scripts/seed-admin.ts

# Production
docker compose exec mongo mongosh gradelens
docker compose exec api node dist/scripts/seed-admin.js
```

---

## 🔗 Important URLs

### Local Development
- Frontend: http://localhost:5173
- API: http://localhost:3000/api
- API Health: http://localhost:3000/api/health
- CV API: http://localhost:8000

### Production
- Application: http://143.198.207.23 (or https://yourdomain.com with SSL)
- API Health: http://143.198.207.23/health
- API Endpoint: http://143.198.207.23/api
- CV API: http://143.198.207.23/cv

---

**Last Updated:** February 8, 2026