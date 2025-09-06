import { isPositionTooClose } from "./is-position-too-close";

export const getRandomSpawnPosition = (
  canvasWidth: number,
  canvasHeight: number,
  playerWidth: number,
  playerHeight: number
) => {
  let attempts = 0;
  let position: { x: number; y: number };

  do {
    position = {
      x: Math.random() * (canvasWidth - playerWidth) + playerWidth / 2,
      y: Math.random() * (canvasHeight - playerHeight) + playerHeight / 2,
    };

    attempts++;
  } while (attempts < 10 && isPositionTooClose(position));

  return position;
};
