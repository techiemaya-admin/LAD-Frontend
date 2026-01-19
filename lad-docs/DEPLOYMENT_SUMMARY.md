# LAD Deployment Summary

## Successfully Deployed! ✅

**Date:** December 10, 2025
**Server:** LAD@142.93.30.59
**Domain:** https://aicalls.LAD.com

---

## Port Configuration

To avoid conflicts with glinks application, LAD uses different ports:

### LAD (aicalls.LAD.com)
- **Frontend:** Port 3001
- **Backend:** Port 3004
- **PM2 Processes:**
  - `LAD-ui` (Next.js frontend)
  - `LAD-service` (Express backend)

### Glinks (glinks.techiemaya.com)
- **Frontend:** Port 3000
- **Backend:** Port 3005

---

## Application URLs

- **Production:** https://aicalls.LAD.com
- **API Endpoint:** https://aicalls.LAD.com/api/
- **Health Check:** https://aicalls.LAD.com/health

---

## SSL Certificate

✅ **Enabled** - Let's Encrypt SSL certificate installed
- Certificate: `/etc/letsencrypt/live/aicalls.LAD.com/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/aicalls.LAD.com/privkey.pem`
- Auto-renewal enabled
- Expires: March 10, 2026

---

## Deployment Structure

```
/home/LAD/LAD/
├── .next/                      # Next.js build output
├── package.json                # Frontend dependencies
├── .env.production             # Production environment variables
└── backend/
    └── sts-service/
        ├── src/                # Backend source code
        ├── package.json        # Backend dependencies
        └── .env                # Backend environment variables
```

---

## Nginx Configuration

**Config File:** `/etc/nginx/sites-available/aicalls-LAD`

**Key Features:**
- HTTPS redirect enabled
- Proper API routing (Next.js routes prioritized)
- Socket.IO support
- Static file caching (30 days)
- Client max body size: 100MB

**Proxy Rules:**
1. Next.js API routes → Port 3001
2. Backend API routes → Port 3004
3. Socket.IO → Port 3004
4. Static assets → Port 3001

---

## PM2 Process Management

### Check Status
```bash
ssh LAD@142.93.30.59 "pm2 status"
```

### View Logs
```bash
# Frontend logs
ssh LAD@142.93.30.59 "pm2 logs LAD-ui"

# Backend logs
ssh LAD@142.93.30.59 "pm2 logs LAD-service"
```

### Restart Services
```bash
# Restart frontend
ssh LAD@142.93.30.59 "pm2 restart LAD-ui"

# Restart backend
ssh LAD@142.93.30.59 "pm2 restart LAD-service"

# Restart all
ssh LAD@142.93.30.59 "pm2 restart all"
```

---

## Environment Variables

### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://aicalls.LAD.com
NEXT_PUBLIC_API_BASE_URL=https://aicalls.LAD.com
NEXT_PUBLIC_BACKEND_URL=https://aicalls.LAD.com
NEXT_PUBLIC_SOCKET_URL=https://aicalls.LAD.com
BACKEND_INTERNAL_URL=http://142.93.30.59:3004
```

### Backend (.env)
```env
BASE_URL=https://aicalls.LAD.com
BACKEND_URL=https://aicalls.LAD.com
FRONTEND_URLS=https://aicalls.LAD.com,...
PORT=3004
```

---

## Deployment Commands

### Deploy Frontend
```bash
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/lad_ui
./deploy.sh
```

### Deploy Backend
```bash
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/sts-service
./deploy-backend.sh
```

### Deploy Nginx Config
```bash
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/lad_ui
./deploy-nginx.sh
```

---

## Troubleshooting

### Check if ports are in use
```bash
ssh LAD@142.93.30.59 "sudo ss -tlnp | grep -E ':(3001|3004)'"
```

### Verify Nginx configuration
```bash
ssh LAD@142.93.30.59 "sudo nginx -t"
```

### Reload Nginx
```bash
ssh LAD@142.93.30.59 "sudo systemctl reload nginx"
```

### Check SSL certificates
```bash
ssh LAD@142.93.30.59 "sudo certbot certificates"
```

### Renew SSL manually
```bash
ssh LAD@142.93.30.59 "sudo certbot renew"
```

---

## Database Configuration

**PostgreSQL Server:** 142.93.30.59:5432
**Database:** glinks_db (shared with glinks)
**Schema:** voice_agent

---

## Notes

1. ✅ Both glinks and LAD applications are running on the same server
2. ✅ Port conflicts resolved (glinks: 3000/3005, LAD: 3001/3004)
3. ✅ SSL enabled with automatic renewal
4. ✅ PM2 configured for auto-restart on failure
5. ⚠️  Database is shared with glinks application

---

## Next Steps

1. ✅ Verify application functionality at https://aicalls.LAD.com
2. ✅ Test all API endpoints
3. ✅ Verify Socket.IO connections
4. Monitor PM2 logs for any errors
5. Set up monitoring/alerting (optional)

---

**Deployment Status:** ✅ LIVE AND RUNNING
