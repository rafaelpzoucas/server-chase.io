import type * as Party from "partykit/server";
import { GameState, Player } from "../types";
import { getRandomSpawnPosition } from "../utils/get-random-spawn-position";
import { selectRandomPlayerAsIt } from "../utils/select-random-player-as-it";
import { gameConfig } from "../config";

export function initRequest(
  connection: Party.Connection,
  gameState: GameState,
  room: Party.Room
) {
  const newPlayer: Player = {
    id: connection.id,
    socketId: connection.id,
    position: getRandomSpawnPosition(
      gameConfig.arena.width,
      gameConfig.arena.height,
      gameConfig.player.size,
      gameConfig.player.size,
      gameState
    ),
    color: gameConfig.player.color.NORMAL,
    width: gameConfig.player.size,
    height: gameConfig.player.size,
    nickname: `Player ${gameState.players.size + 1}`,
    isIt: false,
    velocity: { x: 0, y: 0 },
  };

  gameState.players.set(connection.id, newPlayer);

  // Envia dados de inicialização para o jogador que se conectou
  connection.send(
    JSON.stringify({
      type: "game:init",
      payload: {
        playerId: connection.id,
        player: newPlayer,
        players: Array.from(gameState.players.values()),
        canvasWidth: gameConfig.arena.width,
        canvasHeight: gameConfig.arena.height,
      },
    })
  );

  // Notifica outros jogadores sobre o novo jogador (broadcast exclude sender)
  room.broadcast(
    JSON.stringify({
      type: "game:playerJoined",
      payload: newPlayer,
    }),
    [connection.id]
  );

  // Se é o primeiro jogador e o jogo ainda não começou
  if (gameState.players.size === 1 && !gameState.gameStarted) {
    newPlayer.isIt = true;
    newPlayer.color = gameConfig.player.color.NORMAL;
    gameState.players.set(connection.id, newPlayer);
    gameState.gameStarted = true;

    // Notifica que o jogo começou (broadcast para todos)
    room.broadcast(
      JSON.stringify({
        type: "game:started",
        payload: {
          itPlayerId: connection.id,
          players: Array.from(gameState.players.values()),
        },
      })
    );
  }
  // Se há mais de um jogador e nenhum está no pique, seleciona um aleatório
  else if (
    gameState.players.size > 1 &&
    !Array.from(gameState.players.values()).some((p) => p.isIt)
  ) {
    selectRandomPlayerAsIt(gameState, room);
  }
}
