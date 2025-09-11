import type * as Party from "partykit/server";
import { GameState } from "../types";
import { gameConfig } from "../config";
import { selectRandomPlayerAsIt } from "../utils/select-random-player-as-it";
import { cleanupPlayerInput } from "./player-input";

export function restartGame(gameState: GameState, room: Party.Room) {
  // RESET DOS INPUTS PRIMEIRO - Para todos os jogadores (ativos + eliminados)
  const allPlayerIds = new Set([
    ...gameState.activePlayers.keys(),
    ...gameState.eliminatedPlayers.keys(),
  ]);

  allPlayerIds.forEach((playerId) => {
    cleanupPlayerInput(playerId);
  });

  // Move eliminados para ativos ANTES de resetar estados
  gameState.eliminatedPlayers.forEach((player, id) => {
    // Reset completo do jogador eliminado
    player.caughtCount = 0;
    player.isIt = false;
    player.color = gameConfig.player.color.NORMAL;
    player.width = gameConfig.player.size;
    player.height = gameConfig.player.size;

    // Reset da velocidade também
    player.velocity.x = 0;
    player.velocity.y = 0;

    // Move para ativos
    gameState.activePlayers.set(id, player);
  });
  gameState.eliminatedPlayers.clear();

  // Reset COMPLETO de todos os jogadores ativos
  gameState.activePlayers.forEach((player) => {
    player.caughtCount = 0;
    player.isIt = false;
    player.color = gameConfig.player.color.NORMAL;
    player.width = gameConfig.player.size;
    player.height = gameConfig.player.size;

    // Reset da velocidade também
    player.velocity.x = 0;
    player.velocity.y = 0;

    // Reset de posição se necessário (caso tenham ficado em posições inválidas)
    // Descomente se houver propriedades de posição
    // player.x = gameConfig.player.initialPosition.x;
    // player.y = gameConfig.player.initialPosition.y;
  });

  // Só define como iniciado DEPOIS de configurar tudo
  if (gameState.activePlayers.size === 1) {
    // Para 1 jogador, ele é automaticamente "it"
    const singlePlayer = Array.from(gameState.activePlayers.values())[0];
    singlePlayer.isIt = true;
    singlePlayer.color = gameConfig.player.color.PIQUE;
  } else if (gameState.activePlayers.size > 1) {
    selectRandomPlayerAsIt(gameState, room);
  }

  // AGORA sim marca como iniciado
  gameState.gameStarted = true;

  // Busca o jogador "it" para o broadcast
  const itPlayer = Array.from(gameState.activePlayers.values()).find(
    (p) => p.isIt
  );

  // Broadcast com informações completas
  room.broadcast(
    JSON.stringify({
      type: "game:restarted", // Evento específico para restart
      payload: {
        gameStarted: true,
        itPlayerId: itPlayer?.id,
        activePlayers: Array.from(gameState.activePlayers.values()),
        eliminatedPlayers: [], // Sempre vazio após restart
        totalPlayers: gameState.activePlayers.size,
      },
    })
  );

  // Opcional: Também enviar game:started para compatibilidade
  room.broadcast(
    JSON.stringify({
      type: "game:started",
      payload: {
        itPlayerId: itPlayer?.id,
        activePlayers: Array.from(gameState.activePlayers.values()),
        eliminatedPlayers: [],
      },
    })
  );

  console.log(
    `Jogo reiniciado com ${gameState.activePlayers.size} jogadores. Jogador "it": ${itPlayer?.id}`
  );
  console.log(
    `Teclas de movimento resetadas para ${gameState.activePlayers.size} jogadores`
  );
}
