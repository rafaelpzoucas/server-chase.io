import type * as Party from "partykit/server";
import { GameState, Player } from "../types";
import { PLAYER_COLORS } from "./constants";

export function transferPique(
  playerId: string,
  movingPlayer: Player,
  otherPlayer: Player,
  gameState: GameState,
  room: Party.Room
) {
  // Transfere o pique
  movingPlayer.isIt = false;
  movingPlayer.color = PLAYER_COLORS.NORMAL;

  otherPlayer.isIt = true;
  otherPlayer.color = PLAYER_COLORS.PIQUE;

  // Atualiza no Map
  gameState.players.set(movingPlayer.id, movingPlayer);
  gameState.players.set(playerId, otherPlayer);

  // Notifica todos os jogadores sobre a mudança de pique
  room.broadcast(
    JSON.stringify({
      type: "game:piqueTransferred",
      payload: {
        fromPlayerId: movingPlayer.id,
        toPlayerId: playerId,
        players: Array.from(gameState.players.values()),
      },
    })
  );
}
