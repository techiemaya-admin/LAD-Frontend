# Deployment Scripts Documentation

This directory contains all the necessary scripts and configuration files to deploy Pluto and its clone applications (like G-Links) with all the critical fixes applied.

## 📁 Files Overview

### Configuration Files

- **`nginx.conf`** - Production Nginx configuration for Pluto with all fixes applied
- **`nginx.conf.template`** - Template for clone applications (G-Links, etc.)
- **`ecosystem.config.js`** - PM2 process manager configuration for Pluto
- **`TROUBLESHOOTING_GUIDE.md`** - Comprehensive guide for fixing common issues

### Deployment Scripts

- **`deploy.sh`** - Deploy updates to existing Pluto installation
- **`setup-clone.sh`** - Deploy a new clone application from scratch

---

## 🚀 Quick Start

### Deploying Updates to Pluto

```bash
cd lad_ui
./deploy.sh
```

This will:
1. Build the Next.js application
2. Deploy files to the server
3. Update Nginx configuration (if changed)
4. Update PM2 configuration (if changed)
5. Restart the application
6. Run health checks

### Setting Up a Clone Application (e.g., G-Links)

```bash
cd lad_ui
./setup-clone.sh glinks glinks.techiemaya.com 143.110.249.144
```

This will:
1. Create custom Nginx config for the clone
2. Create custom PM2 ecosystem config
3. Build and deploy the application
4. Configure Nginx with proper routing order
5. Setup SSL certificates with Certbot
6. Start PM2 processes
7. Run comprehensive health checks

---

## 🔧 Critical Fixes Included

### 1. Nginx Configuration Order (Prevents 502 & 404 Errors)

**Problem:** Recording proxy returns 404, API calls return 502

**Solution:** Next.js API routes must come BEFORE general /api/ block

```nginx
# ✅ CORRECT ORDER:
# 1. Next.js routes (port 3000)
location ~ ^/api/(auth|recording-proxy|webhooks) {
    proxy_pass http://localhost:3000;
}

# 2. Backend routes (port 3004)
location /api/ {
    proxy_pass http://localhost:3004/api/;
}
```

### 2. Single /api/ Block (Prevents 502 Bad Gateway)

**Problem:** Multiple conflicting /api/ location blocks cause 502 errors

**Solution:** Consolidate to one block per service, remove duplicates

### 3. Trailing Slash Consistency

**Problem:** URL rewriting issues with proxy_pass

**Solution:** Always use trailing slash: `proxy_pass http://localhost:3004/api/;`

### 4. PM2 Process Management

**Problem:** Services crash or don't restart properly

**Solution:** Use ecosystem.config.js with proper restart policies

---

## 📝 Manual Deployment Steps

If you need to deploy manually or troubleshoot:

### 1. Build Locally

```bash
cd lad_ui
npm run build
```

### 2. Deploy Files

```bash
# Deploy Next.js build
rsync -avz --delete .next/ root@143.110.249.144:/var/www/html/pluto/.next/

# Deploy package files
rsync -avz package.json package-lock.json next.config.ts .env.production \
  root@143.110.249.144:/var/www/html/pluto/

# Deploy public assets
rsync -avz --delete public/ root@143.110.249.144:/var/www/html/pluto/public/
```

### 3. Deploy Nginx Configuration

```bash
# Copy nginx config to server
scp nginx.conf root@143.110.249.144:/tmp/pluto-nginx.conf

# On server:
ssh root@143.110.249.144

# Backup existing config
cp /etc/nginx/sites-available/pluto /etc/nginx/sites-available/pluto.backup

# Move new config
mv /tmp/pluto-nginx.conf /etc/nginx/sites-available/pluto

# Test configuration
nginx -t

# If test passes, reload
systemctl reload nginx
```

### 4. Restart Application

```bash
ssh root@143.110.249.144

cd /var/www/html/pluto
npm install --production

# Using PM2
pm2 restart pluto-ui

# Or with ecosystem config
pm2 delete pluto-ui
pm2 start ecosystem.config.js --only pluto-ui
pm2 save
```

### 5. Verify Deployment

```bash
# Test backend
curl -s http://localhost:3004/api/auth/login -X POST
# Expected: {"error":"Invalid email or password."} (HTTP 401)

# Test recording proxy
curl -I https://pluto.techiemaya.com/api/recording-proxy?url=test
# Expected: HTTP 400 (NOT 404!)

# Test frontend
curl -I https://pluto.techiemaya.com
# Expected: HTTP 200 or 307
```

---

## 🐛 Troubleshooting

### Recording Proxy Returns 404

**Diagnosis:**
```bash
ssh root@143.110.249.144 'cat /etc/nginx/sites-enabled/pluto | grep -A 10 "location"'
```

**Fix:** Ensure Next.js API routes location block comes FIRST:
```nginx
# This MUST come before location /api/
location ~ ^/api/(auth|recording-proxy|webhooks) {
    proxy_pass http://localhost:3000;
}
```

### 502 Bad Gateway on API Calls

**Diagnosis:**
```bash
ssh root@143.110.249.144 'grep -r "location /api/" /etc/nginx/sites-enabled/'
```

**Fix:** Remove duplicate /api/ location blocks. Keep only ONE:
```nginx
location /api/ {
    proxy_pass http://localhost:3004/api/;  # Note trailing slash
}
```

### Backend Service Crashes

