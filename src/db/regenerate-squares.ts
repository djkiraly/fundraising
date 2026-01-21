import * as dotenv from 'dotenv';
// Load environment variables FIRST
dotenv.config();

async function main() {
  const { db } = await import('./index');
  const { players, squares } = await import('./schema');
  const { eq } = await import('drizzle-orm');

  /**
   * Generate heart-shaped grid coordinates
   * Uses the parametric heart curve equation for a classic heart shape
   */
  function generateHeartCoordinates(): { x: number; y: number }[] {
    const coordinates: { x: number; y: number }[] = [];
    const gridSize = 15;
    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);
    const scale = 6; // Scale factor for the heart size

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        // Normalize coordinates to -1 to 1 range, flip Y so heart points down
        const nx = (x - centerX) / scale;
        const ny = -(y - centerY) / scale; // Flip Y axis

        // Heart curve equation: (x² + y² - 1)³ - x²y³ < 0
        const value = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);

        if (value < 0) {
          coordinates.push({ x, y });
        }
      }
    }

    return coordinates;
  }

  /**
   * Generate random square values that sum to approximately $100
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

  console.log('🔄 Regenerating squares for all players...\n');

  try {
    // Get all players
    const allPlayers = await db.select().from(players);

    if (allPlayers.length === 0) {
      console.log('No players found in database. Run npm run db:seed first.');
      process.exit(1);
    }

    for (const player of allPlayers) {
      // Delete existing squares for this player
      await db.delete(squares).where(eq(squares.playerId, player.id));
      console.log(`🗑️  Deleted old squares for ${player.name}`);

      // Generate new heart-shaped squares
      const heartCoordinates = generateHeartCoordinates();
      const squareValues = generateSquareValues(heartCoordinates.length);

      const squareData = heartCoordinates.map((coord, index) => ({
        playerId: player.id,
        positionX: coord.x,
        positionY: coord.y,
        value: squareValues[index].toFixed(2),
        isPurchased: false,
      }));

      await db.insert(squares).values(squareData);
      console.log(`✅ Created ${squareData.length} heart-shaped squares for ${player.name}`);
    }

    console.log('\n🎉 Squares regenerated successfully!');
    console.log('Note: All previous donations and purchased squares have been reset.');
  } catch (error) {
    console.error('❌ Failed to regenerate squares:', error);
    throw error;
  }

  process.exit(0);
}

main();
