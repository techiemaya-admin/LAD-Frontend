# G-Links Quick Fix Guide

## Current Issue: 404 on Recording Proxy

**Error:**
```
GET https://glinks.techiemaya.com/api/recording-proxy?url=... 404 (Not Found)
Audio play error: NotSupportedError: The element has no supported sources.
```

---

## 🔥 Quick Fix (5 minutes)

### Step 1: Check Current Nginx Config
```bash
ssh root@143.110.249.144 'cat /etc/nginx/sites-enabled/glinks | grep -B 2 -A 10 "location"'
```

### Step 2: Fix the Location Block Order

The problem is that `/api/` block is catching `/api/recording-proxy` before the Next.js routes.

**Edit the config:**
```bash
ssh root@143.110.249.144 'nano /etc/nginx/sites-enabled/glinks'
```

**Ensure this order:**
```nginx
# 1. FIRST: Next.js API routes (MUST be before /api/)
location ~ ^/api/(auth|recording-proxy|webhooks) {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 2. SECOND: Backend API routes
location /api/ {
    proxy_pass http://localhost:3004/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Remove any other `/api/` location blocks!**

### Step 3: Test and Reload
```bash
# Test config
ssh root@143.110.249.144 'nginx -t'

# If test passes, reload
ssh root@143.110.249.144 'systemctl reload nginx'
```

### Step 4: Verify Fix
```bash
# Should return 400 (Bad Request - URL required), NOT 404
curl -I https://glinks.techiemaya.com/api/recording-proxy?url=test
```

**Expected Result:**
```
HTTP/2 400  ← This is GOOD (means Next.js is handling it)
```

**Bad Result:**
```
HTTP/2 404  ← This means still going to wrong backend
```

---

## 🔍 Diagnostic Commands

### Check if recording-proxy route file exists
```bash
ssh root@143.110.249.144 'ls -la /var/www/html/glinks/src/app/api/recording-proxy/'
```

### Check which service is on port 3000
```bash
ssh root@143.110.249.144 'pm2 list | grep glinks'
ssh root@143.110.249.144 'lsof -i :3000'
```

### Check Nginx logs for 404
```bash
ssh root@143.110.249.144 'tail -50 /var/log/nginx/error.log | grep recording-proxy'
```

---

## 📋 Full Automated Fix

If you want to use the automated scripts from Pluto:

### Option 1: Deploy using setup script
```bash
cd /path/to/pluto/lad_ui
./setup-clone.sh glinks glinks.techiemaya.com 143.110.249.144
```

This will:
- ✅ Create proper Nginx config with correct order
- ✅ Setup PM2 with ecosystem config
- ✅ Deploy the application
- ✅ Setup SSL
- ✅ Run health checks

### Option 2: Just update Nginx config
```bash
# Copy template locally
cd /path/to/pluto/lad_ui
cp nginx.conf.template glinks-nginx.conf

# Edit it
sed -i '' 's/YOUR_DOMAIN.techiemaya.com/glinks.techiemaya.com/g' glinks-nginx.conf
sed -i '' 's/YOUR_APP_NAME/glinks/g' glinks-nginx.conf

# Deploy it
scp glinks-nginx.conf root@143.110.249.144:/tmp/

# On server
ssh root@143.110.249.144 << 'EOF'
# Backup current config
cp /etc/nginx/sites-available/glinks /etc/nginx/sites-available/glinks.backup

# Replace with new config (preserving SSL settings)
# Extract SSL lines from current config
grep -E "ssl_certificate|listen 443|include.*ssl" /etc/nginx/sites-available/glinks > /tmp/ssl_lines.txt

# Update new config with SSL
cat /tmp/ssl_lines.txt >> /tmp/glinks-nginx.conf

# Move to proper location
mv /tmp/glinks-nginx.conf /etc/nginx/sites-available/glinks

# Test and reload
nginx -t && systemctl reload nginx
EOF
```

---

## ⚠️ Common Mistakes

### ❌ Wrong: General /api/ comes first
```nginx
location /api/ {                    # This catches /api/recording-proxy
    proxy_pass http://localhost:3004/api/;
}

location ~ ^/api/recording-proxy {  # Never reached!
    proxy_pass http://localhost:3000;
}
```

### ✅ Right: Specific routes come first
```nginx
location ~ ^/api/(auth|recording-proxy|webhooks) {  # Catches specific routes
    proxy_pass http://localhost:3000;
}

location /api/ {                    # Catches remaining /api/* routes
    proxy_pass http://localhost:3004/api/;
}
```

---

## 🎯 Success Criteria

After the fix, you should see:

1. **Recording proxy works:**
   ```bash
   curl -I https://glinks.techiemaya.com/api/recording-proxy?url=test
   # Returns: HTTP 400 (not 404)
   ```

2. **Backend API still works:**
   ```bash
   curl -s https://glinks.techiemaya.com/api/auth/login -X POST
   # Returns: {"error":"Invalid email or password."}
   ```

3. **No errors in browser console** when trying to play recordings

4. **PM2 services running:**
   ```bash
   ssh root@143.110.249.144 'pm2 list | grep glinks'
   # Both frontend and backend should be "online"
   ```

---

## 📞 If Still Not Working

1. **Check if recording-proxy API route exists:**
   ```bash
   ssh root@143.110.249.144 'find /var/www/html/glinks -name "route.ts" | grep recording-proxy'
   ```

2. **If missing, create it** at `/var/www/html/glinks/src/app/api/recording-proxy/route.ts`

3. **Check both services are on correct ports:**
   ```bash
   ssh root@143.110.249.144 'lsof -i :3000 && lsof -i :3004'
   ```

4. **Restart everything:**
   ```bash
   ssh root@143.110.249.144 'pm2 restart all && systemctl reload nginx'
   ```

---

## 📚 More Info

See the full troubleshooting guide: `TROUBLESHOOTING_GUIDE.md`  
See deployment documentation: `DEPLOYMENT.md`

**Last Updated:** December 9, 2025
