/**
 * Script to add a new player to the fundraiser
 * Usage: npm run add-player
 */

import { db } from '../src/db';
import { users, players, squares } from '../src/db/schema';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { generateUniqueSlug } from '../src/lib/utils';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * Generate heart-shaped grid coordinates
 */
function generateHeartCoordinates(): { x: number; y: number }[] {
  const coordinates: { x: number; y: number }[] = [];
  const gridSize = 20;
  const centerX = gridSize / 2;
  const centerY = gridSize / 2;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const nx = (x - centerX) / centerX;
      const ny = (y - centerY) / centerY;
      const value = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);

      if (value < 0.1) {
        coordinates.push({ x, y });
      }
    }
  }

  return coordinates;
}

/**
 * Generate random square values that sum to target total
 */
function generateSquareValues(count: number, targetTotal: number = 100): number[] {
  const values: number[] = [];
  let remaining = targetTotal;

  for (let i = 0; i < count - 1; i++) {
    const minValue = 5;
    const maxValue = Math.min(25, remaining - (count - i - 1) * 5);
    const value = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
    values.push(value);
    remaining -= value;
  }

  values.push(Math.max(5, Math.min(25, remaining)));
  return values.sort(() => Math.random() - 0.5);
}

async function addPlayer() {
  console.log('\n🏐 Add New Player to Fundraiser\n');

  try {
    // Collect player information
    const name = await question('Player Name: ');
    const email = await question('Email: ');
    const password = await question('Password: ');
    const photoUrl = await question('Photo URL (optional, press Enter to skip): ');
    const goalInput = await question('Fundraising Goal (default $100): ');
    const goal = goalInput ? parseFloat(goalInput) : 100;

    // Validate input
    if (!name || !email || !password) {
      console.log('❌ Name, email, and password are required!');
      rl.close();
      process.exit(1);
    }

    console.log('\n⏳ Creating player account...\n');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user account
    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
        role: 'player',
      })
      .returning();

    console.log('✅ User account created');

    // Get existing slugs to ensure uniqueness
    const existingSlugs = await db
      .select({ slug: players.slug })
      .from(players);
    const slugList = existingSlugs.map(p => p.slug);
    const slug = generateUniqueSlug(name, slugList);

    // Create player profile
    const [player] = await db
      .insert(players)
      .values({
        userId: user.id,
        name,
        slug,
        photoUrl: photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=FF69B4&color=fff`,
        goal: goal.toFixed(2),
        totalRaised: '0.00',
      })
      .returning();

    console.log('✅ Player profile created');

    // Generate heart grid
    const heartCoordinates = generateHeartCoordinates();
    const squareValues = generateSquareValues(heartCoordinates.length, goal);

    const squareData = heartCoordinates.map((coord, index) => ({
      playerId: player.id,
      positionX: coord.x,
      positionY: coord.y,
      value: squareValues[index].toFixed(2),
      isPurchased: false,
    }));

    await db.insert(squares).values(squareData);

    console.log(`✅ Created ${squareData.length} squares\n`);

    console.log('🎉 Success! Player added to fundraiser\n');
    console.log('Player Details:');
    console.log(`  Name: ${name}`);
    console.log(`  Email: ${email}`);
    console.log(`  Goal: $${goal}`);
    console.log(`  Squares: ${squareData.length}`);
    console.log(`\n🔗 Player URL: ${process.env.NEXT_PUBLIC_APP_URL}/player/${player.slug}\n`);
    console.log('📧 Login Credentials:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}\n`);

  } catch (error: any) {
    console.error('❌ Error adding player:', error.message);
    if (error.message.includes('unique')) {
      console.error('💡 This email is already in use. Please use a different email.');
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

addPlayer();
