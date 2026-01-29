# Deployment Guide - Volleyball Fundraiser

This guide covers deploying the volleyball fundraiser application to a production server with nginx, SSL certificates, and proper security configuration.

## Prerequisites

- Ubuntu/Debian server (20.04 LTS or later recommended)
- Node.js 18+ installed
- PostgreSQL access (Neon.Tech account)
- Domain name pointed to your server
- Root or sudo access

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 1.3 Install Nginx
```bash
sudo apt install -y nginx
```

### 1.4 Install Certbot (for SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 1.5 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

## Step 2: Database Setup (Neon.Tech)

### 2.1 Create Neon.Tech Account
1. Go to https://neon.tech
2. Create a new account (free tier available)
3. Create a new project
4. Copy your connection string (looks like: `postgresql://user:password@host/database`)

### 2.2 Configure Database
The connection string will be used in your `.env` file in the next step.

## Step 3: Application Setup

### 3.1 Clone/Upload Application
```bash
# Create app directory
sudo mkdir -p /var/www/volleyball-fundraiser
sudo chown $USER:$USER /var/www/volleyball-fundraiser

# Navigate to directory
cd /var/www/volleyball-fundraiser

# Upload your application files here
# (via git clone, scp, or other method)
```

### 3.2 Install Dependencies
```bash
npm install
```

### 3.3 Configure Environment Variables
```bash
# Create .env file
nano .env
```

Add the following (replace with your actual values):
```env
# Database (Neon.Tech)
DATABASE_URL="postgresql://user:password@host.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Admin Credentials (for initial setup)
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your-secure-password"

# App Configuration
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# Encryption (required for storing payment provider credentials securely)
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"

# ===========================================
# PAYMENT PROVIDER CONFIGURATION
# Choose ONE payment provider: stripe OR square
# ===========================================

# Payment Provider Selection
# Options: stripe, square, or both (comma-separated)
PAYMENT_PROVIDER_ACTIVE="stripe"
PAYMENT_PROVIDER_DEFAULT="stripe"

# --- Stripe Configuration (if using Stripe) ---
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_your_publishable_key"
STRIPE_SECRET_KEY="sk_live_your_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# --- Square Configuration (if using Square) ---
# NEXT_PUBLIC_SQUARE_APPLICATION_ID="sq0idp-your_application_id"
# SQUARE_ACCESS_TOKEN="your_access_token"
# SQUARE_LOCATION_ID="your_location_id"
# SQUARE_WEBHOOK_SIGNATURE_KEY="your_webhook_signature_key"
# SQUARE_ENVIRONMENT="production"  # or "sandbox" for testing
```

### 3.4 Generate Secrets
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

### 3.5 Port Configuration (Shared Servers)

The application runs on **port 3002** by default (configured in `package.json`). This avoids conflicts with other applications on shared servers.

**To change the port:**

1. Edit `package.json` - update the start script:
   ```json
   "start": "next start -p YOUR_PORT"
   ```

2. Edit `nginx.conf` - update the upstream server:
   ```nginx
   upstream nextjs_app {
       server 127.0.0.1:YOUR_PORT;
       keepalive 64;
   }
   ```

3. After deployment, ensure both files use the same port number.

### 3.6 Run Database Migrations
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 3.7 Build Application
```bash
npm run build
```

## Step 4: Nginx Configuration (HTTP-Only for Certificate Generation)

**IMPORTANT**: You must configure nginx in two stages:
1. First, HTTP-only to allow certificate generation
2. Then, full HTTPS configuration after certificates are obtained

### 4.1 Create Certbot Directory
```bash
sudo mkdir -p /var/www/certbot
```

### 4.2 Create Initial HTTP-Only Configuration
```bash
sudo nano /etc/nginx/sites-available/volleyball-fundraiser
```

Add this **temporary HTTP-only** configuration:
```nginx
# Temporary HTTP-only configuration for certificate generation
# This will be replaced after SSL certificates are obtained

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Let's Encrypt ACME challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Temporary proxy to app (will redirect to HTTPS after cert)
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Replace `yourdomain.com`** with your actual domain name.

### 4.3 Remove Default Site and Enable New Site
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/volleyball-fundraiser /etc/nginx/sites-enabled/
```

### 4.4 Test and Restart Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: SSL Certificate Generation (Certbot)

