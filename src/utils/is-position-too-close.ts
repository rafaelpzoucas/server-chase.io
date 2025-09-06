import { gameState } from "../server";

export const isPositionTooClose = (position: {
  x: number;
  y: number;
}): boolean => {
  const MIN_DISTANCE = 100;

  for (const player of gameState.players.values()) {
    const distance = Math.sqrt(
      Math.pow(position.x - player.position.x, 2) +
        Math.pow(position.y - player.position.y, 2)
    );

    if (distance < MIN_DISTANCE) return true;
  }

  return false;
};
