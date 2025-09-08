// Cores dos jogadores
export const PlayerColors = {
  PIQUE: "red",
  NORMAL: "gray",
  SELECTED: "green",
  IMMUNE: "yellow",
} as const;

export const PlayerConfig = {
  size: 25,
  speed: 6,
  pique_size: 30,
  pique_speed_bonus: 1.2,
  color: PlayerColors,
} as const;
