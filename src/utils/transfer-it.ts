import { gameState, io } from "../server";
import { Player } from "../types";
import { PLAYER_COLORS } from "./constants";

export const transferPique = (
  playerId: string,
  movingPlayer: Player,
  otherPlayer: Player
) => {
  // Transfere o pique
  movingPlayer.isIt = false;
  movingPlayer.color = PLAYER_COLORS.NORMAL;

  otherPlayer.isIt = true;
  otherPlayer.color = PLAYER_COLORS.PIQUE;

  // Atualiza no Map
  gameState.players.set(movingPlayer.id, movingPlayer);
  gameState.players.set(playerId, otherPlayer);

  // Notifica todos os jogadores sobre a mudança de pique
  io.emit("game:piqueTransferred", {
    fromPlayerId: movingPlayer.id,
    toPlayerId: playerId,
    players: Array.from(gameState.players.values()),
  });
};
