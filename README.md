# Volleyball Club Fundraiser 🏐❤️

A modern, full-stack fundraising web application designed for volleyball clubs. Players have their own heart-shaped grids of donation "squares" that supporters can purchase. Each square has a random value between $5-$25, helping players reach their $100 fundraising goal.

## ✨ Features

### 🎯 Core Features
- **Heart-Shaped Donation Grids**: Unique visual representation of fundraising progress
- **Player Public Pages**: Shareable URLs for each player's fundraiser
- **Secure Payment Processing**: Stripe integration for donations
- **Anonymous or Named Donations**: Donors can choose to display their name or remain anonymous
- **Real-time Progress Tracking**: Live updates of fundraising goals
- **Player Dashboard**: Track donations and share fundraiser links
- **Admin Analytics**: Comprehensive analytics with charts and player management

### 🎨 Design
- Modern, clean interface with pink, white, and black color scheme
- Fully responsive (mobile, tablet, desktop)
- Smooth animations and transitions
- Loading states and error handling

### 🔐 Security
- NextAuth.js authentication with role-based access
- Secure password hashing with bcryptjs
- SSL/TLS encryption (production)
- Environment-based configuration
- Stripe webhook signature verification

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Lucide icons
- **Charts**: Recharts for analytics
- **Payments**: Stripe Elements

### Backend
- **Runtime**: Node.js
- **Database**: PostgreSQL (Neon.Tech serverless)
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js
- **Payment Processing**: Stripe

### Infrastructure
- **Reverse Proxy**: nginx
- **SSL**: Certbot (Let's Encrypt)
- **Process Manager**: PM2

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon.Tech account recommended)
- Stripe account
- Domain name (for production)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd volleyball-fundraiser
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Neon.Tech)
DATABASE_URL="postgresql://user:password@host.neon.tech/neondb?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Admin Credentials (for initial setup)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-this-password"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Encryption (for storing payment credentials securely)
ENCRYPTION_KEY="your-64-char-hex-key"

# Payment Provider (stripe or square)
PAYMENT_PROVIDER_ACTIVE="stripe"
PAYMENT_PROVIDER_DEFAULT="stripe"

# Stripe (if using Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Square (if using Square instead of Stripe)
# NEXT_PUBLIC_SQUARE_APPLICATION_ID="sq0idp-..."
# SQUARE_ACCESS_TOKEN="..."
# SQUARE_LOCATION_ID="..."
# SQUARE_WEBHOOK_SIGNATURE_KEY="..."
# SQUARE_ENVIRONMENT="sandbox"
```

**Generate secrets:**
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

### 4. Database Setup

#### 4.1 Create Neon.Tech Database
1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string to `DATABASE_URL` in `.env`

#### 4.2 Run Migrations
```bash
npm run db:generate
npm run db:migrate
```

#### 4.3 Seed Database (Optional)
```bash
npm run db:seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- 5 sample players with credentials: `[firstname].[lastname]@example.com` / `player123`

### 5. Stripe Setup

#### 5.1 Get API Keys
1. Sign up at https://stripe.com
2. Go to Developers → API keys
3. Copy publishable and secret keys to `.env`

#### 5.2 Configure Webhook (for production)
1. Go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payment/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook signing secret to `.env`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📱 Usage

### User Roles

#### 👤 Players
- Access at `/dashboard`
- View fundraising progress
- See donation history
- Share personal fundraiser link
- Track square purchases

#### 👨‍💼 Admin
- Access at `/admin`
- View all players and their progress
- Analytics dashboard with charts
- Manage player accounts
- Export donation reports

### Making a Donation

1. Visit a player's page: `/player/[player-id]`
2. Click on an available square in the heart grid
3. Choose anonymous or named donation
4. Enter payment details
5. Complete payment
6. Square is marked as purchased with donor attribution

## 🏗️ Project Structure

```
volleyball-fundraiser/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── payment/       # Stripe payment & webhooks
│   │   │   └── squares/       # Square management
│   │   ├── admin/             # Admin dashboard
│   │   ├── dashboard/         # Player dashboard
│   │   ├── player/[id]/       # Player public pages
│   │   ├── login/             # Login page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── admin/             # Admin-specific components
│   │   ├── ui/                # Reusable UI components
│   │   ├── donation-modal.tsx # Donation payment modal
│   │   └── providers.tsx      # Context providers
│   ├── db/                    # Database
│   │   ├── schema.ts          # Drizzle schema
│   │   ├── index.ts           # Database client
│   │   ├── migrate.ts         # Migration script
│   │   └── seed.ts            # Seed script
│   └── lib/                   # Utility functions
│       ├── auth.ts            # NextAuth configuration
│       ├── stripe.ts          # Stripe utilities
│       └── utils.ts           # Helper functions
├── public/                    # Static assets
├── nginx.conf                 # Nginx configuration
├── DEPLOYMENT.md              # Deployment guide
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── tailwind.config.ts         # Tailwind config
├── drizzle.config.ts          # Drizzle config
└── README.md                  # This file
```

