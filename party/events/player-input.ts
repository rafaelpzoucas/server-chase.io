import type * as Party from "partykit/server";
import { GameState } from "../types";
import { GAME_CONFIG } from "../utils/constants";

// Interface para controlar o estado das teclas
interface PlayerInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

// Mapa para armazenar o estado de input de cada jogador
const playerInputStates = new Map<string, PlayerInputState>();

export function playerInput(
  connection: Party.Connection,
  data: { input: string; state: boolean },
  gameState: GameState
) {
  const player = gameState.players.get(connection.id);
  if (!player) return;

  // Inicializa o estado de input do jogador se não existir
  if (!playerInputStates.has(connection.id)) {
    playerInputStates.set(connection.id, {
      up: false,
      down: false,
      left: false,
      right: false,
    });
  }

  const inputState = playerInputStates.get(connection.id)!;

  // Atualiza o estado da tecla específica
  switch (data.input) {
    case "up":
      inputState.up = data.state;
      break;
    case "down":
      inputState.down = data.state;
      break;
    case "left":
      inputState.left = data.state;
      break;
    case "right":
      inputState.right = data.state;
      break;
  }

  // Calcula a velocidade baseada em todas as teclas pressionadas
  const speedMultiplier = player.isIt ? GAME_CONFIG.PIQUE_SPEED_BONUS : 1;
  const baseSpeed = GAME_CONFIG.PLAYER_SPEED * speedMultiplier;

  // Reseta a velocidade
  player.velocity.x = 0;
  player.velocity.y = 0;

  // Aplica movimento vertical (prioridade: não permitir up e down simultaneamente)
  if (inputState.up && !inputState.down) {
    player.velocity.y = -baseSpeed;
  } else if (inputState.down && !inputState.up) {
    player.velocity.y = baseSpeed;
  }

  // Aplica movimento horizontal (prioridade: não permitir left e right simultaneamente)
  if (inputState.left && !inputState.right) {
    player.velocity.x = -baseSpeed;
  } else if (inputState.right && !inputState.left) {
    player.velocity.x = baseSpeed;
  }

  // Normaliza a velocidade para movimento diagonal (opcional)
  if (player.velocity.x !== 0 && player.velocity.y !== 0) {
    const diagonalSpeed = baseSpeed * 0.7071; // √2/2 para manter velocidade constante
    player.velocity.x = player.velocity.x > 0 ? diagonalSpeed : -diagonalSpeed;
    player.velocity.y = player.velocity.y > 0 ? diagonalSpeed : -diagonalSpeed;
  }

  gameState.players.set(connection.id, player);
}

// Função para limpar estado quando jogador desconectar
export function cleanupPlayerInput(playerId: string) {
  playerInputStates.delete(playerId);
}
