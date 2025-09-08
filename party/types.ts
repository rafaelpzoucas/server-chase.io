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
}

export interface GameState {
  players: Map<string, Player>;
  gameStarted: boolean;
}
