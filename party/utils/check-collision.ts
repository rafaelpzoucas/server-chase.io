import type * as Party from "partykit/server";
import { GameState, Player } from "../types";
import { transferPique } from "./transfer-it";

export function checkCollision(
  movingPlayer: Player,
  gameState: GameState,
  room: Party.Room
) {
  if (!movingPlayer.isIt) return;

  for (const [playerId, otherPlayer] of gameState.activePlayers.entries()) {
    if (playerId === movingPlayer.id || otherPlayer.isIt) continue;
    if (Date.now() < otherPlayer.immuneUntil) continue;

    const dx = movingPlayer.position.x - otherPlayer.position.x;
    const dy = movingPlayer.position.y - otherPlayer.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const collisionDistance = movingPlayer.width / 2 + otherPlayer.width / 2;

    if (distance < collisionDistance) {
      transferPique(playerId, movingPlayer, otherPlayer, gameState, room);
      break; // Para depois da primeira colisão
    }
  }
}
