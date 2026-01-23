import { db } from '@/db';
import { squares } from '@/db/schema';
import { getSquareRandomizationConfig } from '@/lib/config';

/**
 * Standard heart grid configuration
 * All players get exactly the same heart shape with 97 squares
 */
export const HEART_GRID_SIZE = 15;
export const HEART_SQUARE_COUNT = 97;

/**
 * Pre-computed heart coordinates for consistent grid across all players
 * Generated using the parametric heart curve equation
 */
export const STANDARD_HEART_COORDINATES: ReadonlyArray<{ x: number; y: number }> = Object.freeze(
  generateHeartCoordinates()
);

/**
 * Generate heart-shaped grid squares for a player and insert them into the database
 * Uses admin config for min/max values
 */
export async function generateHeartSquares(playerId: string): Promise<void> {
  const heartCoords = STANDARD_HEART_COORDINATES;

  // Get config values from admin settings
  const config = await getSquareRandomizationConfig();
  const values = generateSquareValuesFromConfig(heartCoords.length, config.minValue, config.maxValue);

  const squareData = heartCoords.map((coord, index) => ({
    playerId,
    positionX: coord.x,
    positionY: coord.y,
    value: String(Math.round(values[index])), // Whole dollar amounts only
    isPurchased: false,
  }));

  await db.insert(squares).values(squareData);
}

/**
 * Generate heart grid squares data without inserting (for bulk operations)
 * Uses admin config for min/max values
 * Returns array of square data ready for insertion
 */
export async function generateHeartGridSquares(targetGoal: number = 100): Promise<Array<{
  x: number;
  y: number;
  value: number;
}>> {
  const heartCoords = STANDARD_HEART_COORDINATES;

  // Get config values from admin settings
  const config = await getSquareRandomizationConfig();
  const values = generateSquareValuesFromConfig(heartCoords.length, config.minValue, config.maxValue);

  return heartCoords.map((coord, index) => ({
    x: coord.x,
    y: coord.y,
    value: values[index],
  }));
}

/**
 * Generate heart grid squares data with explicit min/max values (sync version for seeding)
 * Only uses valid US dollar bill denominations within the min/max range
 * Returns array of square data ready for insertion
 */
export function generateHeartGridSquaresSync(minValue: number = 1, maxValue: number = 10): Array<{
  x: number;
  y: number;
  value: number;
}> {
  const heartCoords = STANDARD_HEART_COORDINATES;
  const values = generateSquareValuesFromConfig(heartCoords.length, minValue, maxValue);

  return heartCoords.map((coord, index) => ({
    x: coord.x,
    y: coord.y,
    value: values[index],
  }));
}

// Valid US dollar bill denominations
const DOLLAR_DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100];

/**
 * Generate square values using config min/max values
 * Only generates valid US dollar bill denominations ($1, $2, $5, $10, $20, $50, $100)
 */
function generateSquareValuesFromConfig(count: number, minValue: number, maxValue: number): number[] {
  if (count === 0) return [];

  // Filter denominations to only those within the min/max range
  const validDenominations = DOLLAR_DENOMINATIONS.filter(
    d => d >= minValue && d <= maxValue
  );

  // Fallback to closest valid denominations if none in range
  if (validDenominations.length === 0) {
    const closest = DOLLAR_DENOMINATIONS.reduce((prev, curr) =>
      Math.abs(curr - minValue) < Math.abs(prev - minValue) ? curr : prev
    );
    validDenominations.push(closest);
  }

  const values: number[] = [];

  // Generate random values from valid denominations
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * validDenominations.length);
    values.push(validDenominations[randomIndex]);
  }

  // Fisher-Yates shuffle
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  return values;
}

/**
 * Generate square values with even distribution of predefined values
 * @deprecated Use generateSquareValuesFromConfig with admin settings instead
 */
function generateSquareValues(count: number): number[] {
  // Default fallback values if config is not available
  return generateSquareValuesFromConfig(count, 1, 10);
}

/**
 * Generate square values that sum close to the target goal
 */
function generateSquareValuesForGoal(count: number, targetGoal: number): number[] {
  if (count === 0) return [];

  // Calculate average value per square
  const avgValue = targetGoal / count;

  // Determine value distribution based on average
  let minValue: number, maxValue: number;

  if (avgValue <= 3) {
    minValue = 1;
    maxValue = 5;
  } else if (avgValue <= 7) {
    minValue = 3;
    maxValue = 10;
  } else if (avgValue <= 15) {
    minValue = 5;
    maxValue = 20;
  } else {
    minValue = 10;
    maxValue = Math.ceil(avgValue * 2);
  }

  // Generate initial random values
  const values: number[] = [];
  let currentSum = 0;

  for (let i = 0; i < count; i++) {
    const value = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
    values.push(value);
    currentSum += value;
  }

  // Adjust values to get closer to target
  const difference = targetGoal - currentSum;
  const adjustmentPerSquare = Math.round(difference / count);

  if (Math.abs(adjustmentPerSquare) > 0) {
    for (let i = 0; i < count && Math.abs(currentSum - targetGoal) > count; i++) {
      const newValue = Math.max(minValue, Math.min(maxValue, values[i] + adjustmentPerSquare));
      currentSum = currentSum - values[i] + newValue;
      values[i] = newValue;
    }
  }

  // Fisher-Yates shuffle
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  return values;
}

/**
 * Generate heart-shaped coordinates for the grid
 * Uses the parametric heart curve equation: (x² + y² - 1)³ - x²y³ < 0
 * This produces exactly 97 squares with a 15x15 grid
 */
function generateHeartCoordinates(): { x: number; y: number }[] {
  const coordinates: { x: number; y: number }[] = [];
  const gridSize = HEART_GRID_SIZE;
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
