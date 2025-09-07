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

  const disconnectedPlayer = gameState.players.get(connection.id);
  gameState.players.delete(connection.id);

  // Notifica outros jogadores sobre a saída (broadcast exclude sender)
  room.broadcast(
    JSON.stringify({
      type: "game:playerLeft",
      payload: connection.id,
    }),
    [connection.id]
  );

  cleanupPlayerInput(connection.id);

  // Se o jogador que saiu estava no pique e ainda há jogadores, seleciona outro
  if (disconnectedPlayer?.isIt && gameState.players.size > 0) {
    selectRandomPlayerAsIt(gameState, room);
  }

  // Se não há mais jogadores, reseta o jogo
  if (gameState.players.size === 0) {
    gameState.gameStarted = false;
  }
}
