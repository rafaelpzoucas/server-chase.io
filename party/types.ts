export interface Player {
  id: string;
  socketId: string;
  position: { x: number; y: number };
  color: string;
  width: number;
  height: number;
  nickname?: string;
  isIt: boolean;
  velocity: { x: number; y: number };
  immuneUntil: number;
  caught_count: number;
}

export interface GameState {
  activePlayers: Map<string, Player>;
  eliminatedPlayers: Map<string, Player>;
  gameStarted: boolean;
  gameFinished: boolean;
}
