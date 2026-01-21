# Quick Start Guide 🚀

Get your volleyball fundraiser up and running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- A Neon.Tech account (free tier works great)
- A Stripe account (test mode is fine for development)

## Step-by-Step Setup

### 1. Install Dependencies (2 minutes)

```bash
npm install
```

### 2. Set Up Database (3 minutes)

#### Create Neon.Tech Database
1. Go to https://neon.tech and sign up (it's free!)
2. Click "Create a project"
3. Give it a name (e.g., "volleyball-fundraiser")
4. Copy the connection string (it looks like `postgresql://...`)

### 3. Configure Environment Variables (2 minutes)

Create a `.env` file in the root directory:

```env
# Database - paste your Neon.Tech connection string here
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"

# NextAuth - generate a random secret
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Stripe - get from https://dashboard.stripe.com/test/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Admin Account
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Quick Tips:**
- Generate `NEXTAUTH_SECRET`: Run `openssl rand -base64 32` in terminal
- Get Stripe test keys from: https://dashboard.stripe.com/test/apikeys
- For webhook secret: We'll set this up later (use dummy value for now)

### 4. Set Up Stripe (2 minutes)

#### Get Your Stripe Test Keys
1. Sign up at https://stripe.com
2. Go to **Developers** → **API keys**
3. Toggle **"Viewing test data"** ON (top right)
4. Copy **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
5. Click "Reveal test key" → Copy **Secret key** → `STRIPE_SECRET_KEY`

#### Set Up Webhook (for local testing)
```bash
# Install Stripe CLI
# Mac: brew install stripe/stripe-cli/stripe
# Windows: https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to local server (run this in a separate terminal)
stripe listen --forward-to localhost:3000/api/payment/webhook
# Copy the webhook signing secret (starts with whsec_) to STRIPE_WEBHOOK_SECRET
```

### 5. Initialize Database (1 minute)

```bash
# Generate migration files
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

This creates:
- ✅ Admin account: `admin@example.com` / `admin123`
- ✅ 5 sample players with fundraising pages
- ✅ Heart-shaped grids for each player

### 6. Start the Application (30 seconds)

```bash
npm run dev
```

Open http://localhost:3000 in your browser 🎉

## What's Next?

### Test the Application

1. **Visit Home Page** → http://localhost:3000
   - See all fundraising players

2. **Click on a Player** → View their heart-shaped donation grid

3. **Make a Test Donation**
   - Click any available square
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date, CVC: Any 3 digits

4. **Login as Player** → http://localhost:3000/login
   - Email: `emma.johnson@example.com`
   - Password: `player123`
   - View your dashboard and share link

5. **Login as Admin** → http://localhost:3000/login
   - Email: `admin@example.com`
   - Password: `admin123`
   - Access analytics and player management

### Stripe Test Cards

| Card Number | Description |
|------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0025 0000 3155` | Requires authentication |
| `4000 0000 0000 9995` | Declined |

Use any future expiration date and any 3-digit CVC.

## Common Issues

### Database Connection Error
```bash
# Make sure your DATABASE_URL is correct
echo $DATABASE_URL

# Re-run migrations
npm run db:migrate
```

### Port Already in Use
```bash
# Kill the process on port 3000
# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Stripe Webhook Issues
- Make sure `stripe listen` is running in a separate terminal
- Copy the webhook secret it displays to `.env`
- Restart your dev server after updating `.env`

## Next Steps

1. **Customize the Look**
   - Edit colors in `tailwind.config.ts`
   - Modify components in `src/components/`

2. **Add Real Players**
   - Login as admin
   - Navigate to admin panel
   - Manage players (or create manually in database)

3. **Deploy to Production**
   - See `DEPLOYMENT.md` for full deployment guide
   - Set up on a real domain
   - Use Stripe live keys

4. **Customize Fundraising**
   - Change goal amounts in database
   - Modify square values in `src/db/seed.ts`
   - Adjust heart shape algorithm

## Development Tips

```bash
# View database in browser
npm run db:studio

# Check for TypeScript errors
npm run lint

# Reset database (careful!)
npm run db:migrate
npm run db:seed
```

## Need Help?

- 📖 See full documentation in `README.md`
- 🚀 Deployment guide in `DEPLOYMENT.md`
- 💳 Stripe docs: https://stripe.com/docs
- 🗄️ Neon.Tech docs: https://neon.tech/docs

---

**You're all set! Happy fundraising! 🏐❤️**
