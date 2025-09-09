import type * as Party from "partykit/server";
import { GameState } from "../types";
import { gameConfig } from "../config";

export function selectRandomPlayerAsIt(gameState: GameState, room: Party.Room) {
  const players = Array.from(gameState.activePlayers.values());
  if (players.length === 0) return;

  // Remove o pique de todos os jogadores
  players.forEach((player) => {
    player.isIt = false;
    player.color = gameConfig.player.color.NORMAL;
    player.width = gameConfig.player.size;
    player.height = gameConfig.player.size;
  });

  // Seleciona um jogador aleatório para ser o pique
  const randomIndex = Math.floor(Math.random() * players.length);
  const selectedPlayer = players[randomIndex];

  selectedPlayer.isIt = true;
  selectedPlayer.color = gameConfig.player.color.PIQUE;
  selectedPlayer.width = gameConfig.player.pique_size;
  selectedPlayer.height = gameConfig.player.pique_size;

  // Atualiza o jogador no Map
  gameState.activePlayers.set(selectedPlayer.id, selectedPlayer);

  // Notifica todos os jogadores sobre quem está no pique
  room.broadcast(
    JSON.stringify({
      type: "game:piqueChanged",
      payload: {
        playerId: selectedPlayer.id,
        activePlayers: Array.from(gameState.activePlayers.values()),
        eliminatedPlayers: Array.from(gameState.eliminatedPlayers.values()),
      },
    })
  );
}
