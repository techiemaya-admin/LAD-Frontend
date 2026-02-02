# Nginx & Certbot Setup Guide for LAD Application

## Prerequisites

- Ubuntu/Debian server with root/sudo access
- Domain name pointing to your server IP (A record for aicalls.LAD.com)
- Ports 80 and 443 open in firewall
- Frontend running on port 3001
- Backend running on port 3004

## Step 1: Install Nginx

```bash
# Update package list
sudo apt update

# Install nginx
sudo apt install nginx -y

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

## Step 2: Install Certbot

```bash
# Install certbot and nginx plugin
sudo apt install certbot python3-certbot-nginx -y

# Verify installation
certbot --version
```

## Step 3: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Verify
sudo ufw status
```

## Step 4: Deploy Nginx Configuration

### Option A: Automated Deployment (Recommended)

From your local machine, run the deployment script:

```bash
cd /Users/naveenreddy/Desktop/AI-Maya/LAD/LAD-Web/LAD-Frontend/web

# Make script executable
chmod +x deploy-nginx.sh

# Run deployment
./deploy-nginx.sh
```

This script will:
- Copy the nginx configuration to the server
- Install and enable the configuration
- Test the configuration
- Setup SSL certificates with Let's Encrypt
- Reload nginx

### Option B: Manual Setup

1. **Copy configuration to server:**
```bash
scp nginx-aicalls-LAD.conf LAD@142.93.30.59:/tmp/
```

2. **SSH into server and install config:**
```bash
ssh LAD@142.93.30.59

# Move config to sites-available
sudo mv /tmp/nginx-aicalls-LAD.conf /etc/nginx/sites-available/aicalls-LAD

# Create symlink
sudo ln -sf /etc/nginx/sites-available/aicalls-LAD /etc/nginx/sites-enabled/aicalls-LAD

# Remove default config if exists
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 5: Setup SSL with Let's Encrypt

```bash
# Run certbot to obtain SSL certificate
sudo certbot --nginx -d aicalls.LAD.com -d www.aicalls.LAD.com

# Follow prompts:
# - Enter email address
# - Agree to terms of service
# - Choose to redirect HTTP to HTTPS (recommended)
```

Certbot will:
- Obtain SSL certificate from Let's Encrypt
- Automatically configure nginx with SSL settings
- Set up auto-renewal

## Step 6: Verify SSL Certificate

```bash
# Check certificate details
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```

## Step 7: Test Your Application

Visit your application:
- https://aicalls.LAD.com

Check SSL grade:
- https://www.ssllabs.com/ssltest/

## Maintenance Commands

### Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/aicalls-LAD-error.log

# View access logs
sudo tail -f /var/log/nginx/aicalls-LAD-access.log
```

### Certbot Commands
```bash
# Renew certificates manually
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates

# Revoke certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/aicalls.LAD.com/cert.pem
```

## Automatic SSL Renewal

Certbot installs a systemd timer that runs twice daily to renew certificates:

```bash
# Check renewal timer
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

## Troubleshooting

### Issue: Nginx fails to start

```bash
# Check configuration syntax
sudo nginx -t

# Check logs
sudo journalctl -xeu nginx.service
```

### Issue: SSL certificate not obtained

```bash
# Ensure domain points to server
nslookup aicalls.LAD.com

# Ensure port 80 is accessible
sudo netstat -tlnp | grep :80

# Check certbot logs
sudo cat /var/log/letsencrypt/letsencrypt.log
```

### Issue: 502 Bad Gateway

```bash
# Check if backend/frontend are running
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :3004

# Check nginx error logs
sudo tail -50 /var/log/nginx/aicalls-LAD-error.log
```

### Issue: Rate limiting too strict

Edit nginx config and adjust rate limits:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;  # Increase from 10r/s
```

Then reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Security Best Practices

1. **Keep Nginx Updated:**
```bash
sudo apt update && sudo apt upgrade nginx -y
```

2. **Monitor Logs Regularly:**
```bash
# Setup logrotate (usually automatic)
sudo cat /etc/logrotate.d/nginx
```

3. **Use Strong SSL Configuration:**
```bash
# Test SSL configuration
sudo certbot renew --dry-run
```

4. **Enable Fail2ban (Optional):**
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

5. **Regular Backups:**
```bash
# Backup nginx config
sudo tar -czf nginx-backup-$(date +%Y%m%d).tar.gz /etc/nginx/

# Backup SSL certificates
sudo tar -czf letsencrypt-backup-$(date +%Y%m%d).tar.gz /etc/letsencrypt/
```

## Environment-Specific Configuration

### Production Environment Variables

Ensure your application servers have the correct environment:

**Backend (.env):**
```bash
PORT=3004
NODE_ENV=production
CORS_ORIGINS=https://aicalls.LAD.com
BACKEND_URL=https://aicalls.LAD.com/api
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=https://aicalls.LAD.com/api
NEXT_PUBLIC_WS_URL=wss://aicalls.LAD.com
NODE_ENV=production
```

## Performance Tuning

### Nginx Worker Processes

Edit `/etc/nginx/nginx.conf`:
```nginx
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
```

### Enable HTTP/2 Push (Optional)

In server block:
```nginx
http2_push_preload on;
```

## Monitoring Setup

### Setup Nginx Status Page

Add to nginx config:
```nginx
location /nginx_status {
    stub_status on;
    access_log off;
    allow 127.0.0.1;
    deny all;
}
```

### Monitor with Commands

```bash
# Active connections
curl http://localhost/nginx_status

# Process monitoring
ps aux | grep nginx

# Resource usage
sudo ss -s
```

## Quick Reference

| Task | Command |
|------|---------|
| Deploy config | `./deploy-nginx.sh` |
| Test config | `sudo nginx -t` |
| Reload | `sudo systemctl reload nginx` |
| Restart | `sudo systemctl restart nginx` |
| Check SSL | `sudo certbot certificates` |
| Renew SSL | `sudo certbot renew` |
| View logs | `sudo tail -f /var/log/nginx/aicalls-LAD-error.log` |

## Support

For issues or questions:
- Nginx docs: https://nginx.org/en/docs/
- Certbot docs: https://certbot.eff.org/docs/
- Let's Encrypt: https://letsencrypt.org/docs/