### 5.1 Obtain SSL Certificate
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email address
- Agree to Terms of Service
- Choose whether to share your email with EFF

### 5.2 Verify Certificates Were Created
```bash
sudo ls -la /etc/letsencrypt/live/yourdomain.com/
```

You should see:
- `fullchain.pem` - Full certificate chain
- `privkey.pem` - Private key
- `chain.pem` - Intermediate certificate
- `cert.pem` - Domain certificate

## Step 6: Nginx Full HTTPS Configuration

### 6.1 Replace with Full Configuration
Now that certificates exist, replace the temporary config with the full HTTPS configuration:

```bash
sudo cp /var/www/volleyball-fundraiser/nginx.conf /etc/nginx/sites-available/volleyball-fundraiser
```

### 6.2 Edit Configuration with Your Domain
```bash
sudo nano /etc/nginx/sites-available/volleyball-fundraiser
```

Replace ALL instances of `yourdomain.com` with your actual domain name (there are 5 occurrences).

### 6.3 Test and Restart Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 6.4 Verify HTTPS is Working
```bash
curl -I https://yourdomain.com
```

You should see `HTTP/2 200` and security headers.

## Step 7: Certificate Auto-Renewal

### 7.1 Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### 7.2 Verify Certbot Timer is Active
```bash
sudo systemctl status certbot.timer
```

### 7.3 Manual Renewal (if needed)
```bash
sudo certbot renew
sudo systemctl reload nginx
```

## Step 8: Start Application with PM2

### 8.1 Start the Application
```bash
cd /var/www/volleyball-fundraiser
pm2 start npm --name "volleyball-fundraiser" -- start
```

### 8.2 Configure PM2 to Start on Boot
```bash
pm2 startup
pm2 save
```

### 8.3 Useful PM2 Commands
```bash
# View logs
pm2 logs volleyball-fundraiser

# Restart application
pm2 restart volleyball-fundraiser

# Stop application
pm2 stop volleyball-fundraiser

# View status
pm2 status

# Monitor
pm2 monit
```

## Step 9: Payment Webhook Setup

Configure webhooks for your chosen payment provider(s).

### 9.1 Stripe Webhook Setup (if using Stripe)
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/api/payment/webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook signing secret
6. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`
7. Restart the application: `pm2 restart volleyball-fundraiser`

### 9.2 Square Webhook Setup (if using Square)
1. Go to https://developer.squareup.com/apps
2. Select your application
3. Navigate to "Webhooks" in the left sidebar
4. Click "Add Webhook Subscription"
5. Enter URL: `https://yourdomain.com/api/payment/square/webhook`
6. Select events to listen to:
   - `payment.completed`
   - `payment.updated`
7. Copy the Signature Key from webhook settings
8. Add it to your `.env` file as `SQUARE_WEBHOOK_SIGNATURE_KEY`
9. Restart the application: `pm2 restart volleyball-fundraiser`

## Step 10: Email Configuration (Gmail API)

Email functionality enables automatic password setup emails for new players, donation receipts, and notifications.

### 10.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Volleyball Fundraiser")
3. Enable the Gmail API:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

### 10.2 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type → Create
3. Fill in required fields:
   - App name: "Volleyball Fundraiser"
   - User support email: your email
   - Developer contact email: your email
4. Click "Save and Continue"
5. On Scopes page, click "Add or Remove Scopes"
6. Add scope: `https://www.googleapis.com/auth/gmail.send`
7. Save and continue through remaining steps

### 10.3 Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Name: "Volleyball Fundraiser"
5. Authorized redirect URIs: `https://yourdomain.com/api/admin/gmail/callback`
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

### 10.4 Configure in Admin Panel
After deploying, configure email in the admin settings:

1. Log in to admin panel: `https://yourdomain.com/admin`
2. Navigate to Settings → Email Configuration
3. Enter Gmail OAuth credentials:
   - Gmail Client ID
   - Gmail Client Secret
   - Redirect URI: `https://yourdomain.com/api/admin/gmail/callback`
4. Click "Save"
5. Click "Connect Gmail Account" and authorize with Google
6. Toggle "Enable Gmail" to ON
7. Ensure "Password Setup Emails" is enabled for automatic new player emails

### 10.5 Verify Email is Working
1. Create a test player with an email address
2. Check that the player receives a password setup email
3. Monitor logs for any email errors: `pm2 logs volleyball-fundraiser`