**Diagnosis:**
```bash
ssh root@143.110.249.144 'pm2 logs sts-service --lines 50'
ssh root@143.110.249.144 'systemctl status postgresql'
```

**Fix:**
```bash
# Restart backend
ssh root@143.110.249.144 'pm2 restart sts-service'

# If PostgreSQL is down
ssh root@143.110.249.144 'systemctl restart postgresql'
```

### Frontend Won't Load

**Diagnosis:**
```bash
ssh root@143.110.249.144 'pm2 list | grep pluto-ui'
ssh root@143.110.249.144 'curl -I http://localhost:3000'
```

**Fix:**
```bash
ssh root@143.110.249.144 'pm2 restart pluto-ui'
```

---

## 🔍 Health Check Commands

Run these after any deployment:

```bash
# Check all services
ssh root@143.110.249.144 'pm2 list && systemctl status nginx && systemctl status postgresql'

# Check Nginx config
ssh root@143.110.249.144 'nginx -t'

# Test backend API
ssh root@143.110.249.144 'curl -s http://localhost:3004/api/auth/login -X POST'

# Test frontend
curl -I https://pluto.techiemaya.com/login

# Test recording proxy (critical!)
curl -I https://pluto.techiemaya.com/api/recording-proxy?url=test

# Check logs
ssh root@143.110.249.144 'pm2 logs --lines 30 --nostream'
ssh root@143.110.249.144 'tail -50 /var/log/nginx/error.log'
```

---

## 📊 Expected Test Results

| Endpoint | Expected Status | Meaning |
|----------|----------------|---------|
| `/api/auth/login` (POST) | 401 | Backend working (invalid credentials) |
| `/api/recording-proxy?url=test` | 400 or 401 | Next.js route working (NOT 404!) |
| `/login` | 200 or 307 | Frontend working |
| Backend at :3004 | 401 | API responding |
| Frontend at :3000 | 200 | Next.js responding |

---

## 🔐 Environment Variables

Ensure `.env.production` contains:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/salesmaya_agent

# API URLs
NEXT_PUBLIC_API_URL=https://pluto.techiemaya.com/api
NEXT_PUBLIC_WS_URL=wss://pluto.techiemaya.com

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Other services
STRIPE_SECRET_KEY=sk_...
VAPI_API_KEY=...
```

---

## 📦 PM2 Management

### View Processes
```bash
pm2 list
pm2 show pluto-ui
pm2 show sts-service
```

### View Logs
```bash
pm2 logs pluto-ui --lines 50
pm2 logs sts-service --lines 50
pm2 logs --lines 0  # Follow all logs
```

### Restart Services
```bash
pm2 restart pluto-ui
pm2 restart sts-service
pm2 restart all
```

### Update with Ecosystem Config
```bash
cd /var/www/html/pluto
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

### Enable Auto-Start on Reboot
```bash
pm2 startup systemd
pm2 save
```

---

## 🌐 Nginx Management

### Test Configuration
```bash
nginx -t
```

### Reload (no downtime)
```bash
systemctl reload nginx
```

### Restart (brief downtime)
```bash
systemctl restart nginx
```

### View Logs
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### View Configuration
```bash
cat /etc/nginx/sites-enabled/pluto
```

---

## 🔄 Complete Deployment Workflow

### For Pluto Updates:

1. Make changes locally
2. Test locally if possible
3. Run `./deploy.sh`
4. Monitor deployment output
5. Run health checks
6. Check browser console for errors

### For New Clone App:

1. Prepare environment variables (`.env.production`)
2. Update any app-specific settings
3. Run `./setup-clone.sh <app_name> <domain> <server_ip>`
4. Monitor setup output
5. Visit the domain and verify functionality
6. Check PM2 logs for any errors

---

## 📞 Support Checklist

Before asking for help, provide:

1. **Which deployment script did you use?**
   - `deploy.sh` or `setup-clone.sh`

2. **What's the exact error?**
   - HTTP status code (404, 502, etc.)
   - Error message from browser console
   - Error from terminal/SSH

3. **Service status:**
   ```bash
   ssh root@SERVER_IP 'pm2 list && systemctl status nginx'
   ```

4. **Recent logs:**
   ```bash
   ssh root@SERVER_IP 'pm2 logs --lines 50 --nostream'
   ssh root@SERVER_IP 'tail -50 /var/log/nginx/error.log'
   ```

5. **Nginx config check:**
   ```bash
   ssh root@SERVER_IP 'nginx -t'
   ssh root@SERVER_IP 'cat /etc/nginx/sites-enabled/YOUR_APP | grep -A 10 "location /api"'
   ```

---

## 📚 Additional Resources

- **Troubleshooting Guide:** See `TROUBLESHOOTING_GUIDE.md` in project root
- **Nginx Docs:** https://nginx.org/en/docs/
- **PM2 Docs:** https://pm2.keymetrics.io/docs/
- **Next.js Deployment:** https://nextjs.org/docs/deployment

---

## 🔖 Version History

| Date | Changes |
|------|---------|
| 2025-12-09 | Initial deployment scripts with all fixes |
| 2025-12-09 | Added Nginx config order fix for recording-proxy |
| 2025-12-09 | Added PM2 ecosystem configuration |
| 2025-12-09 | Added automated health checks |

---

**Last Updated:** December 9, 2025  
**Maintainer:** TechieMaya Development Team
