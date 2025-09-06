import { DefaultEventsMap, Socket } from "socket.io";
import { gameState } from "../server";
import { selectRandomPlayerAsIt } from "../utils/select-random-player-as-it";
import { cleanupPlayerInput } from "./player-input";

export const disconnect = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  console.log(`Player disconnected: ${socket.id}`);

  const disconnectedPlayer = gameState.players.get(socket.id);
  gameState.players.delete(socket.id);

  socket.broadcast.emit("game:playerLeft", socket.id);

  cleanupPlayerInput(socket.id);

  if (disconnectedPlayer?.isIt && gameState.players.size > 0) {
    selectRandomPlayerAsIt();
  }

  // Se não há mais jogadores, reseta o jogo
  if (gameState.players.size === 0) {
    gameState.gameStarted = false;
  }
};
