import { DefaultEventsMap, Socket } from "socket.io";
import { Player } from "../types";
import { getRandomSpawnPosition } from "../utils/get-random-spawn-position";
import { GAME_CONFIG, PLAYER_COLORS } from "../utils/constants";
import { gameState, io } from "../server";
import { selectRandomPlayerAsIt } from "../utils/select-random-player-as-it";

export const initRequest = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const newPlayer: Player = {
    id: socket.id,
    socketId: socket.id,
    position: getRandomSpawnPosition(
      GAME_CONFIG.ARENA_WIDTH,
      GAME_CONFIG.ARENA_HEIGHT,
      GAME_CONFIG.PLAYER_SIZE,
      GAME_CONFIG.PLAYER_SIZE
    ),
    color: PLAYER_COLORS.NORMAL,
    width: GAME_CONFIG.PLAYER_SIZE,
    height: GAME_CONFIG.PLAYER_SIZE,
    nickname: `Player ${gameState.players.size + 1}`,
    isIt: false,
    velocity: { x: 0, y: 0 },
  };

  gameState.players.set(socket.id, newPlayer);

  socket.emit("game:init", {
    playerId: socket.id,
    player: newPlayer,
    players: Array.from(gameState.players.values()),
    canvasWidth: GAME_CONFIG.ARENA_WIDTH,
    canvasHeight: GAME_CONFIG.ARENA_HEIGHT,
  });

  socket.broadcast.emit("game:playerJoined", newPlayer);

  // Se é o primeiro jogador e o jogo ainda não começou
  if (gameState.players.size === 1 && !gameState.gameStarted) {
    newPlayer.isIt = true;
    newPlayer.color = PLAYER_COLORS.PIQUE;
    gameState.players.set(socket.id, newPlayer);
    gameState.gameStarted = true;

    // Notifica que o jogo começou
    io.emit("game:started", {
      itPlayerId: socket.id,
      players: Array.from(gameState.players.values()),
    });
  }
  // Se há mais de um jogador e nenhum está no pique, seleciona um aleatório
  else if (
    gameState.players.size > 1 &&
    !Array.from(gameState.players.values()).some((p) => p.isIt)
  ) {
    selectRandomPlayerAsIt();
  }
};
