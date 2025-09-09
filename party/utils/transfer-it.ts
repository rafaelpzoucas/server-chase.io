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
  otherPlayer.caught_count++;

  if (otherPlayer.caught_count === 3) {
    // Remove do activePlayers
    gameState.activePlayers.delete(otherPlayer.id);

    // Adiciona ao eliminatedPlayers
    gameState.eliminatedPlayers.set(otherPlayer.id, otherPlayer);
  } else {
    // Se não foi eliminado, apenas atualiza no activePlayers
    gameState.activePlayers.set(playerId, otherPlayer);
  }

  // Sempre atualiza o itPlayer (que perdeu o pique)
  gameState.activePlayers.set(itPlayer.id, itPlayer);

  // Notifica todos os jogadores sobre a mudança de pique
  room.broadcast(
    JSON.stringify({
      type: "game:piqueTransferred",
      payload: {
        fromPlayerId: itPlayer.id,
        toPlayerId: playerId,
        activePlayers: Array.from(gameState.activePlayers.values()),
        eliminatedPlayers: Array.from(gameState.eliminatedPlayers.values()),
      },
    })
  );
}
