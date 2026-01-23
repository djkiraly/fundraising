import * as dotenv from 'dotenv';
// Load environment variables FIRST
dotenv.config();

async function main() {
  const { db } = await import('./index');
  const { players, squares } = await import('./schema');
  const { eq, sql } = await import('drizzle-orm');
  const { STANDARD_HEART_COORDINATES, HEART_SQUARE_COUNT, generateHeartGridSquares } = await import('../lib/squares');

  console.log('🔄 Regenerating squares for all players...');
  console.log(`📐 Standard heart shape: ${HEART_SQUARE_COUNT} squares\n`);

  try {
    // Get all players with their square counts
    const allPlayers = await db
      .select({
        id: players.id,
        name: players.name,
        goal: players.goal,
        squareCount: sql<number>`(SELECT COUNT(*) FROM squares WHERE player_id = ${players.id})`.as('square_count'),
      })
      .from(players);

    if (allPlayers.length === 0) {
      console.log('No players found in database. Run npm run db:seed first.');
      process.exit(1);
    }

    console.log(`Found ${allPlayers.length} players to process\n`);

    let updated = 0;
    let skipped = 0;

    for (const player of allPlayers) {
      const currentCount = Number(player.squareCount);

      if (currentCount === HEART_SQUARE_COUNT) {
        console.log(`⏭️  ${player.name}: Already has ${currentCount} squares - skipping`);
        skipped++;
        continue;
      }

      console.log(`🔧 ${player.name}: Has ${currentCount} squares, regenerating to ${HEART_SQUARE_COUNT}...`);

      // Delete existing squares for this player
      await db.delete(squares).where(eq(squares.playerId, player.id));

      // Generate new standardized squares using admin config
      const heartSquares = await generateHeartGridSquares();

      const squareData = heartSquares.map((square) => ({
        playerId: player.id,
        positionX: square.x,
        positionY: square.y,
        value: String(square.value), // Whole dollar amounts
        isPurchased: false,
      }));

      await db.insert(squares).values(squareData);

      console.log(`   ✅ Created ${squareData.length} new squares for ${player.name}`);
      updated++;
    }

    console.log('\n🎉 Regeneration completed!');
    console.log(`   Updated: ${updated} players`);
    console.log(`   Skipped: ${skipped} players (already correct)`);
    console.log('\n⚠️  Note: All previous purchased squares have been reset for updated players.');

  } catch (error) {
    console.error('❌ Regeneration failed:', error);
    throw error;
  }

  process.exit(0);
}

main();
