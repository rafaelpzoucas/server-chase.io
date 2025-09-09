import type * as Party from "partykit/server";
import { GameState } from "../types";
import { selectRandomPlayerAsIt } from "../utils/select-random-player-as-it";
import { cleanupPlayerInput } from "./player-input";

export function disconnect(
  connection: Party.Connection,
  gameState: GameState,
  room: Party.Room
) {
  console.log(`Player disconnected: ${connection.id}`);

  // Verifica se o jogador está nos ativos ou eliminados
  const disconnectedPlayer =
    gameState.activePlayers.get(connection.id) ||
    gameState.eliminatedPlayers.get(connection.id);

  // Remove das duas listas (só uma vai ter o jogador)
  gameState.activePlayers.delete(connection.id);
  gameState.eliminatedPlayers.delete(connection.id);

  // Notifica outros jogadores sobre a saída (broadcast exclude sender)
  room.broadcast(
    JSON.stringify({
      type: "game:playerLeft",
      payload: {
        playerId: connection.id,
        activePlayers: Array.from(gameState.activePlayers.values()),
        eliminatedPlayers: Array.from(gameState.eliminatedPlayers.values()),
      },
    }),
    [connection.id]
  );

  cleanupPlayerInput(connection.id);

  // Se o jogador que saiu estava no pique e ainda há jogadores ativos, seleciona outro
  if (disconnectedPlayer?.isIt && gameState.activePlayers.size > 0) {
    selectRandomPlayerAsIt(gameState, room);
  }

  // Se não há mais jogadores (ativos + eliminados), reseta o jogo
  if (
    gameState.activePlayers.size === 0 &&
    gameState.eliminatedPlayers.size === 0
  ) {
    gameState.gameStarted = false;
  }
}
