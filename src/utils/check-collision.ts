import { gameState, io } from "../server";
import { Player } from "../types";
import { transferPique } from "./transfer-it";

export const checkCollision = (movingPlayer: Player) => {
  if (!movingPlayer.isIt) return;

  for (const [playerId, otherPlayer] of gameState.players.entries()) {
    if (playerId === movingPlayer.id || otherPlayer.isIt) continue;

    const dx = movingPlayer.position.x - otherPlayer.position.x;
    const dy = movingPlayer.position.y - otherPlayer.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const collisionDistance = movingPlayer.width / 2 + otherPlayer.width / 2;

    if (distance < collisionDistance) {
      transferPique(playerId, movingPlayer, otherPlayer);

      break; // Para depois da primeira colisão
    }
  }
};
