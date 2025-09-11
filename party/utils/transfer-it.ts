// transfer-it.ts - Versão atualizada para usar com o servidor
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
  // Atualiza o contador do jogador atingido
  otherPlayer.caughtCount++;

  if (otherPlayer.caughtCount >= 3) {
    // Jogador eliminado — NÃO recebe o pique
    gameState.activePlayers.delete(otherPlayer.id);
    gameState.eliminatedPlayers.set(otherPlayer.id, otherPlayer);

    // Quem estava com o pique mantém o status
    itPlayer.isIt = true;
    itPlayer.color = gameConfig.player.color.PIQUE;
    itPlayer.width = gameConfig.player.pique_size;
    itPlayer.height = gameConfig.player.pique_size;
    // Não aplica imunidade, já que continua sendo "it"

    gameState.activePlayers.set(itPlayer.id, itPlayer);
  } else {
    // Transfere o pique normalmente
    itPlayer.isIt = false;
    itPlayer.color = gameConfig.player.color.NORMAL;
    itPlayer.width = gameConfig.player.size;
    itPlayer.height = gameConfig.player.size;

    // ✅ NOVA LÓGICA: Define imunidade usando método do servidor
    // Como não temos acesso direto ao servidor aqui, vamos definir manualmente
    itPlayer.isImmune = true;

    // Programa remoção da imunidade usando setTimeout
    setTimeout(() => {
      // Verifica se o jogador ainda existe e remove imunidade
      const currentPlayer = gameState.activePlayers.get(itPlayer.id);
      if (currentPlayer && currentPlayer.isImmune) {
        currentPlayer.isImmune = false;
        gameState.activePlayers.set(itPlayer.id, currentPlayer);

        // Notifica sobre expiração da imunidade
        room.broadcast(
          JSON.stringify({
            type: "game:immunityExpired",
            payload: {
              playerId: itPlayer.id,
              activePlayers: Array.from(gameState.activePlayers.values()),
            },
          })
        );
      }
    }, gameConfig.pique.immunityTime);

    otherPlayer.isIt = true;
    otherPlayer.color = gameConfig.player.color.PIQUE;
    otherPlayer.width = gameConfig.player.pique_size;
    otherPlayer.height = gameConfig.player.pique_size;

    gameState.activePlayers.set(itPlayer.id, itPlayer);
    gameState.activePlayers.set(otherPlayer.id, otherPlayer);
  }

  // Broadcast para todos
  room.broadcast(
    JSON.stringify({
      type: "game:piqueTransferred",
      payload: {
        fromPlayerId: itPlayer.id,
        toPlayerId: otherPlayer.isIt ? otherPlayer.id : itPlayer.id,
        activePlayers: Array.from(gameState.activePlayers.values()),
        eliminatedPlayers: Array.from(gameState.eliminatedPlayers.values()),
      },
    })
  );
}
