import type * as Party from "partykit/server";
import { GameState, Player } from "../types";
import { gameConfig } from "../config";

export function transferPique(
  playerId: string,
  itPlayer: Player,
  otherPlayer: Player,
  gameState: GameState,
  room: Party.Room
) {
  // Transfere o pique
  itPlayer.isIt = false;
  itPlayer.color = gameConfig.player.color.NORMAL;
  itPlayer.width = gameConfig.player.size;
  itPlayer.height = gameConfig.player.size;
  itPlayer.immuneUntil = Date.now() + gameConfig.pique.immunityTime;

  otherPlayer.isIt = true;
  otherPlayer.color = gameConfig.player.color.PIQUE;
  otherPlayer.width = gameConfig.player.pique_size;
  otherPlayer.height = gameConfig.player.pique_size;

  // Atualiza no Map
  gameState.players.set(itPlayer.id, itPlayer);
  gameState.players.set(playerId, otherPlayer);

  // Notifica todos os jogadores sobre a mudança de pique
  room.broadcast(
    JSON.stringify({
      type: "game:piqueTransferred",
      payload: {
        fromPlayerId: itPlayer.id,
        toPlayerId: playerId,
        players: Array.from(gameState.players.values()),
      },
    })
  );
}
