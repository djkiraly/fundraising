import { db } from '@/db';
import { squares } from '@/db/schema';

/**
 * Generate heart-shaped grid squares for a player and insert them into the database
 */
export async function generateHeartSquares(playerId: string): Promise<void> {
  const heartCoords = generateHeartCoordinates();
  const values = generateSquareValues(heartCoords.length);

  const squareData = heartCoords.map((coord, index) => ({
    playerId,
    positionX: coord.x,
    positionY: coord.y,
    value: String(values[index]),
    isPurchased: false,
  }));

  await db.insert(squares).values(squareData);
}

/**
 * Generate heart grid squares data without inserting (for bulk operations)
 * Returns array of square data ready for insertion
 */
export function generateHeartGridSquares(targetGoal: number = 100): Array<{
  x: number;
  y: number;
  value: number;
}> {
  const heartCoords = generateHeartCoordinates();
  const values = generateSquareValuesForGoal(heartCoords.length, targetGoal);

  return heartCoords.map((coord, index) => ({
    x: coord.x,
    y: coord.y,
    value: values[index],
  }));
}

/**
 * Generate square values with even distribution of predefined values
 */
function generateSquareValues(count: number): number[] {
  const SQUARE_VALUES = [5, 10, 20];
  if (count === 0) return [];

  const values: number[] = [];
  const perValue = Math.floor(count / 3);
  const remainder = count % 3;

  for (let i = 0; i < 3; i++) {
    const extraOne = i < remainder ? 1 : 0;
    for (let j = 0; j < perValue + extraOne; j++) {
      values.push(SQUARE_VALUES[i]);
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
 */
function generateHeartCoordinates(): { x: number; y: number }[] {
  const coords: { x: number; y: number }[] = [];
  const gridSize = 20;
  const centerX = gridSize / 2;
  const centerY = gridSize / 2;
  const scale = 0.8;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const nx = ((x - centerX) / centerX) * 1.2;
      const ny = ((centerY - y) / centerY) * 1.2;

      const heartX = nx / scale;
      const heartY = (ny - Math.sqrt(Math.abs(nx)) * 0.7) / scale;

      if (heartX * heartX + heartY * heartY <= 1) {
        coords.push({ x, y });
      }
    }
  }

  return coords;
}
