import type * as Party from "partykit/server";
import { GameState } from "../types";
import { gameConfig } from "../config";
import { selectRandomPlayerAsIt } from "../utils/select-random-player-as-it";

export function restartGame(
  connection: Party.Connection,
  gameState: GameState,
  room: Party.Room
) {
  // Reset básico e deixa o initRequest cuidar do resto
  gameState.gameStarted = false;

  // Move eliminados para ativos
  gameState.eliminatedPlayers.forEach((player, id) => {
    player.caught_count = 0;
    gameState.activePlayers.set(id, player);
  });
  gameState.eliminatedPlayers.clear();

  // Reset todos os ativos
  gameState.activePlayers.forEach((player) => {
    player.caught_count = 0;
    player.isIt = false;
    player.color = gameConfig.player.color.NORMAL;
    player.width = gameConfig.player.size;
    player.height = gameConfig.player.size;
  });

  // Reutiliza a lógica do initRequest
  if (gameState.activePlayers.size === 1) {
    // Lógica para 1 jogador (do initRequest)
  } else if (gameState.activePlayers.size > 1) {
    selectRandomPlayerAsIt(gameState, room);
  }

  // Broadcast similar ao game:started
  room.broadcast(
    JSON.stringify({
      type: "game:started", // Reutiliza o evento existente!
      payload: {
        itPlayerId: Array.from(gameState.activePlayers.values()).find(
          (p) => p.isIt
        )?.id,
        activePlayers: Array.from(gameState.activePlayers.values()),
        eliminatedPlayers: Array.from(gameState.eliminatedPlayers.values()),
      },
    })
  );
}
