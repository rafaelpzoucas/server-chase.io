import { checkCollision } from "./check-collision";

import { GameState } from "../types";
import type * as Party from "partykit/server";
import { gameConfig } from "../config";

export function updatePlayerPositions(gameState: GameState, room: Party.Room) {
  for (const player of gameState.players.values()) {
    // Atualiza posição baseada na velocidade
    let newX = player.position.x + player.velocity.x;
    let newY = player.position.y + player.velocity.y;

    // Verifica limites do canvas
    newX = Math.max(0, Math.min(gameConfig.arena.width - player.width, newX));
    newY = Math.max(0, Math.min(gameConfig.arena.height - player.height, newY));

    player.position.x = newX;
    player.position.y = newY;

    // Verifica colisões se o jogador estiver se movendo
    if (player.velocity.x !== 0 || player.velocity.y !== 0) {
      checkCollision(player, gameState, room);
    }
  }
}
