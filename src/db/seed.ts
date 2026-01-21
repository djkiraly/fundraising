import * as dotenv from 'dotenv';
// Load environment variables FIRST
dotenv.config();

// Now dynamically import everything else
async function main() {
  const { db } = await import('./index');
  const { users, players, squares, settings } = await import('./schema');
  const bcryptModule = await import('bcryptjs');
  const bcrypt = bcryptModule.default;
  const { encrypt } = await import('../lib/encryption');
  const { generateSlug } = await import('../lib/utils');
  const { STANDARD_HEART_COORDINATES, generateHeartGridSquares } = await import('../lib/squares');

  console.log('🌱 Seeding database...');

  try {
    // Create admin user
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    const [adminUser] = await db
      .insert(users)
      .values({
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        name: 'Admin User',
        passwordHash: adminPasswordHash,
        role: 'admin',
      })
      .returning();

    console.log('✅ Created admin user:', adminUser.email);

    // Create sample players
    const playerNames = [
      'Emma Johnson',
      'Sophia Williams',
      'Olivia Brown',
      'Ava Davis',
      'Isabella Miller',
    ];

    for (const playerName of playerNames) {
      const email = playerName.toLowerCase().replace(' ', '.') + '@example.com';
      const passwordHash = await bcrypt.hash('player123', 10);

      const [playerUser] = await db
        .insert(users)
        .values({
          email,
          name: playerName,
          passwordHash,
          role: 'player',
        })
        .returning();

      const [player] = await db
        .insert(players)
        .values({
          userId: playerUser.id,
          name: playerName,
          slug: generateSlug(playerName),
          photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName)}&size=200&background=FF69B4&color=fff`,
          goal: '100.00',
          totalRaised: '0.00',
        })
        .returning();

      console.log('✅ Created player:', playerName);

      // Use standardized heart grid with 97 squares
      const heartSquares = generateHeartGridSquares(100); // Target $100 goal

      const squareData = heartSquares.map((square) => ({
        playerId: player.id,
        positionX: square.x,
        positionY: square.y,
        value: square.value.toFixed(2),
        isPurchased: false,
      }));

      await db.insert(squares).values(squareData);

      console.log(`✅ Created ${squareData.length} squares for ${playerName} (standard heart: ${STANDARD_HEART_COORDINATES.length} positions)`);
    }

    // Seed Stripe settings from environment variables (if available)
    const seedSettings = process.env.SEED_STRIPE_SETTINGS === 'true';

    if (seedSettings) {
      console.log('\n🔧 Seeding settings from environment variables...');

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      const encryptionKey = process.env.ENCRYPTION_KEY;

      if (!encryptionKey) {
        console.log('⚠️  ENCRYPTION_KEY not set, skipping settings seeding');
      } else {
        if (stripeSecretKey) {
          await db.insert(settings).values({
            key: 'STRIPE_SECRET_KEY',
            value: encrypt(stripeSecretKey),
            category: 'stripe',
            isSecret: true,
            description: 'Stripe API secret key (starts with sk_)',
          }).onConflictDoNothing();
          console.log('✅ Seeded STRIPE_SECRET_KEY');
        }

        if (stripeWebhookSecret) {
          await db.insert(settings).values({
            key: 'STRIPE_WEBHOOK_SECRET',
            value: encrypt(stripeWebhookSecret),
            category: 'stripe',
            isSecret: true,
            description: 'Stripe webhook signing secret (starts with whsec_)',
          }).onConflictDoNothing();
          console.log('✅ Seeded STRIPE_WEBHOOK_SECRET');
        }

        if (stripePublishableKey) {
          await db.insert(settings).values({
            key: 'STRIPE_PUBLISHABLE_KEY',
            value: stripePublishableKey,
            category: 'stripe',
            isSecret: false,
            description: 'Stripe publishable key for client-side (starts with pk_)',
          }).onConflictDoNothing();
          console.log('✅ Seeded STRIPE_PUBLISHABLE_KEY');
        }
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`Admin: ${adminUser.email} / ${adminPassword}`);
    console.log('Players: [name]@example.com / player123');

    if (seedSettings) {
      console.log('\n⚠️  Note: Stripe settings were seeded from .env');
      console.log('   You can now remove them from .env and manage via admin panel');
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }

  process.exit(0);
}

main();
