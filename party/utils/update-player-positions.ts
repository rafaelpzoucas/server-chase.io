import { checkCollision } from "./check-collision";

import { GameState } from "../types";
import type * as Party from "partykit/server";
import { gameConfig } from "../config";

export function updatePlayerPositions(gameState: GameState, room: Party.Room) {
  for (const player of gameState.activePlayers.values()) {
    let newX = player.position.x + player.velocity.x;
    let newY = player.position.y + player.velocity.y;

    // Arena bounds
    newX = Math.max(0, Math.min(gameConfig.arena.width - player.width, newX));
    newY = Math.max(0, Math.min(gameConfig.arena.height - player.height, newY));

    // Verifica colisão com outros jogadores antes de aplicar
    for (const [id, other] of gameState.activePlayers.entries()) {
      if (id === player.id) continue;

      const dx = newX - other.position.x;
      const dy = newY - other.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const minDist = player.width / 2 + other.width / 2;

      if (dist < minDist) {
        // empurra o player para a borda do outro
        const overlap = minDist - dist;
        const nx = dx / dist; // direção normalizada
        const ny = dy / dist;

        newX += nx * overlap;
        newY += ny * overlap;
      }
    }

    player.position.x = newX;
    player.position.y = newY;

    if (player.velocity.x !== 0 || player.velocity.y !== 0) {
      checkCollision(player, gameState, room);
    }
  }
}
