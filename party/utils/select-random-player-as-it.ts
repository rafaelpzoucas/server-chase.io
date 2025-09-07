import type * as Party from "partykit/server";
import { PLAYER_COLORS } from "./constants";
import { GameState } from "../types";

export function selectRandomPlayerAsIt(gameState: GameState, room: Party.Room) {
  const players = Array.from(gameState.players.values());
  if (players.length === 0) return;

  // Remove o pique de todos os jogadores
  players.forEach((player) => {
    player.isIt = false;
    player.color = PLAYER_COLORS.NORMAL;
  });

  // Seleciona um jogador aleatório para ser o pique
  const randomIndex = Math.floor(Math.random() * players.length);
  const selectedPlayer = players[randomIndex];
  selectedPlayer.isIt = true;
  selectedPlayer.color = PLAYER_COLORS.PIQUE;

  // Atualiza o jogador no Map
  gameState.players.set(selectedPlayer.id, selectedPlayer);

  // Notifica todos os jogadores sobre quem está no pique
  room.broadcast(
    JSON.stringify({
      type: "game:piqueChanged",
      payload: {
        playerId: selectedPlayer.id,
        players: Array.from(gameState.players.values()),
      },
    })
  );
}