### 10.6 Email Feature Summary
When properly configured, the following emails are sent automatically:

| Trigger | Email Sent | Recipient |
|---------|------------|-----------|
| New player created (individual) | Password setup link | Player |
| New players imported (bulk) | Password setup link | Each player |
| Donation completed | Receipt | Donor |
| Donation completed | Notification | Player |
| 50% goal reached | Milestone celebration | Player |
| 100% goal reached | Goal achieved celebration | Player |
| Player sends outreach | Fundraiser invitation | Up to 10 recipients |

### Player Email Outreach

Players can send invitation emails to potential supporters directly from their dashboard:
- Up to 10 emails can be sent at a time
- Players write a custom message using the rich text editor
- Email subject: "[Player Name] is fundraising for their Panhandle Powerhouse Volleyball Club"
- Email includes the player's message and a link to their fundraising page
- Requires Gmail to be configured and enabled

## Step 11: Firewall Configuration

### 10.1 Configure UFW (if using)
```bash
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
sudo ufw status
```

## Step 12: Monitoring and Maintenance

### 12.1 Set Up Log Rotation
Create log rotation config:
```bash
sudo nano /etc/logrotate.d/volleyball-fundraiser
```

Add:
```
/var/log/nginx/volleyball-fundraiser-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

### 12.2 Monitor Application
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs volleyball-fundraiser --lines 100

# Monitor system resources
pm2 monit

# Check nginx logs
sudo tail -f /var/log/nginx/volleyball-fundraiser-error.log
sudo tail -f /var/log/nginx/volleyball-fundraiser-access.log
```

## Step 13: Backup Strategy

### 13.1 Database Backups
Since you're using Neon.Tech, backups are handled automatically. However, you can also:

```bash
# Manual backup script
#!/bin/bash
BACKUP_DIR="/var/backups/volleyball-fundraiser"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup using pg_dump (install postgresql-client first)
pg_dump $DATABASE_URL > $BACKUP_DIR/backup_$DATE.sql
```

### 13.2 Application Backups
```bash
# Backup application files
tar -czf /var/backups/volleyball-fundraiser-app-$(date +%Y%m%d).tar.gz /var/www/volleyball-fundraiser
```

## Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs volleyball-fundraiser

# Check if port 3002 is in use (or your configured port)
sudo lsof -i :3002

# Restart application
pm2 restart volleyball-fundraiser
```

### Nginx Errors
```bash
# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check nginx SSL configuration
sudo nginx -t
```

### Database Connection Issues
```bash
# Test database connection
npm run db:migrate

# Check environment variables
cat .env | grep DATABASE_URL
```

## Performance Optimization

### Enable Nginx Caching
Add to your nginx configuration:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=STATIC:10m inactive=7d use_temp_path=off;
```

### PM2 Cluster Mode
For better performance:
```bash
pm2 start npm --name "volleyball-fundraiser" -i max -- start
```

## Security Checklist

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] Strong passwords for admin account
- [ ] Environment variables secured (not in version control)
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Nginx security headers configured
- [ ] Stripe/Square webhook secret configured
- [ ] Database credentials secured
- [ ] Regular backups configured
- [ ] Gmail OAuth credentials secured (stored encrypted in database)
- [ ] Gmail redirect URI matches production domain exactly

## Updating the Application

```bash
cd /var/www/volleyball-fundraiser

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run migrations (if any)
npm run db:migrate

# Rebuild application
npm run build

# Restart
pm2 restart volleyball-fundraiser
```

### Recent Database Migrations

When updating, ensure you run `npm run db:migrate` to apply any new migrations. Recent migrations include:

| Migration | Description |
|-----------|-------------|
| `0010_aspiring_epoch.sql` | Adds `message` field to players table for rich text personal messages |

Players can now add personal messages to their fundraising pages via the dashboard. The message supports:
- Bold, italic, underline text formatting
- Left, center, right alignment
- Messages are sanitized server-side to prevent XSS attacks

## Support

For issues or questions:
1. Check application logs: `pm2 logs volleyball-fundraiser`
2. Check nginx logs: `sudo tail -f /var/log/nginx/volleyball-fundraiser-error.log`
3. Review this deployment guide
4. Check the main README.md for application-specific information

---

**Your application should now be live at https://yourdomain.com!** 🎉
