import { checkCollision } from "./check-collision";
import { GAME_CONFIG } from "./constants";
import { gameState, io } from "../server";

export const updatePlayerPositions = () => {
  for (const player of gameState.players.values()) {
    // Atualiza posição baseada na velocidade
    let newX = player.position.x + player.velocity.x;
    let newY = player.position.y + player.velocity.y;

    // Verifica limites do canvas
    newX = Math.max(0, Math.min(GAME_CONFIG.ARENA_WIDTH - player.width, newX));
    newY = Math.max(
      0,
      Math.min(GAME_CONFIG.ARENA_HEIGHT - player.height, newY)
    );

    player.position.x = newX;
    player.position.y = newY;

    // Verifica colisões se o jogador estiver no pique
    if (player.velocity.x !== 0 || player.velocity.y !== 0) {
      checkCollision(player);
    }
  }
};