## 🗄️ Database Schema

### Tables

#### `users`
- User authentication and role management
- Fields: id, email, name, passwordHash, role, createdAt, updatedAt

#### `players`
- Player profiles and fundraising info
- Fields: id, userId, name, photoUrl, goal, totalRaised, isActive, createdAt, updatedAt

#### `squares`
- Individual donation squares in heart grids
- Fields: id, playerId, positionX, positionY, value, isPurchased, donorName, isAnonymous, createdAt, purchasedAt

#### `donations`
- Transaction records
- Fields: id, playerId, squareId, amount, donorName, donorEmail, isAnonymous, stripePaymentIntentId, status, createdAt, completedAt

## 🎨 Customization

### Colors
Edit `tailwind.config.ts` to change the color scheme:
```typescript
colors: {
  primary: {
    pink: '#FF69B4',        // Main pink
    'pink-light': '#FFB6D9', // Light pink
    'pink-dark': '#FF1493',  // Dark pink
  },
}
```

### Heart Grid
Modify the heart algorithm in `src/db/seed.ts` → `generateHeartCoordinates()` to change the heart shape.

### Square Values
Change square value ranges in `src/db/seed.ts` → `generateSquareValues()`:
```typescript
const minValue = 5;  // Minimum square value
const maxValue = 25; // Maximum square value
```

## 🚀 Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions including:
- Server setup (Ubuntu/Debian)
- nginx configuration
- SSL certificate setup with Certbot
- PM2 process management
- Database migration
- Stripe webhook configuration
- Security hardening
- Monitoring and backups

### Quick Deploy Steps
```bash
# 1. Setup server and install dependencies
# 2. Clone/upload application
# 3. Configure environment variables
# 4. Run database migrations
npm run db:migrate
npm run db:seed

# 5. Build application
npm run build

# 6. Start with PM2
pm2 start npm --name "volleyball-fundraiser" -- start
pm2 save

# 7. Configure nginx and SSL
sudo certbot --nginx -d yourdomain.com
```

## 📊 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Drizzle Studio
```

## 🔧 API Routes

### Authentication
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Get current session

### Payments
- `POST /api/payment/create-intent` - Create Stripe payment intent
- `POST /api/payment/webhook` - Stripe webhook handler

### Squares
- `GET /api/squares/[id]` - Get square details
- `PATCH /api/squares/[id]` - Update square (donor info)

## 🧪 Testing Payments

### Test Mode (Stripe)
Use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Requires authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Any future expiration date and any 3-digit CVC.

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
npm run db:migrate
```

### Stripe Webhook Not Working
1. Check webhook secret in `.env`
2. Verify endpoint URL in Stripe Dashboard
3. Check nginx configuration for `/api/payment/webhook`
4. View webhook logs in Stripe Dashboard

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## 📝 Environment Variables Reference

### Core Variables
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://...` |
| `NEXTAUTH_URL` | Application URL | Yes | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes | `random-secret-32-chars` |
| `ADMIN_EMAIL` | Initial admin email | Yes | `admin@example.com` |
| `ADMIN_PASSWORD` | Initial admin password | Yes | `secure-password` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes | `http://localhost:3000` |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data | Yes | `64-char-hex-string` |

### Payment Provider Selection
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PAYMENT_PROVIDER_ACTIVE` | Active payment provider(s) | No | `stripe` or `square` |
| `PAYMENT_PROVIDER_DEFAULT` | Default provider if multiple active | No | `stripe` |

### Stripe Configuration (if using Stripe)
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | If Stripe | `pk_test_...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | If Stripe | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | If Stripe | `whsec_...` |

### Square Configuration (if using Square)
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | Square application ID | If Square | `sq0idp-...` |
| `SQUARE_ACCESS_TOKEN` | Square access token | If Square | `EAAAl...` |
| `SQUARE_LOCATION_ID` | Square location ID | If Square | `L...` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Square webhook signature | If Square | `...` |
| `SQUARE_ENVIRONMENT` | Square environment | If Square | `production` or `sandbox` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Stripe for payment processing
- Neon.Tech for serverless PostgreSQL
- Recharts for beautiful analytics

## 📧 Support

For support or questions:
- Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide
- Review troubleshooting section
- Check application logs: `pm2 logs volleyball-fundraiser`

---

**Built with ❤️ for volleyball clubs everywhere!**
